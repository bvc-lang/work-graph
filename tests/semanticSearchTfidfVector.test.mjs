import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSemanticSearchDocuments, searchSemanticWorkflowAsync, SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1 } from '../src/semanticSearchWorkflow.mjs';
import { buildTfidfIndex, scoreTfidfCosine } from '../src/semanticSearchTfidfVector.mjs';

const ITEMS = [{
  id: 'gross-profit-gate',
  title: 'Gross profit verification gate',
  status: 'backlog',
  basis: 'Warehouse dimension for gross profit posting',
  vector: 'OneBase check integration',
  goal: 'Verify margin calculation',
  targetFiles: ['src/onebaseGrossProfitStaticVerify.mjs'],
  nextAction: 'implement',
  ownerRole: 'engineer',
  department: 'domain-onebase',
  priority: 'high',
  dependsOn: [],
  checks: [],
  evidence: [],
}];

describe('semanticSearchTfidfVector', () => {
  it('scores documents with tfidf cosine', () => {
    const documents = buildSemanticSearchDocuments(ITEMS);
    const index = buildTfidfIndex(documents);
    const scores = scoreTfidfCosine('warehouse margin posting', index);
    assert.ok(scores.length >= 1);
    assert.equal(scores[0].id, 'work:gross-profit-gate');
  });

  it('returns hybrid vector mode with embeddingsUsed flag', async () => {
    const result = await searchSemanticWorkflowAsync('warehouse margin', ITEMS, {
      mode: SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1,
      limit: 5,
    });
    assert.equal(result.mode, SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1);
    assert.equal(result.embeddingsUsed, true);
    assert.equal(result.vectorIndex, 'tfidf-v1');
    assert.ok(result.hitCount >= 1);
  });
});
