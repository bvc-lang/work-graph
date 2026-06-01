import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBm25Index,
  mergeLexicalAndBm25Scores,
  scoreBm25,
  tokenizeForBm25,
} from '../src/semanticSearchBm25.mjs';

describe('semanticSearchBm25', () => {
  it('scores documents with shared query terms', () => {
    const documents = [
      {
        id: 'work:alpha',
        label: 'Alpha',
        summary: 'Graph RAG context slice',
        parts: [{ text: 'buildGraphRagSlice hybrid retrieval', weight: 1 }],
      },
      {
        id: 'work:beta',
        label: 'Beta',
        summary: 'Billing unrelated',
        parts: [{ text: 'invoice totals', weight: 1 }],
      },
    ];

    const index = buildBm25Index(documents);
    const scores = scoreBm25(tokenizeForBm25('graph rag hybrid'), index);
    assert.ok((scores.get('work:alpha') ?? 0) > (scores.get('work:beta') ?? 0));
  });

  it('merges lexical and bm25 scores', () => {
    const merged = mergeLexicalAndBm25Scores([
      { id: 'a', score: 2 },
      { id: 'b', score: 1 },
    ], new Map([['a', 0.5], ['b', 3]]), { bm25Weight: 2 });

    assert.equal(merged[0].id, 'b');
    assert.equal(merged[0].bm25Score, 3);
  });
});
