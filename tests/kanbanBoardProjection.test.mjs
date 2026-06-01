import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  KANBAN_BOARD_PROJECTION_SCHEMA,
  buildKanbanBoardProjection,
} from '../src/kanbanBoardProjection.mjs';

describe('buildKanbanBoardProjection', () => {
  it('groups items into backlog/ready/in_progress/done columns with counts', () => {
    const projection = buildKanbanBoardProjection([
      { id: 'a', title: 'A', status: 'backlog' },
      { id: 'b', title: 'B', status: 'ready' },
      { id: 'c', title: 'C', status: 'doing' },
      { id: 'd', title: 'D', status: 'done' },
      { id: 'e', title: 'E', status: 'verified' },
    ]);

    assert.equal(projection.schema, KANBAN_BOARD_PROJECTION_SCHEMA);
    assert.equal(projection.readOnly, true);
    assert.equal(projection.dragEnabled, false);
    assert.equal(projection.columnCounts.backlog, 1);
    assert.equal(projection.columnCounts.ready, 1);
    assert.equal(projection.columnCounts.in_progress, 1);
    assert.equal(projection.columnCounts.done, 2);
    assert.deepEqual(projection.columns.find((column) => column.id === 'ready')?.workIds, ['b']);
  });
});
