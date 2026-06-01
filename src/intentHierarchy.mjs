import { workItemPathInFolder } from './bvcNewWritePolicy.mjs';

export const INTENT_HIERARCHY_SCHEMA = 'intent.hierarchy.snapshot.v1';

export const INTENT_LAYERS = ['system', 'ui', 'domain', 'research', 'memory', 'plans'];

export const INTENT_FEATURES = {
  runtime: 'runtime',
  storage: 'storage',
  dashboard: 'dashboard',
  onebase: 'onebase',
  marketplace: 'marketplace',
  pvrg: 'pvrg',
  memory: 'memory',
  plans: 'plans',
};

const DOMAIN_LABELS = {
  'system/runtime': 'Системный runtime',
  'system/storage': 'Системное хранилище',
  'ui/dashboard': 'UI и dashboard',
  'domain/onebase': 'OneBase',
  'domain/marketplace': 'Marketplace',
  'research/pvrg': 'PVRG и retrieval',
  'memory/work': 'Project Memory',
  'plans/work': 'Планы',
};

export function classifyIntentFolder(item) {
  const searchable = [
    item.id,
    item.title,
    item.department,
    item.ownerRole,
    item.nextAction,
    ...item.targetFiles,
  ]
    .join(' ')
    .toLowerCase();

  if (item.department === 'domain-marketplace' || searchable.includes('intent/domains/marketplace') || /\bmarketplace\b/u.test(searchable)) {
    return 'intent/domains/marketplace/work';
  }

  if (searchable.includes('onebase') || searchable.includes('../onebase')) {
    return 'intent/domains/onebase/work';
  }

  if (item.department === 'frontend-ui' || /\b(ui|dashboard|board|graph-viewer|atom-inspector)\b/u.test(searchable)) {
    return 'intent/ui/dashboard/work';
  }

  if (searchable.includes('memory')) {
    return 'intent/memory/work';
  }

  if (searchable.includes('pvrg') || searchable.includes('rag') || searchable.includes('retrieval')) {
    return 'intent/research/pvrg/work';
  }

  if (
    item.department === 'devops-runtime' ||
    searchable.includes('storage') ||
    searchable.includes('serialization') ||
    searchable.includes('sqlite') ||
    searchable.includes('gbc') ||
    searchable.includes('flatbuffers') ||
    searchable.includes('intent tree') ||
    searchable.includes('intent hierarchy')
  ) {
    return 'intent/system/storage/work';
  }

  return 'intent/system/runtime/work';
}

export function classifyIntentNode(item) {
  const folder = classifyIntentFolder(item);
  const segments = folder.split('/');
  const layer = segments[1] === 'domains' ? 'domain' : segments[1];
  const feature = segments[2] ?? 'runtime';
  const domain = `${layer}/${feature}`;
  const path = workItemPathInFolder(folder, item.id, { preferCanon: true });

  return {
    workId: item.id,
    title: item.title,
    layer,
    feature,
    domain,
    domainLabel: DOMAIN_LABELS[domain] ?? domain,
    folder,
    path,
    projectedLabels: {
      'intent.domain': layer,
      'intent.feature': feature,
      'intent.path': path,
    },
  };
}

export function toIntentPath(item) {
  return classifyIntentNode(item).path;
}

export function buildIntentHierarchySnapshot(entries) {
  const nodes = entries.map((entry) => {
    const item = entry.item ?? entry;
    return classifyIntentNode(item);
  });

  const domains = new Map();
  for (const node of nodes) {
    const bucket = domains.get(node.domain) ?? {
      id: node.domain,
      label: node.domainLabel,
      layer: node.layer,
      feature: node.feature,
      count: 0,
      workIds: [],
    };

    bucket.count += 1;
    bucket.workIds.push(node.workId);
    domains.set(node.domain, bucket);
  }

  return {
    schema: INTENT_HIERARCHY_SCHEMA,
    count: nodes.length,
    domains: [...domains.values()]
      .map((domain) => ({
        ...domain,
        workIds: [...domain.workIds].sort(compareText),
      }))
      .sort((left, right) => compareText(left.id, right.id)),
    nodes: nodes.sort((left, right) => compareText(left.workId, right.workId)),
  };
}

export function resolveIntentPathFromIndex(indexText, workId) {
  if (typeof indexText !== 'string' || typeof workId !== 'string' || workId.trim() === '') {
    return null;
  }

  const pattern = new RegExp(`^\\s*-\\s*${escapeRegExp(workId)}:\\s*(\\S+)\\s*$`, 'mu');
  const match = indexText.match(pattern);
  return match?.[1] ?? null;
}

export function buildCatalogPassportAlignment(entries, options = {}) {
  const catalogSource = options.catalogIndexPath ?? '../project/.iohasc/catalog-index.v1.json';
  const indexByWorkId = new Map((options.indexEntries ?? []).map((entry) => [entry.id, entry.path]));
  const nodes = entries.map((entry) => classifyIntentNode(entry.item ?? entry));

  return {
    schema: 'catalog-passport.intent-alignment.v1',
    catalogSource,
    passportField: 'stepGuid | stepTitle | catalog.packageId',
    mappings: nodes.map((node) => {
      const indexedPath = indexByWorkId.get(node.workId) ?? null;
      const intentPath = indexedPath ?? node.path;
      return {
        workId: node.workId,
        intentPath,
        projectedIntentPath: indexedPath && indexedPath !== node.path ? node.path : null,
        intentDomain: node.domain,
        passportLookup: `catalog-index -> stepTitle/work.id match -> ${node.workId}`,
        traceRefs: [`trace.artifact_refs: ${intentPath}`, `trace.links: work:${node.workId}`],
      };
    }),
    rules: [
      'catalog-index остаётся derived/read model из старого ioHasC',
      'canonical identity для rebuild — work.id + intent.path из intent/index.bvc',
      'passport section в .bvc atom сопоставляется через stepTitle/guid, не через file path alone',
      'projectedIntentPath — heuristic drift hint only; index path wins for validation',
    ],
  };
}

/**
 * @param {ReturnType<typeof buildCatalogPassportAlignment>} alignment
 * @param {{ cwd?: string, indexEntries?: Array<{ id: string, path: string }> }} [options]
 */
export async function validateCatalogPassportIntentAlignment(alignment, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const { access } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const errors = [];

  if (!alignment?.mappings?.length) {
    errors.push('alignment mappings are empty');
  }

  const indexEntries = options.indexEntries ?? [];
  const indexByWorkId = new Map(indexEntries.map((entry) => [entry.id, entry.path]));

  for (const row of alignment.mappings ?? []) {
    if (!row.workId || !row.intentPath) {
      errors.push(`mapping missing workId or intentPath: ${JSON.stringify(row)}`);
      continue;
    }

    const indexedPath = indexByWorkId.get(row.workId);
    const canonicalPath = indexedPath ?? row.intentPath;
    if (indexedPath && row.projectedIntentPath && indexedPath.replace(/\\/g, '/') !== row.projectedIntentPath.replace(/\\/g, '/')) {
      // Drift between index manifest and classifyIntentFolder heuristic — index wins; not a gate failure.
    }

    try {
      await access(join(cwd, canonicalPath));
    } catch {
      errors.push(`intent file missing for ${row.workId}: ${canonicalPath}`);
    }

    if (!Array.isArray(row.traceRefs) || row.traceRefs.length < 1) {
      errors.push(`trace refs missing for ${row.workId}`);
    }
  }

  return {
    schema: 'catalog-passport.intent-alignment.validation.v1',
    ok: errors.length === 0,
    mappingCount: alignment?.mappings?.length ?? 0,
    errors,
  };
}

export async function buildAndValidateCatalogPassportAlignment(entries, options = {}) {
  const alignment = buildCatalogPassportAlignment(entries, options);
  const validation = await validateCatalogPassportIntentAlignment(alignment, options);
  return { alignment, validation };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function compareText(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'variant' });
}
