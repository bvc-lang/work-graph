import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runSemanticRuntimeStage2 } from '../src/semanticRuntimeStage2.mjs';

const FLOW = {
  schema: 'ir.flow.v1',
  nodes: [
    { id: 'start', kind: 'start' },
    { id: 'verify', kind: 'action' },
    { id: 'end', kind: 'end' },
  ],
  edges: [
    { from: 'start', to: 'verify' },
    { from: 'verify', to: 'end' },
  ],
};

describe('semanticRuntimeStage2', () => {
  it('runs barrier + evidence envelope with flow', () => {
    const result = runSemanticRuntimeStage2({
      taskId: 'heritage-pilot',
      flow: FLOW,
      factsBatch: { schema: 'workgraph.language-file-facts.batch.v1', facts: [] },
    });

    assert.equal(result.barrier.passed, true);
    assert.equal(result.evidence.kind, 'integrity');
    assert.equal(result.shannonMetrics.traceSteps, 3);
  });
});
