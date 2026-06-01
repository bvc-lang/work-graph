import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  agentToolLoopThresholdForTool,
  createAgentToolLoopTracker,
  stableAgentToolLoopKey,
} from '../src/agentToolLoopGuard.mjs';

describe('agentToolLoopGuard', () => {
  it('builds stable loop keys regardless of object key order', () => {
    const left = stableAgentToolLoopKey('get_work_item', { workId: 'ready-eval', mode: 'full' });
    const right = stableAgentToolLoopKey('get_work_item', { mode: 'full', workId: 'ready-eval' });
    assert.equal(left, right);
  });

  it('fires LOOP_HINT after threshold repeats', () => {
    const tracker = createAgentToolLoopTracker();
    const args = { workId: 'ready-eval' };
    tracker.record('get_work_item', args);
    const second = tracker.record('get_work_item', args);
    assert.equal(second.loopAborted, true);
    assert.match(second.loopHint ?? '', /LOOP_HINT/u);
    assert.equal(agentToolLoopThresholdForTool('get_work_item'), 2);
  });
});
