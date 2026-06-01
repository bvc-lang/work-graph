import {
  buildWorkerPromptFromInput,
  normalizeWorkerOutput,
} from './agentWorkerOpenAiProvider.mjs';
import {
  formatBoundedTargetFilesForPrompt,
  readBoundedTargetFiles,
} from './workGraphBoundedTargetFileRead.mjs';
import {
  buildTargetFileFactsProjection,
  formatLanguageFileFactsForPrompt,
} from './languageAdapterRegistry.mjs';

const INPUT_SCHEMA = 'agent-worker.input.v1';
const OUTPUT_SCHEMA = 'agent-worker.output.v1';

export function resolveClaudeProviderEnv(options = {}) {
  const env = options.env ?? process.env;
  return {
    enabled: (options.enabled ?? env.IOHASC_CLAUDE_WORKER) === '1',
    baseUrl: String(options.baseUrl ?? env.IOHASC_ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/+$/u, ''),
    model: String(options.model ?? env.IOHASC_CLAUDE_MODEL ?? 'claude-3-5-sonnet-latest').trim(),
    apiKey: String(options.apiKey ?? env.IOHASC_CLAUDE_API_KEY ?? env.ANTHROPIC_API_KEY ?? '').trim(),
    apiVersion: String(options.apiVersion ?? env.IOHASC_ANTHROPIC_VERSION ?? '2023-06-01').trim(),
    timeoutMs: Number(options.timeoutMs ?? env.IOHASC_CLAUDE_TIMEOUT_MS ?? 120_000),
  };
}

export function buildClaudeMessagesRequestFromInput(input, options = {}) {
  const env = resolveClaudeProviderEnv(options);
  const prompt = buildWorkerPromptFromInput(input, {
    targetFileContents: options.targetFileContents ?? '',
  });

  const systemMessage = prompt.messages.find((entry) => entry.role === 'system')?.content ?? '';
  const userMessages = prompt.messages
    .filter((entry) => entry.role !== 'system')
    .map((entry) => ({ role: entry.role === 'assistant' ? 'assistant' : 'user', content: entry.content }));

  return {
    schema: 'claude-sdk-api.worker.request.v1',
    runId: input.runId,
    taskId: input.task?.id ?? '',
    model: env.model,
    system: systemMessage,
    messages: userMessages,
    maxTokens: options.maxTokens ?? 4096,
    policy: { ...(input.policy ?? {}) },
    allowedTools: [...(input.allowedTools ?? [])],
    targetFiles: [...(input.targetFiles ?? [])],
    providerHints: { ...(input.providerHints ?? {}), provider: 'claude-sdk-api' },
  };
}

export function parseClaudeResponsePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('claude response payload must be an object');
  }

  const blocks = payload.content;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error('claude response missing content blocks');
  }

  const text = blocks
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (text === '') {
    throw new Error('claude response did not include text content');
  }

  return text;
}

export function validateClaudeStructuredOutput(output) {
  const errors = [];

  if (!output || typeof output !== 'object') {
    return ['output must be an object'];
  }

  if (output.schema !== OUTPUT_SCHEMA) {
    errors.push(`schema must be ${OUTPUT_SCHEMA}`);
  }

  if (typeof output.runId !== 'string' || output.runId.trim() === '') {
    errors.push('runId must be a non-empty string');
  }

  if (typeof output.taskId !== 'string' || output.taskId.trim() === '') {
    errors.push('taskId must be a non-empty string');
  }

  if (!['succeeded', 'failed', 'cancelled', 'needs_human'].includes(output.status)) {
    errors.push('status must be a Worker Output status');
  }

  if (!output.patchSummary || typeof output.patchSummary !== 'object') {
    errors.push('patchSummary is required');
  }

  if (!output.transitionRequest || typeof output.transitionRequest !== 'object') {
    errors.push('transitionRequest is required');
  }

  return errors;
}

export function normalizeClaudeWorkerOutput(raw, input) {
  const normalized = normalizeWorkerOutput(raw, input);

  if (Array.isArray(normalized.evidence) && normalized.evidence.length > 0) {
    normalized.evidence = normalized.evidence.map((entry) => ({
      ...entry,
      source: entry.source === 'openai-compatible' ? 'claude-sdk-api' : (entry.source ?? 'claude-sdk-api'),
    }));
  }

  return normalized;
}

export async function runClaudeSdkApiWorker(input, options = {}) {
  const validationError = validateClaudeWorkerInput(input);
  if (validationError !== null) {
    return buildClaudeFailureOutput(input, validationError, 'code_failure');
  }

  const env = resolveClaudeProviderEnv(options);
  if (!env.enabled && options.requireLive !== false) {
    return buildClaudeFailureOutput(
      input,
      'Claude SDK/API provider skipped: set IOHASC_CLAUDE_WORKER=1 for live path',
      'skipped',
    );
  }

  if (env.apiKey === '' && options.requireApiKey !== false) {
    return buildClaudeFailureOutput(
      input,
      'Claude SDK/API provider blocked: IOHASC_CLAUDE_API_KEY or ANTHROPIC_API_KEY is required',
      'env_blocker',
    );
  }

  const includeTargetFiles = options.includeTargetFiles !== false;
  let targetFileContents = '';
  if (includeTargetFiles && (input.targetFiles?.length ?? 0) > 0) {
    const readResult = await readBoundedTargetFiles(input, {
      repoRoot: options.repoRoot ?? options.cwd,
      readFile: options.readFile,
      maxBytesPerFile: options.maxBytesPerFile,
      maxTotalBytes: options.maxTotalBytes,
    });
    const factsBlock = formatLanguageFileFactsForPrompt(buildTargetFileFactsProjection(readResult));
    targetFileContents = formatBoundedTargetFilesForPrompt(readResult);
    if (factsBlock) {
      targetFileContents = `${targetFileContents}\n\n${factsBlock}`;
    }
  }

  const request = buildClaudeMessagesRequestFromInput(input, { ...options, targetFileContents });
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return buildClaudeFailureOutput(input, 'fetch is not available in this runtime', 'env_blocker');
  }

  let response;
  try {
    response = await fetchImpl(`${env.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.apiKey,
        'anthropic-version': env.apiVersion,
      },
      body: JSON.stringify({
        model: env.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages,
        temperature: 0,
      }),
      signal: options.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureClass = error?.name === 'AbortError' ? 'timeout' : 'env_blocker';
    return buildClaudeFailureOutput(input, `Claude API request failed: ${message}`, failureClass);
  }

  if (!response.ok) {
    const body = await response.text();
    return buildClaudeFailureOutput(
      input,
      `Claude API HTTP ${response.status}: ${body.slice(0, 500)}`,
      'model_failure',
    );
  }

  const payload = await response.json();

  try {
    const text = parseClaudeResponsePayload(payload);
    const parsedRaw = parseRawWorkerOutputJson(text);
    const structureErrors = validateClaudeStructuredOutput(parsedRaw);
    if (structureErrors.length > 0) {
      return buildClaudeFailureOutput(
        input,
        `Claude structured output validation failed: ${structureErrors.join('; ')}`,
        'model_failure',
      );
    }

    return normalizeClaudeWorkerOutput(parsedRaw, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildClaudeFailureOutput(input, `Failed to parse Claude JSON output: ${message}`, 'model_failure');
  }
}

function validateClaudeWorkerInput(input) {
  if (!input || typeof input !== 'object') {
    return 'input must be an object';
  }

  if (input.schema !== INPUT_SCHEMA) {
    return `unsupported input schema: ${String(input.schema)}`;
  }

  if (!input.task || typeof input.task.id !== 'string' || input.task.id.trim() === '') {
    return 'task.id must be a non-empty string';
  }

  if (input.policy?.allowShell === true || input.policy?.allowFileWrite === true) {
    return 'claude-sdk-api provider MVP rejects shell/file-write policy flags';
  }

  return null;
}

function parseRawWorkerOutputJson(text) {
  const trimmed = String(text ?? '').trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('model response did not contain JSON object');
  }

  return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
}

function buildClaudeFailureOutput(input, failureReason, failureClass) {
  const runId = typeof input?.runId === 'string' && input.runId.trim() !== '' ? input.runId : 'claude-invalid-input';
  const taskId = typeof input?.task?.id === 'string' && input.task.id.trim() !== '' ? input.task.id : '';

  return {
    schema: OUTPUT_SCHEMA,
    runId,
    taskId,
    status: 'failed',
    patchSummary: {
      changedFiles: [],
      summary: failureClass === 'skipped'
        ? 'Claude SDK/API provider skipped (env-gated mode).'
        : 'Claude SDK/API provider failed before producing a patch summary.',
    },
    evidence: [{
      kind: 'worker_run',
      source: 'claude-sdk-api',
      result: 'failed',
      summary: failureReason,
      failureClass,
    }],
    transitionRequest: {
      status: 'blocked',
      reason: failureReason,
    },
    logs: [{ level: failureClass === 'skipped' ? 'info' : 'error', message: failureReason }],
    failureReason,
    retryAdvice: failureClass === 'skipped'
      ? 'Set IOHASC_CLAUDE_WORKER=1 and configure IOHASC_CLAUDE_API_KEY / IOHASC_CLAUDE_MODEL.'
      : 'Verify Claude endpoint availability and JSON output quality, then retry.',
  };
}
