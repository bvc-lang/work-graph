import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  RECOVERY_ACTIONS,
  RECOVERY_PRESETS,
  buildRecoverySuggestionFromWorkerOutput,
  classifyFailure,
  suggestRecovery,
} from '../src/workGraphRecoveryPolicy.mjs';

describe('classifyFailure', () => {
  it('classifies env blockers', () => {
    assert.equal(classifyFailure({ status: 'failed', failureReason: 'Install Go toolchain' }), 'env_blocker');
  });

  it('classifies policy denial', () => {
    assert.equal(classifyFailure({ status: 'failed', failureReason: 'policy denied shell' }), 'policy_denied');
  });

  it('classifies no task', () => {
    assert.equal(classifyFailure(null, { noClaimableTask: true }), 'no_task');
  });
});

describe('suggestRecovery', () => {
  it('escalates after repeated failures', () => {
    const suggestion = suggestRecovery('model_failure', { retryCount: 2, maxRetries: 2 });
    assert.equal(suggestion.preset, RECOVERY_PRESETS.WORKER_FAILED_REPEATED);
    assert.equal(suggestion.action, RECOVERY_ACTIONS.ESCALATE_HUMAN);
  });

  it('blocks env failures', () => {
    const suggestion = suggestRecovery('env_blocker');
    assert.equal(suggestion.preset, RECOVERY_PRESETS.ENV_BLOCKER);
    assert.equal(suggestion.action, RECOVERY_ACTIONS.STAY_BLOCKED);
  });
});

describe('buildRecoverySuggestionFromWorkerOutput', () => {
  it('returns succeeded preset for successful worker output', () => {
    const suggestion = buildRecoverySuggestionFromWorkerOutput({ status: 'succeeded' }, { taskStatus: 'verify' });
    assert.equal(suggestion.preset, RECOVERY_PRESETS.SUCCEEDED);
    assert.equal(suggestion.action, RECOVERY_ACTIONS.STAY_VERIFY);
  });
});
