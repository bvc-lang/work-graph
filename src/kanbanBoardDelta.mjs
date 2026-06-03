export const KANBAN_BOARD_DELTA_SCHEMA = 'workgraph.kanban-board-delta.v1';

function buildWorkIdColumnMap(projection) {
  /** @type {Record<string, string>} */
  const map = Object.create(null);
  if (!projection?.columns) {
    return map;
  }
  for (const column of projection.columns) {
    for (const workId of column.workIds ?? []) {
      map[workId] = column.id;
    }
  }
  return map;
}

/**
 * @param {object | null | undefined} previousProjection
 * @param {object | null | undefined} nextProjection
 */
export function computeKanbanBoardDelta(previousProjection, nextProjection) {
  if (!previousProjection?.columns || !nextProjection?.columns) {
    return {
      schema: KANBAN_BOARD_DELTA_SCHEMA,
      fullRender: true,
      moves: [],
      adds: [],
      removes: [],
      updates: [],
    };
  }

  const prevMap = buildWorkIdColumnMap(previousProjection);
  const nextMap = buildWorkIdColumnMap(nextProjection);
  const workIds = new Set([...Object.keys(prevMap), ...Object.keys(nextMap)]);

  /** @type {Array<{ workId: string, fromColumnId: string, toColumnId: string }>} */
  const moves = [];
  /** @type {Array<{ workId: string, toColumnId: string }>} */
  const adds = [];
  /** @type {Array<{ workId: string, fromColumnId: string }>} */
  const removes = [];

  for (const workId of workIds) {
    const fromColumnId = prevMap[workId];
    const toColumnId = nextMap[workId];
    if (fromColumnId && !toColumnId) {
      removes.push({ workId, fromColumnId });
    } else if (!fromColumnId && toColumnId) {
      adds.push({ workId, toColumnId });
    } else if (fromColumnId && toColumnId && fromColumnId !== toColumnId) {
      moves.push({ workId, fromColumnId, toColumnId });
    }
  }

  return {
    schema: KANBAN_BOARD_DELTA_SCHEMA,
    fullRender: false,
    moves,
    adds,
    removes,
    updates: [],
  };
}
