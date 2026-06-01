const architectureViewsCompareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const ARCHITECTURE_L1_GROUP_LABELS = {
  domains: 'Домены',
};

/**
 * @param {{ group?: string }} block
 */
export function getArchitectureBlockGroupLabel(block) {
  const group = block?.group ?? '';
  return ARCHITECTURE_L1_GROUP_LABELS[group] ?? '';
}

/**
 * Row/detail title — block title only; L1 group is shown separately in the list section header.
 * @param {{ id?: string, title?: string }} block
 */
export function formatArchitectureBlockDisplayTitle(block) {
  return block?.title ?? block?.id ?? '';
}

function mermaidNodeId(blockId) {
  return String(blockId).replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeMermaidLabel(value) {
  return String(value ?? '').replace(/"/g, "'").replace(/\[/g, '(').replace(/\]/g, ')');
}

/**
 * @param {{ blocks?: Array<{ id: string, title?: string }>, edges?: Array<{ from: string, to: string, type?: string }> }} snapshot
 */
export function exportArchitectureSnapshotMermaid(snapshot) {
  const blocks = snapshot?.blocks ?? [];
  const edges = snapshot?.edges ?? [];
  const lines = ['flowchart LR'];

  for (const block of blocks) {
    const id = mermaidNodeId(block.id);
    const label = escapeMermaidLabel(block.title ?? block.id);
    lines.push(`  ${id}["${label}"]`);
  }

  for (const edge of edges) {
    const from = mermaidNodeId(edge.from);
    const to = mermaidNodeId(edge.to);
    const edgeLabel = escapeMermaidLabel(edge.type ?? '');
    lines.push(edgeLabel
      ? `  ${from} -->|"${edgeLabel}"| ${to}`
      : `  ${from} --> ${to}`);
  }

  return `${lines.join('\n')}\n`;
}

const MATRIX_STATUS_COLUMNS = [
  { id: 'backlog', label: 'Бэклог', statuses: ['backlog'] },
  { id: 'ready', label: 'Готово', statuses: ['ready'] },
  { id: 'active', label: 'В работе', statuses: ['claimed', 'doing', 'in_progress', 'verify', 'blocked'] },
  { id: 'done', label: 'Завершено', statuses: ['done', 'verified'] },
];

function sumStatuses(taskCounts, statuses) {
  let total = 0;
  for (const status of statuses) {
    total += Number(taskCounts?.[status] ?? 0);
  }
  return total;
}

/**
 * @param {{ blocks?: Array<{ id: string, title?: string, layer?: string, taskCounts?: Record<string, number> }> }} snapshot
 */
export function buildArchitectureMatrixModel(snapshot) {
  const blocks = [...(snapshot?.blocks ?? [])].sort((left, right) => architectureViewsCompareText(left.title ?? left.id, right.title ?? right.id));

  return {
    schema: 'architecture.matrix.v1',
    columns: MATRIX_STATUS_COLUMNS.map((column) => ({ id: column.id, label: column.label })),
    rows: blocks.map((block) => ({
      blockId: block.id,
      title: block.title ?? block.id,
      layer: block.layer ?? 'L1',
      cells: MATRIX_STATUS_COLUMNS.map((column) => ({
        columnId: column.id,
        count: sumStatuses(block.taskCounts ?? {}, column.statuses),
      })),
    })),
  };
}

/**
 * @param {{ id: string, title?: string, summary?: string, vector?: string, group?: string, taskIds?: string[], taskCounts?: Record<string, number> }} block
 */
export function summarizeArchitectureBlockForList(block) {
  const taskCount = block.taskIds?.length ?? 0;
  const activeCount = sumStatuses(block.taskCounts ?? {}, MATRIX_STATUS_COLUMNS.find((c) => c.id === 'active')?.statuses ?? []);
  const doneCount = sumStatuses(block.taskCounts ?? {}, MATRIX_STATUS_COLUMNS.find((c) => c.id === 'done')?.statuses ?? []);
  const vectorPreview = String(block.vector ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) ?? '';
  const title = block.title ?? block.id;

  return {
    blockId: block.id,
    title,
    listTitle: title,
    groupLabel: getArchitectureBlockGroupLabel(block),
    summary: block.summary || vectorPreview,
    taskCount,
    activeCount,
    doneCount,
  };
}
