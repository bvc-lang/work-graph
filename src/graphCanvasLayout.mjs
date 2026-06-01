/** @typedef {'layered-dag-v1' | 'pipeline-v1'} LayoutProfileKind */

/**
 * @typedef {{
 *   profile: LayoutProfileKind,
 *   ranks?: Record<string, number>,
 *   manualOverrides?: Record<string, { col?: number, row?: number, colSpan?: number }>,
 *   pipelineNodeIds?: string[],
 * }} LayoutProfile
 */

/**
 * @typedef {{
 *   nodeWidth?: number,
 *   nodeMinHeight?: number,
 *   colGap?: number,
 *   rowGap?: number,
 *   offsetX?: number,
 *   offsetY?: number,
 * }} GridLayoutConfig
 */

export const LAYOUT_PROFILE_LAYERED_DAG_V1 = 'layered-dag-v1';
export const LAYOUT_PROFILE_PIPELINE_V1 = 'pipeline-v1';

export const GRAPH_CANVAS_VIEW_FULL = 'full';
export const GRAPH_CANVAS_VIEW_PIPELINE = 'pipeline';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/** @type {LayoutProfile} */
export const ARCHITECTURE_LAYOUT_PROFILE = {
  profile: LAYOUT_PROFILE_LAYERED_DAG_V1,
  ranks: {
    'step-canon': 0,
    'work-graph': 0,
    'agent-runtime': 0,
    'trace-evidence': 0,
    'project-memory': 0,
    'domains': 1,
    'derived-projections': 1,
  },
  manualOverrides: {
    'step-canon': { col: 0, row: 0 },
    'work-graph': { col: 1, row: 0 },
    'agent-runtime': { col: 2, row: 0 },
    'trace-evidence': { col: 3, row: 0 },
    'project-memory': { col: 4, row: 0 },
    'domains': { col: 1, row: 1, colSpan: 2 },
    'derived-projections': { col: 3, row: 1 },
  },
};

/** @type {LayoutProfile} */
export const ARCHITECTURE_PIPELINE_LAYOUT_PROFILE = {
  profile: LAYOUT_PROFILE_PIPELINE_V1,
  pipelineNodeIds: [
    'step-canon',
    'work-graph',
    'agent-runtime',
    'trace-evidence',
    'project-memory',
  ],
};

/** @type {LayoutProfile} */
export const SCHEMATIC_LAYOUT_PROFILE = {
  profile: LAYOUT_PROFILE_LAYERED_DAG_V1,
  ranks: {
    'intent-tree': 0,
    'work-graph': 0,
    'runner': 0,
    'evidence': 0,
    'memory': 1,
    'graph-rag': 1,
    'ui': 1,
    'domains': 1,
    'storage': 2,
  },
  manualOverrides: {
    'intent-tree': { col: 0, row: 0 },
    'work-graph': { col: 1, row: 0 },
    'runner': { col: 2, row: 0 },
    'evidence': { col: 3, row: 0 },
    'memory': { col: 0, row: 1 },
    'graph-rag': { col: 1, row: 1 },
    'ui': { col: 2, row: 1 },
    'domains': { col: 3, row: 1, colSpan: 2 },
    'storage': { col: 1, row: 2, colSpan: 2 },
  },
};

/** @type {LayoutProfile} */
export const SCHEMATIC_PIPELINE_LAYOUT_PROFILE = {
  profile: LAYOUT_PROFILE_PIPELINE_V1,
  pipelineNodeIds: [
    'intent-tree',
    'work-graph',
    'runner',
    'evidence',
    'memory',
    'graph-rag',
    'ui',
  ],
};

/**
 * @param {unknown} profile
 * @returns {LayoutProfile}
 */
export function normalizeLayoutProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new TypeError('layoutProfile must be an object');
  }

  const candidate = /** @type {LayoutProfile} */ (profile);
  if (candidate.profile !== LAYOUT_PROFILE_LAYERED_DAG_V1 && candidate.profile !== LAYOUT_PROFILE_PIPELINE_V1) {
    throw new RangeError(`Unknown layout profile: ${String(candidate.profile)}`);
  }

  if (candidate.profile === LAYOUT_PROFILE_PIPELINE_V1) {
    const pipelineNodeIds = [...(candidate.pipelineNodeIds ?? [])].map(String).filter(Boolean);
    if (pipelineNodeIds.length === 0) {
      throw new RangeError('pipeline-v1 layoutProfile requires pipelineNodeIds');
    }
    return {
      profile: LAYOUT_PROFILE_PIPELINE_V1,
      pipelineNodeIds,
    };
  }

  return {
    profile: LAYOUT_PROFILE_LAYERED_DAG_V1,
    ranks: candidate.ranks ? { ...candidate.ranks } : {},
    manualOverrides: candidate.manualOverrides ? { ...candidate.manualOverrides } : {},
  };
}

/**
 * @param {string} viewMode
 * @param {{ full?: LayoutProfile, pipeline?: LayoutProfile }} profiles
 * @returns {LayoutProfile}
 */
export function resolveLayoutProfileForViewMode(viewMode, profiles) {
  if (viewMode === GRAPH_CANVAS_VIEW_PIPELINE) {
    return normalizeLayoutProfile(profiles.pipeline);
  }
  return normalizeLayoutProfile(profiles.full);
}

/**
 * @param {{ nodeIds: string[], edges: Array<{ from: string, to: string, upstream?: boolean }>, layoutProfile: LayoutProfile }} input
 * @returns {Map<string, { col: number, row: number, colSpan?: number }>}
 */
export function computeNodeSlots({ nodeIds, edges, layoutProfile }) {
  const profile = normalizeLayoutProfile(layoutProfile);
  const slots = new Map();

  if (profile.profile === LAYOUT_PROFILE_PIPELINE_V1) {
    const orderedIds = profile.pipelineNodeIds.filter((id) => nodeIds.includes(id));
    orderedIds.forEach((id, index) => {
      slots.set(id, { col: index, row: 0, colSpan: 1 });
    });
    for (const id of nodeIds) {
      if (!slots.has(id)) {
        slots.set(id, { col: orderedIds.length, row: 0, colSpan: 1 });
      }
    }
    return slots;
  }

  const forwardEdges = edges.filter((edge) => !edge.upstream);
  const rankById = new Map(nodeIds.map((id) => [id, profile.ranks?.[id] ?? null]));

  for (const id of nodeIds) {
    if (rankById.get(id) === null || rankById.get(id) === undefined) {
      rankById.set(id, inferRankFromForwardEdges(id, forwardEdges, rankById, nodeIds));
    }
  }

  const nodesByRow = new Map();
  for (const id of [...nodeIds].sort(compareText)) {
    const override = profile.manualOverrides?.[id];
    if (override && Number.isInteger(override.row) && Number.isInteger(override.col)) {
      slots.set(id, {
        col: override.col,
        row: override.row,
        colSpan: override.colSpan ?? 1,
      });
      continue;
    }

    const row = rankById.get(id) ?? 0;
    const rowNodes = nodesByRow.get(row) ?? [];
    rowNodes.push(id);
    nodesByRow.set(row, rowNodes);
  }

  for (const [row, ids] of nodesByRow.entries()) {
    ids.sort(compareText).forEach((id, index) => {
      if (slots.has(id)) {
        return;
      }
      const override = profile.manualOverrides?.[id];
      slots.set(id, {
        col: Number.isInteger(override?.col) ? override.col : index,
        row,
        colSpan: override?.colSpan ?? 1,
      });
    });
  }

  for (const id of nodeIds) {
    if (!slots.has(id)) {
      slots.set(id, { col: 0, row: 0, colSpan: 1 });
    }
  }

  return slots;
}

/**
 * @param {string} nodeId
 * @param {Array<{ from: string, to: string }>} forwardEdges
 * @param {Map<string, number | null>} rankById
 * @param {string[]} nodeIds
 */
function inferRankFromForwardEdges(nodeId, forwardEdges, rankById, nodeIds) {
  const incoming = forwardEdges.filter((edge) => edge.to === nodeId);
  if (incoming.length === 0) {
    return 0;
  }

  let maxParentRank = 0;
  for (const edge of incoming) {
    if (!nodeIds.includes(edge.from)) {
      continue;
    }
    const parentRank = rankById.get(edge.from);
    const resolvedParentRank = parentRank === null || parentRank === undefined
      ? inferRankFromForwardEdges(edge.from, forwardEdges, rankById, nodeIds)
      : parentRank;
    rankById.set(edge.from, resolvedParentRank);
    maxParentRank = Math.max(maxParentRank, resolvedParentRank + 1);
  }

  return maxParentRank;
}

/**
 * @param {Array<{ row: number, height: number }>} nodes
 * @param {GridLayoutConfig} config
 */
export function buildGraphCanvasRowTops(nodes, config) {
  const rowGap = config.rowGap ?? 96;
  const offsetY = config.offsetY ?? 32;
  const nodeMinHeight = config.nodeMinHeight ?? 112;
  const rowHeights = new Map();

  for (const node of nodes) {
    rowHeights.set(node.row, Math.max(rowHeights.get(node.row) ?? 0, node.height));
  }

  const rowTops = new Map();
  let y = offsetY;
  const maxRow = Math.max(...nodes.map((node) => node.row), 0);
  for (let row = 0; row <= maxRow; row += 1) {
    rowTops.set(row, y);
    y += (rowHeights.get(row) ?? nodeMinHeight) + rowGap;
  }

  return rowTops;
}

/**
 * @param {{
 *   items: Array<{ id: string, [key: string]: unknown }>,
 *   edges: Array<{ from: string, to: string, upstream?: boolean }>,
 *   layoutProfile: LayoutProfile,
 *   estimateSize: (item: object, slot: { colSpan?: number }) => { width: number, height: number },
 *   config?: GridLayoutConfig,
 * }} input
 */
export function placeGraphCanvasNodes({ items, edges, layoutProfile, estimateSize, config = {} }) {
  const nodeWidth = config.nodeWidth ?? 228;
  const colGap = config.colGap ?? 72;
  const offsetX = config.offsetX ?? 32;
  const offsetY = config.offsetY ?? 32;

  const nodeIds = items.map((item) => item.id);
  const slots = computeNodeSlots({ nodeIds, edges, layoutProfile });

  const nodes = items.map((item) => {
    const slot = slots.get(item.id) ?? { col: 0, row: 0, colSpan: 1 };
    const colSpan = slot.colSpan ?? 1;
    const { width, height } = estimateSize(item, slot);
    return {
      item,
      id: item.id,
      x: offsetX + slot.col * (nodeWidth + colGap),
      y: offsetY,
      width: colSpan > 1 ? nodeWidth * colSpan + colGap * (colSpan - 1) : width,
      height,
      row: slot.row,
      col: slot.col,
      colSpan,
    };
  });

  const rowTops = buildGraphCanvasRowTops(nodes, config);
  for (const node of nodes) {
    node.y = rowTops.get(node.row) ?? offsetY;
  }

  return nodes;
}

/**
 * @param {{
 *   nodes: Array<{ id: string, x: number, y: number, width: number, height: number }>,
 *   nodeIds: string[],
 *   edges: Array<{ from: string, to: string, upstream?: boolean }>,
 * }} input
 */
export function filterGraphForViewMode({ nodes, nodeIds, edges, viewMode, pipelineNodeIds }) {
  if (viewMode !== GRAPH_CANVAS_VIEW_PIPELINE) {
    return {
      nodes,
      edges,
      nodeIds,
    };
  }

  const allowed = new Set(pipelineNodeIds.filter((id) => nodeIds.includes(id)));
  return {
    nodes: nodes.filter((node) => allowed.has(node.id)),
    edges: edges.filter((edge) => allowed.has(edge.from) && allowed.has(edge.to) && !edge.upstream),
    nodeIds: pipelineNodeIds.filter((id) => allowed.has(id)),
  };
}

function segmentIntersects(a1, a2, b1, b2) {
  const det = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(det) < 1e-9) {
    return false;
  }

  const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
  const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;
  return lambda > 0.01 && lambda < 0.99 && gamma > 0.01 && gamma < 0.99;
}

function edgeSegment(edge) {
  const geometry = edge.geometry;
  if (!geometry) {
    return null;
  }
  return {
    a: { x: geometry.startX, y: geometry.startY },
    b: { x: geometry.endX, y: geometry.endY },
  };
}

function nodeBoxes(nodes) {
  return nodes.map((node) => ({
    id: node.id,
    left: node.x,
    top: node.y,
    right: node.x + node.width,
    bottom: node.y + node.height,
  }));
}

function pointInBox(x, y, box, padding = 4) {
  return x >= box.left - padding
    && x <= box.right + padding
    && y >= box.top - padding
    && y <= box.bottom + padding;
}

function minGapBetweenNodes(nodes) {
  let minGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const gapX = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
      const gapY = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
      const gap = Math.max(gapX, gapY);
      if (gap < minGap) {
        minGap = gap;
      }
    }
  }
  return Number.isFinite(minGap) ? minGap : 0;
}

/**
 * @param {{
 *   nodes: Array<{ id: string, x: number, y: number, width: number, height: number }>,
 *   edges: Array<{ from: string, to: string, geometry?: { labelX?: number, labelY?: number, startX?: number, startY?: number, endX?: number, endY?: number } }>,
 * }} layout
 */
export function computeLayoutQualityMetrics(layout) {
  const boxes = nodeBoxes(layout.nodes);
  const segments = layout.edges.map(edgeSegment).filter(Boolean);

  let edgeCrossings = 0;
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      if (segmentIntersects(segments[i].a, segments[i].b, segments[j].a, segments[j].b)) {
        edgeCrossings += 1;
      }
    }
  }

  let labelsUnderNodes = 0;
  for (const edge of layout.edges) {
    const geometry = edge.geometry;
    if (!geometry || !Number.isFinite(geometry.labelX) || !Number.isFinite(geometry.labelY)) {
      continue;
    }
    for (const box of boxes) {
      if (box.id === edge.from || box.id === edge.to) {
        continue;
      }
      if (pointInBox(geometry.labelX, geometry.labelY, box)) {
        labelsUnderNodes += 1;
        break;
      }
    }
  }

  return {
    edgeCrossings,
    minGap: minGapBetweenNodes(layout.nodes),
    labelsUnderNodes,
  };
}

/** @type {{ edgeCrossings: number, minGap: number, labelsUnderNodes: number }} */
export const LAYOUT_QUALITY_THRESHOLDS = {
  edgeCrossings: 12,
  minGap: 24,
  labelsUnderNodes: 0,
};

/**
 * @param {{ edgeCrossings: number, minGap: number, labelsUnderNodes: number }} metrics
 * @param {{ edgeCrossings?: number, minGap?: number, labelsUnderNodes?: number }} [thresholds]
 */
export function assertLayoutQuality(metrics, thresholds = LAYOUT_QUALITY_THRESHOLDS) {
  const failures = [];
  if (metrics.edgeCrossings > (thresholds.edgeCrossings ?? LAYOUT_QUALITY_THRESHOLDS.edgeCrossings)) {
    failures.push(`edge_crossings ${metrics.edgeCrossings} > ${thresholds.edgeCrossings ?? LAYOUT_QUALITY_THRESHOLDS.edgeCrossings}`);
  }
  if (metrics.minGap < (thresholds.minGap ?? LAYOUT_QUALITY_THRESHOLDS.minGap)) {
    failures.push(`min_gap ${metrics.minGap} < ${thresholds.minGap ?? LAYOUT_QUALITY_THRESHOLDS.minGap}`);
  }
  if (metrics.labelsUnderNodes > (thresholds.labelsUnderNodes ?? LAYOUT_QUALITY_THRESHOLDS.labelsUnderNodes)) {
    failures.push(`labels_under_nodes ${metrics.labelsUnderNodes} > ${thresholds.labelsUnderNodes ?? LAYOUT_QUALITY_THRESHOLDS.labelsUnderNodes}`);
  }
  return failures;
}
