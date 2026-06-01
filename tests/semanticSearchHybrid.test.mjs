import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import {
  SEMANTIC_SEARCH_MODE_HYBRID_V1,
  searchSemanticWorkflowAsync,
} from '../src/semanticSearchWorkflow.mjs';

const SAMPLE = parseWorkItems(`#Задача_alpha<[
Базис:
  Semantic search alpha basis.
Вектор:
  Graph RAG vector path.
Цель:
  Alpha goal.

Метки:
  atom.profile: work_item
  work.id: alpha-task
  work.title: Alpha task
  work.status: ready
  work.target_files: src/semanticSearchWorkflow.mjs
  trace.status: linked
]>
`);

describe('searchSemanticWorkflowAsync hybrid mode', () => {
  it('returns hybrid hits with excerpt and bm25 scores from target file content', async () => {
    const result = await searchSemanticWorkflowAsync('buildSemanticSearchDocuments hybrid', SAMPLE, {
      mode: SEMANTIC_SEARCH_MODE_HYBRID_V1,
      cwd: process.cwd(),
      repoRoot: process.cwd(),
      limit: 5,
    });

    assert.equal(result.mode, SEMANTIC_SEARCH_MODE_HYBRID_V1);
    assert.ok(result.hitCount >= 1);
    const top = result.hits[0];
    assert.equal(top.workId, 'alpha-task');
    assert.ok(top.bm25Score >= 0);
    assert.ok(String(top.summary).includes('excerpt'));
  });
});
