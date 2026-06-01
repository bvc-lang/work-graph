export const RECOVERY_PRESETS = {
  WORKER_FAILED_FIRST: 'worker_failed_first',
  WORKER_FAILED_REPEATED: 'worker_failed_repeated',
  ENV_BLOCKER: 'env_blocker',
  VERIFICATION_FAILED: 'verification_failed',
  RATE_LIMIT_RETRY: 'rate_limit_retry',
  NO_CLAIMABLE_TASK: 'no_claimable_task',
  SUCCEEDED: 'succeeded',
};

export const RECOVERY_ACTIONS = {
  RETRY_READY: 'retry_ready',
  STAY_BLOCKED: 'stay_blocked',
  STAY_VERIFY: 'stay_verify',
  ESCALATE_HUMAN: 'escalate_human',
  NOOP: 'noop',
};

const DEFAULT_MAX_RETRIES = 2;

export function classifyFailure(output, context = {}) {
  if (context.noClaimableTask) {
    return 'no_task';
  }

  if (!output || output.status === 'succeeded') {
    return 'succeeded';
  }

  const reason = String(output.failureReason || output.transitionRequest?.reason || '').toLowerCase();

  if (reason.includes('go') || reason.includes('env') || reason.includes('eaddrinuse') || reason.includes('toolchain')) {
    return 'env_blocker';
  }

  if (reason.includes('policy') || reason.includes('denied') || reason.includes('unsupported')) {
    return 'policy_denied';
  }

  if (reason.includes('rate limit') || reason.includes('429')) {
    return 'rate_limit';
  }

  if (reason.includes('verify') || reason.includes('test:') || context.taskStatus === 'verify') {
    return 'verification_failed';
  }

  return 'model_failure';
}

export function suggestRecovery(failureClass, context = {}) {
  const retryCount = Number(context.retryCount ?? 0);
  const maxRetries = Number(context.maxRetries ?? DEFAULT_MAX_RETRIES);
  const taskStatus = context.taskStatus ?? '';

  if (failureClass === 'succeeded') {
    return {
      preset: RECOVERY_PRESETS.SUCCEEDED,
      action: taskStatus === 'verify' ? RECOVERY_ACTIONS.STAY_VERIFY : RECOVERY_ACTIONS.NOOP,
      reason: 'worker run succeeded',
      retryAdvice: '',
    };
  }

  if (failureClass === 'no_task') {
    return {
      preset: RECOVERY_PRESETS.NO_CLAIMABLE_TASK,
      action: RECOVERY_ACTIONS.NOOP,
      reason: 'no claimable ready task in snapshot',
      retryAdvice: 'add ready WorkItem or resolve dependencies',
    };
  }

  if (failureClass === 'env_blocker') {
    return {
      preset: RECOVERY_PRESETS.ENV_BLOCKER,
      action: RECOVERY_ACTIONS.STAY_BLOCKED,
      reason: 'environment blocker detected',
      retryAdvice: 'fix environment gate and rerun tick',
    };
  }

  if (failureClass === 'rate_limit') {
    return {
      preset: RECOVERY_PRESETS.RATE_LIMIT_RETRY,
      action: RECOVERY_ACTIONS.RETRY_READY,
      reason: 'rate limit detected; schedule retry with backoff',
      retryAdvice: 'wait and rerun daemon tick',
    };
  }

  if (failureClass === 'verification_failed') {
    return {
      preset: RECOVERY_PRESETS.VERIFICATION_FAILED,
      action: RECOVERY_ACTIONS.RETRY_READY,
      reason: 'verification gate failed',
      retryAdvice: 'fix failing verification command and rerun tick',
    };
  }

  if (retryCount >= maxRetries) {
    return {
      preset: RECOVERY_PRESETS.WORKER_FAILED_REPEATED,
      action: RECOVERY_ACTIONS.ESCALATE_HUMAN,
      reason: `worker failed ${retryCount + 1} times`,
      retryAdvice: 'review worker-run evidence and narrow task scope or switch provider',
    };
  }

  return {
    preset: RECOVERY_PRESETS.WORKER_FAILED_FIRST,
    action: failureClass === 'policy_denied' ? RECOVERY_ACTIONS.STAY_BLOCKED : RECOVERY_ACTIONS.RETRY_READY,
    reason: failureClass === 'policy_denied' ? 'worker policy denied execution' : 'first worker failure',
    retryAdvice: 'retry daemon tick after adjusting worker input or task scope',
  };
}

export function buildRecoverySuggestionFromWorkerOutput(output, context = {}) {
  const failureClass = classifyFailure(output, context);
  return {
    failureClass,
    ...suggestRecovery(failureClass, context),
  };
}
