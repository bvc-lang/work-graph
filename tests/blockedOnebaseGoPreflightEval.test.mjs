import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateBlockedOnebaseGoPreflightDeterministic,
  evaluateOnebaseVerificationCommandGoPreflight,
  runBlockedOnebaseGoPreflightEval,
} from '../src/blockedOnebaseGoPreflightEval.mjs';

describe('blockedOnebaseGoPreflightEval', () => {
  it('marks OneBase gate blocked from backlog go evidence', () => {
    const result = evaluateBlockedOnebaseGoPreflightDeterministic();
    assert.equal(result.ok, true);
    assert.equal(result.onebaseRowStatus, 'blocked');
    assert.equal(result.onebaseGateStatus, 'blocked');
    assert.equal(result.blockedTaskStatus, 'blocked');
    assert.equal(result.preflightCommand, 'go version');
    assert.equal(result.keywordsOk, true);
  });

  it('returns go preflight failure without blocked=true on worker tool', () => {
    const result = evaluateOnebaseVerificationCommandGoPreflight();
    assert.equal(result.ok, true);
    assert.equal(result.result.reason, 'go preflight failed');
    assert.equal(result.result.command, 'go version');
    assert.equal(result.result.blocked, false);
    assert.match(result.result.stderr, /go not found/i);
  });

  it('runs full eval deterministically without live LLM', async () => {
    const result = await runBlockedOnebaseGoPreflightEval();
    assert.equal(result.ok, true);
    assert.equal(result.failureClass, null);
    assert.equal(result.live, null);
    assert.equal(result.deterministic.ok, true);
    assert.equal(result.verificationCommand.ok, true);
  });
});
