import {
  ARCHITECTURE_LAYOUT_PROFILE,
  ARCHITECTURE_PIPELINE_LAYOUT_PROFILE,
  GRAPH_CANVAS_VIEW_FULL,
  GRAPH_CANVAS_VIEW_PIPELINE,
  filterGraphForViewMode,
  placeGraphCanvasNodes,
  resolveLayoutProfileForViewMode,
} from './graphCanvasLayout.mjs';

const NODE_WIDTH = 200;
const NODE_MIN_HEIGHT = 88;
const COL_GAP = 72;
const ROW_GAP = 72;
const OFFSET_X = 24;
const OFFSET_Y = 24;
const NODE_PADDING_X = 20;
const HEADER_BLOCK_HEIGHT = 52;
const META_BLOCK_HEIGHT = 28;
const SUMMARY_LINE_HEIGHT = 18;
const SUMMARY_CHARS_PER_LINE = 32;
const SUMMARY_MAX_LINES = 2;

const GRID_CONFIG = {
  nodeWidth: NODE_WIDTH,
  nodeMinHeight: NODE_MIN_HEIGHT,
  colGap: COL_GAP,
  rowGap: ROW_GAP,
  offsetX: OFFSET_X,
  offsetY: OFFSET_Y,
};

function estimateSummaryLines(summary, width) {
  const charsPerLine = Math.max(
    16,
    Math.floor((width - NODE_PADDING_X) / (NODE_WIDTH / SUMMARY_CHARS_PER_LINE)),
  );
  const rawLines = Math.max(1, Math.ceil(String(summary ?? '').length / charsPerLine));
  return Math.min(SUMMARY_MAX_LINES, rawLines);
}

function estimateArchitectureNodeHeight(block, width) {
  const lines = estimateSummaryLines(block.summary, width);
  return Math.max(
    NODE_MIN_HEIGHT,
    HEADER_BLOCK_HEIGHT + lines * SUMMARY_LINE_HEIGHT + META_BLOCK_HEIGHT,
  );
}

export function assignArchitectureEdgeLanes(edges) {
  const outgoing = new Map();
  const incoming = new Map();

  edges.forEach((edge) => {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  });

  return edges.map((edge) => {
    const outList = outgoing.get(edge.from) ?? [];
    const inList = incoming.get(edge.to) ?? [];
    return {
      ...edge,
      outLane: outList.indexOf(edge),
      outLaneCount: outList.length,
      inLane: inList.indexOf(edge),
      inLaneCount: inList.length,
    };
  });
}

export function architectureEdgeGeometry(edge) {
  const from = edge.fromNode;
  const to = edge.toNode;
  const sameRow = from.row === to.row;
  const goesDown = to.row > from.row;
  const goesUp = to.row < from.row;

  let geometry;

  if (sameRow && to.col > from.col) {
    const laneOffset = (edge.outLane - (edge.outLaneCount - 1) / 2) * 14;
    geometry = {
      axis: 'horizontal',
      upstream: false,
      startX: from.x + from.width,
      startY: from.y + from.height / 2 + laneOffset,
      endX: to.x,
      endY: to.y + to.height / 2 + laneOffset,
    };
  } else if (goesDown) {
    const spread = from.width / (edge.outLaneCount + 1);
    const startX = from.x + spread * (edge.outLane + 1);
    const endSpread = to.width / (edge.inLaneCount + 1);
    const endX = to.x + endSpread * (edge.inLane + 1);
    geometry = {
      axis: 'vertical-down',
      upstream: false,
      startX,
      startY: from.y + from.height,
      endX,
      endY: to.y,
    };
  } else if (goesUp) {
    const spread = from.width / (edge.outLaneCount + 1);
    const startX = from.x + spread * (edge.outLane + 1);
    const endSpread = to.width / (edge.inLaneCount + 1);
    const endX = to.x + endSpread * (edge.inLane + 1);
    geometry = {
      axis: 'vertical-up',
      upstream: true,
      startX,
      startY: from.y,
      endX,
      endY: to.y + to.height,
    };
  } else {
    const laneOffset = (edge.outLane - (edge.outLaneCount - 1) / 2) * 14;
    geometry = {
      axis: 'horizontal-reverse',
      upstream: true,
      startX: from.x,
      startY: from.y + from.height / 2 + laneOffset,
      endX: to.x + to.width,
      endY: to.y + to.height / 2 + laneOffset,
    };
  }

  const labelX = (geometry.startX + geometry.endX) / 2;
  const labelY = geometry.axis === 'horizontal' || geometry.axis === 'horizontal-reverse'
    ? geometry.startY - 10
    : geometry.startY + (geometry.endY - geometry.startY) / 2;

  return {
    ...geometry,
    d: architectureEdgePath(geometry),
    labelX,
    labelY,
  };
}

export function architectureEdgePath(geometry) {
  const { startX, startY, endX, endY, axis } = geometry;
  if (axis === 'horizontal' || axis === 'horizontal-reverse') {
    const midX = startX + (endX - startX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }

  if (axis === 'vertical-down') {
    const midY = startY + Math.max(36, (endY - startY) / 2);
    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  }

  const midY = endY + Math.max(36, (startY - endY) / 2);
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

export function buildArchitectureLayout(architecture, focusBlockId = null, options = {}) {
  const viewMode = options.viewMode ?? GRAPH_CANVAS_VIEW_FULL;
  const layoutProfile = options.layoutProfile
    ?? resolveLayoutProfileForViewMode(viewMode, {
      full: ARCHITECTURE_LAYOUT_PROFILE,
      pipeline: ARCHITECTURE_PIPELINE_LAYOUT_PROFILE,
    });

  const blocks = architecture.blocks || [];
  const allEdges = (architecture.edges || []).map((edge) => ({
    ...edge,
    upstream: edge.type === 'maps_to',
  }));

  const filtered = filterGraphForViewMode({
    nodes: blocks,
    nodeIds: blocks.map((block) => block.id),
    edges: allEdges,
    viewMode,
    pipelineNodeIds: layoutProfile.pipelineNodeIds ?? [],
  });

  const placed = placeGraphCanvasNodes({
    items: filtered.nodes,
    edges: filtered.edges,
    layoutProfile,
    estimateSize: (block, slot) => {
      const colSpan = slot.colSpan ?? 1;
      const width = NODE_WIDTH * colSpan + COL_GAP * Math.max(0, colSpan - 1);
      return {
        width,
        height: estimateArchitectureNodeHeight(block, width),
      };
    },
    config: GRID_CONFIG,
  });

  const nodes = placed.map((node) => ({
    block: node.item,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    row: node.row,
    col: node.col,
    focused: focusBlockId === node.id,
  }));

  const nodeById = new Map(nodes.map((node) => [node.block.id, node]));
  const edges = assignArchitectureEdgeLanes(
    filtered.edges
      .map((edge) => ({ ...edge, fromNode: nodeById.get(edge.from), toNode: nodeById.get(edge.to) }))
      .filter((edge) => edge.fromNode && edge.toNode),
  ).map((edge) => ({
    ...edge,
    geometry: architectureEdgeGeometry(edge),
  }));

  const maxX = Math.max(...nodes.map((node) => node.x + node.width), NODE_WIDTH + OFFSET_X);
  const maxY = Math.max(...nodes.map((node) => node.y + node.height), NODE_MIN_HEIGHT + OFFSET_Y);

  return {
    nodes,
    edges,
    width: maxX + 64,
    height: maxY + 80,
    viewMode,
    layoutProfile,
  };
}
