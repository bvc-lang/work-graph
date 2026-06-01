import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  AGENT_LIVE_LOOP_PHASES,
  appendWorkerRunJournal,
  applyWorkerOutputToItem,
  formatWorkerEvidenceLine,
  readWorkerRunJournal,
  runAgentWorkerLiveLoop,
  runAgentWorkerLiveLoopFromBacklogText,
} from '../src/agentWorkerLiveLoop.mjs';
import { runLocalWorker } from '../src/agentWorkerLocalRunner.mjs';
import { parseWorkItems, claimWorkItemWithLease } from '../src/workGraphRuntime.mjs';

const SAMPLE_BACKLOG = `#Задача_done_task<[
Базис:
  Done task.
Вектор:
  Finish dependency.
Цель:
  Dependency done.
Свидетельства:
  Dependency evidence.

Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
  trace.status: verified
]>

#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Run live loop.
Цель:
  Produce worker output.
Анализ:
  Fixture analysis for execution gate.
Решение:
  Verdict: useful

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.depends_on: done-task
  work.target_files: src/agentWorkerLiveLoop.mjs, tests/agentWorkerLiveLoop.test.mjs
  work.next_action: run-live-loop-once
  work.decision.verdict: useful
  trace.status: pending

критерии_готовности:
  - live loop completes
]>
`;

describe('formatWorkerEvidenceLine', () => {
  it('formats structured worker evidence', () => {
    const line = formatWorkerEvidenceLine({
      kind: 'worker_run',
      source: 'local-runner',
      result: 'succeeded',
      summary: 'Dry-run accepted.',
    }, { runId: 'run-1', status: 'succeeded' });

    assert.match(line, /worker-run/);
    assert.match(line, /runId=run-1/);
    assert.match(line, /result=succeeded/);
  });
});

describe('applyWorkerOutputToItem', () => {
  it('records evidence and applies verify transition on success', () => {
    const task = parseWorkItems(SAMPLE_BACKLOG).find((item) => item.id === 'ready-task');
    const output = runLocalWorker({
      schema: 'agent-worker.input.v1',
      runId: 'run-success',
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        checks: task.checks,
        evidence: task.evidence,
        dependsOn: task.dependsOn,
        targetFiles: task.targetFiles,
        traceStatus: task.traceStatus,
        nextAction: task.nextAction,
      },
      memorySlice: [],
      allowedTools: [],
      targetFiles: task.targetFiles,
      policy: {
        mode: 'dry-run',
        allowShell: false,
        allowNetwork: false,
        allowFileWrite: false,
        timeoutMs: 0,
      },
      providerHints: { provider: 'local-runner', deterministic: true },
    });

    const applied = applyWorkerOutputToItem(task, output);

    assert.equal(applied.updatedItem.status, 'verify');
    assert.ok(applied.updatedItem.evidence.length >= 1);
    assert.equal(applied.appliedTransition, 'verify');
    assert.equal(applied.transitionProposal.status, 'verify');
  });

  it('blocks task on failed worker output', () => {
    const task = parseWorkItems(SAMPLE_BACKLOG).find((item) => item.id === 'ready-task');
    const output = {
      schema: 'agent-worker.output.v1',
      runId: 'run-fail',
      taskId: task.id,
      status: 'failed',
      patchSummary: { changedFiles: [], summary: 'stopped' },
      evidence: [{ kind: 'worker_run', source: 'local-runner', result: 'failed', summary: 'policy denied' }],
      transitionRequest: { status: 'blocked', reason: 'policy denied' },
      logs: [],
      failureReason: 'policy denied',
      retryAdvice: 'retry dry-run',
    };

    const applied = applyWorkerOutputToItem(task, output);

    assert.equal(applied.updatedItem.status, 'blocked');
    assert.equal(applied.appliedTransition, 'blocked');
    assert.match(applied.updatedItem.blocker, /policy denied/);
  });
});

describe('runAgentWorkerLiveLoop', () => {
  it('blocks execution when analysis or useful verdict is missing', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG).map((item) =>
      item.id === 'ready-task'
        ? { ...item, analysis: '', labels: { ...item.labels, 'work.decision.verdict': '' } }
        : item,
    );

    const result = await runAgentWorkerLiveLoop(items, { runId: 'loop-blocked' });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'missing_analysis');
  });

  it('runs observe->stop phases and selects claimable task via claimNext', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const result = await runAgentWorkerLiveLoop(items, { runId: 'loop-success' });

    assert.equal(result.ok, true);
    assert.equal(result.taskId, 'ready-task');
    assert.deepEqual(result.steps.map((step) => step.phase), AGENT_LIVE_LOOP_PHASES);
    assert.equal(result.appliedTransition, 'verify');
    assert.equal(result.workerOutput.status, 'succeeded');

    const finalTask = result.finalItems.find((item) => item.id === 'ready-task');
    assert.equal(finalTask.status, 'verify');
    assert.ok(finalTask.evidence.some((line) => line.includes('worker-run')));
  });

  it('attaches behavior rule ids to worker input from rules bundle', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    let capturedInput = null;

    await runAgentWorkerLiveLoop(items, {
      runId: 'loop-behavior-rules',
      runWorker: (input) => {
        capturedInput = input;
        return runLocalWorker(input);
      },
    });

    assert.ok(Array.isArray(capturedInput.providerHints.behaviorRuleIds));
    assert.ok(capturedInput.providerHints.behaviorRuleIds.includes('worker-tool-policy'));
    assert.match(String(capturedInput.providerHints.behaviorRulesPrompt), /\[golden-path\]/);
  });

  it('auto-selects local provider when no explicit provider is given', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const result = await runAgentWorkerLiveLoop(items, { runId: 'loop-auto-provider' });

    assert.equal(result.providerResult.providerId, 'local');
    assert.equal(result.workerRunSummary.provider, 'local');
    assert.equal(result.workerRunSummary.explicitProvider, false);
  });

  it('records fallback evidence in worker run summary when openai fails', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const result = await runAgentWorkerLiveLoop(items, {
      runId: 'loop-fallback',
      provider: 'openai',
      providerOptions: {
        requireLive: false,
        fetch: async () => ({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => JSON.stringify({ error: { message: 'timeout contacting model' } }),
        }),
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.workerRunSummary.usedFallback, true);
    assert.equal(result.workerRunSummary.provider, 'local');
    assert.ok(result.workerRunSummary.fallbackTrail.length >= 1);
    assert.ok(result.workerOutput.evidence.some((entry) => entry.kind === 'provider_fallback'));
  });

  it('returns failure when worker policy is denied', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const result = await runAgentWorkerLiveLoop(items, {
      runId: 'loop-fail',
      workerInput: { policy: { allowShell: true } },
    });

    assert.equal(result.ok, false);
    assert.equal(result.workerOutput.status, 'failed');
    assert.equal(result.appliedTransition, 'blocked');

    const finalTask = result.finalItems.find((item) => item.id === 'ready-task');
    assert.equal(finalTask.status, 'blocked');
  });

  it('returns no_claimable_task when queue is empty', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG).map((item) =>
      item.id === 'ready-task' ? { ...item, status: 'backlog', labels: { ...item.labels, 'work.status': 'backlog' } } : item,
    );
    const result = await runAgentWorkerLiveLoop(items);

    assert.equal(result.ok, false);
    assert.equal(result.error, 'no_claimable_task');
  });

  it('rejects explicit second claim while lease is active', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const nowMs = Date.parse('2026-05-29T10:00:00.000Z');
    const [readyTask] = items.filter((item) => item.id === 'ready-task');
    const claimed = claimWorkItemWithLease(readyTask, { claimRunId: 'run-a', nowMs });
    const pool = items.map((item) => (item.id === 'ready-task' ? claimed.item : item));

    const second = await runAgentWorkerLiveLoop(pool, {
      taskId: 'ready-task',
      runId: 'run-b',
      nowMs: nowMs + 1000,
    });

    assert.equal(second.ok, false);
    assert.equal(second.error, 'claim_lease_active');
    assert.equal(second.claimedBy, 'run-a');
  });
});

describe('runAgentWorkerLiveLoopFromBacklogText', () => {
  it('selects next claimable task from backlog text', async () => {
    const result = await runAgentWorkerLiveLoopFromBacklogText(SAMPLE_BACKLOG, { runId: 'loop-text' });
    assert.equal(result.taskId, 'ready-task');
  });
});

describe('worker run journal', () => {
  it('appends and reads worker run summaries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-worker-runs-'));
    const journalPath = join(dir, 'worker-runs.jsonl');

    try {
      await appendWorkerRunJournal({ runId: 'run-1', taskId: 'ready-task', status: 'succeeded' }, { journalPath });
      await appendWorkerRunJournal({ runId: 'run-2', taskId: 'ready-task', status: 'failed' }, { journalPath });

      const entries = await readWorkerRunJournal({ journalPath });
      assert.equal(entries.length, 2);
      assert.equal(entries[0].runId, 'run-1');
      assert.equal(entries[1].status, 'failed');

      const fileText = await readFile(journalPath, 'utf8');
      assert.equal(fileText.trim().split('\n').length, 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('persists fallback metadata in worker run journal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-worker-runs-'));
    const journalPath = join(dir, 'worker-runs.jsonl');

    try {
      const result = await runAgentWorkerLiveLoop(parseWorkItems(SAMPLE_BACKLOG), {
        runId: 'journal-fallback',
        provider: 'openai',
        providerOptions: {
          requireLive: false,
          fetch: async () => ({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () => JSON.stringify({ error: { message: 'timeout contacting model' } }),
          }),
        },
      });

      await appendWorkerRunJournal(result.workerRunSummary, { journalPath });
      const entries = await readWorkerRunJournal({ journalPath });

      assert.equal(entries.length, 1);
      assert.equal(entries[0].usedFallback, true);
      assert.equal(entries[0].provider, 'local');
      assert.ok(entries[0].fallbackTrail.length >= 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('AGENT_LIVE_LOOP_PHASES', () => {
  it('matches agent-state-machine-v1 phase list', () => {
    assert.deepEqual(AGENT_LIVE_LOOP_PHASES, [
      'observe',
      'plan',
      'claim',
      'act',
      'verify',
      'record',
      'stop',
    ]);
  });
});
