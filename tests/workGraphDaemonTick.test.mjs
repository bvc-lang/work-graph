import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  DAEMON_TICK_PHASES,
  appendDaemonAuditJournal,
  buildDaemonTickAuditRecord,
  readDaemonAuditJournal,
  readDaemonAuditTailResponse,
  runWorkGraphDaemonTick,
} from '../src/workGraphDaemonTick.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_BACKLOG = `#Задача_done_task<[
Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
]>

#Задача_ready_task<[
Базис:
  Ready
Вектор:
  Ready
Цель:
  Ready
Анализ:
  Fixture analysis
Решение:
  Verdict: useful
Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.depends_on: done-task
  work.target_files: src/workGraphDaemonTick.mjs
  work.decision.verdict: useful
]>
`;

describe('runWorkGraphDaemonTick', () => {
  it('runs observe->stop phases via live-loop', async () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const result = await runWorkGraphDaemonTick(items, { tickId: 'tick-1', runId: 'daemon-tick-1' });

    assert.equal(result.schema, 'workgraph.daemon.tick.output.v1');
    assert.equal(result.ok, true);
    assert.equal(result.selectedTaskId, 'ready-task');
    assert.deepEqual(result.phases.map((step) => step.phase), DAEMON_TICK_PHASES);
    assert.equal(result.recoverySuggestion.preset, 'succeeded');
  });

  it('skips when scheduler is paused', async () => {
    const result = await runWorkGraphDaemonTick(parseWorkItems(SAMPLE_BACKLOG), {
      tickId: 'tick-paused',
      schedulerPolicy: { paused: true },
    });

    assert.equal(result.skippedReason, 'scheduler_paused');
    assert.equal(result.auditRecord.event, 'tick_skipped');
  });

  it('supports dry-run schedule without worker execution', async () => {
    const result = await runWorkGraphDaemonTick(parseWorkItems(SAMPLE_BACKLOG), {
      tickId: 'tick-dry',
      schedulerPolicy: { dryRun: true },
    });

    assert.equal(result.skippedReason, 'dry_run');
    assert.equal(result.selectedTaskId, 'ready-task');
    assert.ok(!result.workerOutput);
  });
});

describe('daemon audit journal', () => {
  it('appends and reads audit records', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-daemon-audit-'));
    const auditPath = join(dir, 'daemon-audit.jsonl');

    try {
      const record = buildDaemonTickAuditRecord({
        tickId: 'tick-audit',
        event: 'worker_run_finished',
        taskId: 'ready-task',
        workerStatus: 'succeeded',
        recoveryClass: 'succeeded',
        summary: 'tick complete',
      });

      await appendDaemonAuditJournal(record, { auditPath });
      const entries = await readDaemonAuditJournal({ auditPath });

      assert.equal(entries.length, 1);
      assert.equal(entries[0].tickId, 'tick-audit');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('returns bounded tail response for operator API', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-daemon-tail-'));
    const auditPath = join(dir, 'daemon-audit.jsonl');

    try {
      for (let index = 0; index < 5; index += 1) {
        await appendDaemonAuditJournal(buildDaemonTickAuditRecord({
          tickId: `tick-${index}`,
          event: 'worker_run_finished',
          taskId: 'ready-task',
          summary: `entry ${index}`,
        }), { auditPath });
      }

      const tail = await readDaemonAuditTailResponse({ auditPath, limit: 3 });

      assert.equal(tail.schema, 'workgraph.daemon-audit.tail.v1');
      assert.equal(tail.totalCount, 5);
      assert.equal(tail.entries.length, 3);
      assert.equal(tail.truncated, true);
      assert.equal(tail.entries[0].tickId, 'tick-4');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
