import { computeBacklogRevision, backlogRevisionChanged } from './backlogRevision.mjs';
import { createBacklogFileWatch } from './backlogFileWatch.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';

export const UI_EVENTS_STREAM_HEARTBEAT_MS = 25000;

/**
 * @param {{ debounceMs?: number, heartbeatMs?: number }} [options]
 */
export function createBacklogUiEventsHub(options = {}) {
  const heartbeatMs = options.heartbeatMs ?? UI_EVENTS_STREAM_HEARTBEAT_MS;
  /** @type {Set<import('node:http').ServerResponse>} */
  const clients = new Set();
  /** @type {import('node:http').ServerResponse[]} */
  const heartbeatTimers = new Map();
  /** @type {ReturnType<typeof createBacklogFileWatch> | null} */
  let fileWatch = null;
  /** @type {{ cwd: string, backlogPath?: string } | null} */
  let watchContext = null;
  /** @type {object | null} */
  let lastRevision = null;
  let refreshInFlight = null;

  function formatSseEvent(eventName, data) {
    return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  function removeClient(response) {
    clients.delete(response);
    const timer = heartbeatTimers.get(response);
    if (timer) {
      clearInterval(timer);
      heartbeatTimers.delete(response);
    }
  }

  function broadcast(eventName, data) {
    const payload = formatSseEvent(eventName, data);
    for (const client of clients) {
      try {
        client.write(payload);
      } catch {
        removeClient(client);
      }
    }
  }

  async function refreshRevision(ctx = watchContext) {
    if (!ctx?.cwd) {
      return null;
    }
    if (refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = (async () => {
      const items = await readWorkItemsFromRepo({
        cwd: ctx.cwd,
        backlogPath: ctx.backlogPath,
      });
      const next = computeBacklogRevision(items);
      if (backlogRevisionChanged(lastRevision, next)) {
        lastRevision = next;
        broadcast('backlog-revision', next);
      }
      return next;
    })().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  function start(ctx) {
    watchContext = {
      cwd: ctx.cwd,
      backlogPath: ctx.backlogPath,
    };
    if (fileWatch) {
      fileWatch.stop();
    }
    fileWatch = createBacklogFileWatch({
      cwd: ctx.cwd,
      debounceMs: options.debounceMs,
      onChange: () => {
        refreshRevision(watchContext).catch(() => undefined);
      },
    });
    fileWatch.start();
  }

  function stop() {
    fileWatch?.stop();
    fileWatch = null;
    watchContext = null;
  }

  function handleSse(request, response) {
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    });
    response.write(': connected\n\n');
    clients.add(response);

    const heartbeatTimer = setInterval(() => {
      try {
        response.write(': heartbeat\n\n');
      } catch {
        removeClient(response);
      }
    }, heartbeatMs);
    heartbeatTimers.set(response, heartbeatTimer);

    request.on('close', () => {
      removeClient(response);
    });

    if (lastRevision) {
      response.write(formatSseEvent('backlog-revision', lastRevision));
    }
  }

  async function ensureStarted(ctx) {
    if (!watchContext || watchContext.cwd !== ctx.cwd) {
      start(ctx);
    }
    return refreshRevision(ctx);
  }

  function dispose() {
    for (const response of clients) {
      try {
        response.end();
      } catch {
        // ignore
      }
    }
    clients.clear();
    for (const timer of heartbeatTimers.values()) {
      clearInterval(timer);
    }
    heartbeatTimers.clear();
    stop();
    lastRevision = null;
  }

  return {
    handleSse,
    ensureStarted,
    refreshRevision,
    broadcast,
    stop,
    dispose,
    getLastRevision: () => lastRevision,
    getClientCount: () => clients.size,
  };
}
