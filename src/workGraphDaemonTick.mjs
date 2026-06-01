import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  appendWorkerRunJournal,
  runAgentWorkerLiveLoop,
} from './agentWorkerLiveLoop.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import { buildRecoverySuggestionFromWorkerOutput } from './workGraphRecoveryPolicy.mjs';

export const DAEMON_TICK_PHASES = ['observe', 'schedule', 'run', 'recovery', 'audit', 'stop'];

const TICK_OUTPUT_SCHEMA = 'workgraph.daemon.tick.output.v1';
export const DAEMON_AUDIT_TAIL_SCHEMA = 'workgraph.daemon-audit.tail.v1';
const DEFAULT_AUDIT_PATH = 'work/daemon-audit.jsonl';
const DEFAULT_WORKER_RUNS_PATH = 'work/worker-runs.jsonl';
const DEFAULT_AUDIT_TAIL_LIMIT = 24;
const MAX_AUDIT_TAIL_LIMIT = 200;

export function buildDaemonTickAuditRecord(tickMeta) {
  return {
    tickId: tickMeta.tickId,
    event: tickMeta.event,
    taskId: tickMeta.taskId ?? '',
    workerStatus: tickMeta.workerStatus ?? '',
    recoveryClass: tickMeta.recoveryClass ?? '',
    summary: tickMeta.summary ?? '',
    recordedAt: tickMeta.recordedAt ?? new Date().toISOString(),
  };
}

export async function runWorkGraphDaemonTick(items, options = {}) {
  const tickId = options.tickId ?? `tick-${Date.now()}`;
  const phases = [];
  const schedulerPolicy = {
    paused: false,
    dryRun: false,
    ...(options.schedulerPolicy ?? {}),
  };

  phases.push({ phase: 'observe', detail: 'read snapshot', itemCount: items.length });

  if (schedulerPolicy.paused) {
    phases.push({ phase: 'schedule', detail: 'scheduler paused', skipped: true });
    phases.push({ phase: 'stop', detail: 'tick skipped' });
    return buildTickOutput({
      ok: true,
      tickId,
      phases,
      skippedReason: 'scheduler_paused',
      auditRecord: buildDaemonTickAuditRecord({
        tickId,
        event: 'tick_skipped',
        summary: 'scheduler paused',
        recordedAt: options.recordedAt,
      }),
    });
  }

  const loopOptions = {
    taskId: options.taskId,
    runId: options.runId ?? `daemon-${tickId}`,
    workerInput: options.workerInput,
    runWorker: options.runWorker,
    provider: options.provider,
    providerOptions: options.providerOptions,
    selectionOptions: options.selectionOptions,
    enableFallback: options.enableFallback,
    maxFallbackAttempts: options.maxFallbackAttempts,
    recordedAt: options.recordedAt,
  };

  if (schedulerPolicy.dryRun) {
    const pool = cloneItems(items);
    const selected = options.taskId
      ? pool.find((item) => item.id === options.taskId)
      : pool.find((item) => item.status === 'ready');

    phases.push({
      phase: 'schedule',
      detail: selected ? `dry-run selected ${selected.id}` : 'no task selected',
      taskId: selected?.id,
    });
    phases.push({ phase: 'stop', detail: 'dry-run complete' });

    return buildTickOutput({
      ok: true,
      tickId,
      phases,
      selectedTaskId: selected?.id ?? null,
      skippedReason: selected ? 'dry_run' : 'no_claimable_task',
      auditRecord: buildDaemonTickAuditRecord({
        tickId,
        event: 'tick_skipped',
        taskId: selected?.id,
        summary: selected ? 'dry-run schedule only' : 'no claimable task',
        recordedAt: options.recordedAt,
      }),
      recoverySuggestion: buildRecoverySuggestionFromWorkerOutput(null, {
        noClaimableTask: !selected,
      }),
    });
  }

  phases.push({ phase: 'schedule', detail: 'delegate to live-loop claimNext policy' });

  const loopResult = await runAgentWorkerLiveLoop(items, loopOptions);

  phases.push({
    phase: 'run',
    detail: 'live-loop worker run',
    taskId: loopResult.taskId,
    workerStatus: loopResult.workerOutput?.status,
    ok: loopResult.ok,
  });

  const recoverySuggestion = buildRecoverySuggestionFromWorkerOutput(loopResult.workerOutput ?? null, {
    noClaimableTask: loopResult.error === 'no_claimable_task',
    retryCount: options.retryCount,
    maxRetries: options.maxRetries,
    taskStatus: loopResult.finalItems?.find((item) => item.id === loopResult.taskId)?.status,
  });

  phases.push({
    phase: 'recovery',
    detail: recoverySuggestion.preset,
    action: recoverySuggestion.action,
  });

  const auditRecord = buildDaemonTickAuditRecord({
    tickId,
    event: loopResult.ok ? 'worker_run_finished' : 'tick_failed',
    taskId: loopResult.taskId,
    workerStatus: loopResult.workerOutput?.status,
    recoveryClass: recoverySuggestion.failureClass,
    summary: loopResult.workerOutput?.patchSummary?.summary || loopResult.error || recoverySuggestion.reason,
    recordedAt: options.recordedAt,
  });

  phases.push({ phase: 'audit', detail: 'build audit record', event: auditRecord.event });
  phases.push({ phase: 'stop', detail: 'tick complete', taskId: loopResult.taskId });

  return buildTickOutput({
    ok: loopResult.ok,
    tickId,
    phases,
    selectedTaskId: loopResult.taskId ?? null,
    error: loopResult.error,
    workerOutput: loopResult.workerOutput,
    workerRunSummary: loopResult.workerRunSummary,
    auditRecord,
    recoverySuggestion,
    finalItems: loopResult.finalItems,
  });
}

export async function runWorkGraphDaemonTickFromBacklogFile(options = {}) {
  const items = await readWorkItemsFromRepo(options);
  return runWorkGraphDaemonTick(items, options);
}

export async function appendDaemonAuditJournal(entry, options = {}) {
  const journalPath = resolve(options.cwd ?? process.cwd(), options.auditPath ?? DEFAULT_AUDIT_PATH);
  await appendFile(journalPath, `${JSON.stringify(entry)}\n`, 'utf8');
  return journalPath;
}

export async function readDaemonAuditJournal(options = {}) {
  const journalPath = resolve(options.cwd ?? process.cwd(), options.auditPath ?? DEFAULT_AUDIT_PATH);

  try {
    const text = await readFile(journalPath, 'utf8');
    return text
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export async function readDaemonAuditTailResponse(options = {}) {
  const limitRaw = options.limit;
  const limit = Number.isInteger(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, MAX_AUDIT_TAIL_LIMIT)
    : DEFAULT_AUDIT_TAIL_LIMIT;
  const auditPath = options.auditPath ?? DEFAULT_AUDIT_PATH;
  const entries = await readDaemonAuditJournal({ ...options, auditPath });

  return {
    schema: DAEMON_AUDIT_TAIL_SCHEMA,
    journalPath: auditPath,
    limit,
    totalCount: entries.length,
    truncated: entries.length > limit,
    entries: entries.slice(-limit).reverse(),
  };
}

function buildTickOutput(fields) {
  return {
    schema: TICK_OUTPUT_SCHEMA,
    ...fields,
  };
}

function cloneItems(items) {
  return items.map((item) => ({
    ...item,
    dependsOn: [...item.dependsOn],
    evidence: [...item.evidence],
    checks: [...item.checks],
    labels: { ...item.labels },
  }));
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const options = {
    once: false,
    dryRun: false,
    paused: false,
    writeJournal: true,
    taskId: undefined,
    backlogPath: undefined,
    auditPath: DEFAULT_AUDIT_PATH,
    workerRunsPath: DEFAULT_WORKER_RUNS_PATH,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--once') {
      options.once = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--paused') {
      options.paused = true;
      continue;
    }

    if (arg === '--no-journal') {
      options.writeJournal = false;
      continue;
    }

    if (arg === '--backlog') {
      options.backlogPath = args[index + 1];
      index += 1;
      continue;
    }

    if (!arg.startsWith('--') && options.taskId === undefined) {
      options.taskId = arg;
    }
  }

  return options;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cli = parseCliArgs(process.argv);

  if (!cli.once) {
    console.error('Usage: node src/workGraphDaemonTick.mjs --once [--dry-run] [--paused] [--backlog path/to/backlog.bvc] [taskId]');
    process.exitCode = 1;
  } else {
    const result = await runWorkGraphDaemonTickFromBacklogFile({
      taskId: cli.taskId,
      backlogPath: cli.backlogPath,
      schedulerPolicy: { paused: cli.paused, dryRun: cli.dryRun },
    });

    if (cli.writeJournal && result.auditRecord) {
      await appendDaemonAuditJournal(result.auditRecord, { auditPath: cli.auditPath });
    }

    if (cli.writeJournal && result.workerRunSummary && !cli.dryRun && !cli.paused) {
      await appendWorkerRunJournal(result.workerRunSummary, { journalPath: cli.workerRunsPath });
    }

    console.log(JSON.stringify({
      ok: result.ok,
      tickId: result.tickId,
      selectedTaskId: result.selectedTaskId,
      skippedReason: result.skippedReason,
      recoverySuggestion: result.recoverySuggestion,
      phases: result.phases?.map((step) => step.phase),
    }, null, 2));

    if (!result.ok && result.skippedReason !== 'dry_run' && result.skippedReason !== 'scheduler_paused') {
      process.exitCode = 1;
    }
  }
}
