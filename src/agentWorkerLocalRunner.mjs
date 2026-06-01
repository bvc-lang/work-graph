import { pathToFileURL } from 'node:url';

import { readBvcTextFile } from './bvcFileFormat.mjs';
import { claimNext, parseWorkItems } from './workGraphRuntime.mjs';
import { buildGraphRagContextForWorkerInput } from './graphRagContextSlice.mjs';
import { buildMemoryWorkerSliceForTask } from './memoryWorkerSlice.mjs';
import {
  resolveOnebaseAllowedTools,
  runOnebaseWorkerPreflight,
} from './onebaseWorkerTools.mjs';
import { runGvmVerifyPreflight, isGvmVerifyEnabled } from './gvmVerifyWorkerGate.mjs';

const INPUT_SCHEMA = 'agent-worker.input.v1';
const OUTPUT_SCHEMA = 'agent-worker.output.v1';
const DEFAULT_BACKLOG_PATH = 'work/backlog.bvc';

export function buildWorkerInputFromTask(task, options = {}) {
  assertTask(task);

  const runId = options.runId ?? `local-${task.id}`;
  const policy = {
    mode: 'dry-run',
    allowShell: false,
    allowNetwork: false,
    allowFileWrite: false,
    timeoutMs: 0,
    ...(options.policy ?? {}),
  };

  const memorySlice = [...(options.memorySlice ?? [])];
  if (Array.isArray(options.workGraphItems) && options.workGraphItems.length > 0) {
    const memoryWorkerSlice = buildMemoryWorkerSliceForTask(
      options.workGraphItems,
      task.id,
      options.memoryWorker,
    );

    if (memoryWorkerSlice.recordCount > 0) {
      memorySlice.push(memoryWorkerSlice);
    }

    memorySlice.push(buildGraphRagContextForWorkerInput(
      options.workGraphItems,
      task.id,
      options.graphRag,
    ));
  }

  return {
    schema: INPUT_SCHEMA,
    runId,
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      department: task.department ?? '',
      labels: { ...(task.labels ?? {}) },
      checks: [...task.checks],
      evidence: [...task.evidence],
      dependsOn: [...task.dependsOn],
      targetFiles: [...task.targetFiles],
      traceStatus: task.traceStatus,
      nextAction: task.nextAction,
    },
    memorySlice,
    allowedTools: options.allowedTools ?? resolveOnebaseAllowedTools(task),
    targetFiles: [...task.targetFiles],
    policy,
    providerHints: {
      provider: 'local-runner',
      deterministic: true,
      ...(options.providerHints ?? {}),
    },
  };
}

export function createWorkerInputFromBacklogText(backlogText, options = {}) {
  const items = parseWorkItems(backlogText);
  const task = selectTask(items, options.taskId);

  if (task === null) {
    throw new Error(options.taskId === undefined ? 'no ready Work Graph task is claimable' : `task not found: ${options.taskId}`);
  }

  return buildWorkerInputFromTask(task, options);
}

export async function createWorkerInputFromBacklogFile(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const backlogPath = options.backlogPath ?? DEFAULT_BACKLOG_PATH;
  const backlogText = await readBvcTextFile(backlogPath, { cwd });
  return createWorkerInputFromBacklogText(backlogText, options);
}

export function runLocalWorker(input) {
  const validationError = validateWorkerInput(input);
  if (validationError !== null) {
    return buildFailureOutput(input, validationError);
  }

  if (input.policy.mode !== 'dry-run') {
    return buildFailureOutput(input, `unsupported local runner mode: ${input.policy.mode}`);
  }

  const onebasePreflight = runOnebaseWorkerPreflight(input.task, {
    policy: input.policy,
    onebaseRoot: input.providerHints?.onebaseRoot,
  });
  const gvmPreflight = runGvmVerifyPreflight({
    cwd: input.providerHints?.cwd,
    env: input.providerHints?.env,
  });

  const evidence = [
    {
      kind: 'worker_run',
      source: 'local-runner',
      result: 'succeeded',
      summary: `Dry-run accepted Work Graph task ${input.task.id}.`,
    },
    ...onebasePreflight.evidence,
    ...gvmPreflight.evidence,
  ];

  const onebaseSummary = onebasePreflight.skipped
    ? ''
    : ` OneBase preflight: metadata=${onebasePreflight.summary?.metadataTotal ?? 0}, staticVerify=${onebasePreflight.summary?.staticVerifyOk ? 'ok' : 'fail'}.`;
  const gvmSummary = isGvmVerifyEnabled({ env: input.providerHints?.env })
    ? ` GVM preflight: ${gvmPreflight.status}.`
    : '';

  return {
    schema: OUTPUT_SCHEMA,
    runId: input.runId,
    taskId: input.task.id,
    status: 'succeeded',
    patchSummary: {
      changedFiles: [],
      summary: `No files changed; local runner executed in deterministic dry-run mode.${onebaseSummary}${gvmSummary}`,
    },
    evidence,
    transitionRequest: {
      status: 'verify',
      reason: 'local runner dry-run completed',
    },
    logs: [
      {
        level: 'info',
        message: `Prepared task ${input.task.id} with ${input.targetFiles.length} target file(s).`,
      },
    ],
    failureReason: '',
    retryAdvice: '',
  };
}

export async function runLocalWorkerFromBacklogFile(options = {}) {
  return runLocalWorker(await createWorkerInputFromBacklogFile(options));
}

function selectTask(items, taskId) {
  if (taskId === undefined || taskId === '' || taskId === '--next') {
    return claimNext(items);
  }

  return items.find((item) => item.id === taskId) ?? null;
}

function validateWorkerInput(input) {
  if (!input || typeof input !== 'object') {
    return 'input must be an object';
  }

  if (input.schema !== INPUT_SCHEMA) {
    return `unsupported input schema: ${String(input.schema)}`;
  }

  if (typeof input.runId !== 'string' || input.runId.trim() === '') {
    return 'runId must be a non-empty string';
  }

  if (!input.task || typeof input.task.id !== 'string' || input.task.id.trim() === '') {
    return 'task.id must be a non-empty string';
  }

  if (!input.policy || input.policy.allowShell !== false || input.policy.allowNetwork !== false || input.policy.allowFileWrite !== false) {
    return 'local runner MVP requires shell, network and file writes to be disabled';
  }

  return null;
}

function buildFailureOutput(input, failureReason) {
  const runId = typeof input?.runId === 'string' && input.runId.trim() !== '' ? input.runId : 'local-invalid-input';
  const taskId = typeof input?.task?.id === 'string' && input.task.id.trim() !== '' ? input.task.id : '';

  return {
    schema: OUTPUT_SCHEMA,
    runId,
    taskId,
    status: 'failed',
    patchSummary: {
      changedFiles: [],
      summary: 'No files changed; local runner stopped before execution.',
    },
    evidence: [
      {
        kind: 'worker_run',
        source: 'local-runner',
        result: 'failed',
        summary: failureReason,
      },
    ],
    transitionRequest: {
      status: 'blocked',
      reason: failureReason,
    },
    logs: [{ level: 'error', message: failureReason }],
    failureReason,
    retryAdvice: 'Rebuild Worker Input v1 from the current Work Graph snapshot and retry in dry-run mode.',
  };
}

function assertTask(task) {
  if (!task || typeof task !== 'object' || typeof task.id !== 'string') {
    throw new TypeError('task must be a parsed WorkItem');
  }

  for (const field of ['checks', 'evidence', 'dependsOn', 'targetFiles']) {
    if (!Array.isArray(task[field])) {
      throw new TypeError('task must be a parsed WorkItem');
    }
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const taskId = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--'));
  const backlogFlagIndex = process.argv.indexOf('--backlog');
  const backlogPath = backlogFlagIndex === -1 ? DEFAULT_BACKLOG_PATH : process.argv[backlogFlagIndex + 1];
  const output = await runLocalWorkerFromBacklogFile({ taskId, backlogPath });

  console.log(JSON.stringify(output, null, 2));
  if (output.status !== 'succeeded') {
    process.exitCode = 1;
  }
}
