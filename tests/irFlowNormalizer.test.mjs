import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { executeIrFlowCfg } from '../src/irFlow/executeIrFlowCfg.mjs';
import { normalizeLlmIrDraft } from '../src/irFlow/llmIrNormalizer.mjs';

describe('llmIrNormalizer', () => {
  it('normalizes numbered prose into executable flow', () => {
    const result = normalizeLlmIrDraft({
      taskId: 'pilot',
      prose: '1. Parse backlog\n2. Run verify\n3. Close task',
    });

    assert.equal(result.validation.ok, true);
    assert.equal(result.flow.nodes.filter((node) => node.kind === 'action').length, 3);

    const execution = executeIrFlowCfg(result.flow);
    assert.equal(execution.status, 'completed');
  });

  it('uses deterministic stub mode without provider', () => {
    const result = normalizeLlmIrDraft({ prose: '- single step' });
    assert.equal(result.mode, 'deterministic-stub');
  });
});
