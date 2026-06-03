import { classifyWorkItemBlock } from '../workItemBlockClassifier.mjs';

/** @type {Record<string, { label: string, tone: string }>} */
export const ARCHITECTURE_BLOCK_BADGES = {
  'step-canon': { label: 'STEP CANON', tone: 'muted' },
  'work-graph': { label: 'WORK GRAPH', tone: 'accent' },
  'project-memory': { label: 'MEMORY', tone: 'ok' },
  'trace-evidence': { label: 'TRACE', tone: 'warning' },
  'agent-runtime': { label: 'AGENT RT', tone: 'accent' },
  domains: { label: 'DOMAINS', tone: 'ok' },
  'derived-projections': { label: 'UI', tone: 'accent' },
};

/** @type {Record<string, { label: string, tone: string }>} */
export const DEPARTMENT_BADGES = {
  'frontend-ui': { label: 'UI', tone: 'accent' },
  'agent-platform': { label: 'AGENT', tone: 'accent' },
  'domain-onebase': { label: 'ONEBASE', tone: 'ok' },
  'domain-marketplace': { label: 'MARKETPLACE', tone: 'ok' },
  'knowledge-publishing': { label: 'MEMORY', tone: 'ok' },
};

/**
 * @param {{ id?: string, title?: string, department?: string, ownerRole?: string, nextAction?: string, targetFiles?: string[], itemKind?: string, labels?: Record<string, string> } | null | undefined} item
 */
export function resolveWorkItemClassifierBadge(item) {
  const explicitBlock = String(item?.labels?.['architecture.block_id'] ?? '').trim();
  if (explicitBlock && ARCHITECTURE_BLOCK_BADGES[explicitBlock]) {
    return {
      ...ARCHITECTURE_BLOCK_BADGES[explicitBlock],
      source: 'architecture.block_id',
      sourceId: explicitBlock,
    };
  }

  const blockId = classifyWorkItemBlock(item ?? {});
  const itemKind = String(item?.itemKind ?? item?.labels?.['work.item_kind'] ?? 'task').trim().toLowerCase();
  const preferItemKind = blockId === 'work-graph' && (itemKind === 'epic' || itemKind === 'subtask');

  if (ARCHITECTURE_BLOCK_BADGES[blockId] && !preferItemKind) {
    return {
      ...ARCHITECTURE_BLOCK_BADGES[blockId],
      source: 'architecture.block',
      sourceId: blockId,
    };
  }

  const department = String(item?.department ?? '').trim();
  if (department && DEPARTMENT_BADGES[department]) {
    return {
      ...DEPARTMENT_BADGES[department],
      source: 'department',
      sourceId: department,
    };
  }

  if (itemKind === 'epic') {
    return { label: 'EPIC', tone: 'muted', source: 'itemKind', sourceId: 'epic' };
  }
  if (itemKind === 'subtask') {
    return { label: 'SUBTASK', tone: 'default', source: 'itemKind', sourceId: 'subtask' };
  }

  if (ARCHITECTURE_BLOCK_BADGES[blockId]) {
    return {
      ...ARCHITECTURE_BLOCK_BADGES[blockId],
      source: 'architecture.block',
      sourceId: blockId,
    };
  }

  return { label: 'TASK', tone: 'default', source: 'itemKind', sourceId: 'task' };
}

/**
 * Browser-inline helper: expects global renderClientUiBadge.
 * @param {{ id?: string, title?: string, department?: string, ownerRole?: string, nextAction?: string, targetFiles?: string[], itemKind?: string, labels?: Record<string, string> } | null | undefined} item
 */
export function renderWorkItemClassifierBadge(item) {
  const badge = resolveWorkItemClassifierBadge(item);
  const title = badge.source === 'architecture.block'
    ? 'Architecture block: ' + badge.sourceId
    : badge.source === 'architecture.block_id'
      ? 'architecture.block_id: ' + badge.sourceId
      : badge.source + ': ' + badge.sourceId;
  return renderClientUiBadge({
    label: badge.label,
    tone: badge.tone,
    title,
    testId: 'classifier-' + String(badge.sourceId).replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase(),
  });
}
