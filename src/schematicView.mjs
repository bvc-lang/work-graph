import {
  GRAPH_CANVAS_VIEW_FULL,
  GRAPH_CANVAS_VIEW_PIPELINE,
  SCHEMATIC_LAYOUT_PROFILE,
  SCHEMATIC_PIPELINE_LAYOUT_PROFILE,
  filterGraphForViewMode,
  placeGraphCanvasNodes,
  resolveLayoutProfileForViewMode,
} from './graphCanvasLayout.mjs';

export { GRAPH_CANVAS_VIEW_FULL, GRAPH_CANVAS_VIEW_PIPELINE };

const NODE_WIDTH = 232;
const NODE_MIN_HEIGHT = 112;
const COL_GAP = 72;
const ROW_GAP = 96;
const OFFSET_X = 40;
const OFFSET_Y = 40;
const NODE_PADDING_X = 28;
const HEADER_BLOCK_HEIGHT = 54;
const SUMMARY_LINE_HEIGHT = 22;
const SUMMARY_CHARS_PER_LINE = 26;

const GRID_CONFIG = {
  nodeWidth: NODE_WIDTH,
  nodeMinHeight: NODE_MIN_HEIGHT,
  colGap: COL_GAP,
  rowGap: ROW_GAP,
  offsetX: OFFSET_X,
  offsetY: OFFSET_Y,
};

/** @typedef {{ id: string, title: string, summary: string, layer: string, action?: string, target?: string, protocolPath?: string }} SchematicNodeDef */
/** @typedef {{ id: string, from: string, to: string, type: string, label: string, upstream?: boolean }} SchematicEdgeDef */

/** @type {SchematicNodeDef[]} */
export const SCHEMATIC_NODE_DEFS = [
  {
    id: 'intent-tree',
    title: 'Дерево intent',
    summary: 'Каноничная раскладка .bvc атомов: корни intent, протоколы и задачи как устойчивая поверхность авторинга.',
    layer: 'авторинг',
    protocolPath: 'intent/index.bvc',
  },
  {
    id: 'work-graph',
    title: 'Work Graph',
    summary: 'Источник правды runtime: статусы, depends_on, target files, blockers и transition gates.',
    layer: 'рантайм',
    action: 'view:board',
  },
  {
    id: 'runner',
    title: 'Runner задач',
    summary: 'Производная очередь и локальный запуск worker поверх runnable WorkItem projections.',
    layer: 'исполнение',
    protocolPath: 'protocols/agent-worker-adapter.bvc',
  },
  {
    id: 'evidence',
    title: 'Доказательства',
    summary: 'Записи проверок, worker runs, blockers и gate outcomes, связанные с WorkItems.',
    layer: 'проверка',
    protocolPath: 'protocols/evidence-model-v1.bvc',
  },
  {
    id: 'memory',
    title: 'Память проекта',
    summary: 'Устойчивые решения, инварианты и факты, извлечённые из done work и operator review.',
    layer: 'память',
    protocolPath: 'protocols/project-memory-v1.bvc',
  },
  {
    id: 'graph-rag',
    title: 'Graph / RAG',
    summary: 'Производный context slice поверх Work Graph, доказательств, памяти и adapter facts для retrieval.',
    layer: 'проекция',
    action: 'view:board',
    protocolPath: 'protocols/pvrg-graph-rag-minimal.bvc',
  },
  {
    id: 'ui',
    title: 'UI оператора',
    summary: 'Доска, backlog, architecture map, schematic view и task detail drawer для operator loop.',
    layer: 'проекция',
    action: 'view:board',
    protocolPath: 'ui/operator-dashboard.bvc',
  },
  {
    id: 'domains',
    title: 'Домены',
    summary: 'L1 hub прикладных verticals: OneBase и Marketplace (L2) с maps_to на Work Graph.',
    layer: 'домен',
    protocolPath: 'intent/domains',
  },
  {
    id: 'storage',
    title: 'Хранилище / Snapshot',
    summary: '.bvc canon и deterministic JSON exports, пересобираемые для dashboard, worker и tests.',
    layer: 'хранилище',
    protocolPath: 'work/backlog.bvc',
  },
];

/** @type {SchematicEdgeDef[]} */
export const SCHEMATIC_EDGE_DEFS = [
  { id: 'intent-work', from: 'intent-tree', to: 'work-graph', type: 'feeds', label: 'питает' },
  { id: 'work-runner', from: 'work-graph', to: 'runner', type: 'uses', label: 'использует' },
  { id: 'runner-evidence', from: 'runner', to: 'evidence', type: 'feeds', label: 'пишет' },
  { id: 'evidence-work', from: 'evidence', to: 'work-graph', type: 'validates', label: 'проверяет', upstream: true },
  { id: 'evidence-memory', from: 'evidence', to: 'memory', type: 'feeds', label: 'пополняет' },
  { id: 'memory-graph', from: 'memory', to: 'graph-rag', type: 'feeds', label: 'даёт контекст' },
  { id: 'graph-ui', from: 'graph-rag', to: 'ui', type: 'feeds', label: 'показывает' },
  { id: 'work-ui', from: 'work-graph', to: 'ui', type: 'feeds', label: 'показывает' },
  { id: 'storage-work', from: 'storage', to: 'work-graph', type: 'rebuilds', label: 'пересобирает', upstream: true },
  { id: 'storage-evidence', from: 'storage', to: 'evidence', type: 'rebuilds', label: 'пересобирает', upstream: true },
  { id: 'storage-memory', from: 'storage', to: 'memory', type: 'rebuilds', label: 'пересобирает', upstream: true },
  { id: 'storage-graph', from: 'storage', to: 'graph-rag', type: 'rebuilds', label: 'пересобирает', upstream: true },
  { id: 'domains-work', from: 'domains', to: 'work-graph', type: 'maps_to', label: 'сопоставляется', upstream: true },
];

function estimateSummaryLines(summary, width) {
  const charsPerLine = Math.max(
    18,
    Math.floor((width - NODE_PADDING_X) / (NODE_WIDTH / SUMMARY_CHARS_PER_LINE)),
  );
  return Math.max(1, Math.ceil(String(summary).length / charsPerLine));
}

function estimateNodeHeight(summary, width) {
  const lines = estimateSummaryLines(summary, width);
  return Math.max(
    NODE_MIN_HEIGHT,
    HEADER_BLOCK_HEIGHT + lines * SUMMARY_LINE_HEIGHT + 20,
  );
}

/**
 * @param {object} [options]
 * @returns {{
 *   schema: 'schematic.view.v1',
 *   nodes: Array<SchematicNodeDef & { x: number, y: number, width: number, height: number }>,
 *   edges: Array<SchematicEdgeDef & { fromNode: object, toNode: object }>,
 *   width: number,
 *   height: number,
 *   viewMode: string,
 *   layoutProfile: object,
 * }}
 */
export function buildSchematicViewModel(options = {}) {
  const viewMode = options.viewMode ?? GRAPH_CANVAS_VIEW_FULL;
  const layoutProfile = options.layoutProfile
    ?? resolveLayoutProfileForViewMode(viewMode, {
      full: SCHEMATIC_LAYOUT_PROFILE,
      pipeline: SCHEMATIC_PIPELINE_LAYOUT_PROFILE,
    });

  const filtered = filterGraphForViewMode({
    nodes: SCHEMATIC_NODE_DEFS,
    nodeIds: SCHEMATIC_NODE_DEFS.map((node) => node.id),
    edges: SCHEMATIC_EDGE_DEFS,
    viewMode,
    pipelineNodeIds: layoutProfile.pipelineNodeIds ?? [],
  });

  const placed = placeGraphCanvasNodes({
    items: filtered.nodes,
    edges: filtered.edges,
    layoutProfile,
    estimateSize: (node, slot) => {
      const colSpan = slot.colSpan ?? 1;
      const width = NODE_WIDTH * colSpan + COL_GAP * Math.max(0, colSpan - 1);
      return {
        width,
        height: estimateNodeHeight(node.summary, width),
      };
    },
    config: GRID_CONFIG,
  });

  const nodes = placed.map((node) => ({
    ...node.item,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    col: node.col,
    row: node.row,
  }));

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = filtered.edges.map((edge) => ({
    ...edge,
    fromNode: nodeById.get(edge.from),
    toNode: nodeById.get(edge.to),
  }))
    .filter((edge) => edge.fromNode && edge.toNode)
    .map((edge) => ({
      ...edge,
      geometry: schematicEdgeGeometry(edge),
    }));

  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));

  return {
    schema: 'schematic.view.v1',
    nodes,
    edges,
    width: maxX + OFFSET_X,
    height: maxY + OFFSET_Y,
    viewMode,
    layoutProfile,
  };
}

function anchorX(node, towardX) {
  const ratio = (towardX - node.x) / node.width;
  return node.x + node.width * Math.max(0.12, Math.min(0.88, ratio));
}

/**
 * @param {ReturnType<typeof buildSchematicViewModel>['edges'][number]} edge
 */
export function schematicEdgeGeometry(edge) {
  const from = edge.fromNode;
  const to = edge.toNode;
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let startX;
  let startY;
  let endX;
  let endY;
  let orientation;

  if (from.row !== to.row) {
    orientation = 'vertical';
    const startBiasX = anchorX(from, toCx);
    const endBiasX = anchorX(to, fromCx);
    if (to.row > from.row) {
      startX = startBiasX;
      startY = from.y + from.height;
      endX = endBiasX;
      endY = to.y;
    } else {
      startX = startBiasX;
      startY = from.y;
      endX = endBiasX;
      endY = to.y + to.height;
    }
  } else if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
    orientation = 'horizontal';
    if (dx > 0) {
      startX = from.x + from.width;
      startY = fromCy;
      endX = to.x;
      endY = toCy;
    } else {
      startX = from.x;
      startY = fromCy;
      endX = to.x + to.width;
      endY = toCy;
    }
  } else {
    orientation = 'vertical';
    const startBiasX = anchorX(from, toCx);
    const endBiasX = anchorX(to, fromCx);
    if (dy >= 0) {
      startX = startBiasX;
      startY = from.y + from.height;
      endX = endBiasX;
      endY = to.y;
    } else {
      startX = startBiasX;
      startY = from.y;
      endX = endBiasX;
      endY = to.y + to.height;
    }
  }

  const bend = Math.max(32, Math.min(88, (Math.abs(dx) + Math.abs(dy)) * 0.22));
  const d = orientation === 'vertical'
    ? `M ${startX} ${startY} C ${startX} ${startY + Math.sign(dy || 1) * bend}, ${endX} ${endY - Math.sign(dy || 1) * bend}, ${endX} ${endY}`
    : (() => {
      const midX = startX + (endX - startX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    })();

  return {
    d,
    startX,
    startY,
    endX,
    endY,
    orientation,
    upstream: Boolean(edge.upstream),
    labelX: (startX + endX) / 2,
    labelY: orientation === 'horizontal' ? startY - 10 : startY + (endY - startY) / 2,
  };
}
