/**
 * Minimal port of ioHasC agentToolLoopKey loop guard for Work Graph eval/runtime hooks.
 */

export const AGENT_TOOL_LOOP_THRESHOLD = 3;

function stableJsonFragment(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  const type = typeof value;
  if (type === 'boolean' || type === 'number') {
    return JSON.stringify(value);
  }
  if (type === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonFragment(entry)).join(',')}]`;
  }
  if (type === 'object') {
    const object = /** @type {Record<string, unknown>} */ (value);
    const keys = Object.keys(object).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJsonFragment(object[key])}`).join(',')}}`;
  }

  return JSON.stringify(String(value));
}

export function agentToolLoopThresholdForTool(toolName, options = {}) {
  const normalized = String(toolName ?? '').trim();
  let base = AGENT_TOOL_LOOP_THRESHOLD;

  if (normalized === 'claim_work_item' || normalized === 'get_work_item') {
    base = 2;
  } else if (normalized === 'get_pvrg_task_scope' || normalized === 'get_unified_linkage') {
    base = 2;
  } else if (normalized.startsWith('agentWorkGraph')) {
    base = 2;
  }

  if (
    options.isWeakModel === true
    && typeof options.maxSameToolCallsWeak === 'number'
    && options.maxSameToolCallsWeak >= 1
  ) {
    return Math.min(base, options.maxSameToolCallsWeak);
  }

  return base;
}

export function stableAgentToolLoopKey(toolName, rawArgs) {
  const normalized = String(toolName ?? '').trim();
  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
    ? rawArgs
    : {};
  return `${normalized}:${stableJsonFragment(args)}`;
}

export function formatAgentToolDuplicateInvocationLoopHint(toolName, loopStreak) {
  return `⚠️ LOOP_HINT: инструмент «${toolName}» с теми же аргументами повторён ${loopStreak} раз за этот ход (включая вызовы не подряд). Измени аргументы, выбери другой инструмент или ответь текстом; не зацикливай один и тот же вызов.`;
}

export function createAgentToolLoopTracker(options = {}) {
  const counts = new Map();

  return {
    record(toolName, rawArgs) {
      const key = stableAgentToolLoopKey(toolName, rawArgs);
      const nextCount = (counts.get(key) ?? 0) + 1;
      counts.set(key, nextCount);
      const threshold = agentToolLoopThresholdForTool(toolName, options);
      const loopAborted = nextCount >= threshold;
      return {
        key,
        loopStreak: nextCount,
        threshold,
        loopAborted,
        loopHint: loopAborted ? formatAgentToolDuplicateInvocationLoopHint(toolName, nextCount) : null,
      };
    },
    snapshot() {
      return Object.fromEntries(counts.entries());
    },
  };
}
