import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { connectLiveSyncRevisionSse } from '../src/ui/liveSyncSseAdapter.mjs';

describe('connectLiveSyncRevisionSse', () => {
  it('forces liveSync tick on backlog-revision SSE event', () => {
    const ticks = [];
    const liveSync = { forceTick: (id) => ticks.push(id) };

    class MockEventSource {
      static instances = [];

      constructor(url) {
        this.url = url;
        this.listeners = new Map();
        MockEventSource.instances.push(this);
      }

      addEventListener(name, handler) {
        this.listeners.set(name, handler);
      }

      close() {}

      emit(name) {
        this.listeners.get(name)?.({ data: '{}' });
      }

      triggerError() {
        this.onerror?.(new Event('error'));
      }
    }

    const adapter = connectLiveSyncRevisionSse(liveSync, {
      EventSourceImpl: MockEventSource,
      setTimer: (fn) => {
        fn();
        return 1;
      },
      clearTimer: () => {},
    });

    assert.equal(MockEventSource.instances.length, 1);
    MockEventSource.instances[0].emit('backlog-revision');
    assert.deepEqual(ticks, ['backlog-revision']);

    adapter.disconnect();
  });

  it('degrades gracefully when EventSource is unavailable', () => {
    const adapter = connectLiveSyncRevisionSse(
      { forceTick: () => {} },
      { EventSourceImpl: null },
    );
    assert.doesNotThrow(() => adapter.disconnect());
  });
});
