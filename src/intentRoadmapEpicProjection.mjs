import {
  attachDerivedWorkItemHierarchy,
  DONE_STATUSES,
  readWorkItemKind,
  summarizeWorkItemHierarchyRollup,
} from './workItemHierarchy.mjs';
import { buildEpicRoadmapCanvasModel } from './intentRoadmapCanvas.mjs';

export const EPIC_ROADMAP_PROJECTION_SCHEMA = 'workgraph.roadmap-epics.projection.v1';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function computeChildRollup(children) {
  let closed = 0;
  let blocked = 0;
  let inProgress = 0;

  for (const child of children) {
    const status = String(child.status ?? '').trim().toLowerCase();
    if (DONE_STATUSES.has(status)) {
      closed += 1;
    } else if (status === 'blocked') {
      blocked += 1;
    } else {
      inProgress += 1;
    }
  }

  return {
    closed,
    total: children.length,
    blocked,
    inProgress,
  };
}

function buildEpicChildNode(item) {
  return {
    workId: item.id,
    title: item.title ?? item.id,
    status: item.status ?? '',
    itemKind: readWorkItemKind(item),
  };
}

function buildEpicEntry(epic, itemById) {
  const childItems = (epic.childIds ?? [])
    .map((childId) => itemById.get(childId))
    .filter(Boolean)
    .sort((left, right) => compareText(left.id, right.id));

  const hierarchyRollup = summarizeWorkItemHierarchyRollup(epic, [...itemById.values()]);
  const rollup = computeChildRollup(childItems);

  return {
    epicId: epic.id,
    title: epic.title ?? epic.id,
    status: epic.status ?? '',
    childCount: hierarchyRollup.childCount,
    doneChildCount: hierarchyRollup.doneChildCount,
    closeBlocked: hierarchyRollup.closeBlocked,
    rollup,
    children: childItems.map(buildEpicChildNode),
  };
}

function parseCollapsedEpicIds(value) {
  if (value instanceof Set) {
    return value;
  }
  if (Array.isArray(value)) {
    return new Set(value.map((entry) => String(entry).trim()).filter(Boolean));
  }
  const raw = String(value ?? '').trim();
  if (raw === '') {
    return new Set();
  }
  return new Set(raw.split(',').map((entry) => entry.trim()).filter(Boolean));
}

function isActiveEpic(epic, hierarchyRollup) {
  const status = String(epic.status ?? '').trim().toLowerCase();
  return !DONE_STATUSES.has(status) || hierarchyRollup.closeBlocked;
}

/**
 * @param {Array<object>} workItems
 * @param {{ active?: boolean, withChildren?: boolean, collapsed?: Set<string>|string[]|string, cwd?: string }} [options]
 */
export function buildEpicRoadmapProjection(workItems, options = {}) {
  const enriched = attachDerivedWorkItemHierarchy(workItems);
  const itemById = new Map(enriched.map((item) => [item.id, item]));
  const collapsedEpicIds = parseCollapsedEpicIds(options.collapsed);

  let epics = enriched.filter((item) => readWorkItemKind(item) === 'epic');

  if (options.active === true) {
    epics = epics.filter((epic) => isActiveEpic(epic, summarizeWorkItemHierarchyRollup(epic, enriched)));
  }

  if (options.withChildren === true) {
    epics = epics.filter((epic) => (epic.childIds ?? []).length > 0);
  }

  const entries = epics
    .map((epic) => buildEpicEntry(epic, itemById))
    .sort((left, right) => compareText(left.epicId, right.epicId));

  const canvasOptions = { collapsedEpicIds };

  return {
    schema: EPIC_ROADMAP_PROJECTION_SCHEMA,
    readOnly: true,
    epicCount: entries.length,
    epics: entries.map((entry) => ({
      ...entry,
      canvas: buildEpicRoadmapCanvasModel(entry, canvasOptions),
    })),
  };
}

export { parseCollapsedEpicIds };
