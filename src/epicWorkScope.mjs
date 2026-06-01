import { buildEpicRoadmapProjection } from './intentRoadmapEpicProjection.mjs';
import { attachDerivedWorkItemHierarchy, DONE_STATUSES, readWorkItemKind } from './workItemHierarchy.mjs';

export const EPIC_WORK_SCOPE_SCHEMA = 'workgraph.epic-work-scope.v1';

const ACTIVE_SCOPE_STATUSES = new Set(['claimed', 'doing', 'in_progress', 'verify']);

/**
 * Map work.status to markdown checklist mark for read-only scope blocks.
 * @param {string} status
 * @returns {'x' | '~' | ' '}
 */
export function scopeChecklistMark(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (DONE_STATUSES.has(normalized)) {
    return 'x';
  }
  if (ACTIVE_SCOPE_STATUSES.has(normalized)) {
    return '~';
  }
  return ' ';
}

/**
 * Render AN-28 «Scope (read-only)» markdown block from epic scope slice.
 * @param {object} scopeSlice — output of buildEpicWorkScopeSlice
 * @param {{ title?: string }} [options]
 */
export function formatEpicScopeMarkdown(scopeSlice, options = {}) {
  const title = options.title ?? 'Scope (read-only, Work Graph)';
  const lines = [`## ${title}`, ''];
  for (const child of scopeSlice.children ?? []) {
    const mark = scopeChecklistMark(child.status);
    const label = child.title ? ` — ${child.title}` : '';
    lines.push(`- [${mark}] \`${child.id}\` — ${child.status}${label}`);
  }
  return lines.join('\n');
}

/**
 * Compact read-only rollup of direct epic children for chat/UI scope panels.
 *
 * @param {Array<object>} workItems
 * @param {string} epicId
 * @returns {object} schema workgraph.epic-work-scope.v1
 */
export function buildEpicWorkScopeSlice(workItems, epicId) {
  const normalizedEpicId = String(epicId ?? '').trim();
  if (normalizedEpicId === '') {
    throw new TypeError('epicId is required');
  }

  const enriched = attachDerivedWorkItemHierarchy(workItems);
  const epic = enriched.find((item) => item.id === normalizedEpicId);
  if (!epic) {
    throw new Error(`unknown epic id: ${normalizedEpicId}`);
  }
  if (readWorkItemKind(epic) !== 'epic') {
    throw new Error(`work item is not an epic: ${normalizedEpicId}`);
  }

  const projection = buildEpicRoadmapProjection(enriched);
  const entry = projection.epics.find((candidate) => candidate.epicId === normalizedEpicId);
  if (!entry) {
    throw new Error(`unknown epic id: ${normalizedEpicId}`);
  }

  return {
    schema: EPIC_WORK_SCOPE_SCHEMA,
    readOnly: true,
    epicId: entry.epicId,
    title: entry.title,
    status: entry.status,
    childCount: entry.childCount,
    doneChildCount: entry.doneChildCount,
    closeBlocked: entry.closeBlocked,
    rollup: entry.rollup,
    children: entry.children.map((child) => ({
      id: child.workId,
      title: child.title,
      status: child.status,
      itemKind: child.itemKind,
    })),
  };
}
