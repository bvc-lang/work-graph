import {
  formatBoundedTargetFilesForPrompt,
  readBoundedTargetFiles,
} from './workGraphBoundedTargetFileRead.mjs';
import {
  formatGraphRagContextForPrompt,
} from './graphRagContextSlice.mjs';
import { formatMemoryWorkerSliceForPrompt } from './memoryWorkerSlice.mjs';
import {
  buildTargetFileFactsProjection,
  formatLanguageFileFactsForPrompt,
} from './languageAdapterRegistry.mjs';
import { resolveRoleChainHandoff } from './workGraphToolSurfaceAudit.mjs';

const INPUT_SCHEMA = 'agent-worker.input.v1';
const OUTPUT_SCHEMA = 'agent-worker.output.v1';

export const WORKER_NATIVE_TOOL_CALLS_ENV = 'IOHASC_WORKER_NATIVE_TOOL_CALLS';

export const WORKER_OPENAI_NATIVE_TOOL_NAMES = [
  'submit_worker_output',
  'read_target_file',
];

export function resolveWorkerNativeToolCallsEnabled(options = {}) {
  const env = options.env ?? process.env;
  const raw = String(options.nativeToolCalls ?? env[WORKER_NATIVE_TOOL_CALLS_ENV] ?? '').trim();
  return raw === '1' || raw.toLowerCase() === 'true';
}

export function buildOpenAiWorkerToolDefinitions(input, options = {}) {
  const allowed = new Set([
    ...(Array.isArray(input?.allowedTools) ? input.allowedTools : []),
    ...(Array.isArray(options.extraTools) ? options.extraTools : []),
  ]);

  const tools = [{
    type: 'function',
    function: {
      name: 'submit_worker_output',
      description: 'Submit the final agent-worker.output.v1 payload when the task plan is ready.',
      parameters: {
        type: 'object',
        properties: {
          output: {
            type: 'object',
            description: 'Object matching agent-worker.output.v1',
          },
        },
        required: ['output'],
      },
    },
  }];

  if (allowed.has('onebase.readConfigFile') || allowed.has('onebase.listMetadata') || (input?.targetFiles?.length ?? 0) > 0) {
    tools.push({
      type: 'function',
      function: {
        name: 'read_target_file',
        description: 'Read one bounded target file path from the current task allowlist.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path from task targetFiles' },
          },
          required: ['path'],
        },
      },
    });
  }

  for (const toolName of allowed) {
    if (!toolName.startsWith('onebase.') || tools.some((tool) => tool.function.name === toolName.replaceAll('.', '_'))) {
      continue;
    }

    tools.push({
      type: 'function',
      function: {
        name: toolName.replaceAll('.', '_'),
        description: `Invoke bounded OneBase worker tool ${toolName} (advisory; no side effects in OpenAI worker MVP).`,
        parameters: {
          type: 'object',
          properties: {
            note: { type: 'string', description: 'Why this tool is requested' },
          },
        },
      },
    });
  }

  return tools.slice(0, options.maxTools ?? 8);
}

export function buildOpenAiChatCompletionRequestBody(prompt, options = {}) {
  const env = options.env ?? resolveOpenAiProviderEnv(options);
  const body = {
    model: env.model,
    messages: prompt.messages,
    temperature: 0,
  };

  if (env.nativeToolCallsEnabled) {
    body.tools = buildOpenAiWorkerToolDefinitions(options.input, options);
    body.tool_choice = 'auto';
  }

  return body;
}

export function parseWorkerOutputFromToolCalls(message, input) {
  const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  const submitCall = toolCalls.find((call) => call?.function?.name === 'submit_worker_output');

  if (!submitCall?.function?.arguments) {
    throw new Error('model response did not include submit_worker_output tool call');
  }

  const parsed = JSON.parse(submitCall.function.arguments);
  const rawOutput = parsed?.output && typeof parsed.output === 'object' ? parsed.output : parsed;
  return normalizeWorkerOutput(rawOutput, input);
}

export function buildWorkerPromptFromInput(input, options = {}) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('input must be an object');
  }

  const task = input.task ?? {};
  const checks = Array.isArray(task.checks) ? task.checks : [];
  const targetFiles = Array.isArray(input.targetFiles) ? input.targetFiles : [];
  const graphRagPrompt = (input.memorySlice ?? [])
    .map((entry) => {
      if (entry?.schema === 'pvrg.graph_rag.context.v1') {
        return formatGraphRagContextForPrompt(entry);
      }

      return formatMemoryWorkerSliceForPrompt(entry);
    })
    .filter(Boolean)
    .join('\n\n');

  const systemParts = [
    'You are a Work Graph agent worker adapter.',
    'Respond with a single JSON object matching agent-worker.output.v1.',
    'Do not mutate files directly; summarize proposed changes in patchSummary.',
    'Allowed transitionRequest.status values: verify, blocked, ready.',
    'Set status to succeeded only when the task plan is complete enough for verification.',
    'The status field must be exactly one of: succeeded, failed, cancelled, needs_human (never ready, verify, or done).',
    'Example: {"schema":"agent-worker.output.v1","runId":"...","taskId":"...","status":"succeeded","patchSummary":{"changedFiles":[],"summary":"..."},"evidence":[{"kind":"worker_run","source":"openai-compatible","result":"succeeded","summary":"..."}],"transitionRequest":{"status":"verify","reason":"..."}}',
  ];

  if (input.providerHints?.behaviorRulesPrompt) {
    systemParts.push('Behavior rules (prompt_rule bundle):');
    systemParts.push(String(input.providerHints.behaviorRulesPrompt));
  }

  const system = systemParts.join(' ');

  const user = [
    `Task id: ${task.id ?? ''}`,
    `Title: ${task.title ?? ''}`,
    `Status: ${task.status ?? ''}`,
    `Next action: ${task.nextAction ?? ''}`,
    `Checks:\n${checks.map((entry) => `- ${entry}`).join('\n') || '- none'}`,
    `Target files:\n${targetFiles.map((entry) => `- ${entry}`).join('\n') || '- none'}`,
    graphRagPrompt,
    options.targetFileContents
      ? `Target file contents (bounded read):\n${options.targetFileContents}`
      : '',
    `Policy mode: ${input.policy?.mode ?? 'dry-run'}`,
    'Return JSON fields: schema, runId, taskId, status, patchSummary, evidence, transitionRequest, logs, failureReason, retryAdvice.',
  ].filter(Boolean).join('\n');

  return {
    schema: 'agent-worker.prompt.v1',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
}

export function resolveOpenAiProviderEnv(options = {}) {
  const env = options.env ?? process.env;
  return {
    baseUrl: String(options.baseUrl ?? env.IOHASC_LLM_BASE_URL ?? 'http://127.0.0.1:1234/v1').replace(/\/+$/u, ''),
    model: String(options.model ?? env.IOHASC_LLM_MODEL ?? 'local-model'),
    apiKey: String(options.apiKey ?? env.IOHASC_LLM_API_KEY ?? ''),
    liveEnabled: (options.liveEnabled ?? env.IOHASC_E2E_REAL_LLM) === '1',
    nativeToolCallsEnabled: resolveWorkerNativeToolCallsEnabled(options),
  };
}

export function extractFirstJsonObject(text) {
  const trimmed = String(text ?? '').trim();
  const start = trimmed.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return null;
}

export function parseWorkerOutputFromModelText(text, input) {
  const jsonText = extractFirstJsonObject(text);

  if (!jsonText) {
    throw new Error('model response did not contain JSON object');
  }

  const parsed = JSON.parse(jsonText);
  return normalizeWorkerOutput(parsed, input);
}

export function normalizeWorkerOutput(raw, input) {
  const runId = typeof raw?.runId === 'string' && raw.runId.trim() !== ''
    ? raw.runId
    : input.runId;
  const taskId = typeof raw?.taskId === 'string' && raw.taskId.trim() !== ''
    ? raw.taskId
    : input.task.id;
  const rawStatus = typeof raw?.status === 'string' ? raw.status.trim() : '';
  let status = ['succeeded', 'failed', 'cancelled', 'needs_human'].includes(rawStatus)
    ? rawStatus
    : 'failed';

  if (status === 'failed' && ['ready', 'verify', 'done'].includes(rawStatus)) {
    status = 'succeeded';
  }

  const patchSummaryRaw = raw?.patchSummary;
  const patchSummary = typeof patchSummaryRaw === 'string'
    ? { changedFiles: [], summary: patchSummaryRaw }
    : {
      changedFiles: Array.isArray(patchSummaryRaw?.changedFiles) ? patchSummaryRaw.changedFiles : [],
      summary: String(patchSummaryRaw?.summary ?? raw?.summary ?? 'OpenAI-compatible worker response'),
    };

  return {
    schema: OUTPUT_SCHEMA,
    runId,
    taskId,
    status,
    patchSummary,
    evidence: Array.isArray(raw?.evidence) && raw.evidence.length > 0
      ? raw.evidence
      : [{
          kind: 'worker_run',
          source: 'openai-compatible',
          result: status === 'succeeded' ? 'succeeded' : 'failed',
          summary: String(raw?.patchSummary?.summary ?? raw?.summary ?? 'OpenAI-compatible worker run'),
        }],
    transitionRequest: {
      status: ['verify', 'done', 'blocked', 'ready'].includes(raw?.transitionRequest?.status)
        ? raw.transitionRequest.status
        : (status === 'succeeded' ? 'verify' : 'blocked'),
      reason: String(raw?.transitionRequest?.reason ?? raw?.failureReason ?? ''),
    },
    logs: Array.isArray(raw?.logs) ? raw.logs : [{ level: 'info', message: 'OpenAI-compatible worker completed' }],
    failureReason: String(raw?.failureReason ?? (status === 'succeeded' ? '' : 'model returned non-success status')),
    retryAdvice: String(raw?.retryAdvice ?? 'Retry with a model that supports structured JSON output.'),
  };
}

export async function runOpenAiCompatibleWorker(input, options = {}) {
  const validationError = validateOpenAiWorkerInput(input);
  if (validationError !== null) {
    return buildOpenAiFailureOutput(input, validationError, 'code_failure');
  }

  const env = resolveOpenAiProviderEnv(options);
  if (!env.liveEnabled && options.requireLive !== false) {
    return buildOpenAiFailureOutput(
      input,
      'OpenAI-compatible provider skipped: set IOHASC_E2E_REAL_LLM=1 for live path',
      'skipped',
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

  const prompt = buildWorkerPromptFromInput(input, { targetFileContents });
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return buildOpenAiFailureOutput(input, 'fetch is not available in this runtime', 'env_blocker');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (env.apiKey.trim() !== '') {
    headers.Authorization = `Bearer ${env.apiKey.trim()}`;
  }

  let response;
  try {
    response = await fetchImpl(`${env.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildOpenAiChatCompletionRequestBody(prompt, {
        ...options,
        input,
        env,
      })),
      signal: options.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildOpenAiFailureOutput(input, `OpenAI-compatible request failed: ${message}`, 'env_blocker');
  }

  if (!response.ok) {
    const body = await response.text();
    return buildOpenAiFailureOutput(
      input,
      `OpenAI-compatible HTTP ${response.status}: ${body.slice(0, 500)}`,
      'model_failure',
    );
  }

  const payload = await response.json();
  const message = payload?.choices?.[0]?.message;
  const content = message?.content;

  try {
    if (env.nativeToolCallsEnabled && Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
      return parseWorkerOutputFromToolCalls(message, input);
    }

    return parseWorkerOutputFromModelText(content, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildOpenAiFailureOutput(input, `Failed to parse model JSON: ${message}`, 'model_failure');
  }
}

export function buildWorkerInputWithRoleHandoff(task, options = {}) {
  const handoff = resolveRoleChainHandoff(task.ownerRole, options.handoff ?? {});
  return {
    runId: options.runId,
    policy: handoff.policy,
    providerHints: {
      provider: options.provider ?? 'openai-compatible',
      ...handoff.providerHints,
    },
    allowedTools: options.allowedTools,
    memorySlice: options.memorySlice,
  };
}

function validateOpenAiWorkerInput(input) {
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
    return 'openai-compatible provider MVP rejects shell/file-write policy flags';
  }

  return null;
}

function buildOpenAiFailureOutput(input, failureReason, failureClass) {
  const runId = typeof input?.runId === 'string' && input.runId.trim() !== '' ? input.runId : 'openai-invalid-input';
  const taskId = typeof input?.task?.id === 'string' && input.task.id.trim() !== '' ? input.task.id : '';

  return {
    schema: OUTPUT_SCHEMA,
    runId,
    taskId,
    status: failureClass === 'skipped' ? 'failed' : 'failed',
    patchSummary: {
      changedFiles: [],
      summary: failureClass === 'skipped'
        ? 'OpenAI-compatible provider skipped (contract-only mode).'
        : 'OpenAI-compatible provider failed before producing a patch summary.',
    },
    evidence: [{
      kind: 'worker_run',
      source: 'openai-compatible',
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
      ? 'Set IOHASC_E2E_REAL_LLM=1 and configure IOHASC_LLM_BASE_URL / IOHASC_LLM_MODEL.'
      : 'Verify endpoint availability and model JSON output quality, then retry.',
  };
}
