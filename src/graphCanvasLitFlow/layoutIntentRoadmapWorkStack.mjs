/**
 * Intent roadmap hybrid layout (n8n-style):
 * - intent spine (question → … → decision) via dagre LR
 * - work tree as a vertical stack column to the right of decision
 *
 * @param {Array<{ id: string, kind: string, width: number, height: number, [key: string]: unknown }>} workNodes
 * @param {Array<{ from: string, to: string }>} workEdges
 * @param {{ id: string, x: number, y: number, width: number, height: number }} anchorNode
 * @param {{ ranksep?: number, gap?: number }} [options]
 */
export function layoutIntentRoadmapWorkStack(workNodes, workEdges, anchorNode, options = {}) {
  if (!workNodes.length) {
    return new Map();
  }

  const ranksep = options.ranksep ?? 128;
  const gap = options.gap ?? 36;
  const byId = new Map(workNodes.map((node) => [node.id, node]));
  const order = [];

  /** @type {Set<string>} */
  const visited = new Set();
  const roots = workNodes.filter((node) => !workEdges.some((edge) => edge.to === node.id));

  function walk(nodeId) {
    if (visited.has(nodeId) || !byId.has(nodeId)) {
      return;
    }
    visited.add(nodeId);
    order.push(nodeId);
    for (const edge of workEdges.filter((candidate) => candidate.from === nodeId)) {
      walk(edge.to);
    }
  }

  for (const root of roots) {
    walk(root.id);
  }
  for (const node of workNodes) {
    walk(node.id);
  }

  const columnX = anchorNode.x + anchorNode.width + ranksep;
  /** @type {Map<string, object>} */
  const placed = new Map();

  let y = anchorNode.y + anchorNode.height / 2 - (byId.get(order[0])?.height ?? 0) / 2;

  for (const nodeId of order) {
    const node = byId.get(nodeId);
    if (!node) {
      continue;
    }
    placed.set(nodeId, {
      ...node,
      x: columnX,
      y,
    });
    y += node.height + gap;
  }

  return placed;
}

/**
 * @param {Array<{ kind?: string }>} nodes
 */
export function isIntentRoadmapIntentKind(kind) {
  return kind === 'intent_question'
    || kind === 'intent_analysis'
    || kind === 'intent_option'
    || kind === 'intent_decision';
}
