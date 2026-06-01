import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { readDaemonAuditJournal } from '../src/workGraphDaemonTick.mjs';
import { runWorkGraphDaemonWatch } from '../src/workGraphDaemonWatch.mjs';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'daemon-integration');

describe('runWorkGraphDaemonWatch', () => {
  it('runs bounded dry-run ticks and appends daemon audit journal', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-daemon-watch-'));
    const auditPath = 'work/daemon-audit.jsonl';

    try {
      const backlogText = await readFile(join(fixtureDir, 'backlog.bvc'), 'utf8');
      await mkdir(join(cwd, 'work'), { recursive: true });
      await writeFile(join(cwd, 'backlog.bvc'), backlogText, 'utf8');

      const output = await runWorkGraphDaemonWatch({
        cwd,
        backlogPath: 'backlog.bvc',
        auditPath,
        maxTicks: 2,
        intervalMs: 10,
        maxDurationMs: 3000,
        dryRun: true,
        writeJournal: true,
      });

      assert.equal(output.schema, 'workgraph.daemon.watch.output.v1');
      assert.equal(output.tickCount, 2);
      assert.equal(output.results.length, 2);
      assert.equal(output.results[0].skippedReason, 'dry_run');

      const auditEntries = await readDaemonAuditJournal({ cwd, auditPath });
      assert.ok(auditEntries.length >= 2);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
