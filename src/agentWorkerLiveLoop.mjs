import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildWorkerInputFromTask,
} from './agentWorkerLocalRunner.mjs';
import { loadAgentBehaviorRulesBundle } from './agentBehaviorRulesBundle.mjs';
import { buildWorkerInputWithRoleHandoff } from './agentWorkerOpenAiProvider.mjs';
import { AGENT_LOOP_PHASES } from './goldenPath.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import { runWorkerWithProvider } from './workGraphWorkerProvider.mjs';
import {
  WorkGraphPolicyError,
  claimNext,
  claimWorkItemWithLease,
  parseWorkItems,
  recordEvidence,
  transitionStatus,
} from './workGraphRuntime.mjs';
import { evaluateWorkItemExecutionGate } from './workItemExecutionGate.mjs';

export { AGENT_LOOP_PHASES as AGENT_LIVE_LOOP_PHASES };

const DEFAULT_JOURNAL_PATH = 'work/worker-runs.jsonl';

export function formatWorkerEvidenceLine(evidence, output) {
  if (typeof evidence === 'string') {
    return evidence.trim();
  }

  if (!evidence || typeof evidence !== 'object') {
    return `worker-run: runId=${output.runId} status=${output.status}`;
  }

  const parts = [
    'worker-run',
    `runId=${output.runId}`,
    evidence.kind ? `kind=${evidence.kind}` : '',
    evidence.source ? `source=${evidence.source}` : '',
    evidence.result ? `result=${evidence.result}` : '',
    evidence.summary ? `summary=${String(evidence.summary).trim()}` : '',
  ].filter(Boolean);

  return parts.join(' ');
}

export function buildWorkerRunSummary(output, loopMeta = {}) {
  return {
    runId: output.runId,
    taskId: output.taskId,
    status: output.status,
    provider: loopMeta.provider ?? 'local-runner',
    selectionMode: loopMeta.selectionMode ?? null,
    explicitProvider: loopMeta.explicitProvider ?? false,
    usedFallback: loopMeta.usedFallback ?? false,
    fallbackTrail: loopMeta.fallbackTrail ?? [],
    transitionProposal: output.transitionRequest ?? null,
    appliedTransition: loopMeta.appliedTransition ?? null,
    summary: output.patchSummary?.summary || output.failureReason || output.status,
    recordedAt: loopMeta.recordedAt ?? new Date(0).toISOString(),
  };
}

export function applyWorkerOutputToItem(item, output) {
  let current = item;
  const evidenceLines = Array.isArray(output.evidence) && output.evidence.length > 0
    ? output.evidence.map((entry) => formatWorkerEvidenceLine(entry, output))
    : [formatWorkerEvidenceLine(null, output)];

  for (const line of evidenceLines) {
    current = recordEvidence(current, line);
  }

  const transitionProposal = {
    status: output.transitionRequest?.status ?? (output.status === 'succeeded' ? 'verify' : 'blocked'),
    reason: output.transitionRequest?.reason ?? output.failureReason ?? '',
  };

  let appliedTransition = null;
  let transitionError = null;

  try {
    if (output.status === 'succeeded') {
      current = transitionStatus(current, transitionProposal.status, {
        reason: transitionProposal.reason,
      });
      appliedTransition = transitionProposal.status;
    } else {
      const blockerReason = transitionProposal.reason || output.failureReason || 'worker run failed';
      current = transitionStatus(current, 'blocked', {
        reason: blockerReason,
        blocker: blockerReason,
      });
      appliedTransition = 'blocked';
    }
  } catch (error) {
    transitionError = error instanceof WorkGraphPolicyError || error instanceof Error
      ? error.message
      : String(error);
  }

  return {
    updatedItem: current,
    transitionProposal,
    appliedTransition,
    transitionError,
  };
}

export async function runAgentWorkerLiveLoop(items, options = {}) {
  const steps = [];
  const pool = items.map(cloneItem);

  steps.push({ phase: 'observe', detail: 'read snapshot', itemCount: pool.length });

  const selected = options.taskId
    ? pool.find((item) => item.id === options.taskId)
    : claimNext(pool);

  if (!selected) {
    return {
      ok: false,
      error: 'no_claimable_task',
      steps,
      finalItems: pool,
    };
  }

  const gate = evaluateWorkItemExecutionGate(selected);
  if (!gate.allowed) {
    return {
      ok: false,
      error: gate.code,
      message: gate.message,
      taskId: selected.id,
      steps,
      finalItems: pool,
    };
  }

  const runId = options.runId ?? `live-loop-${selected.id}`;
  const claimResult = claimWorkItemWithLease(selected, {
    claimRunId: runId,
    targetStatus: 'claimed',
    nowMs: options.nowMs,
    leaseMs: options.claimLeaseMs,
  });

  if (!claimResult.ok) {
    return {
      ok: false,
      error: claimResult.error,
      taskId: selected.id,
      claimedBy: claimResult.claimedBy ?? null,
      leaseUntil: claimResult.leaseUntil ?? null,
      steps,
      finalItems: pool,
    };
  }

  steps.push({ phase: 'plan', detail: 'select task ' + selected.id, taskId: selected.id });

  let current = claimResult.item;
  replaceItem(pool, selected.id, current);
  steps.push({
    phase: 'claim',
    detail: claimResult.idempotent ? 'reuse active claim lease' : 'transition to claimed',
    taskId: current.id,
    status: current.status,
    claimRunId: claimResult.claimRunId,
    leaseUntil: claimResult.leaseUntil,
  });

  if (claimResult.idempotent && typeof options.runWorker !== 'function') {
    return {
      ok: true,
      taskId: current.id,
      steps,
      idempotentClaim: true,
      claimRunId: claimResult.claimRunId,
      leaseUntil: claimResult.leaseUntil,
      finalItems: pool,
    };
  }

  const explicitProvider = options.provider ?? null;
  const useRoleHandoff = explicitProvider === 'openai' || explicitProvider === 'openai-compatible';
  const handoffExtras = useRoleHandoff
    ? buildWorkerInputWithRoleHandoff(current, { runId, ...(options.handoff ?? {}) })
    : {};

  const behaviorBundle = options.behaviorRulesBundle ?? (
    options.skipBehaviorRules
      ? null
      : await loadAgentBehaviorRulesBundle({ cwd: options.cwd ?? process.cwd() })
  );

  const behaviorHints = behaviorBundle?.ok
    ? {
        behaviorRuleIds: behaviorBundle.ruleIds,
        behaviorRulesPrompt: behaviorBundle.promptSlice,
      }
    : {};

  const input = buildWorkerInputFromTask(current, {
    runId,
    policy: {
      mode: handoffExtras.policy?.mode ?? 'dry-run',
      allowShell: false,
      allowNetwork: false,
      allowFileWrite: false,
      timeoutMs: handoffExtras.policy?.timeoutMs ?? 0,
      ...(options.workerInput?.policy ?? {}),
    },
    workGraphItems: pool,
    graphRag: options.graphRag,
    providerHints: {
      ...(handoffExtras.providerHints ?? {}),
      ...behaviorHints,
      ...(options.workerInput?.providerHints ?? {}),
    },
    allowedTools: options.workerInput?.allowedTools,
    memorySlice: options.workerInput?.memorySlice,
  });

  let providerResult = null;
  let output;

  if (typeof options.runWorker === 'function') {
    output = options.runWorker(input);
    if (output && typeof output.then === 'function') {
      output = await output;
    }
  } else {
    providerResult = await runWorkerWithProvider(input, {
      provider: explicitProvider ?? undefined,
      providerOptions: options.providerOptions,
      selectionOptions: options.selectionOptions,
      enableFallback: options.enableFallback,
      maxFallbackAttempts: options.maxFallbackAttempts,
    });
    output = providerResult.output;
  }

  const resolvedProviderId = providerResult?.providerId ?? explicitProvider ?? 'local';
  const selectionMode = providerResult?.selectionRationale?.selectionMode ?? (explicitProvider ? 'explicit_provider' : 'capability_score');

  steps.push({
    phase: 'act',
    detail: providerResult?.usedFallback
      ? `run ${resolvedProviderId} worker after fallback`
      : explicitProvider
        ? `run ${explicitProvider} worker`
        : `run ${resolvedProviderId} worker (${selectionMode})`,
    taskId: current.id,
    workerStatus: output.status,
    providerId: resolvedProviderId,
    selectionMode,
    usedFallback: providerResult?.usedFallback ?? false,
  });

  const applied = applyWorkerOutputToItem(current, output);
  current = applied.updatedItem;
  replaceItem(pool, current.id, current);

  steps.push({
    phase: 'verify',
    detail: 'apply worker output evidence',
    evidenceCount: current.evidence.length,
  });

  steps.push({
    phase: 'record',
    detail: 'propose transition',
    transitionProposal: applied.transitionProposal,
    appliedTransition: applied.appliedTransition,
    transitionError: applied.transitionError,
  });

  steps.push({ phase: 'stop', detail: 'live loop complete', taskId: current.id });

  const recordedAt = options.recordedAt ?? new Date().toISOString();
  const workerRunSummary = buildWorkerRunSummary(output, {
    appliedTransition: applied.appliedTransition,
    recordedAt,
    provider: resolvedProviderId,
    selectionMode,
    explicitProvider: providerResult?.explicitProvider ?? Boolean(explicitProvider),
    usedFallback: providerResult?.usedFallback ?? false,
    fallbackTrail: providerResult?.fallbackTrail ?? [],
  });

  return {
    ok: output.status === 'succeeded' && applied.transitionError === null,
    error: applied.transitionError ?? (output.status === 'succeeded' ? null : output.failureReason),
    taskId: current.id,
    steps,
    workerInput: input,
    workerOutput: output,
    providerResult,
    transitionProposal: applied.transitionProposal,
    appliedTransition: applied.appliedTransition,
    transitionError: applied.transitionError,
    workerRunSummary,
    finalItems: pool,
  };
}

export async function runAgentWorkerLiveLoopFromBacklogText(backlogText, options = {}) {
  return runAgentWorkerLiveLoop(parseWorkItems(backlogText), options);
}

export async function runAgentWorkerLiveLoopFromBacklogFile(options = {}) {
  const items = await readWorkItemsFromRepo(options);
  return runAgentWorkerLiveLoop(items, options);
}

export async function readWorkerRunJournal(options = {}) {
  const journalPath = resolve(options.cwd ?? process.cwd(), options.journalPath ?? DEFAULT_JOURNAL_PATH);

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

export async function appendWorkerRunJournal(entry, options = {}) {
  const journalPath = resolve(options.cwd ?? process.cwd(), options.journalPath ?? DEFAULT_JOURNAL_PATH);
  await appendFile(journalPath, `${JSON.stringify(entry)}\n`, 'utf8');
  return journalPath;
}

function cloneItem(item) {
  return {
    ...item,
    dependsOn: [...item.dependsOn],
    targetFiles: [...item.targetFiles],
    evidence: [...item.evidence],
    checks: [...item.checks],
    labels: { ...item.labels },
  };
}

function replaceItem(pool, id, nextItem) {
  const index = pool.findIndex((item) => item.id === id);
  if (index === -1) {
    return pool;
  }

  pool[index] = nextItem;
  return pool;
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const options = {
    once: false,
    dryRun: true,
    writeJournal: true,
    taskId: undefined,
    provider: undefined,
    explicitProvider: false,
    backlogPath: undefined,
    journalPath: DEFAULT_JOURNAL_PATH,
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

    if (arg === '--provider') {
      options.provider = args[index + 1] ?? 'local';
      options.explicitProvider = true;
      index += 1;
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

    if (arg === '--journal') {
      options.journalPath = args[index + 1] ?? DEFAULT_JOURNAL_PATH;
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
    console.error('Usage: node src/agentWorkerLiveLoop.mjs --once [--provider local|openai] [--backlog path/to/backlog.bvc] [--journal work/worker-runs.jsonl] [taskId]');
    process.exitCode = 1;
  } else {
    const result = await runAgentWorkerLiveLoopFromBacklogFile({
      taskId: cli.taskId,
      backlogPath: cli.backlogPath,
      provider: cli.explicitProvider ? cli.provider : undefined,
      workerInput: cli.dryRun ? { policy: { mode: 'dry-run' } } : {},
    });

    if (cli.writeJournal && result.workerRunSummary) {
      await appendWorkerRunJournal(result.workerRunSummary, { journalPath: cli.journalPath });
    }

    console.log(JSON.stringify({
      ok: result.ok,
      taskId: result.taskId,
      error: result.error,
      appliedTransition: result.appliedTransition,
      transitionProposal: result.transitionProposal,
      workerRunSummary: result.workerRunSummary,
      steps: result.steps?.map((step) => step.phase),
    }, null, 2));

    if (!result.ok) {
      process.exitCode = 1;
    }
  }
}
