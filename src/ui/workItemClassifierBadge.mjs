import {
  classifyWorkItemBlock,
  classifyWorkItemForCanon,
  UNCLASSIFIED_BLOCK_ID,
} from '../workItemBlockClassifier.mjs';

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

const CONTAINER_KIND_TONES = {
  runtime: 'accent',
  protocol: 'muted',
  ui: 'accent',
  schema: 'warning',
  domain: 'ok',
  research: 'muted',
  storage: 'default',
};

/**
 * @param {string} title
 */
function shortenBlockTitle(title) {
  const trimmed = String(title ?? '').trim();
  if (trimmed.length <= 18) {
    return trimmed.toUpperCase();
  }
  return trimmed.slice(0, 16).trimEnd().toUpperCase() + '…';
}

/**
 * @param {ReturnType<import('../architectureL1Canon.mjs').parseArchitectureL1CanonContent>} [canon]
 */
export function buildArchitectureBlockBadgeLookup(canon) {
  const lookup = { ...ARCHITECTURE_BLOCK_BADGES };
  for (const block of canon?.blocks ?? []) {
    const kind = block.containers?.[0]?.kind ?? 'runtime';
    lookup[block.id] = {
      label: shortenBlockTitle(block.title || block.id),
      tone: CONTAINER_KIND_TONES[kind] ?? 'default',
    };
  }
  return lookup;
}

/**
 * @param {string} blockId
 * @param {Record<string, { label: string, tone: string }>} badgeLookup
 */
function badgeForBlockId(blockId, badgeLookup) {
  if (badgeLookup[blockId]) {
    return badgeLookup[blockId];
  }
  return {
    label: shortenBlockTitle(blockId.replace(/-/g, ' ')),
    tone: 'default',
  };
}

/**
 * @param {{ id?: string, title?: string, department?: string, ownerRole?: string, nextAction?: string, targetFiles?: string[], itemKind?: string, labels?: Record<string, string> } | null | undefined} item
 * @param {{ canon?: ReturnType<import('../architectureL1Canon.mjs').parseArchitectureL1CanonContent>, badgeLookup?: Record<string, { label: string, tone: string }> }} [options]
 */
export function resolveWorkItemClassifierBadge(item, options = {}) {
  const badgeLookup = options.badgeLookup ?? (
    options.canon ? buildArchitectureBlockBadgeLookup(options.canon) : ARCHITECTURE_BLOCK_BADGES
  );

  if (options.canon) {
    const classification = classifyWorkItemForCanon(item ?? {}, options.canon);
    if (classification.source === 'architecture.block_id') {
      return {
        ...badgeForBlockId(classification.blockId, badgeLookup),
        source: 'architecture.block_id',
        sourceId: classification.blockId,
      };
    }
    if (classification.blockId !== UNCLASSIFIED_BLOCK_ID) {
      const itemKind = String(item?.itemKind ?? item?.labels?.['work.item_kind'] ?? 'task').trim().toLowerCase();
      const preferItemKind = classification.blockId === 'work-graph' && (itemKind === 'epic' || itemKind === 'subtask');
      if (!preferItemKind) {
        return {
          ...badgeForBlockId(classification.blockId, badgeLookup),
          source: classification.source === 'legacy.classifier' ? 'architecture.block' : 'architecture.block',
          sourceId: classification.blockId,
        };
      }
    }
  } else {
    const explicitBlock = String(item?.labels?.['architecture.block_id'] ?? '').trim();
    if (explicitBlock && badgeLookup[explicitBlock]) {
      return {
        ...badgeLookup[explicitBlock],
        source: 'architecture.block_id',
        sourceId: explicitBlock,
      };
    }

    const blockId = classifyWorkItemBlock(item ?? {});
    const itemKind = String(item?.itemKind ?? item?.labels?.['work.item_kind'] ?? 'task').trim().toLowerCase();
    const preferItemKind = blockId === 'work-graph' && (itemKind === 'epic' || itemKind === 'subtask');

    if (badgeLookup[blockId] && !preferItemKind) {
      return {
        ...badgeLookup[blockId],
        source: 'architecture.block',
        sourceId: blockId,
      };
    }
  }

  const department = String(item?.department ?? '').trim();
  if (department && DEPARTMENT_BADGES[department]) {
    return {
      ...DEPARTMENT_BADGES[department],
      source: 'department',
      sourceId: department,
    };
  }

  const itemKind = String(item?.itemKind ?? item?.labels?.['work.item_kind'] ?? 'task').trim().toLowerCase();
  if (itemKind === 'epic') {
    return { label: 'EPIC', tone: 'muted', source: 'itemKind', sourceId: 'epic' };
  }
  if (itemKind === 'subtask') {
    return { label: 'SUBTASK', tone: 'default', source: 'itemKind', sourceId: 'subtask' };
  }

  if (!options.canon) {
    const blockId = classifyWorkItemBlock(item ?? {});
    if (ARCHITECTURE_BLOCK_BADGES[blockId]) {
      return {
        ...ARCHITECTURE_BLOCK_BADGES[blockId],
        source: 'architecture.block',
        sourceId: blockId,
      };
    }
  }

  return { label: 'TASK', tone: 'default', source: 'itemKind', sourceId: 'task' };
}

/**
 * Browser-inline helper: expects global renderClientUiBadge.
 * @param {{ id?: string, title?: string, department?: string, ownerRole?: string, nextAction?: string, targetFiles?: string[], itemKind?: string, labels?: Record<string, string> } | null | undefined} item
 * @param {{ canon?: ReturnType<import('../architectureL1Canon.mjs').parseArchitectureL1CanonContent>, badgeLookup?: Record<string, { label: string, tone: string }> }} [options]
 */
export function renderWorkItemClassifierBadge(item, options = {}) {
  const badge = resolveWorkItemClassifierBadge(item, options);
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
