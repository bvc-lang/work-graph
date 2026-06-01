import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { backfillTraceStatusVerified } from '../scripts/backfill-trace-status-verified.mjs';
import { readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';

describe('backfillTraceStatusVerified', () => {
  it('sets trace.status verified on done items that were pending', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-trace-backfill-'));
    await mkdir(join(cwd, 'intent'), { recursive: true });
    await writeFile(join(cwd, 'intent', 'index.bvc'), `index:
  - done-pending: intent/done-pending.work.bvc
`, 'utf8');
    await writeFile(join(cwd, 'intent', 'done-pending.work.bvc'), `#Задача_done_pending<[
Свидетельства:
  fixture.

Метки:
  atom.profile: work_item
  work.id: done-pending
  work.status: done
  trace.status: pending
]>
`, 'utf8');

    try {
      const report = await backfillTraceStatusVerified({ cwd });
      assert.equal(report.patchedCount, 1);
      const items = await readWorkItemsFromIntentTree({ cwd });
      assert.equal(items[0].labels['trace.status'], 'verified');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
