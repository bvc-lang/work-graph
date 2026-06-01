import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseBvcFileContent } from './bvcFileFormat.mjs';

export const ARCHITECTURE_L1_CANON_DEFAULT_PATH = 'architecture/main.bvc';
export const ARCHITECTURE_L1_CANON_ID = 'architecture-l1-blocks-v1';
export const ARCHITECTURE_L1_BLOCK_COUNT = 7;

const VALID_CONTAINER_KINDS = new Set([
  'runtime',
  'protocol',
  'ui',
  'schema',
  'domain',
  'research',
  'storage',
]);

const VALID_EDGE_TYPES = new Set([
  'feeds',
  'uses',
  'validates',
  'implements',
  'defines',
  'maps_to',
  'relates_file',
]);

const MIN_CONTAINER_ANALYSIS_LENGTH = 200;
const MIN_CONTAINER_DECISION_LENGTH = 80;

const EDGE_LINE_PATTERN = /^([^\s]+)\s*->\s*([^\s]+)\s*:\s*([^\s]+)\s*$/u;

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/**
 * @param {string[] | string | undefined | null} value
 */
function joinTextSections(value) {
  if (Array.isArray(value)) {
    return value.join('\n').trim();
  }
  return String(value ?? '').trim();
}

/**
 * @param {Record<string, string>} labels
 */
function parseIntentRootsFromLabels(labels) {
  const raw = labels['architecture.intent_roots'] ?? '';
  return raw
   .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort(compareText);
}

/**
 * @param {string} value
 */
function unescapeContainerLabelMultiline(value) {
  return String(value ?? '')
    .replace(/\\n/g, '\n')
    .trim();
}

/**
 * @param {Record<string, string>} labels
 */
function parseContainersFromLabels(labels) {
  /** @type {Map<string, { id: string, title: string, kind: string, paths: string[], basis: string, vector: string, goal: string, analysis: string, decision: string, labels: Record<string, string> }>} */
  const byId = new Map();

  for (const [key, value] of Object.entries(labels ?? {})) {
    const fieldMatch = /^architecture\.container\.([^.]+)\.(title|kind|paths|basis|vector|goal|summary|analysis|decision)$/.exec(key);
    const verdictMatch = /^architecture\.container\.([^.]+)\.decision\.verdict$/.exec(key);
    const containerId = fieldMatch?.[1] ?? verdictMatch?.[1];
    if (!containerId) {
      continue;
    }

    if (!byId.has(containerId)) {
      byId.set(containerId, {
        id: containerId,
        title: '',
        kind: 'runtime',
        paths: [],
        basis: '',
        vector: '',
        goal: '',
        analysis: '',
        decision: '',
        labels: {},
      });
    }

    const entry = byId.get(containerId);
    if (verdictMatch) {
      entry.labels['architecture.decision.verdict'] = value.trim();
      continue;
    }

    const field = fieldMatch[2];
    if (field === 'paths') {
      entry.paths = value
        .split(',')
        .map((path) => path.trim())
        .filter(Boolean)
        .sort(compareText);
    } else if (field === 'title') {
      entry.title = value.trim();
    } else if (field === 'kind') {
      entry.kind = value.trim();
    } else if (field === 'basis' || field === 'vector' || field === 'goal' || field === 'analysis' || field === 'decision') {
      entry[field] = field === 'analysis' || field === 'decision'
        ? unescapeContainerLabelMultiline(value)
        : value.trim();
    } else if (field === 'summary' && !entry.basis) {
      entry.basis = value.trim();
    }
  }

  return [...byId.values()].sort((left, right) => compareText(left.id, right.id));
}

/**
 * @param {string} vector
 */
function parseEdgesFromVector(vector) {
  /** @type {Array<{ from: string, to: string, type: string }>} */
  const edges = [];

  for (const line of String(vector ?? '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = EDGE_LINE_PATTERN.exec(trimmed);
    if (!match) {
      continue;
    }

    edges.push({
      from: match[1],
      to: match[2],
      type: match[3],
    });
  }

  return edges.sort((left, right) =>
    compareText(left.from, right.from) ||
    compareText(left.to, right.to) ||
    compareText(left.type, right.type),
  );
}

/**
 * @param {import('./stepAtomFormatter.mjs').StepAtomDraft & { title?: string }} atom
 */
function mapBlockAtom(atom) {
  const labels = atom.labels ?? {};
  const blockId = labels['architecture.block_id']?.trim();
  if (!blockId) {
    return null;
  }

  return {
    id: blockId,
    title: labels['architecture.title']?.trim() || atom.title || blockId,
    summary: labels['architecture.summary']?.trim() || '',
    group: labels['architecture.group']?.trim() || '',
    basis: joinTextSections(atom.basis),
    vector: joinTextSections(atom.vector),
    goal: joinTextSections(atom.goal),
    analysis: joinTextSections(atom.analysis),
    decision: joinTextSections(atom.decision),
    labels: pickArchitectureBlockLabels(labels),
    layer: labels['architecture.layer']?.trim() || 'L1',
    intentRoots: parseIntentRootsFromLabels(labels),
    containers: parseContainersFromLabels(labels),
  };
}

/**
 * @param {Record<string, string>} labels
 */
function pickArchitectureBlockLabels(labels) {
  /** @type {Record<string, string>} */
  const picked = {};
  const verdict = labels['architecture.decision.verdict']?.trim();
  if (verdict) {
    picked['architecture.decision.verdict'] = verdict;
  }
  return picked;
}

/**
 * @param {string} content
 * @param {{ filePath?: string, repoRoot?: string }} [options]
 */
export function parseArchitectureL1CanonContent(content, options = {}) {
  const parsed = parseBvcFileContent(content, { filePath: options.filePath });
  /** @type {{ id: string, version: number, charterRef: string, protocolRef: string, designOutput: string, basis: string, vector: string, goal: string } | null} */
  let passport = null;
  /** @type {Array<{ id: string, title: string, summary: string, basis: string, vector: string, goal: string, layer: string, intentRoots: string[], containers: Array<{ id: string, title: string, kind: string, paths: string[] }> }>} */
  const blocks = [];
  /** @type {Array<{ from: string, to: string, type: string }>} */
  let edges = [];

  for (const entry of parsed.atoms) {
    const atom = entry.draft;
    const profile = atom.profile || atom.labels?.['atom.profile'] || '';

    if (profile === 'architecture_canon') {
      passport = {
        id: atom.labels?.['architecture.canon.id']?.trim() || ARCHITECTURE_L1_CANON_ID,
        version: Number(atom.labels?.['architecture.canon.version'] ?? 1),
        charterRef: atom.labels?.['architecture.charter.ref']?.trim() || '',
        protocolRef: atom.labels?.['architecture.protocol.ref']?.trim() || '',
        designOutput: atom.labels?.['architecture.design.output']?.trim() || 'architecture.snapshot.v1',
        basis: joinTextSections(atom.basis),
        vector: joinTextSections(atom.vector),
        goal: joinTextSections(atom.goal),
      };
      continue;
    }

    if (profile === 'architecture_l1_block') {
      const block = mapBlockAtom(atom);
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    if (profile === 'architecture_canon_section' && atom.labels?.['architecture.section'] === 'l1_edges') {
      edges = parseEdgesFromVector(joinTextSections(atom.vector));
    }
  }

  blocks.sort((left, right) => compareText(left.id, right.id));

  const sourcePath = options.filePath ?? ARCHITECTURE_L1_CANON_DEFAULT_PATH;
  const digest = createHash('sha256')
    .update(JSON.stringify({ passport, blocks, edges }), 'utf8')
    .digest('hex')
    .slice(0, 8);

  return {
    schema: 'architecture.l1-canon.v1',
    sourcePath,
    passport,
    blocks,
    edges,
    digest,
    parse: parsed,
  };
}

/**
 * @param {string} repoRoot
 * @param {{ canonPath?: string }} [options]
 */
export function loadArchitectureL1Canon(repoRoot, options = {}) {
  const canonPath = options.canonPath ?? ARCHITECTURE_L1_CANON_DEFAULT_PATH;
  const absolutePath = join(repoRoot, canonPath);
  let content;
  let sourcePath = canonPath.replace(/\\/g, '/');

  try {
    content = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT' && repoRoot !== ARCHITECTURE_L1_CANON_REPO_ROOT) {
      return loadArchitectureL1Canon(ARCHITECTURE_L1_CANON_REPO_ROOT, options);
    }
    throw error;
  }

  const canon = parseArchitectureL1CanonContent(content, { filePath: sourcePath, repoRoot });

  validateArchitectureL1Canon(canon);
  return canon;
}

/**
 * @param {ReturnType<typeof parseArchitectureL1CanonContent>} canon
 */
export function validateArchitectureL1Canon(canon) {
  /** @type {string[]} */
  const errors = [];

  if (!canon.passport) {
    errors.push('missing passport atom (atom.profile: architecture_canon)');
  } else {
    if (!canon.passport.id) {
      errors.push('passport missing architecture.canon.id');
    }
    if (!Number.isFinite(canon.passport.version)) {
      errors.push('passport architecture.canon.version must be a number');
    }
  }

  if (canon.blocks.length !== ARCHITECTURE_L1_BLOCK_COUNT) {
    errors.push(`expected ${ARCHITECTURE_L1_BLOCK_COUNT} L1 blocks, got ${canon.blocks.length}`);
  }

  const blockIds = new Set(canon.blocks.map((block) => block.id));
  if (blockIds.size !== canon.blocks.length) {
    errors.push('duplicate architecture.block_id values');
  }

  for (const block of canon.blocks) {
    if (!block.title) {
      errors.push(`block ${block.id}: missing title`);
    }
    for (const container of block.containers) {
      if (!container.title) {
        errors.push(`block ${block.id}: container ${container.id} missing title`);
      }
      if (!VALID_CONTAINER_KINDS.has(container.kind)) {
        errors.push(`block ${block.id}: container ${container.id} invalid kind ${container.kind}`);
      }
      if (!container.paths.length) {
        errors.push(`block ${block.id}: container ${container.id} missing paths`);
      }
      validateContainerPipeline(container, block.id, errors);
    }
  }

  if (!canon.edges.length) {
    errors.push('missing L1 edges section');
  }

  for (const edge of canon.edges) {
    if (!blockIds.has(edge.from)) {
      errors.push(`edge from unknown block: ${edge.from}`);
    }
    if (!blockIds.has(edge.to)) {
      errors.push(`edge to unknown block: ${edge.to}`);
    }
    if (!VALID_EDGE_TYPES.has(edge.type)) {
      errors.push(`edge ${edge.from}->${edge.to}: invalid type ${edge.type}`);
    }
  }

  if (errors.length) {
    throw new Error(`Invalid architecture L1 canon (${canon.sourcePath}):\n- ${errors.join('\n- ')}`);
  }

  return canon;
}

/**
 * @param {{ id: string, analysis?: string, decision?: string, labels?: Record<string, string> }} container
 * @param {string} blockId
 * @param {string[]} errors
 */
function validateContainerPipeline(container, blockId, errors) {
  const analysis = String(container.analysis ?? '').trim();
  const decision = String(container.decision ?? '').trim();

  if (analysis.length < MIN_CONTAINER_ANALYSIS_LENGTH) {
    errors.push(`block ${blockId}: container ${container.id} analysis too short (min ${MIN_CONTAINER_ANALYSIS_LENGTH})`);
  }
  if (!analysis.includes('Целесообразность:') || !analysis.includes('Контекст и границы:')) {
    errors.push(`block ${blockId}: container ${container.id} analysis must include «Целесообразность:» and «Контекст и границы:»`);
  }
  if (decision.length < MIN_CONTAINER_DECISION_LENGTH) {
    errors.push(`block ${blockId}: container ${container.id} decision too short (min ${MIN_CONTAINER_DECISION_LENGTH})`);
  }
  if (!container.labels?.['architecture.decision.verdict']) {
    errors.push(`block ${blockId}: container ${container.id} missing architecture.container.*.decision.verdict label`);
  }
}

/**
 * Strip BVC triplet fields for layout helpers expecting legacy block shape.
 * @param {{ id: string, title: string, summary: string, basis: string, vector: string, goal: string, layer: string, intentRoots: string[], containers: Array<{ id: string, title: string, kind: string, paths: string[] }> }} block
 */
export function toArchitectureL1BlockProjection(block) {
  return {
    id: block.id,
    title: block.title,
    summary: block.summary,
    ...(block.group ? { group: block.group } : {}),
    intentRoots: [...block.intentRoots],
    containers: block.containers.map((container) => ({
      id: container.id,
      title: container.title,
      kind: container.kind,
      paths: [...container.paths],
      ...(container.basis ? { basis: container.basis } : {}),
      ...(container.vector ? { vector: container.vector } : {}),
      ...(container.goal ? { goal: container.goal } : {}),
      ...(container.analysis ? { analysis: container.analysis } : {}),
      ...(container.decision ? { decision: container.decision } : {}),
      ...(container.labels && Object.keys(container.labels).length > 0 ? { labels: { ...container.labels } } : {}),
    })),
  };
}

const moduleDir = fileURLToPath(new URL('.', import.meta.url));
export const ARCHITECTURE_L1_CANON_REPO_ROOT = join(moduleDir, '..');

let cachedDefaultCanon = null;

export function getDefaultArchitectureL1Canon() {
  if (!cachedDefaultCanon) {
    cachedDefaultCanon = loadArchitectureL1Canon(ARCHITECTURE_L1_CANON_REPO_ROOT);
  }
  return cachedDefaultCanon;
}

export const ARCHITECTURE_L1_BLOCKS = getDefaultArchitectureL1Canon().blocks.map(toArchitectureL1BlockProjection);
export const ARCHITECTURE_L1_EDGES = getDefaultArchitectureL1Canon().edges.map((edge) => ({ ...edge }));
