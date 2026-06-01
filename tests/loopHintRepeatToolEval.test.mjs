import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLoopHintPrompt,
  evaluateLoopHintModelResponse,
  evaluateRepeatToolCallLoopDeterministic,
  runLoopHintRepeatToolEval,
} from '../src/loopHintRepeatToolEval.mjs';

describe('loopHintRepeatToolEval', () => {
  it('detects repeated identical tool calls deterministically', () => {
    const result = evaluateRepeatToolCallLoopDeterministic();
    assert.equal(result.ok, true);
    assert.match(result.lastRecord.loopHint ?? '', /LOOP_HINT/u);
  });

  it('accepts model response that acknowledges LOOP_HINT', () => {
    const evaluation = evaluateLoopHintModelResponse(
      'LOOP_HINT received. I will stop repeating get_work_item and choose a different strategy.',
    );
    assert.equal(evaluation.ok, true);
  });

  it('rejects model response that repeats the same tool call', () => {
    const evaluation = evaluateLoopHintModelResponse(
      'I will call get_work_item again for ready-eval to verify.',
    );
    assert.equal(evaluation.ok, false);
  });

  it('builds prompt with LOOP_HINT text', () => {
    const prompt = buildLoopHintPrompt('⚠️ LOOP_HINT: duplicate get_work_item');
    assert.match(prompt, /LOOP_HINT/);
    assert.match(prompt, /stop repeating/i);
  });

  it('skips live LLM when env flag missing', async () => {
    const result = await runLoopHintRepeatToolEval({
      env: { IOHASC_E2E_REAL_LLM: '0' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.failureClass, 'skipped');
    assert.equal(result.deterministic.ok, true);
  });
});
