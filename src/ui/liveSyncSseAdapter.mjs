/**
 * Browser SSE adapter: revision events trigger liveSync coordinator ticks.
 * Poll scopes remain active as fallback when SSE is disconnected.
 *
 * @param {{ forceTick: (id: string) => void }} liveSync
 * @param {{ streamUrl?: string, scopeId?: string, reconnectMs?: number, setTimer?: Function, clearTimer?: Function, EventSourceImpl?: typeof EventSource }} [options]
 */
export function connectLiveSyncRevisionSse(liveSync, options = {}) {
  const streamUrl = options.streamUrl ?? '/api/ui-events/stream';
  const scopeId = options.scopeId ?? 'backlog-revision';
  const reconnectMs = options.reconnectMs ?? 5000;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((id) => clearTimeout(id));
  const EventSourceImpl = options.EventSourceImpl ?? (typeof EventSource === 'undefined' ? null : EventSource);

  if (!EventSourceImpl || !liveSync?.forceTick) {
    return { disconnect() {} };
  }

  /** @type {EventSource | null} */
  let source = null;
  /** @type {number | null} */
  let reconnectTimer = null;
  let closed = false;

  function connect() {
    if (closed) {
      return;
    }
    source = new EventSourceImpl(streamUrl);
    source.addEventListener('backlog-revision', () => {
      liveSync.forceTick(scopeId);
    });
    source.onerror = () => {
      if (source) {
        source.close();
        source = null;
      }
      if (!closed) {
        reconnectTimer = setTimer(connect, reconnectMs);
      }
    };
  }

  connect();

  return {
    disconnect() {
      closed = true;
      if (reconnectTimer != null) {
        clearTimer(reconnectTimer);
        reconnectTimer = null;
      }
      if (source) {
        source.close();
        source = null;
      }
    },
  };
}
