const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const KANBAN_BOARD_PROJECTION_SCHEMA = 'workgraph.kanban-board-projection.v1';

export const KANBAN_BOARD_COLUMNS = [
  { id: 'backlog', title: 'Бэклог', statuses: ['backlog'] },
  { id: 'ready', title: 'Ready', statuses: ['ready'] },
  { id: 'in_progress', title: 'В работе', statuses: ['claimed', 'doing', 'in_progress', 'verify', 'blocked'] },
  { id: 'done', title: 'Завершено', statuses: ['done', 'verified'] },
];

function summarizeItem(item) {
  return {
    workId: item.id,
    title: item.title,
    status: item.status,
    department: item.department ?? '',
    priority: item.priority ?? '',
    ownerRole: item.ownerRole ?? '',
  };
}

export function buildKanbanBoardProjection(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const sortedItems = [...items].sort((left, right) => compareText(left.id, right.id));
  const statusCounts = Object.create(null);

  for (const item of sortedItems) {
    statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
  }

  const columns = KANBAN_BOARD_COLUMNS.map((column) => {
    const columnItems = sortedItems.filter((item) => column.statuses.includes(item.status));
    return {
      id: column.id,
      title: column.title,
      statuses: [...column.statuses],
      count: columnItems.length,
      workIds: columnItems.map((item) => item.id),
      items: options.includeItems === true ? columnItems.map(summarizeItem) : undefined,
    };
  });

  const columnCounts = Object.fromEntries(columns.map((column) => [column.id, column.count]));

  return {
    schema: KANBAN_BOARD_PROJECTION_SCHEMA,
    readOnly: true,
    dragEnabled: false,
    itemCount: sortedItems.length,
    statusCounts,
    columnCounts,
    columns,
  };
}
