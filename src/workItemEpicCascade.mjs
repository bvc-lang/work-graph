import {
  attachDerivedWorkItemHierarchy,
  DONE_STATUSES,
  readWorkItemKind,
} from './workItemHierarchy.mjs';
import { transitionStatus } from './workGraphRuntime.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function replaceWorkItem(items, updatedItem) {
  return items.map((entry) => (entry.id === updatedItem.id ? updatedItem : entry));
}

/**
 * @param {Array<{ id: string, status?: string, childIds?: string[] }>} items
 * @param {string} rootId
 */
export function collectOpenDescendantWorkItems(items, rootId) {
  const enriched = attachDerivedWorkItemHierarchy(items);
  const itemById = new Map(enriched.map((entry) => [entry.id, entry]));
  /** @type {Array<{ id: string, status?: string }>} */
  const open = [];
  /** @type {string[]} */
  const queue = [...(itemById.get(rootId)?.childIds ?? [])];
  const visited = new Set();

  while (queue.length > 0) {
    const childId = queue.shift();
    if (childId === undefined || visited.has(childId)) {
      continue;
    }
    visited.add(childId);

    const child = itemById.get(childId);
    if (!child) {
      continue;
    }

    for (const nestedId of child.childIds ?? []) {
      queue.push(nestedId);
    }

    if (!DONE_STATUSES.has(String(child.status ?? '').trim())) {
      open.push(child);
    }
  }

  return open.sort((left, right) => compareText(left.id, right.id));
}

/**
 * @param {Array<import('./workGraphRuntime.mjs').WorkItem>} items
 * @param {import('./workGraphRuntime.mjs').WorkItem} item
 * @param {string} targetStatus
 * @param {{ evidence?: string, cascadeEvidence?: string, reason?: string, blocker?: string }} [options]
 */
export function transitionWorkItemWithEpicCascade(items, item, targetStatus, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }
  if (!item?.id) {
    throw new TypeError('item.id is required');
  }

  if (readWorkItemKind(item) !== 'epic' || !DONE_STATUSES.has(targetStatus)) {
    const updated = transitionStatus(item, targetStatus, {
      reason: options.reason,
      blocker: options.blocker,
      evidence: options.evidence,
      allItems: items,
    });
    return {
      items: replaceWorkItem(items, updated),
      updatedItems: [updated],
      cascadedChildIds: [],
    };
  }

  let working = items.map((entry) => ({ ...entry }));
  /** @type {string[]} */
  const cascadedChildIds = [];
  const cascadeEvidence = String(
    options.cascadeEvidence ?? `cascade: parent epic ${item.id} → ${targetStatus}`,
  ).trim();
  const openDescendants = collectOpenDescendantWorkItems(working, item.id);

  for (const child of openDescendants) {
    const currentChild = working.find((entry) => entry.id === child.id);
    if (!currentChild) {
      continue;
    }
    const updatedChild = transitionStatus(currentChild, targetStatus, {
      evidence: cascadeEvidence,
      allItems: working,
    });
    working = replaceWorkItem(working, updatedChild);
    cascadedChildIds.push(updatedChild.id);
  }

  const currentEpic = working.find((entry) => entry.id === item.id) ?? item;
  const updatedEpic = transitionStatus(currentEpic, targetStatus, {
    reason: options.reason,
    blocker: options.blocker,
    evidence: options.evidence,
    allItems: working,
  });
  working = replaceWorkItem(working, updatedEpic);

  return {
    items: working,
    updatedItems: [
      ...working.filter((entry) => cascadedChildIds.includes(entry.id)),
      updatedEpic,
    ],
    cascadedChildIds,
  };
}

/**
 * Repair drift: epic already done/verified while descendants remain open.
 *
 * @param {Array<import('./workGraphRuntime.mjs').WorkItem>} items
 * @param {string} epicId
 * @param {{ cascadeEvidence?: string, targetStatus?: string }} [options]
 */
export function closeOpenDescendantsForDoneEpic(items, epicId, options = {}) {
  const epic = items.find((entry) => entry.id === epicId);
  if (!epic || readWorkItemKind(epic) !== 'epic' || !DONE_STATUSES.has(String(epic.status ?? '').trim())) {
    return {
      items,
      updatedItems: [],
      cascadedChildIds: [],
    };
  }

  const targetStatus = options.targetStatus ?? epic.status;
  let working = items.map((entry) => ({ ...entry }));
  /** @type {string[]} */
  const cascadedChildIds = [];
  const cascadeEvidence = String(
    options.cascadeEvidence ?? `cascade: reconcile epic ${epic.id} already ${targetStatus}`,
  ).trim();

  for (const child of collectOpenDescendantWorkItems(working, epic.id)) {
    const currentChild = working.find((entry) => entry.id === child.id);
    if (!currentChild) {
      continue;
    }
    const updatedChild = transitionStatus(currentChild, targetStatus, {
      evidence: cascadeEvidence,
      allItems: working,
    });
    working = replaceWorkItem(working, updatedChild);
    cascadedChildIds.push(updatedChild.id);
  }

  return {
    items: working,
    updatedItems: working.filter((entry) => cascadedChildIds.includes(entry.id)),
    cascadedChildIds,
  };
}

/**
 * @param {Array<import('./workGraphRuntime.mjs').WorkItem>} items
 */
export function findDoneEpicsWithOpenDescendants(items) {
  return attachDerivedWorkItemHierarchy(items)
    .filter((item) => readWorkItemKind(item) === 'epic' && DONE_STATUSES.has(String(item.status ?? '').trim()))
    .map((epic) => ({
      epicId: epic.id,
      openChildIds: collectOpenDescendantWorkItems(items, epic.id).map((child) => child.id),
    }))
    .filter((entry) => entry.openChildIds.length > 0)
    .sort((left, right) => compareText(left.epicId, right.epicId));
}
