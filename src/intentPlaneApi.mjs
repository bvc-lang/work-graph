import { buildGraphCanvasProjectionFromIntentPlane } from './graphCanvasLitFlow/graphCanvasProjection.mjs';
import { buildSemanticDriftBatch, driftScoreMapFromBatch, driftTierMapFromBatch } from './semanticDrift.mjs';
import { queryIntentPlane } from './queryIntentPlane.mjs';

export const INTENT_PLANE_GRAPH_SCHEMA = 'intent.plane.graph.v1';

const NODE_W = 220;
const NODE_H = 88;
const GAP_X = 120;
const GAP_Y = 24;

function nodeLevels(queryResult) {
  const levels = new Map();
  const focus = queryResult.focusWorkId;
  if (focus) {
    levels.set(focus, 0);
  }

  for (const edge of queryResult.edges ?? []) {
    const fromLevel = levels.get(edge.from);
    if (fromLevel !== undefined && !levels.has(edge.to)) {
      levels.set(edge.to, fromLevel + 1);
    }
    const toLevel = levels.get(edge.to);
    if (toLevel !== undefined && !levels.has(edge.from)) {
      levels.set(edge.from, Math.max(0, toLevel - 1));
    }
  }

  for (const node of queryResult.nodes ?? []) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  }

  return levels;
}

export function layoutIntentPlaneGraphNodes(queryResult, options = {}) {
  const driftScores = options.driftScores ?? new Map();
  const driftTiers = options.driftTiers ?? new Map();
  const levels = nodeLevels(queryResult);
  const byLevel = new Map();

  for (const node of queryResult.nodes ?? []) {
    const level = levels.get(node.id) ?? 0;
    if (!byLevel.has(level)) {
      byLevel.set(level, []);
    }
    byLevel.get(level).push(node);
  }

  const layoutNodes = [];
  for (const [level, nodes] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
    nodes.sort((left, right) => String(left.id).localeCompare(String(right.id)));
    nodes.forEach((node, index) => {
      const driftScore = driftScores.get(node.id);
      const driftTier = driftTiers.get(node.id) ?? '';
      layoutNodes.push({
        id: node.id,
        kind: 'work_item',
        title: node.title ?? node.id,
        layer: 'intent-plane',
        status: node.status ?? '',
        taskId: node.id,
        x: level * (NODE_W + GAP_X),
        y: index * (NODE_H + GAP_Y),
        width: NODE_W,
        height: NODE_H,
        summary: driftScore !== undefined ? `drift ${Number(driftScore).toFixed(2)}` : '',
        driftTier,
        focused: node.id === queryResult.focusWorkId,
      });
    });
  }

  return layoutNodes;
}

export function buildIntentPlaneGraphResponse(items, options = {}) {
  const start = String(options.start ?? options.workId ?? '').trim();
  const direction = String(options.direction ?? 'downstream').trim();
  const depth = Number.isInteger(options.depth) ? options.depth : Number(options.depth) || 1;
  const includeDrift = options.drift === true || options.drift === '1' || options.drift === 1;

  if (start === '') {
    throw new TypeError('start work id is required');
  }

  const query = queryIntentPlane(items, {
    startNode: { id: start },
    direction,
    depth,
  }, options);

  let driftBatch = null;
  const driftScores = new Map();
  const driftTiers = new Map();

  if (includeDrift) {
    const workIds = new Set((query.nodes ?? []).map((node) => node.id));
    driftBatch = buildSemanticDriftBatch(
      items.filter((item) => workIds.has(item.id)),
      { limit: workIds.size },
    );
    for (const [workId, score] of driftScoreMapFromBatch(driftBatch)) {
      driftScores.set(workId, score);
    }
    for (const [workId, tier] of driftTierMapFromBatch(driftBatch)) {
      driftTiers.set(workId, tier);
    }
  }

  const layoutNodes = layoutIntentPlaneGraphNodes(query, { driftScores, driftTiers });
  const edges = (query.edges ?? []).map((edge, index) => ({
    id: `${edge.from}-${edge.to}-${index}`,
    from: edge.from,
    to: edge.to,
    label: edge.relation ?? '',
  }));

  const projection = buildGraphCanvasProjectionFromIntentPlane({
    nodes: layoutNodes,
    edges,
  }, { viewId: 'intent-plane' });

  return {
    schema: INTENT_PLANE_GRAPH_SCHEMA,
    start,
    direction,
    depth,
    query,
    projection,
    driftBatch,
  };
}
