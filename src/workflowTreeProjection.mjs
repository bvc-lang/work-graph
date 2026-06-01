const workflowTreeCompareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/**
 * @param {Array<{ id: string, title?: string, parentId?: string, itemKind?: string }>} items
 */
export function buildWorkflowTreeForest(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const visibleIds = new Set(items.map((item) => item.id));
  /** @type {Map<string, Array<object>>} */
  const childrenByParentId = new Map();

  for (const item of items) {
    let parentId = String(item.parentId ?? '').trim();
    if (parentId !== '' && !visibleIds.has(parentId)) {
      parentId = '';
    }
    if (!childrenByParentId.has(parentId)) {
      childrenByParentId.set(parentId, []);
    }
    childrenByParentId.get(parentId).push(item);
  }

  for (const children of childrenByParentId.values()) {
    children.sort((left, right) => workflowTreeCompareText(left.title ?? left.id, right.title ?? right.id));
  }

  /**
   * @param {object} item
   * @param {number} depth
   */
  function buildNode(item, depth) {
    const children = (childrenByParentId.get(item.id) ?? []).map((child) => buildNode(child, depth + 1));
    return {
      item,
      depth,
      childCount: children.length,
      children,
    };
  }

  const roots = childrenByParentId.get('') ?? [];
  return roots.map((root) => buildNode(root, 0));
}

/**
 * @param {Array<object>} forest
 */
export function buildWorkflowTreeDisplayUnits(forest) {
  return forest.map((root) => ({ type: 'tree-root', root }));
}
