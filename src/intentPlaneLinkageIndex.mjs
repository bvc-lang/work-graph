import { buildUnifiedLinkageProjectionV1 } from './unifiedLinkageProjection.mjs';

export const INTENT_PLANE_LINKAGE_INDEX_SCHEMA = 'intent.plane.linkage.index.v1';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export function buildIntentPlaneLinkageIndex(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const linkage = options.linkage ?? buildUnifiedLinkageProjectionV1(items, options);
  const workIds = new Set(items.map((item) => item.id));

  const nodes = items.map((item) => ({
    id: item.id,
    kind: 'work',
    title: item.title ?? item.id,
    status: item.status ?? 'unknown',
    department: item.labels?.['work.department'] ?? '',
    parentId: item.labels?.['work.parent_id'] ?? '',
  })).sort((left, right) => compareText(left.id, right.id));

  const edges = linkage.links
    .filter((link) => workIds.has(link.sourceWorkId))
    .map((link) => ({
      from: link.from?.id ?? link.sourceWorkId,
      to: link.to?.id ?? '',
      relation: link.relation ?? 'links',
      sourceWorkId: link.sourceWorkId,
    }))
    .filter((edge) => edge.to !== '');

  for (const node of nodes) {
    if (node.parentId && workIds.has(node.parentId)) {
      edges.push({
        from: node.parentId,
        to: node.id,
        relation: 'parent_of',
        sourceWorkId: node.id,
      });
    }
  }

  const normalizedEdges = edges
    .sort((left, right) => compareText(`${left.from}\0${left.to}`, `${right.from}\0${right.to}`));

  const byWorkId = new Map();
  for (const edge of edges) {
    if (!byWorkId.has(edge.sourceWorkId)) {
      byWorkId.set(edge.sourceWorkId, []);
    }
    byWorkId.get(edge.sourceWorkId).push(edge);
  }

  return {
    schema: INTENT_PLANE_LINKAGE_INDEX_SCHEMA,
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    adjacency: Object.fromEntries([...byWorkId.entries()].map(([workId, adjacent]) => [workId, adjacent])),
    linkageSchema: linkage.schema,
  };
}

export function queryIntentPlaneIndex(index, query = {}) {
  const workId = String(query.workId ?? '').trim();
  const depth = Number.isInteger(query.depth) && query.depth >= 0 ? query.depth : 1;

  if (workId === '') {
    return {
      schema: 'intent.plane.query.result.v1',
      focusWorkId: null,
      nodes: index.nodes.slice(0, query.limit ?? 64),
      edges: index.edges.slice(0, query.limit ?? 128),
    };
  }

  const visited = new Set([workId]);
  const edgeSet = new Set();
  let frontier = [workId];

  for (let level = 0; level < depth; level += 1) {
    const next = [];
    for (const current of frontier) {
      const adjacent = index.adjacency[current] ?? [];
      for (const edge of adjacent) {
        const key = `${edge.from}\0${edge.to}\0${edge.relation}`;
        edgeSet.add(key);
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          next.push(edge.to);
        }
      }
    }
    frontier = next;
  }

  const edges = index.edges.filter((edge) => edgeSet.has(`${edge.from}\0${edge.to}\0${edge.relation}`));
  const nodes = index.nodes.filter((node) => visited.has(node.id));

  return {
    schema: 'intent.plane.query.result.v1',
    focusWorkId: workId,
    depth,
    nodes,
    edges,
  };
}
