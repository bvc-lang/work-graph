/**
 * View-scoped live poll hub: one timer drives multiple scopes with independent intervals.
 * Hidden document tabs use a backoff multiplier on tick scheduling.
 */

const DEFAULT_TICK_MS = 1000;
const HIDDEN_TAB_BACKOFF = 4;

/**
 * @param {{
 *   tickMs?: number,
 *   hiddenTabBackoff?: number,
 *   isDocumentHidden?: () => boolean,
 *   setTimer?: (fn: Function, ms: number) => number,
 *   clearTimer?: (id: number) => void,
 * }} [options]
 */
export function createLiveSyncCoordinator(options = {}) {
  const tickMs = options.tickMs ?? DEFAULT_TICK_MS;
  const hiddenBackoff = options.hiddenTabBackoff ?? HIDDEN_TAB_BACKOFF;
  const isDocumentHidden = options.isDocumentHidden ?? (() => false);
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((id) => clearTimeout(id));

  /** @type {Map<string, { intervalMs: number, onTick: Function, enabled: () => boolean, lastRunAt: number }>} */
  const scopes = new Map();
  let timerId = null;

  function effectiveIntervalMs(intervalMs) {
    return isDocumentHidden() ? intervalMs * hiddenBackoff : intervalMs;
  }

  function scheduleNextTick() {
    if (timerId != null) {
      clearTimer(timerId);
      timerId = null;
    }

    let nextDelay = null;
    const now = Date.now();

    for (const scope of scopes.values()) {
      if (!scope.enabled()) {
        continue;
      }
      const dueIn = scope.lastRunAt + effectiveIntervalMs(scope.intervalMs) - now;
      const delay = Math.max(0, dueIn);
      if (nextDelay == null || delay < nextDelay) {
        nextDelay = delay;
      }
    }

    if (nextDelay == null) {
      return;
    }

    timerId = setTimer(() => {
      timerId = null;
      runDueScopes();
      scheduleNextTick();
    }, Math.max(tickMs, nextDelay));
  }

  function runDueScopes() {
    const now = Date.now();
    for (const scope of scopes.values()) {
      if (!scope.enabled()) {
        continue;
      }
      if (now - scope.lastRunAt >= effectiveIntervalMs(scope.intervalMs)) {
        scope.lastRunAt = now;
        scope.onTick();
      }
    }
  }

  function sync() {
    scheduleNextTick();
  }

  /**
   * @param {string} id
   * @param {{ intervalMs: number, onTick: Function, enabled?: () => boolean }} config
   */
  function registerScope(id, config) {
    scopes.set(id, {
      intervalMs: config.intervalMs,
      onTick: config.onTick,
      enabled: config.enabled ?? (() => true),
      lastRunAt: 0,
    });
    sync();
  }

  function unregisterScope(id) {
    scopes.delete(id);
    sync();
  }

  function forceTick(id) {
    const scope = scopes.get(id);
    if (!scope) {
      return;
    }
    scope.lastRunAt = Date.now();
    scope.onTick();
    sync();
  }

  function dispose() {
    if (timerId != null) {
      clearTimer(timerId);
      timerId = null;
    }
    scopes.clear();
  }

  return {
    registerScope,
    unregisterScope,
    forceTick,
    sync,
    dispose,
    _scopes: scopes,
  };
}
