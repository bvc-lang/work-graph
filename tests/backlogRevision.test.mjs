import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backlogRevisionChanged, computeBacklogRevision } from '../src/backlogRevision.mjs';

describe('computeBacklogRevision', () => {
  it('is stable for the same corpus', () => {
    const items = [
      { id: 'b-task', status: 'backlog', labels: {} },
      { id: 'a-task', status: 'ready', labels: {} },
    ];
    const first = computeBacklogRevision(items);
    const second = computeBacklogRevision([...items].reverse());
    assert.equal(first.revision, second.revision);
    assert.equal(first.itemCount, 2);
  });

  it('changes when status changes', () => {
    const base = [{ id: 'task-1', status: 'backlog', labels: {} }];
    const changed = [{ id: 'task-1', status: 'done', labels: {} }];
    assert.notEqual(
      computeBacklogRevision(base).revision,
      computeBacklogRevision(changed).revision,
    );
  });

  it('detects revision change helper', () => {
    const a = computeBacklogRevision([{ id: 'x', status: 'backlog', labels: {} }]);
    const b = computeBacklogRevision([{ id: 'x', status: 'ready', labels: {} }]);
    assert.equal(backlogRevisionChanged(a, a), false);
    assert.equal(backlogRevisionChanged(a, b), true);
  });
});
