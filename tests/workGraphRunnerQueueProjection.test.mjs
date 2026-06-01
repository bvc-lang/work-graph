import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildRunnerQueueProjectionFromItems,
  computeRunnerQueuePolicyHash,
  readRunnerQueueProjectionFromRepo,
  RUNNER_QUEUE_PROJECTION_SCHEMA,
  syncRunnerQueueProjectionToSqlite,
} from '../src/workGraphRunnerQueueProjection.mjs';

const SAMPLE_ITEMS = [
  { id: 'done-task', title: 'Done', status: 'done', dependsOn: [], priority: 'high' },
  { id: 'ready-task', title: 'Ready', status: 'ready', dependsOn: ['done-task'], priority: 'medium', ownerRole: 'feature_engineer' },
  { id: 'claimed-task', title: 'Claimed', status: 'claimed', dependsOn: ['done-task'], priority: 'low' },
];

describe('buildRunnerQueueProjectionFromItems', () => {
  it('builds runnable queue rows from snapshot items', () => {
    const projection = buildRunnerQueueProjectionFromItems(SAMPLE_ITEMS, {
      workerRuns: [{
        taskId: 'ready-task',
        runId: 'run-1',
        status: 'succeeded',
        provider: 'local-runner',
        recordedAt: '2026-05-29T12:00:00.000Z',
      }],
      recordedAt: '2026-05-29T12:00:00.000Z',
    });

    assert.equal(projection.schema, RUNNER_QUEUE_PROJECTION_SCHEMA);
    assert.equal(projection.summary.ready, 1);
    assert.equal(projection.summary.claimed, 1);
    const readyRow = projection.rows.find((row) => row.taskId === 'ready-task');
    assert.equal(readyRow.lastRunId, 'run-1');
    assert.equal(readyRow.providerId, 'local-runner');
    assert.ok(readyRow.policyHash);
  });

  it('excludes done tasks from runnable projection', () => {
    const projection = buildRunnerQueueProjectionFromItems(SAMPLE_ITEMS);
    assert.ok(!projection.rows.some((row) => row.taskId === 'done-task'));
  });
});

describe('computeRunnerQueuePolicyHash', () => {
  it('is stable for the same item fields', () => {
    const item = { id: 'ready-task', status: 'ready', dependsOn: ['done-task'], priority: 'medium' };
    assert.equal(computeRunnerQueuePolicyHash(item), computeRunnerQueuePolicyHash(item));
  });
});

describe('syncRunnerQueueProjectionToSqlite', () => {
  it('skips safely when dbPath missing or sqlite unavailable', async () => {
    const projection = buildRunnerQueueProjectionFromItems(SAMPLE_ITEMS);
    const skipped = await syncRunnerQueueProjectionToSqlite(projection);
    assert.equal(skipped.skipped, true);

    const dir = await mkdtemp(join(tmpdir(), 'wg-runner-queue-'));
    try {
      const result = await syncRunnerQueueProjectionToSqlite(projection, { dbPath: join(dir, 'queue.sqlite') });
      if (result.skipped) {
        assert.match(result.reason, /node:sqlite|sqlite/i);
      } else {
        assert.equal(result.ok, true);
        assert.equal(result.rowCount, projection.rows.length);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('readRunnerQueueProjectionFromRepo', () => {
  it('builds projection from backlog file and optional worker journal', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const dir = await mkdtemp(join(tmpdir(), 'wg-runner-queue-repo-'));

    try {
      await mkdir(join(dir, 'work'), { recursive: true });
      await writeFile(join(dir, 'work/backlog.bvc'), `#Задача_ready_task<[
Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready
  work.status: ready
  trace.status: pending
]>`, 'utf8');
      await writeFile(join(dir, 'work/worker-runs.jsonl'), `${JSON.stringify({
        runId: 'run-1',
        taskId: 'ready-task',
        status: 'succeeded',
        provider: 'local-runner',
        recordedAt: '2026-05-29T12:00:00.000Z',
      })}\n`, 'utf8');

      const projection = await readRunnerQueueProjectionFromRepo({
        cwd: dir,
        backlogPath: 'work/backlog.bvc',
        journalPath: 'work/worker-runs.jsonl',
      });

      assert.equal(projection.summary.ready, 1);
      assert.equal(projection.rows[0].lastRunId, 'run-1');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
