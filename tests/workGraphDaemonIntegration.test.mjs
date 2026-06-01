import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { runWorkGraphDaemonTickFromBacklogFile } from '../src/workGraphDaemonTick.mjs';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'daemon-integration');

describe('daemon integration fixtures', () => {
  it('runs success path: daemon tick delegates to live-loop on fixture backlog', async () => {
    const result = await runWorkGraphDaemonTickFromBacklogFile({
      cwd: fixtureDir,
      backlogPath: 'backlog.bvc',
      tickId: 'integration-success',
      runId: 'integration-run-success',
      recordedAt: '2026-05-29T12:00:00.000Z',
    });

    assert.equal(result.ok, true);
    assert.equal(result.selectedTaskId, 'daemon-fixture-ready');
    assert.equal(result.workerOutput?.status, 'succeeded');
    assert.equal(result.auditRecord.event, 'worker_run_finished');
    assert.equal(result.recoverySuggestion.preset, 'succeeded');
  });

  it('runs blocked path when worker policy is denied', async () => {
    const backlogText = await readFile(join(fixtureDir, 'backlog.bvc'), 'utf8');
    const { parseWorkItems } = await import('../src/workGraphRuntime.mjs');
    const { runWorkGraphDaemonTick } = await import('../src/workGraphDaemonTick.mjs');

    const result = await runWorkGraphDaemonTick(parseWorkItems(backlogText), {
      tickId: 'integration-blocked',
      runId: 'integration-run-blocked',
      recordedAt: '2026-05-29T12:00:01.000Z',
      workerInput: {
        policy: {
          mode: 'execute',
          allowShell: true,
          allowNetwork: true,
          allowFileWrite: true,
        },
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.workerOutput?.status, 'failed');
    assert.equal(result.auditRecord.event, 'tick_failed');
    assert.ok(result.recoverySuggestion.retryAdvice || result.workerOutput?.retryAdvice);
  });
});
