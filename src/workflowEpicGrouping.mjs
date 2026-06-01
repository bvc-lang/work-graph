const workflowEpicCompareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });
const WORKFLOW_EPIC_DONE_STATUSES = new Set(['done', 'verified']);

/**
 * @param {Array<{ id: string, title?: string, status?: string, parentId?: string, itemKind?: string }>} items
 */
export function buildWorkflowEpicGroups(items) {
  if (!Array.isArray(items)) {
    return { epicGroups: [], orphans: [] };
  }

  const epics = items
    .filter((item) => item.itemKind === 'epic')
    .sort((left, right) => workflowEpicCompareText(left.title ?? left.id, right.title ?? right.id));
  const epicIds = new Set(epics.map((epic) => epic.id));
  /** @type {Map<string, Array<object>>} */
  const childrenByEpicId = new Map();
  /** @type {Set<string>} */
  const assignedChildIds = new Set();

  for (const item of items) {
    if (item.itemKind === 'epic') {
      continue;
    }
    const parentId = String(item.parentId ?? '').trim();
    if (parentId === '' || !epicIds.has(parentId)) {
      continue;
    }
    if (!childrenByEpicId.has(parentId)) {
      childrenByEpicId.set(parentId, []);
    }
    childrenByEpicId.get(parentId).push(item);
    assignedChildIds.add(item.id);
  }

  for (const children of childrenByEpicId.values()) {
    children.sort((left, right) => workflowEpicCompareText(left.title ?? left.id, right.title ?? right.id));
  }

  const epicGroups = epics.map((epic) => {
    const children = childrenByEpicId.get(epic.id) ?? [];
    const doneChildCount = children.filter((child) => WORKFLOW_EPIC_DONE_STATUSES.has(String(child.status ?? ''))).length;
    return {
      epic,
      children,
      childCount: children.length,
      doneChildCount,
    };
  });

  const orphans = items
    .filter((item) => item.itemKind !== 'epic' && !assignedChildIds.has(item.id))
    .sort((left, right) => workflowEpicCompareText(left.title ?? left.id, right.title ?? right.id));

  return { epicGroups, orphans };
}

/**
 * @param {Array<object>} items
 */
export function buildWorkflowDisplayUnits(items) {
  const { epicGroups, orphans } = buildWorkflowEpicGroups(items);
  return [
    ...epicGroups.map((group) => ({ type: 'epic', group })),
    ...orphans.map((item) => ({ type: 'orphan', item })),
  ];
}
