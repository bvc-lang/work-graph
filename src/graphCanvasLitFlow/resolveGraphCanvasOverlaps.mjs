/**
 * Post-layout pass: n8n stores manual positions; we auto-fix dagre underestimates
 * when several nodes share the same rank (vertical stacks in LR layout).
 *
 * @param {Array<{ id: string, x: number, y: number, width: number, height: number }>} nodes
 * @param {{ gap?: number, rankTolerance?: number, layoutDirection?: 'LR' | 'TB' | 'RL' | 'BT' }} [options]
 */
export function resolveGraphCanvasOverlaps(nodes, options = {}) {
  if (!nodes.length) {
    return nodes;
  }

  const gap = options.gap ?? 28;
  const rankTolerance = options.rankTolerance ?? 48;
  const horizontal = options.layoutDirection === 'LR' || options.layoutDirection === 'RL';
  const rankKey = horizontal
    ? (node) => Math.round(node.x / rankTolerance) * rankTolerance
    : (node) => Math.round(node.y / rankTolerance) * rankTolerance;
  const crossKey = horizontal
    ? (node) => node.y
    : (node) => node.x;

  /** @type {Map<number, Array<typeof nodes[number]>>} */
  const lanes = new Map();
  for (const node of nodes) {
    const key = rankKey(node);
    if (!lanes.has(key)) {
      lanes.set(key, []);
    }
    lanes.get(key).push(node);
  }

  for (const laneNodes of lanes.values()) {
    laneNodes.sort((left, right) => crossKey(left) - crossKey(right));
    for (let index = 1; index < laneNodes.length; index += 1) {
      const previous = laneNodes[index - 1];
      const current = laneNodes[index];
      const previousEnd = horizontal
        ? previous.y + previous.height
        : previous.x + previous.width;
      const currentStart = horizontal ? current.y : current.x;
      const minStart = previousEnd + gap;
      if (currentStart < minStart) {
        const shift = minStart - currentStart;
        for (let rest = index; rest < laneNodes.length; rest += 1) {
          if (horizontal) {
            laneNodes[rest].y += shift;
          } else {
            laneNodes[rest].x += shift;
          }
        }
      }
    }
  }

  return nodes;
}

/**
 * @param {Array<{ x: number, y: number, width: number, height: number }>} nodes
 */
export function graphCanvasNodesOverlap(nodes) {
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const separated = left.x + left.width <= right.x
        || right.x + right.width <= left.x
        || left.y + left.height <= right.y
        || right.y + right.height <= left.y;
      if (!separated) {
        return true;
      }
    }
  }
  return false;
}
