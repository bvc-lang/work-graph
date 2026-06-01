import {
  buildWorkerPromptFromInput,
  normalizeWorkerOutput,
} from './agentWorkerOpenAiProvider.mjs';

const INPUT_SCHEMA = 'agent-worker.input.v1';
const OUTPUT_SCHEMA = 'agent-worker.output.v1';

export function resolveCursorSdkProviderEnv(options = {}) {
  const env = options.env ?? process.env;
  return {
    enabled: (options.enabled ?? env.IOHASC_CURSOR_SDK_WORKER) === '1',
    workspaceRoot: String(options.workspaceRoot ?? env.IOHASC_CURSOR_SDK_WORKSPACE ?? process.cwd()).trim(),
    model: String(options.model ?? env.IOHASC_CURSOR_SDK_MODEL ?? 'default').trim(),
  };
}

export function buildCursorSdkAgentRequestFromInput(input, options = {}) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('input must be an object');
  }

  const env = resolveCursorSdkProviderEnv(options);
  const prompt = buildWorkerPromptFromInput(input, {
    targetFileContents: options.targetFileContents ?? '',
  });

  return {
    schema: 'cursor-sdk.worker.request.v1',
    runId: input.runId,
    taskId: input.task?.id ?? '',
    workspaceRoot: env.workspaceRoot,
    model: env.model,
    policy: { ...(input.policy ?? {}) },
    allowedTools: [...(input.allowedTools ?? [])],
    targetFiles: [...(input.targetFiles ?? [])],
    prompt,
    providerHints: { ...(input.providerHints ?? {}), provider: 'cursor-sdk' },
  };
}

export async function runCursorSdkWorker(input, options = {}) {
  const validationError = validateCursorSdkWorkerInput(input);
  if (validationError !== null) {
    return buildCursorSdkFailureOutput(input, validationError, 'code_failure');
  }

  const env = resolveCursorSdkProviderEnv(options);
  if (!env.enabled && options.requireLive !== false) {
    return buildCursorSdkFailureOutput(
      input,
      'Cursor SDK provider skipped: set IOHASC_CURSOR_SDK_WORKER=1 for live path',
      'skipped',
    );
  }

  const request = buildCursorSdkAgentRequestFromInput(input, options);
  const runAgent = options.runAgent;

  if (typeof runAgent !== 'function') {
    return buildCursorSdkFailureOutput(
      input,
      'Cursor SDK adapter is not configured in this runtime',
      'env_blocker',
    );
  }

  try {
    const agentResult = await runAgent(request, options);
    return normalizeCursorSdkWorkerOutput(agentResult, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildCursorSdkFailureOutput(input, `Cursor SDK worker failed: ${message}`, 'model_failure');
  }
}

export function normalizeCursorSdkWorkerOutput(raw, input) {
  if (raw && raw.schema === OUTPUT_SCHEMA) {
    return normalizeWorkerOutput(raw, input);
  }

  const normalized = normalizeWorkerOutput({
    schema: OUTPUT_SCHEMA,
    runId: raw?.runId ?? input.runId,
    taskId: raw?.taskId ?? input.task.id,
    status: raw?.status ?? 'succeeded',
    patchSummary: raw?.patchSummary ?? {
      changedFiles: raw?.changedFiles ?? [],
      summary: raw?.summary ?? 'Cursor SDK worker completed',
    },
    evidence: raw?.evidence,
    transitionRequest: raw?.transitionRequest,
    logs: raw?.logs,
    failureReason: raw?.failureReason ?? '',
    retryAdvice: raw?.retryAdvice ?? '',
  }, input);

  if (Array.isArray(normalized.evidence) && normalized.evidence.length > 0) {
    normalized.evidence = normalized.evidence.map((entry) => ({
      ...entry,
      source: entry.source === 'openai-compatible' ? 'cursor-sdk' : (entry.source ?? 'cursor-sdk'),
    }));
  }

  return normalized;
}

function validateCursorSdkWorkerInput(input) {
  if (!input || typeof input !== 'object') {
    return 'input must be an object';
  }

  if (input.schema !== INPUT_SCHEMA) {
    return `unsupported input schema: ${String(input.schema)}`;
  }

  if (!input.task || typeof input.task.id !== 'string' || input.task.id.trim() === '') {
    return 'task.id must be a non-empty string';
  }

  return null;
}

function buildCursorSdkFailureOutput(input, failureReason, failureClass) {
  const runId = typeof input?.runId === 'string' && input.runId.trim() !== '' ? input.runId : 'cursor-sdk-invalid-input';
  const taskId = typeof input?.task?.id === 'string' && input.task.id.trim() !== '' ? input.task.id : '';

  return {
    schema: OUTPUT_SCHEMA,
    runId,
    taskId,
    status: 'failed',
    patchSummary: {
      changedFiles: [],
      summary: failureClass === 'skipped'
        ? 'Cursor SDK provider skipped (env-gated mode).'
        : 'Cursor SDK provider failed before producing a patch summary.',
    },
    evidence: [{
      kind: 'worker_run',
      source: 'cursor-sdk',
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
      ? 'Set IOHASC_CURSOR_SDK_WORKER=1 and inject a Cursor SDK runAgent adapter.'
      : 'Verify Cursor SDK adapter availability and structured output mapping, then retry.',
  };
}
