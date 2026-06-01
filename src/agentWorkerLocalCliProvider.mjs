import { spawnSync } from 'node:child_process';

import { VERIFICATION_MATRIX } from './verificationLoop.mjs';

const INPUT_SCHEMA = 'agent-worker.input.v1';
const OUTPUT_SCHEMA = 'agent-worker.output.v1';

const ALLOWLISTED_COMMANDS = new Set(
  VERIFICATION_MATRIX
    .map((row) => row.command)
    .filter((command) => typeof command === 'string' && command.trim() !== '' && !command.startsWith('manual')),
);

export function resolveLocalCliProviderEnv(options = {}) {
  const env = options.env ?? process.env;
  return {
    enabled: (options.enabled ?? env.IOHASC_LOCAL_CLI_WORKER) === '1',
    cwd: String(options.cwd ?? env.IOHASC_LOCAL_CLI_CWD ?? process.cwd()).trim(),
    timeoutMs: Number(options.timeoutMs ?? env.IOHASC_LOCAL_CLI_TIMEOUT_MS ?? 900_000),
  };
}

export function resolveAllowlistedVerificationCommand(task) {
  if (!task || typeof task !== 'object') {
    return null;
  }

  const taskId = String(task.id ?? '').trim();
  if (taskId === '') {
    return null;
  }

  const matches = VERIFICATION_MATRIX.filter((row) => row.gateTaskIds.includes(taskId));
  if (matches.length === 0) {
    return null;
  }

  return matches.find((row) => ALLOWLISTED_COMMANDS.has(row.command)) ?? null;
}

export function assertAllowlistedCliCommand(command) {
  const normalized = String(command ?? '').trim();
  if (!ALLOWLISTED_COMMANDS.has(normalized)) {
    throw new Error(`command not in verification allowlist: ${normalized}`);
  }
  return normalized;
}

export function executeAllowlistedCliCommand(command, options = {}) {
  const allowlistedCommand = assertAllowlistedCliCommand(command);
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? defaultRunCommand;
  return runCommand(allowlistedCommand, { cwd, timeoutMs: options.timeoutMs ?? 900_000 });
}

export async function runLocalCliWorker(input, options = {}) {
  const validationError = validateLocalCliWorkerInput(input);
  if (validationError !== null) {
    return buildLocalCliFailureOutput(input, validationError, 'code_failure');
  }

  const env = resolveLocalCliProviderEnv(options);
  if (!env.enabled && options.requireLive !== false) {
    return buildLocalCliFailureOutput(
      input,
      'Local CLI provider skipped: set IOHASC_LOCAL_CLI_WORKER=1 for live path',
      'skipped',
    );
  }

  if (input.policy?.allowShell !== true) {
    return buildLocalCliFailureOutput(
      input,
      'Local CLI provider blocked: Worker Input policy.allowShell must be true',
      'blocked',
    );
  }

  const matrixRow = resolveAllowlistedVerificationCommand(input.task);
  if (!matrixRow) {
    return buildLocalCliFailureOutput(
      input,
      `No verification allowlist entry for task ${input.task.id}`,
      'blocked',
    );
  }

  try {
    const result = executeAllowlistedCliCommand(matrixRow.command, {
      cwd: options.cwd ?? env.cwd,
      timeoutMs: env.timeoutMs,
      runCommand: options.runCommand,
    });

    if (result.exitCode !== 0) {
      return buildLocalCliFailureOutput(
        input,
        `Allowlisted command failed (${matrixRow.command}): exit ${result.exitCode}`,
        'env_blocker',
        {
          command: matrixRow.command,
          verificationId: matrixRow.id,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      );
    }

    return {
      schema: OUTPUT_SCHEMA,
      runId: input.runId,
      taskId: input.task.id,
      status: 'succeeded',
      patchSummary: {
        changedFiles: [],
        summary: `Allowlisted verification command succeeded: ${matrixRow.command}`,
      },
      evidence: [{
        kind: 'verification_command',
        source: 'local-cli',
        result: 'succeeded',
        summary: `${matrixRow.id}: ${matrixRow.command}`,
        verificationId: matrixRow.id,
        command: matrixRow.command,
        exitCode: result.exitCode,
      }],
      transitionRequest: {
        status: 'verify',
        reason: `verification allowlist command passed (${matrixRow.id})`,
      },
      logs: [{
        level: 'info',
        message: `Executed allowlisted command ${matrixRow.command} with exit code ${result.exitCode}`,
      }],
      failureReason: '',
      retryAdvice: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildLocalCliFailureOutput(input, `Local CLI execution failed: ${message}`, 'env_blocker');
  }
}

function defaultRunCommand(command, options = {}) {
  const result = spawnSync(command, {
    cwd: options.cwd,
    encoding: 'utf8',
    shell: true,
    timeout: options.timeoutMs,
  });

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    signal: result.signal ?? null,
  };
}

function validateLocalCliWorkerInput(input) {
  if (!input || typeof input !== 'object') {
    return 'input must be an object';
  }

  if (input.schema !== INPUT_SCHEMA) {
    return `unsupported input schema: ${String(input.schema)}`;
  }

  if (!input.task || typeof input.task.id !== 'string' || input.task.id.trim() === '') {
    return 'task.id must be a non-empty string';
  }

  if (input.policy?.allowNetwork === true) {
    return 'local-cli provider MVP rejects allowNetwork policy flag';
  }

  if (input.policy?.allowFileWrite === true) {
    return 'local-cli provider MVP rejects allowFileWrite policy flag';
  }

  return null;
}

function buildLocalCliFailureOutput(input, failureReason, failureClass, details = {}) {
  const runId = typeof input?.runId === 'string' && input.runId.trim() !== '' ? input.runId : 'local-cli-invalid-input';
  const taskId = typeof input?.task?.id === 'string' && input.task.id.trim() !== '' ? input.task.id : '';

  return {
    schema: OUTPUT_SCHEMA,
    runId,
    taskId,
    status: 'failed',
    patchSummary: {
      changedFiles: [],
      summary: failureClass === 'skipped'
        ? 'Local CLI provider skipped (env-gated mode).'
        : 'Local CLI provider failed before producing verification evidence.',
    },
    evidence: [{
      kind: 'verification_command',
      source: 'local-cli',
      result: 'failed',
      summary: failureReason,
      failureClass,
      ...details,
    }],
    transitionRequest: {
      status: 'blocked',
      reason: failureReason,
    },
    logs: [{ level: failureClass === 'skipped' ? 'info' : 'error', message: failureReason }],
    failureReason,
    retryAdvice: failureClass === 'skipped'
      ? 'Set IOHASC_LOCAL_CLI_WORKER=1 and allowShell=true with a verification-matrix gate for the task.'
      : 'Fix verification command environment or choose a different provider, then retry.',
  };
}
