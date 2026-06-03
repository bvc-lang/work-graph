import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildKanbanBoardProjection } from '../src/kanbanBoardProjection.mjs';
import { computeKanbanBoardDelta } from '../src/kanbanBoardDelta.mjs';

describe('computeKanbanBoardDelta', () => {
  const baseItems = [
    { id: 'task-a', status: 'backlog', title: 'A' },
    { id: 'task-b', status: 'ready', title: 'B' },
    { id: 'task-c', status: 'doing', title: 'C' },
  ];

  it('returns fullRender when a projection is missing', () => {
    const delta = computeKanbanBoardDelta(null, buildKanbanBoardProjection(baseItems));
    assert.equal(delta.fullRender, true);
    assert.equal(delta.moves.length, 0);
  });

  it('detects status change as column move', () => {
    const prev = buildKanbanBoardProjection(baseItems);
    const nextItems = baseItems.map((item) => (
      item.id === 'task-c' ? { ...item, status: 'done' } : item
    ));
    const next = buildKanbanBoardProjection(nextItems);
    const delta = computeKanbanBoardDelta(prev, next);

    assert.equal(delta.fullRender, false);
    assert.deepEqual(delta.moves, [{
      workId: 'task-c',
      fromColumnId: 'in_progress',
      toColumnId: 'done',
    }]);
    assert.deepEqual(delta.adds, []);
    assert.deepEqual(delta.removes, []);
  });

  it('detects new work item as add', () => {
    const prev = buildKanbanBoardProjection(baseItems);
    const next = buildKanbanBoardProjection([
      ...baseItems,
      { id: 'task-new', status: 'backlog', title: 'New' },
    ]);
    const delta = computeKanbanBoardDelta(prev, next);

    assert.deepEqual(delta.adds, [{ workId: 'task-new', toColumnId: 'backlog' }]);
    assert.deepEqual(delta.moves, []);
  });

  it('detects removed work item', () => {
    const prev = buildKanbanBoardProjection(baseItems);
    const next = buildKanbanBoardProjection(baseItems.filter((item) => item.id !== 'task-b'));
    const delta = computeKanbanBoardDelta(prev, next);

    assert.deepEqual(delta.removes, [{ workId: 'task-b', fromColumnId: 'ready' }]);
  });
});
