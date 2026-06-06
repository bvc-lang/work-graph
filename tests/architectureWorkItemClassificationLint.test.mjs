import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { loadArchitectureL1Canon } from '../src/architectureL1Canon.mjs';
import {
  lintArchitectureWorkItemClassification,
  suggestArchitectureBlockIdForWorkItem,
} from '../src/architectureWorkItemClassificationLint.mjs';
import { lintBacklogItems } from '../src/backlogSchemaLint.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRIPE_LIKE_FIXTURE = join('tests', 'fixtures', 'architecture-gripe-like', 'main.bvc');

describe('lintArchitectureWorkItemClassification', () => {
  it('warns on active tasks that do not map to canon L1 blocks', () => {
    const canon = loadArchitectureL1Canon(repoRoot, { canonPath: GRIPE_LIKE_FIXTURE });
    const [orphan] = parseWorkItems(`#Задача_orphan<[
Базис: Orphan.
Вектор: Orphan.
Цель: Orphan.
Метки:
  atom.profile: work_item
  work.id: gripe-meta-analytics-only
  work.title: Analytics only
  work.status: backlog
  work.department: domain-onebase
  work.target_files: work/analytics/some-note.md
  trace.status: pending
]>`);

    const report = lintArchitectureWorkItemClassification([orphan], {
      repoRoot,
      canonPath: GRIPE_LIKE_FIXTURE,
      canon,
    });

    assert.equal(report.unclassifiedCount, 1);
    assert.ok(report.issues.some((issue) => issue.code === 'architecture_unclassified'));
  });

  it('skips done tasks and reports invalid architecture.block_id', () => {
    const canon = loadArchitectureL1Canon(repoRoot, { canonPath: GRIPE_LIKE_FIXTURE });
    const [invalid, done] = parseWorkItems(`#Задача_invalid<[
Базис: Invalid.
Вектор: Invalid.
Цель: Invalid.
Метки:
  atom.profile: work_item
  work.id: invalid-block-id
  work.title: Invalid block
  work.status: backlog
  architecture.block_id: missing-block
  trace.status: pending
]>

#Задача_done<[
Базис: Done.
Вектор: Done.
Цель: Done.
Метки:
  atom.profile: work_item
  work.id: done-unclassified
  work.title: Done unclassified
  work.status: done
  work.target_files: work/analytics/some-note.md
  trace.status: pending
]>`);

    const report = lintArchitectureWorkItemClassification([invalid, done], {
      repoRoot,
      canonPath: GRIPE_LIKE_FIXTURE,
      canon,
    });

    assert.equal(report.invalidBlockIdCount, 1);
    assert.equal(report.unclassifiedCount, 0);
    assert.ok(report.issues.some((issue) => issue.code === 'architecture_invalid_block_id'));
  });

  it('feeds architecture warnings into backlog lint when repoRoot is provided', () => {
    const [orphan] = parseWorkItems(`#Задача_orphan<[
Базис: Orphan.
Вектор: Orphan.
Цель: Orphan.
Метки:
  atom.profile: work_item
  work.id: gripe-meta-analytics-only
  work.title: Analytics only
  work.status: backlog
  work.department: domain-onebase
  work.target_files: work/analytics/some-note.md
  migration.strategy: rebuild
  trace.status: pending
]>`);

    const report = lintBacklogItems([orphan], {
      repoRoot,
      canonPath: GRIPE_LIKE_FIXTURE,
    });

    assert.ok(report.issues.some((issue) => issue.code === 'architecture_unclassified'));
  });
});

describe('suggestArchitectureBlockIdForWorkItem', () => {
  it('suggests catalog-pipeline for Gripe-like target files', () => {
    const hint = suggestArchitectureBlockIdForWorkItem({
      id: 'import-zhivotnye-catalog-facets',
      department: 'domain-onebase',
      targetFiles: ['config/catalog-facets.php'],
    }, {
      repoRoot,
      canonPath: GRIPE_LIKE_FIXTURE,
    });

    assert.equal(hint?.status, 'suggested');
    assert.equal(hint?.blockId, 'catalog-pipeline');
    assert.match(hint?.hint, /architecture\.block_id/u);
  });

  it('returns unclassified hint when paths do not match canon', () => {
    const hint = suggestArchitectureBlockIdForWorkItem({
      id: 'gripe-meta-analytics-only',
      department: 'domain-onebase',
      targetFiles: ['work/analytics/some-note.md'],
    }, {
      repoRoot,
      canonPath: GRIPE_LIKE_FIXTURE,
    });

    assert.equal(hint?.status, 'unclassified');
    assert.match(hint?.hint, /architecture\.block_id/u);
  });
});
