export const UNCLASSIFIED_BLOCK_ID = '__unclassified__';

const compareBlockClassifierText = (left, right) =>
  String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/**
 * @param {string} raw
 */
export function normalizeCanonPath(raw) {
  return String(raw ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//u, '')
    .replace(/\/+$/u, '')
    .trim()
    .toLowerCase();
}

/**
 * @param {import('./architectureL1Canon.mjs').parseArchitectureL1CanonContent extends (...args: any) => infer R ? R : never} canon
 */
export function isStarterArchitectureCanon(canon) {
  const starterFromParse = canon.parse?.atoms?.some((entry) => {
    const profile = entry.draft.profile || entry.draft.labels?.['atom.profile'] || '';
    return profile === 'architecture_canon' && entry.draft.labels?.['architecture.starter']?.trim() === 'true';
  });
  if (starterFromParse) {
    return true;
  }

  const legacyIds = new Set([
    'step-canon',
    'work-graph',
    'project-memory',
    'trace-evidence',
    'agent-runtime',
    'domains',
    'derived-projections',
  ]);
  const blockIds = canon.blocks.map((block) => block.id);
  return blockIds.length > 0 && blockIds.every((id) => legacyIds.has(id));
}

/**
 * @param {ReturnType<import('./architectureL1Canon.mjs').parseArchitectureL1CanonContent>} canon
 */
export function buildCanonBlockPathIndex(canon) {
  /** @type {Map<string, Set<string>>} */
  const prefixesByBlock = new Map();

  const addPrefix = (blockId, rawPath) => {
    const prefix = normalizeCanonPath(rawPath);
    if (!prefix) {
      return;
    }
    if (!prefixesByBlock.has(blockId)) {
      prefixesByBlock.set(blockId, new Set());
    }
    prefixesByBlock.get(blockId).add(prefix);
  };

  for (const block of canon.blocks) {
    for (const root of block.intentRoots ?? []) {
      addPrefix(block.id, root);
    }
    for (const container of block.containers ?? []) {
      for (const containerPath of container.paths ?? []) {
        addPrefix(block.id, containerPath);
      }
    }
  }

  /** @type {Array<{ blockId: string, prefix: string, prefixLength: number }>} */
  const entries = [];
  for (const [blockId, prefixes] of prefixesByBlock.entries()) {
    for (const prefix of prefixes) {
      entries.push({ blockId, prefix, prefixLength: prefix.length });
    }
  }

  return entries.sort((left, right) =>
    right.prefixLength - left.prefixLength ||
    compareBlockClassifierText(left.blockId, right.blockId) ||
    compareBlockClassifierText(left.prefix, right.prefix),
  );
}

/**
 * @param {string} path
 * @param {string} prefix
 */
function pathMatchesPrefix(path, prefix) {
  if (!path || !prefix) {
    return false;
  }
  if (path === prefix) {
    return true;
  }
  if (path.startsWith(`${prefix}/`)) {
    return true;
  }
  if (prefix.startsWith(`${path}/`)) {
    return true;
  }
  return false;
}

/**
 * @param {{ targetFiles?: string[], labels?: Record<string, string>, sourcePath?: string }} item
 * @param {ReturnType<typeof buildCanonBlockPathIndex>} pathIndex
 * @param {Set<string>} blockIds
 */
function matchItemPathsToBlock(item, pathIndex, blockIds) {
  const candidatePaths = [
    ...(item.targetFiles ?? []),
    item.labels?.['intent.path'],
    item.sourcePath,
  ]
    .map(normalizeCanonPath)
    .filter(Boolean);

  /** @type {{ blockId: string, prefix: string, prefixLength: number, matchedPath: string } | null} */
  let best = null;

  for (const path of candidatePaths) {
    for (const entry of pathIndex) {
      if (!blockIds.has(entry.blockId)) {
        continue;
      }
      if (!pathMatchesPrefix(path, entry.prefix)) {
        continue;
      }
      if (!best || entry.prefixLength > best.prefixLength) {
        best = {
          blockId: entry.blockId,
          prefix: entry.prefix,
          prefixLength: entry.prefixLength,
          matchedPath: path,
        };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    blockId: best.blockId,
    source: 'canon.path',
    confidence: 0.8,
    matchedPrefix: best.prefix,
    matchedPath: best.matchedPath,
  };
}

/**
 * @param {{ labels?: Record<string, string>, targetFiles?: string[], sourcePath?: string, id?: string, title?: string, department?: string, ownerRole?: string, nextAction?: string }} item
 * @param {ReturnType<import('./architectureL1Canon.mjs').parseArchitectureL1CanonContent>} canon
 * @param {{ pathIndex?: ReturnType<typeof buildCanonBlockPathIndex> }} [options]
 */
export function classifyWorkItemForCanon(item, canon, options = {}) {
  const blockIds = new Set(canon.blocks.map((block) => block.id));
  const pathIndex = options.pathIndex ?? buildCanonBlockPathIndex(canon);

  const explicit = String(item?.labels?.['architecture.block_id'] ?? '').trim();
  if (explicit && blockIds.has(explicit)) {
    return {
      blockId: explicit,
      source: 'architecture.block_id',
      confidence: 1,
    };
  }

  const pathMatch = matchItemPathsToBlock(item ?? {}, pathIndex, blockIds);
  if (pathMatch) {
    return pathMatch;
  }

  const legacyId = classifyWorkItemBlock(item ?? {});
  if (isStarterArchitectureCanon(canon) || blockIds.has(legacyId)) {
    return {
      blockId: legacyId,
      source: 'legacy.classifier',
      confidence: blockIds.has(legacyId) ? 0.5 : 0.3,
    };
  }

  return {
    blockId: UNCLASSIFIED_BLOCK_ID,
    source: 'unclassified',
    confidence: 0,
  };
}

/**
 * @param {Parameters<typeof classifyWorkItemForCanon>[0]} item
 * @param {Parameters<typeof classifyWorkItemForCanon>[1]} canon
 * @param {Parameters<typeof classifyWorkItemForCanon>[2]} [options]
 */
export function classifyWorkItemBlockIdForCanon(item, canon, options = {}) {
  return classifyWorkItemForCanon(item, canon, options).blockId;
}

export function classifyWorkItemBlock(item) {
  const searchable = [
    item.id,
    item.title,
    item.department,
    item.ownerRole,
    item.nextAction,
    ...(item.targetFiles ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (
    item.department === 'domain-marketplace'
    || item.department === 'domain-onebase'
    || searchable.includes('intent/domains/marketplace')
    || searchable.includes('intent/domains/onebase')
    || searchable.includes('onebase')
    || searchable.includes('../onebase')
    || searchable.includes('marketplace')
  ) {
    return 'domains';
  }

  if (
    searchable.includes('memory')
    || searchable.includes('claude-note')
    || item.department === 'knowledge-publishing'
  ) {
    return 'project-memory';
  }

  if (
    searchable.includes('trace')
    || searchable.includes('evidence')
    || searchable.includes('verification')
  ) {
    return 'trace-evidence';
  }

  if (
    searchable.includes('worker')
    || searchable.includes('agent-worker')
    || searchable.includes('agent-runtime')
    || searchable.includes('design-agent-')
    || searchable.includes('implement-agent-')
    || searchable.includes('runner')
    || searchable.includes('promptpilot')
  ) {
    return 'agent-runtime';
  }

  if (
    searchable.includes('step-atom')
    || searchable.includes('formatter')
    || searchable.includes('charter')
    || searchable.includes('parser-roundtrip')
  ) {
    return 'step-canon';
  }

  if (
    item.department === 'frontend-ui'
    || /\b(ui|dashboard|board|graph-viewer|atom-inspector|architecture|schematic)\b/u.test(searchable)
    || searchable.includes('pvrg')
    || searchable.includes('derived-graph')
  ) {
    return 'derived-projections';
  }

  return 'work-graph';
}
