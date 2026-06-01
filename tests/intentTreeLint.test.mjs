import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { lintIntentTreeOrphans } from '../src/intentTreeLint.mjs';

const INDEX = `#Index<[
WorkItems:
  - indexed-task: intent/system/runtime/work/indexed-task.work.bvc
  - missing-task: intent/system/runtime/work/missing-task.work.bvc
]>
`;

describe('lintIntentTreeOrphans', () => {
  it('passes when index and files are aligned', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-intent-lint-ok-'));
    const intentRoot = join(cwd, 'intent/system/runtime/work');
    await mkdir(intentRoot, { recursive: true });
    await writeFile(join(cwd, 'intent/index.bvc'), `#Index<[
WorkItems:
  - indexed-task: intent/system/runtime/work/indexed-task.work.bvc
]>
`, 'utf8');
    await writeFile(join(intentRoot, 'indexed-task.work.bvc'), atomText('indexed-task'), 'utf8');

    try {
      const report = await lintIntentTreeOrphans({ cwd });
      assert.equal(report.ok, true);
      assert.equal(report.orphanFiles.length, 0);
      assert.equal(report.missingFiles.length, 0);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('reports orphan .work.bvc without index entry', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-intent-lint-orphan-'));
    const intentRoot = join(cwd, 'intent/system/runtime/work');
    await mkdir(intentRoot, { recursive: true });
    await writeFile(join(cwd, 'intent/index.bvc'), INDEX, 'utf8');
    await writeFile(join(intentRoot, 'indexed-task.work.bvc'), atomText('indexed-task'), 'utf8');
    await writeFile(join(intentRoot, 'orphan-task.work.bvc'), atomText('orphan-task'), 'utf8');

    try {
      const report = await lintIntentTreeOrphans({ cwd });
      assert.equal(report.ok, false);
      assert.ok(report.orphanFiles.some((row) => row.path.endsWith('orphan-task.work.bvc')));
      assert.ok(report.missingFiles.some((row) => row.workId === 'missing-task'));
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

function atomText(workId) {
  return `#Task<[
Метки:
  atom.profile: work_item
  work.id: ${workId}
  work.title: ${workId}
  work.status: backlog
]>
`;
}
