import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const STEP_GRAPH_SLICE_SCHEMA = 'step-graph.slice.v1';
export const STEP_GRAPH_PROJECTION_SCHEMA = 'step-graph.projection.v1';
export const STEP_GRAPH_NODE_SEP = '\u001f';

const STEP_BLOCK_PATTERN = /^#([^\n<]+)<\[\n([\s\S]*?)\n\]>/gmu;
const STEP_REF_PATTERN = /#([A-Za-zА-Яа-яЁё0-9_]+)/gu;

const DEFAULT_SCAN_ROOTS = [
  'charter',
  'protocols',
  'plans',
  'intent',
  'ui',
  'rules',
  'skills',
  'work',
];

const DEFAULT_MAX_NODES = 32;
const DEFAULT_MAX_DEPTH = 2;

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function normalizeLogicalPath(path) {
  return String(path ?? '').replace(/\\/g, '/').trim();
}

function globalNodeId(logicalPath, stepName) {
  return `${normalizeLogicalPath(logicalPath)}${STEP_GRAPH_NODE_SEP}${stepName}`;
}

function previewText(body, maxLen = 120) {
  const lines = String(body ?? '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  const text = lines.join(' ').replace(/\s+/gu, ' ').trim();
  if (text.length <= maxLen) {
    return text;
  }

  return `${text.slice(0, maxLen)}…`;
}

function extractStepRefTargets(text, selfName) {
  const out = new Set();
  for (const match of String(text ?? '').matchAll(STEP_REF_PATTERN)) {
    const name = match[1];
    if (!name || name === selfName) {
      continue;
    }

    if (name.endsWith('[') || name.includes('<')) {
      continue;
    }

    out.add(name);
  }

  return [...out];
}

function parseStepBlocks(text) {
  return [...String(text ?? '').matchAll(STEP_BLOCK_PATTERN)].map((match) => ({
    name: match[1].trim(),
    body: match[2],
  }));
}

async function walkStepFiles(absoluteRoot, relativeDir, output) {
  const current = join(absoluteRoot, relativeDir);
  let entries = [];

  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const rel = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }

      await walkStepFiles(absoluteRoot, rel, output);
      continue;
    }

    if (entry.isFile() && (entry.name.endsWith('.bvc') || entry.name.endsWith('.bvc'))) {
      output.add(normalizeLogicalPath(rel));
    }
  }
}

export async function collectStepFilePaths(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const roots = options.roots ?? DEFAULT_SCAN_ROOTS;
  const paths = new Set();

  for (const root of roots) {
    await walkStepFiles(cwd, root, paths);
  }

  return [...paths].sort(compareText);
}

export async function readProjectStepFiles(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const paths = options.paths ?? await collectStepFilePaths(options);
  const files = [];

  for (const logicalPath of paths) {
    const text = await readFile(join(cwd, logicalPath), 'utf8');
    files.push({ logicalPath, text });
  }

  return files.sort((left, right) => compareText(left.logicalPath, right.logicalPath));
}

export function buildStepGraphProjectionV1(files, options = {}) {
  if (!Array.isArray(files)) {
    throw new TypeError('files must be an array');
  }

  const nameToGlobalIds = new Map();
  const nodes = [];
  const edges = [];
  let edgeIndex = 0;

  for (const { logicalPath, text } of files) {
    const blocks = parseStepBlocks(text);
    const blockNames = new Set(blocks.map((block) => block.name));

    for (const block of blocks) {
      const nodeId = globalNodeId(logicalPath, block.name);
      nodes.push({
        id: nodeId,
        stepName: block.name,
        logicalPath,
        preview: previewText(block.body),
      });

      const bucket = nameToGlobalIds.get(block.name) ?? [];
      bucket.push(nodeId);
      nameToGlobalIds.set(block.name, bucket);
    }

    for (const block of blocks) {
      const sourceId = globalNodeId(logicalPath, block.name);
      const refs = extractStepRefTargets(block.body, block.name);

      for (const refName of refs) {
        if (blockNames.has(refName)) {
          edges.push({
            id: `step-edge-${edgeIndex += 1}`,
            from: sourceId,
            to: globalNodeId(logicalPath, refName),
            relation: 'step_ref',
            scope: 'intra_file',
          });
          continue;
        }

        const candidates = [...(nameToGlobalIds.get(refName) ?? [])].sort(compareText);
        if (candidates.length === 0) {
          continue;
        }

        edges.push({
          id: `step-edge-${edgeIndex += 1}`,
          from: sourceId,
          to: candidates[0],
          relation: 'step_ref',
          scope: candidates.length > 1 ? 'cross_file_ambiguous' : 'cross_file',
          candidateCount: candidates.length,
        });
      }
    }
  }

  const maxNodes = Number.isInteger(options.maxNodes) && options.maxNodes > 0
    ? options.maxNodes
    : null;

  const sortedNodes = nodes.sort((left, right) => compareText(left.id, right.id));
  const sortedEdges = edges.sort((left, right) => compareText(left.id, right.id));

  return {
    schema: STEP_GRAPH_PROJECTION_SCHEMA,
    fileCount: files.length,
    nodeCount: sortedNodes.length,
    edgeCount: sortedEdges.length,
    truncated: maxNodes !== null && sortedNodes.length > maxNodes,
    nodes: maxNodes === null ? sortedNodes : sortedNodes.slice(0, maxNodes),
    edges: sortedEdges,
  };
}

function resolveSeedNodeId(projection, options = {}) {
  const seedNodeId = normalizeLogicalPath(options.seedNodeId ?? options.nodeId ?? '');
  if (seedNodeId.includes(STEP_GRAPH_NODE_SEP)) {
    return seedNodeId;
  }

  const seedStepName = String(options.seedStepName ?? options.stepName ?? '').trim();
  const seedPath = normalizeLogicalPath(options.seedPath ?? options.logicalPath ?? '');

  if (seedStepName && seedPath) {
    return globalNodeId(seedPath, seedStepName);
  }

  if (seedStepName) {
    const matches = projection.nodes.filter((node) => node.stepName === seedStepName);
    if (matches.length === 1) {
      return matches[0].id;
    }

    if (matches.length > 1) {
      throw new Error(`ambiguous seedStepName: ${seedStepName} (${matches.length} nodes)`);
    }

    throw new Error(`unknown seedStepName: ${seedStepName}`);
  }

  if (seedPath) {
    const matches = projection.nodes.filter((node) => node.logicalPath === seedPath);
    if (matches.length >= 1) {
      return matches[0].id;
    }

    throw new Error(`no step blocks in seedPath: ${seedPath}`);
  }

  throw new Error('seedStepName, seedPath or seedNodeId is required');
}

export function buildStepGraphSliceV1(projection, options = {}) {
  const seedId = resolveSeedNodeId(projection, options);
  const nodeById = new Map(projection.nodes.map((node) => [node.id, node]));
  if (!nodeById.has(seedId)) {
    throw new Error(`seed node not found in projection: ${seedId}`);
  }

  const maxNodes = Number.isInteger(options.maxNodes) && options.maxNodes > 0
    ? options.maxNodes
    : DEFAULT_MAX_NODES;
  const maxDepth = Number.isInteger(options.maxDepth) && options.maxDepth >= 0
    ? options.maxDepth
    : DEFAULT_MAX_DEPTH;

  const adjacency = new Map();
  for (const edge of projection.edges) {
    const bucket = adjacency.get(edge.from) ?? [];
    bucket.push(edge);
    adjacency.set(edge.from, bucket);
  }

  const nodes = new Map([[seedId, nodeById.get(seedId)]]);
  const edges = [];
  const queue = [{ id: seedId, depth: 0 }];
  const visited = new Set([seedId]);

  while (queue.length > 0 && nodes.size < maxNodes) {
    const current = queue.shift();
    for (const edge of adjacency.get(current.id) ?? []) {
      edges.push(edge);
      const next = nodeById.get(edge.to);
      if (!next) {
        continue;
      }

      nodes.set(next.id, next);
      if (current.depth < maxDepth && !visited.has(next.id) && nodes.size < maxNodes) {
        visited.add(next.id);
        queue.push({ id: next.id, depth: current.depth + 1 });
      }
    }
  }

  return {
    schema: STEP_GRAPH_SLICE_SCHEMA,
    seedNodeId: seedId,
    maxNodes,
    maxDepth,
    truncated: nodes.size >= maxNodes,
    nodeCount: nodes.size,
    edgeCount: edges.length,
    nodes: [...nodes.values()].sort((left, right) => compareText(left.id, right.id)),
    edges: [...edges].sort((left, right) => compareText(left.id, right.id)),
  };
}

export async function buildStepGraphProjectionFromRepo(options = {}) {
  const files = await readProjectStepFiles(options);
  return buildStepGraphProjectionV1(files, options);
}

export async function buildStepGraphSliceFromRepo(options = {}) {
  const { maxNodes, maxDepth, seedStepName, seedPath, seedNodeId, nodeId, stepName, logicalPath, ...projectionOptions } =
    options;
  const projection = await buildStepGraphProjectionFromRepo(projectionOptions);
  return buildStepGraphSliceV1(projection, {
    ...(maxNodes !== undefined ? { maxNodes } : {}),
    ...(maxDepth !== undefined ? { maxDepth } : {}),
    ...(seedStepName !== undefined ? { seedStepName } : {}),
    ...(seedPath !== undefined ? { seedPath } : {}),
    ...(seedNodeId !== undefined ? { seedNodeId } : {}),
    ...(nodeId !== undefined ? { nodeId } : {}),
    ...(stepName !== undefined ? { stepName } : {}),
    ...(logicalPath !== undefined ? { logicalPath } : {}),
  });
}
