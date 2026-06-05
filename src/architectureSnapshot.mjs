import {
  getArchitectureL1Blocks,
  getArchitectureL1Edges,
  ARCHITECTURE_L1_CANON_REPO_ROOT,
  loadArchitectureL1Canon,
  toArchitectureL1BlockProjection,
} from './architectureL1Canon.mjs';
import {
  buildOnebasePvrgGraphFromProjectRoot,
  mergeOnebaseGraphIntoBlockL2Graph,
} from './onebasePvrgGraphNodes.mjs';
import { ARCHITECTURE_LAYOUT_PROFILE } from './graphCanvasLayout.mjs';
import { classifyWorkItemBlock } from './workItemBlockClassifier.mjs';

export { getArchitectureL1Blocks, getArchitectureL1Edges };
export { classifyWorkItemBlock };

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function countTasksByStatus(taskIds, itemById) {
  const counts = {};
  for (const taskId of taskIds) {
    const status = itemById.get(taskId)?.status ?? 'missing';
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => compareText(left, right)));
}

function collectArtifactPaths(blockId, items) {
  const paths = new Set();
  for (const item of items) {
    if (classifyWorkItemBlock(item) !== blockId) {
      continue;
    }
    for (const path of item.targetFiles ?? []) {
      paths.add(path);
    }
  }
  return [...paths].sort(compareText);
}

export const ARCHITECTURE_L2_MAX_NODES = 15;
export const L2_CONTAINER_HEIGHT = 104;
export const L2_FILE_HEIGHT = 82;
export const L2_ROW_GAP = 24;
export const L2_COLUMN_GAP = 184;
export const L2_CONTAINER_WIDTH = 252;
export const L2_FILE_WIDTH = 312;
export const L2_LAYOUT_TOP_PADDING = 24;

function normalizePathPrefix(path) {
  return String(path).replace(/\\/g, '/');
}

function pathMatchesPrefix(path, prefix) {
  const normalizedPath = normalizePathPrefix(path);
  const normalizedPrefix = normalizePathPrefix(prefix);
  if (normalizedPath === normalizedPrefix) {
    return true;
  }
  if (normalizedPrefix.endsWith('/')) {
    return normalizedPath.startsWith(normalizedPrefix);
  }
  return normalizedPath.startsWith(`${normalizedPrefix}/`) || normalizedPath.startsWith(normalizedPrefix);
}

function findContainerForPath(containers, path) {
  let best = null;

  for (const container of containers) {
    for (const containerPath of container.paths ?? []) {
      if (!pathMatchesPrefix(path, containerPath) && !pathMatchesPrefix(containerPath, path)) {
        continue;
      }

      const score = normalizePathPrefix(containerPath).length;
      if (!best || score > best.score) {
        best = { container, score };
      }
    }
  }

  return best?.container ?? null;
}

function containerEdgeType(kind) {
  if (kind === 'protocol') {
    return 'defines';
  }
  if (kind === 'runtime' || kind === 'ui') {
    return 'implements';
  }
  return 'uses';
}

function ensureFileNode(nodeById, path) {
  const id = `file:${path}`;
  if (!nodeById.has(id)) {
    nodeById.set(id, {
      id,
      kind: 'file',
      title: path.split('/').pop() || path,
      subtitle: 'artifact',
      path,
    });
  }
  return nodeById.get(id);
}

export function buildArchitectureBlockL2Graph(block, workItems = [], options = {}) {
  if (!block || typeof block.id !== 'string') {
    throw new TypeError('block must include id');
  }

  const maxNodes = options.maxNodes ?? ARCHITECTURE_L2_MAX_NODES;
  const containers = block.containers ?? [];
  const nodeById = new Map();
  const edges = [];
  const edgeKeys = new Set();

  for (const container of containers) {
    nodeById.set(`container:${container.id}`, {
      id: `container:${container.id}`,
      kind: 'container',
      title: container.title,
      subtitle: container.kind,
      paths: [...(container.paths ?? [])].sort(compareText),
      ...(container.basis ? { basis: container.basis } : {}),
      ...(container.vector ? { vector: container.vector } : {}),
      ...(container.goal ? { goal: container.goal } : {}),
      ...(container.analysis ? { analysis: container.analysis } : {}),
      ...(container.decision ? { decision: container.decision } : {}),
      ...(container.labels && Object.keys(container.labels).length > 0 ? { labels: { ...container.labels } } : {}),
    });

    for (const path of container.paths ?? []) {
      const fileNode = ensureFileNode(nodeById, path);
      const edgeKey = `${container.id}->${fileNode.id}:${containerEdgeType(container.kind)}`;
      if (!edgeKeys.has(edgeKey)) {
        edgeKeys.add(edgeKey);
        edges.push({
          from: `container:${container.id}`,
          to: fileNode.id,
          type: containerEdgeType(container.kind),
        });
      }
    }
  }

  const artifactPaths = [...new Set([
    ...(block.artifactPaths ?? []),
    ...workItems.flatMap((item) => item.targetFiles ?? []),
  ])].sort(compareText);

  for (const path of artifactPaths) {
    const container = findContainerForPath(containers, path);
    if (!container) {
      continue;
    }

    const fileNode = ensureFileNode(nodeById, path);
    const edgeKey = `${container.id}->${fileNode.id}:relates_file`;
    if (edgeKeys.has(edgeKey)) {
      continue;
    }

    edgeKeys.add(edgeKey);
    edges.push({
      from: `container:${container.id}`,
      to: fileNode.id,
      type: 'relates_file',
    });
  }

  const connectedIds = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const prunedNodes = [...nodeById.values()].filter(
    (node) => node.kind === 'container' || connectedIds.has(node.id),
  );
  const containerNodes = prunedNodes.filter((node) => node.kind === 'container');
  const fileNodes = prunedNodes.filter((node) => node.kind === 'file');
  const hiddenCount = Math.max(0, prunedNodes.length - maxNodes);
  const visibleNodes = [
    ...containerNodes,
    ...fileNodes.slice(0, Math.max(0, maxNodes - containerNodes.length)),
  ];

  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges
    .filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to))
    .sort((left, right) => compareText(`${left.from}\0${left.to}\0${left.type}`, `${right.from}\0${right.to}\0${right.type}`));

  return {
    schema: 'architecture.block_l2_graph.v1',
    blockId: block.id,
    nodes: visibleNodes,
    edges: visibleEdges,
    capped: hiddenCount > 0,
    hiddenCount,
    counts: {
      nodes: visibleNodes.length,
      edges: visibleEdges.length,
      containers: containerNodes.length,
      files: visibleNodes.filter((node) => node.kind === 'file').length,
    },
  };
}

export function layoutArchitectureL2Graph(graph) {
  const containerNodes = graph.nodes.filter((node) => node.kind === 'container');
  const fileNodes = graph.nodes.filter((node) => node.kind === 'file');
  const nodeById = new Map();
  const containerWidth = L2_CONTAINER_WIDTH;
  const fileWidth = L2_FILE_WIDTH;
  const containerX = 20;
  const fileX = containerX + containerWidth + L2_COLUMN_GAP;

  const containerLayouts = containerNodes.map((node) => ({
    node,
    width: containerWidth,
    height: estimateL2NodeHeight(node, containerWidth, L2_CONTAINER_HEIGHT),
  }));

  const containerStackHeight = containerLayouts.reduce(
    (sum, item, index) => sum + item.height + (index > 0 ? L2_ROW_GAP : 0),
    0,
  );

  let fileY = L2_LAYOUT_TOP_PADDING;
  const fileLayouts = [];
  for (const node of fileNodes) {
    const height = estimateL2NodeHeight(node, fileWidth, L2_FILE_HEIGHT);
    fileLayouts.push({ node, y: fileY, height });
    nodeById.set(node.id, {
      ...node,
      depth: 1,
      x: fileX,
      y: fileY,
      width: fileWidth,
      height,
    });
    fileY += height + L2_ROW_GAP;
  }

  const fileColumnTop = L2_LAYOUT_TOP_PADDING;
  const fileColumnBottom = fileLayouts.length > 0
    ? fileLayouts[fileLayouts.length - 1].y + fileLayouts[fileLayouts.length - 1].height
    : fileColumnTop + L2_FILE_HEIGHT;
  const fileColumnCenter = fileColumnTop + (fileColumnBottom - fileColumnTop) / 2;

  let containerY = fileLayouts.length > 0
    ? Math.max(L2_LAYOUT_TOP_PADDING, fileColumnCenter - containerStackHeight / 2)
    : L2_LAYOUT_TOP_PADDING;

  for (const item of containerLayouts) {
    nodeById.set(item.node.id, {
      ...item.node,
      depth: 0,
      x: containerX,
      y: containerY,
      width: item.width,
      height: item.height,
    });
    containerY += item.height + L2_ROW_GAP;
  }

  const layoutNodes = graph.nodes.map((node) => nodeById.get(node.id)).filter(Boolean);
  const rawEdges = graph.edges.map((edge) => ({
    ...edge,
    fromNode: nodeById.get(edge.from),
    toNode: nodeById.get(edge.to),
  })).filter((edge) => edge.fromNode && edge.toNode);

  const layoutEdges = assignBlockL2EdgeLanes(rawEdges);

  return {
    ...graph,
    layoutNodes,
    layoutEdges,
    width: fileX + fileWidth + 32,
    height: Math.max(containerY, fileY, L2_CONTAINER_HEIGHT + 48) + 16,
  };
}

function estimateL2NodeHeight(node, width, minHeight) {
  const contentWidth = Math.max(1, width - 28);
  const averageCharWidth = node.kind === 'file' ? 10 : 8;
  const approxCharsPerLine = Math.max(12, Math.floor(contentWidth / averageCharWidth));
  const titleText = node.kind === 'file' ? (node.path || node.title || '') : (node.title || '');
  const subtitleText = node.kind === 'file' ? '' : (node.subtitle || '');
  const titleLines = Math.max(1, Math.ceil(String(titleText).length / approxCharsPerLine));
  const subtitleLines = subtitleText ? Math.max(1, Math.ceil(String(subtitleText).length / approxCharsPerLine)) : 0;
  const kindLine = 20;
  const titleLineHeight = 22;
  const subtitleLineHeight = 21;
  const verticalPadding = 20;
  return Math.max(minHeight, verticalPadding + kindLine + titleLines * titleLineHeight + subtitleLines * subtitleLineHeight);
}

function assignBlockL2EdgeLanes(edges) {
  const incoming = new Map();
  edges.forEach((edge) => {
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    incoming.get(edge.to).push(edge);
  });

  return edges.map((edge) => {
    const inList = incoming.get(edge.to) ?? [];
    return {
      ...edge,
      inLane: inList.indexOf(edge),
      inLaneCount: inList.length,
    };
  });
}

export function buildArchitectureSnapshot(workGraphSnapshot, options = {}) {
  if (!workGraphSnapshot || workGraphSnapshot.schema !== 'workgraph.snapshot.v1') {
    throw new TypeError('workGraphSnapshot must be workgraph.snapshot.v1');
  }

  const repoRoot = options.repoRoot ?? ARCHITECTURE_L1_CANON_REPO_ROOT;
  const canon = loadArchitectureL1Canon(repoRoot, { canonPath: options.canonPath });
  const l1Blocks = canon.blocks.map(toArchitectureL1BlockProjection);

  const items = [...workGraphSnapshot.items].sort((left, right) => compareText(left.id, right.id));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const tasksByBlock = new Map(l1Blocks.map((block) => [block.id, []]));

  for (const item of items) {
    const blockId = classifyWorkItemBlock(item);
    tasksByBlock.get(blockId)?.push(item.id);
  }

  for (const taskIds of tasksByBlock.values()) {
    taskIds.sort(compareText);
  }

  const blocks = canon.blocks.map((canonBlock) => {
    const block = toArchitectureL1BlockProjection(canonBlock);
    const taskIds = tasksByBlock.get(block.id) ?? [];
    const blockItems = items.filter((item) => taskIds.includes(item.id));
    const blockSnapshot = {
      id: block.id,
      title: block.title,
      summary: block.summary,
      ...(canonBlock.group ? { group: canonBlock.group } : {}),
      basis: canonBlock.basis,
      vector: canonBlock.vector,
      goal: canonBlock.goal,
      analysis: canonBlock.analysis ?? '',
      decision: canonBlock.decision ?? '',
      labels: canonBlock.labels ?? {},
      layer: 'L1',
      intentRoots: [...block.intentRoots].sort(compareText),
      taskIds,
      taskCounts: countTasksByStatus(taskIds, itemById),
      containers: block.containers.map((container) => ({
        ...container,
        paths: [...container.paths].sort(compareText),
      })),
      artifactPaths: collectArtifactPaths(block.id, items),
    };
    blockSnapshot.l2Graph = layoutArchitectureL2Graph(
      buildArchitectureBlockL2Graph(blockSnapshot, blockItems),
    );
    return blockSnapshot;
  });

  const edges = canon.edges.map((edge) => ({ ...edge }));

  const focusBlockId = options.focusBlockId ?? null;
  if (focusBlockId !== null && !blocks.some((block) => block.id === focusBlockId)) {
    throw new RangeError(`Unknown focusBlockId: ${focusBlockId}`);
  }

  const onebaseGraph = options.onebaseGraph ?? buildOnebasePvrgGraphFromProjectRoot({
    repoRoot: options.repoRoot ?? process.cwd(),
    projectRoot: options.onebaseProjectRoot,
  });

  for (const block of blocks) {
    if (block.id !== 'domains') {
      continue;
    }

    block.onebaseGraph = onebaseGraph;
    block.l2Graph = layoutArchitectureL2Graph(
      mergeOnebaseGraphIntoBlockL2Graph(block.l2Graph, onebaseGraph, {
        maxNodes: options.maxNodes ?? ARCHITECTURE_L2_MAX_NODES,
      }),
    );
  }

  const containerCount = blocks.reduce((sum, block) => sum + block.containers.length, 0);

  return {
    schema: 'architecture.snapshot.v1',
    sourceSchema: 'workgraph.snapshot.v1',
    source: workGraphSnapshot.source ?? '.bvc',
    focusBlockId,
    l1Canon: {
      id: canon.passport?.id ?? canon.digest,
      version: canon.passport?.version ?? 1,
      digest: canon.digest,
      sourcePath: canon.sourcePath,
      charterRef: canon.passport?.charterRef ?? null,
      protocolRef: canon.passport?.protocolRef ?? null,
    },
    blocks,
    edges,
    layoutProfile: options.layoutProfile ?? ARCHITECTURE_LAYOUT_PROFILE,
    counts: {
      blocks: blocks.length,
      edges: edges.length,
      tasks: items.length,
      containers: containerCount,
    },
  };
}
