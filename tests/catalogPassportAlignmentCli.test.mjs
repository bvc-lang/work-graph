import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { checkCatalogPassportAlignment } from '../scripts/check-catalog-alignment.mjs';
import { validateCatalogPassportIntentAlignment } from '../src/intentHierarchy.mjs';

describe('checkCatalogPassportAlignment', () => {
  it('passes on aligned fixture intent tree', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-catalog-align-ok-'));
    const path = 'intent/system/runtime/work/indexed-task.work.bvc';
    await mkdir(join(cwd, 'intent/system/runtime/work'), { recursive: true });
    await writeFile(join(cwd, 'intent/index.bvc'), `#Index<[
WorkItems:
  - indexed-task: ${path}
]>
`, 'utf8');
    await writeFile(join(cwd, path), atomText('indexed-task'), 'utf8');

    try {
      const report = await checkCatalogPassportAlignment({ cwd });
      assert.equal(report.ok, true);
      assert.equal(report.mappingCount, 1);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('fails when index points to missing file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-catalog-align-bad-'));
    await mkdir(join(cwd, 'intent/system/runtime/work'), { recursive: true });
    await writeFile(join(cwd, 'intent/index.bvc'), `#Index<[
WorkItems:
  - missing-task: intent/system/runtime/work/missing-task.work.bvc
]>
`, 'utf8');

    try {
      const report = await checkCatalogPassportAlignment({ cwd });
      assert.equal(report.ok, false);
      assert.ok(report.errors.some((error) => error.includes('missing-task')));
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('validateCatalogPassportIntentAlignment', () => {
  it('reports missing intent files', async () => {
    const validation = await validateCatalogPassportIntentAlignment({
      mappings: [{ workId: 'x', intentPath: 'intent/missing.work.bvc', traceRefs: ['a'] }],
    }, { cwd: process.cwd() });

    assert.equal(validation.ok, false);
    assert.ok(validation.errors.length >= 1);
  });
});

function atomText(workId) {
  return `#Task<[
Метки:
  atom.profile: work_item
  work.id: ${workId}
  work.title: ${workId}
  work.status: backlog
  work.department: agent-platform
]>
`;
}
