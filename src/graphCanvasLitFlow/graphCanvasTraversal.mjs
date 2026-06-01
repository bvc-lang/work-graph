function buildEdgeMaps(edges) {
  /** @type {Map<string, Set<string>>} */
  const outgoing = new Map();
  /** @type {Map<string, Set<string>>} */
  const incoming = new Map();

  for (const edge of edges ?? []) {
    if (!edge?.from || !edge?.to) {
      continue;
    }
    if (!outgoing.has(edge.from)) {
      outgoing.set(edge.from, new Set());
    }
    if (!incoming.has(edge.to)) {
      incoming.set(edge.to, new Set());
    }
    outgoing.get(edge.from).add(edge.to);
    incoming.get(edge.to).add(edge.from);
  }

  return { outgoing, incoming };
}

export function getOutgoingNodeIds(nodeId, edges) {
  const { outgoing } = buildEdgeMaps(edges);
  return [...(outgoing.get(nodeId) ?? [])];
}

export function getIncomingNodeIds(nodeId, edges) {
  const { incoming } = buildEdgeMaps(edges);
  return [...(incoming.get(nodeId) ?? [])];
}

export function getUpstreamNodeIds(nodeId, edges, visited = new Set()) {
  if (visited.has(nodeId)) {
    return [];
  }
  visited.add(nodeId);
  const direct = getIncomingNodeIds(nodeId, edges);
  const nested = direct.flatMap((id) => getUpstreamNodeIds(id, edges, visited));
  return [...new Set([...direct, ...nested])];
}

export function getDownstreamNodeIds(nodeId, edges, visited = new Set()) {
  if (visited.has(nodeId)) {
    return [];
  }
  visited.add(nodeId);
  const direct = getOutgoingNodeIds(nodeId, edges);
  const nested = direct.flatMap((id) => getDownstreamNodeIds(id, edges, visited));
  return [...new Set([...direct, ...nested])];
}

export function sortNodeIdsByVerticalPosition(nodeIds, nodes) {
  const byId = new Map((nodes ?? []).map((node) => [node.id, node]));
  return [...nodeIds].sort((left, right) => {
    const leftNode = byId.get(left);
    const rightNode = byId.get(right);
    const dy = (leftNode?.y ?? 0) - (rightNode?.y ?? 0);
    if (dy !== 0) {
      return dy;
    }
    return String(left).localeCompare(String(right), 'en');
  });
}

export function getSiblingNodeIds(nodeId, edges, nodes) {
  const parents = getIncomingNodeIds(nodeId, edges);
  if (parents.length === 0) {
    return [];
  }
  const siblings = parents.flatMap((parentId) => getOutgoingNodeIds(parentId, edges));
  return sortNodeIdsByVerticalPosition(
    siblings.filter((id) => id !== nodeId),
    nodes,
  );
}
