const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const WORK_ITEM_KINDS = ['epic', 'task', 'subtask'];
export const DEFAULT_WORK_ITEM_KIND = 'task';
export const DONE_STATUSES = new Set(['done', 'verified']);

export function normalizeWorkItemKind(value) {
  const kind = String(value ?? '').trim().toLowerCase();
  if (kind === '') {
    return DEFAULT_WORK_ITEM_KIND;
  }
  return kind;
}

export function isValidWorkItemKind(value) {
  const kind = String(value ?? '').trim().toLowerCase();
  return kind === '' || WORK_ITEM_KINDS.includes(kind);
}

export function readWorkItemParentId(item) {
  return String(item?.parentId ?? item?.labels?.['work.parent_id'] ?? '').trim();
}

export function readWorkItemKind(item) {
  return normalizeWorkItemKind(item?.itemKind ?? item?.labels?.['work.item_kind']);
}

export function buildChildIdsByParentId(items) {
  const childIdsByParent = new Map();

  for (const item of items) {
    const parentId = readWorkItemParentId(item);
    if (parentId === '') {
      continue;
    }

    if (!childIdsByParent.has(parentId)) {
      childIdsByParent.set(parentId, []);
    }
    childIdsByParent.get(parentId).push(item.id);
  }

  for (const childIds of childIdsByParent.values()) {
    childIds.sort(compareText);
  }

  return childIdsByParent;
}

export function attachDerivedWorkItemHierarchy(items) {
  const childIdsByParent = buildChildIdsByParentId(items);

  return items.map((item) => ({
    ...item,
    parentId: readWorkItemParentId(item),
    itemKind: readWorkItemKind(item),
    childIds: [...(childIdsByParent.get(item.id) ?? [])],
  }));
}

export function hasWorkItemParentCycle(itemId, itemById) {
  const visited = new Set();
  let current = itemId;

  while (current !== '') {
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);
    current = readWorkItemParentId(itemById.get(current));
  }

  return false;
}

export function findEpicDependentsWithoutParent(items, epicId) {
  const epicKey = String(epicId ?? '').trim();
  if (epicKey === '' || !Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => {
    if (readWorkItemKind(item) === 'epic') {
      return false;
    }
    if (!(item.dependsOn ?? []).includes(epicKey)) {
      return false;
    }
    return readWorkItemParentId(item) !== epicKey;
  });
}

export function validateWorkItemCreateHierarchy({ itemKind, parentId } = {}) {
  const kind = readWorkItemKind({ itemKind, labels: { 'work.item_kind': itemKind } });
  const normalizedParentId = String(parentId ?? '').trim();
  if (kind === 'subtask' && normalizedParentId === '') {
    return {
      ok: false,
      code: 'subtask_requires_parent_id',
      message: 'itemKind=subtask requires parentId (work.parent_id)',
    };
  }
  return { ok: true };
}

export function lintWorkItemHierarchyIssues(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const issues = [];
  const itemById = new Map(items.map((item) => [item.id, item]));
  const childIdsByParent = buildChildIdsByParentId(items);

  for (const item of items) {
    const parentId = readWorkItemParentId(item);
    const rawKind = String(item?.labels?.['work.item_kind'] ?? item?.itemKind ?? '').trim().toLowerCase();
    const itemKind = readWorkItemKind(item);

    if (rawKind !== '' && !WORK_ITEM_KINDS.includes(rawKind)) {
      issues.push({
        severity: 'error',
        code: 'invalid_item_kind',
        message: `Invalid work.item_kind "${rawKind}" for ${item.id}`,
        workId: item.id,
        itemKind: rawKind,
      });
    }

    if (parentId === item.id) {
      issues.push({
        severity: 'error',
        code: 'self_parent',
        message: `WorkItem cannot be its own parent: ${item.id}`,
        workId: item.id,
      });
      continue;
    }

    if (parentId !== '' && !itemById.has(parentId)) {
      issues.push({
        severity: 'error',
        code: 'missing_parent',
        message: `Missing parent "${parentId}" for ${item.id}`,
        workId: item.id,
        parentId,
      });
    }

    if (parentId !== '' && hasWorkItemParentCycle(item.id, itemById)) {
      issues.push({
        severity: 'error',
        code: 'parent_cycle',
        message: `Parent cycle detected for ${item.id}`,
        workId: item.id,
        parentId,
      });
    }

    for (const dependencyId of item.dependsOn ?? []) {
      const dependency = itemById.get(dependencyId);
      if (dependency !== undefined && readWorkItemParentId(dependency) === item.id) {
        issues.push({
          severity: 'error',
          code: 'parent_depends_on_child',
          message: `Parent ${item.id} depends_on child ${dependencyId}`,
          workId: item.id,
          dependencyId,
        });
      }

      if (
        dependency !== undefined
        && readWorkItemKind(dependency) === 'epic'
        && itemKind !== 'epic'
        && readWorkItemParentId(item) === ''
      ) {
        issues.push({
          severity: 'warning',
          code: 'epic_dependency_without_parent',
          message: `${item.id} depends_on epic ${dependencyId} without work.parent_id`,
          workId: item.id,
          epicId: dependencyId,
        });
      }
    }

    if (itemKind === 'epic' && (childIdsByParent.get(item.id) ?? []).length === 0) {
      issues.push({
        severity: 'warning',
        code: 'epic_without_children',
        message: `Epic ${item.id} has no child WorkItems`,
        workId: item.id,
        itemKind,
      });
    }

    if (itemKind === 'epic' && DONE_STATUSES.has(String(item.status ?? '').trim())) {
      const rollup = summarizeWorkItemHierarchyRollup(item, items);
      if (rollup.openChildIds.length > 0) {
        issues.push({
          severity: 'warning',
          code: 'epic_done_open_children',
          message: `Epic ${item.id} is done but child WorkItems remain open (${rollup.openChildIds.join(', ')})`,
          workId: item.id,
          openChildIds: rollup.openChildIds,
        });
      }
    }
  }

  return issues;
}

export function summarizeWorkItemHierarchyRollup(item, items) {
  const enriched = attachDerivedWorkItemHierarchy(items);
  const fullItem = enriched.find((candidate) => candidate.id === item.id) ?? item;
  const childIds = fullItem.childIds ?? [];
  if (childIds.length === 0) {
    return {
      childCount: 0,
      doneChildCount: 0,
      openChildIds: [],
      closeBlocked: false,
    };
  }

  const itemById = new Map(enriched.map((entry) => [entry.id, entry]));
  const openChildIds = childIds.filter((childId) => {
    const child = itemById.get(childId);
    return child !== undefined && !DONE_STATUSES.has(child.status);
  });

  return {
    childCount: childIds.length,
    doneChildCount: childIds.length - openChildIds.length,
    openChildIds,
    closeBlocked: openChildIds.length > 0,
  };
}

export function evaluateParentCloseGate(items, item, targetStatus) {
  if (!DONE_STATUSES.has(String(targetStatus ?? '').trim())) {
    return { ok: true };
  }

  const rollup = summarizeWorkItemHierarchyRollup(item, items);
  if (!rollup.closeBlocked) {
    return { ok: true, rollup };
  }

  return {
    ok: false,
    code: 'parent_close_blocked_open_children',
    message: `Cannot close ${item.id}: open child WorkItems remain (${rollup.openChildIds.join(', ')})`,
    workId: item.id,
    openChildIds: rollup.openChildIds,
    rollup,
  };
}

export function assertParentCloseAllowed(items, item, targetStatus) {
  const gate = evaluateParentCloseGate(items, item, targetStatus);
  if (!gate.ok) {
    const error = new Error(gate.message);
    error.code = gate.code;
    error.openChildIds = gate.openChildIds;
    throw error;
  }
  return gate;
}
