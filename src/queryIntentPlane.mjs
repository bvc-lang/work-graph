import {
  buildIntentPlaneLinkageIndex,
  queryIntentPlaneIndex,
} from './intentPlaneLinkageIndex.mjs';

export const INTENT_PLANE_QUERY_SCHEMA = 'intent.plane.query.v1';

const VALID_DIRECTIONS = new Set(['downstream', 'upstream', 'lateral', 'both']);

function filterNodes(nodes, filters = {}) {
  return nodes.filter((node) => {
    if (filters.status && node.status !== filters.status) {
      return false;
    }
    if (filters.department && node.department !== filters.department) {
      return false;
    }
    return true;
  });
}

function upstreamEdges(index, workId, depth) {
  const edges = [];
  const nodeIds = new Set([workId]);
  let frontier = [workId];

  for (let level = 0; level < depth; level += 1) {
    const next = [];
    for (const edge of index.edges) {
      if (!frontier.includes(edge.to)) {
        continue;
      }
      edges.push({ ...edge, direction: 'upstream' });
      if (!nodeIds.has(edge.from)) {
        nodeIds.add(edge.from);
        next.push(edge.from);
      }
    }
    frontier = next;
  }

  return { edges, nodeIds };
}

function lateralEdges(index, workId) {
  const focus = index.nodes.find((node) => node.id === workId);
  const parentId = focus?.parentId ?? '';
  if (parentId === '') {
    return { edges: [], nodeIds: new Set([workId]) };
  }

  const siblings = index.nodes
    .filter((node) => node.parentId === parentId && node.id !== workId)
    .map((node) => node.id);

  const edges = siblings.map((siblingId) => ({
    from: workId,
    to: siblingId,
    relation: 'parent_of',
    direction: 'lateral',
    sourceWorkId: workId,
  }));

  return {
    edges,
    nodeIds: new Set([workId, ...siblings]),
  };
}

export function queryIntentPlane(items, args = {}, options = {}) {
  const startId = String(args.startNode?.id ?? args.workId ?? '').trim();
  const direction = String(args.direction ?? 'downstream').trim();
  const depth = Number.isInteger(args.depth) ? args.depth : 1;

  if (startId === '') {
    throw new TypeError('startNode.id is required');
  }
  if (depth < 0 || depth > 3) {
    return {
      schema: 'intent.plane.query.result.v1',
      error: 'depth_out_of_range',
      focusWorkId: startId,
      nodes: [],
      edges: [],
    };
  }
  if (!VALID_DIRECTIONS.has(direction)) {
    return {
      schema: 'intent.plane.query.result.v1',
      error: 'invalid_direction',
      focusWorkId: startId,
      nodes: [],
      edges: [],
    };
  }

  const index = options.index ?? buildIntentPlaneLinkageIndex(items, options);
  const focusExists = index.nodes.some((node) => node.id === startId);
  if (!focusExists) {
    return {
      schema: 'intent.plane.query.result.v1',
      error: 'unknown_start_node',
      focusWorkId: startId,
      nodes: [],
      edges: [],
    };
  }

  let nodeIds = new Set([startId]);
  let edges = [];

  if (direction === 'downstream' || direction === 'both') {
    const downstream = queryIntentPlaneIndex(index, { workId: startId, depth, limit: 256 });
    for (const node of downstream.nodes) {
      nodeIds.add(node.id);
    }
    edges = edges.concat(downstream.edges.map((edge) => ({ ...edge, direction: 'downstream' })));
  }

  if (direction === 'upstream' || direction === 'both') {
    const upstream = upstreamEdges(index, startId, depth);
    upstream.nodeIds.forEach((id) => nodeIds.add(id));
    edges = edges.concat(upstream.edges);
  }

  if (direction === 'lateral') {
    const lateral = lateralEdges(index, startId);
    lateral.nodeIds.forEach((id) => nodeIds.add(id));
    edges = edges.concat(lateral.edges);
  }

  const nodes = filterNodes(
    index.nodes.filter((node) => nodeIds.has(node.id)),
    args.filters ?? {},
  );

  const result = {
    schema: 'intent.plane.query.result.v1',
    focusWorkId: startId,
    direction,
    depth,
    nodes,
    edges,
  };

  if (args.returnFormat === 'markdown') {
    result.markdown = [
      `# Intent plane: ${startId}`,
      `direction=${direction} depth=${depth}`,
      '',
      '## Nodes',
      ...nodes.map((node) => `- ${node.id} (${node.status}) ${node.title ?? ''}`),
      '',
      '## Edges',
      ...edges.map((edge) => `- ${edge.from} → ${edge.to} [${edge.relation}]`),
    ].join('\n');
  }

  return result;
}
