import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildClaimNoEligiblePrompt,
  buildEmptyReadyQueueItems,
  evaluateClaimNextEmpty,
  evaluateClaimNoEligibleModelResponse,
  runClaimNoEligibleEval,
} from '../src/claimNoEligibleEval.mjs';

describe('claimNoEligibleEval', () => {
  it('verifies empty ready queue deterministically', () => {
    const items = buildEmptyReadyQueueItems();
    const result = evaluateClaimNextEmpty(items);
    assert.equal(result.ok, true);
    assert.deepEqual(result.readyQueue, []);
    assert.equal(result.claimNextResult, null);
  });

  it('accepts stop response without invented claim ids', () => {
    const items = buildEmptyReadyQueueItems();
    const evaluation = evaluateClaimNoEligibleModelResponse(
      'Ready queue is empty. No claimable WorkItem found. Stop and wait for operator.',
      { knownWorkIds: items.map((item) => item.id), readyQueue: [] },
    );
    assert.equal(evaluation.ok, true);
    assert.equal(evaluation.hasStopSignal, true);
  });

  it('rejects invented claim ids', () => {
    const evaluation = evaluateClaimNoEligibleModelResponse(
      'I will claim_work_item for invented-task-xyz and complete it.',
      { knownWorkIds: ['done-only-task', 'backlog-only-task'], readyQueue: [] },
    );
    assert.equal(evaluation.ok, false);
    assert.ok(evaluation.inventedClaimIds.length >= 1);
  });

  it('builds prompt with empty ready queue snapshot', () => {
    const items = buildEmptyReadyQueueItems();
    const prompt = buildClaimNoEligiblePrompt({ items, readyQueue: [], statusCounts: { done: 1, backlog: 1 } });
    assert.match(prompt, /ready queue is empty/i);
    assert.match(prompt, /"readyQueue": \[\]/);
  });

  it('skips live LLM when env flag missing', async () => {
    const result = await runClaimNoEligibleEval({
      env: { IOHASC_E2E_REAL_LLM: '0' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.failureClass, 'skipped');
    assert.equal(result.deterministic.ok, true);
  });
});
