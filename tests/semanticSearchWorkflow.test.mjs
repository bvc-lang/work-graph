import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import {
  buildSemanticSearchDocuments,
  searchSemanticWorkflow,
  SEMANTIC_SEARCH_MODE_LEXICAL_V1,
  SEMANTIC_SEARCH_RESULT_SCHEMA,
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
  work.target_files: src/graphRagContextSlice.mjs
  trace.status: linked
]>

#Задача_beta<[
Базис:
  Unrelated billing basis.
Вектор:
  Billing vector.
Цель:
  Beta goal.

Метки:
  atom.profile: work_item
  work.id: beta-task
  work.title: Beta task
  work.status: backlog
  work.target_files: src/billing.mjs
  trace.status: pending
]>
`);

describe('buildSemanticSearchDocuments', () => {
  it('indexes work items and file artifacts with trace refs', () => {
    const documents = buildSemanticSearchDocuments(SAMPLE);

    assert.ok(documents.some((doc) => doc.id === 'work:alpha-task'));
    assert.ok(documents.some((doc) => doc.id === 'file:src/graphRagContextSlice.mjs'));
    assert.deepEqual(
      documents.find((doc) => doc.id === 'work:alpha-task')?.traceRefs,
      ['work:alpha-task'],
    );
  });
});

describe('searchSemanticWorkflow', () => {
  it('returns lexical hits with file and work trace refs', () => {
    const result = searchSemanticWorkflow('graph rag alpha', SAMPLE, { limit: 5 });

    assert.equal(result.schema, SEMANTIC_SEARCH_RESULT_SCHEMA);
    assert.equal(result.mode, SEMANTIC_SEARCH_MODE_LEXICAL_V1);
    assert.equal(result.embeddingsUsed, false);
    assert.ok(result.hitCount >= 1);
    assert.equal(result.hits[0].workId, 'alpha-task');
    assert.ok(result.hits[0].traceRefs.includes('work:alpha-task'));
  });

  it('returns empty result for blank query', () => {
    const result = searchSemanticWorkflow('  ', SAMPLE);
    assert.equal(result.hitCount, 0);
    assert.deepEqual(result.hits, []);
  });

  it('respects result limit', () => {
    const result = searchSemanticWorkflow('task', SAMPLE, { limit: 1 });
    assert.equal(result.hitCount, 1);
    assert.equal(result.truncated, true);
  });
});
