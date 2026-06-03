import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLiveSyncCoordinator } from '../src/ui/liveSyncCoordinator.mjs';

describe('createLiveSyncCoordinator', () => {
  it('runs enabled scopes on schedule', () => {
    let now = 0;
    const ticks = [];
    const timers = [];
    const coordinator = createLiveSyncCoordinator({
      tickMs: 50,
      isDocumentHidden: () => false,
      setTimer: (fn, ms) => {
        const id = timers.length + 1;
        timers.push({ id, fn, at: now + ms });
        return id;
      },
      clearTimer: () => {},
    });

    coordinator.registerScope('board', {
      intervalMs: 100,
      enabled: () => true,
      onTick: () => ticks.push('board'),
    });

    coordinator.forceTick('board');
    assert.deepEqual(ticks, ['board']);
    coordinator.dispose();
  });

  it('skips disabled scopes', () => {
    const ticks = [];
    const coordinator = createLiveSyncCoordinator({
      tickMs: 10,
      setTimer: (fn) => {
        fn();
        return 1;
      },
      clearTimer: () => {},
    });

    coordinator.registerScope('analytics', {
      intervalMs: 100,
      enabled: () => false,
      onTick: () => ticks.push('analytics'),
    });

    coordinator.sync();
    assert.deepEqual(ticks, []);
    coordinator.dispose();
  });

  it('accepts hidden tab backoff configuration', () => {
    const coordinator = createLiveSyncCoordinator({
      hiddenTabBackoff: 4,
      isDocumentHidden: () => true,
      setTimer: () => 1,
      clearTimer: () => {},
    });
    coordinator.registerScope('home', {
      intervalMs: 100,
      onTick: () => {},
    });
    assert.equal(coordinator._scopes.get('home').intervalMs, 100);
    coordinator.dispose();
  });
});
