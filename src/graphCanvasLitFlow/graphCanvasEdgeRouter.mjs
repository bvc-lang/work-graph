/**
 * Work Graph edge router (n8n-style bezier / vertical cubic).
 * Used by SVG overlay; lit-flow flow-edge is not used for product views.
 */

/**
 * @param {{ x: number, width: number }} node
 * @param {number} targetCenterX
 */
function anchorX(node, targetCenterX) {
  const ratio = (targetCenterX - node.x) / Math.max(node.width, 1);
  return node.x + node.width * Math.max(0.15, Math.min(0.85, ratio));
}

/**
 * @param {{
 *   fromNode: { x: number, y: number, width: number, height: number },
 *   toNode: { x: number, y: number, width: number, height: number },
 *   rejected?: boolean,
 *   label?: string,
 * }} edge
 * @param {'LR' | 'TB' | string} [layoutDirection]
 */
export function buildGraphCanvasEdgeGeometry(edge, layoutDirection = 'LR') {
  const from = edge.fromNode;
  const to = edge.toNode;
  const fromCy = from.y + from.height / 2;
  const toCy = to.y + to.height / 2;
  const toCx = to.x + to.width / 2;
  const fromCx = from.x + from.width / 2;

  let startX;
  let startY;
  let endX;
  let endY;
  let orientation;

  if (layoutDirection === 'LR') {
    const goesRight = to.x > from.x + from.width - 8;
    if (goesRight) {
      orientation = 'horizontal';
      startX = from.x + from.width;
      startY = fromCy;
      endX = to.x;
      endY = toCy;
    } else if (toCy > fromCy + 8) {
      orientation = 'vertical';
      startX = anchorX(from, toCx);
      endX = anchorX(to, fromCx);
      startY = from.y + from.height;
      endY = to.y;
    } else {
      orientation = 'vertical-reverse';
      startX = anchorX(from, toCx);
      endX = anchorX(to, fromCx);
      startY = from.y;
      endY = to.y + to.height;
    }
  } else {
    const goesDown = toCy > fromCy + 8;
    if (goesDown) {
      orientation = 'vertical';
      startX = anchorX(from, toCx);
      endX = anchorX(to, fromCx);
      startY = from.y + from.height;
      endY = to.y;
    } else if (to.x >= from.x + from.width - 8) {
      orientation = 'horizontal';
      startX = from.x + from.width;
      startY = fromCy;
      endX = to.x;
      endY = toCy;
    } else {
      orientation = 'horizontal-reverse';
      startX = from.x;
      startY = fromCy;
      endX = to.x + to.width;
      endY = toCy;
    }
  }

  const dy = endY - startY;
  const dx = endX - startX;
  const bend = Math.max(28, Math.min(72, (Math.abs(dx) + Math.abs(dy)) * 0.22));
  const d = orientation === 'vertical' || orientation === 'vertical-reverse'
    ? `M ${startX} ${startY} C ${startX} ${startY + Math.sign(dy || 1) * bend}, ${endX} ${endY - Math.sign(dy || 1) * bend}, ${endX} ${endY}`
    : (() => {
      const midX = startX + (endX - startX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    })();

  const label = String(edge.label ?? '').trim();
  const hideLabel = orientation === 'vertical' && label === 'подзадача';

  return {
    d,
    startX,
    startY,
    endX,
    endY,
    orientation,
    rejected: edge.rejected === true,
    upstream: edge.upstream === true,
    label: hideLabel ? '' : label,
    labelX: (startX + endX) / 2,
    labelY: orientation === 'horizontal' || orientation === 'horizontal-reverse'
      ? Math.min(startY, endY) - 10
      : startY + (endY - startY) / 2,
    labelPlacement: orientation === 'horizontal' && to.x > from.x + from.width * 0.35
      ? 'start'
      : 'center',
  };
}

/**
 * @param {{
 *   layoutDirection?: string,
 *   nodes?: Array<{ id: string, x?: number, y?: number, width?: number, height?: number }>,
 *   edges?: Array<{ id?: string, from: string, to: string, label?: string, rejected?: boolean, upstream?: boolean }>,
 * }} projection
 */
export function buildGraphCanvasEdgeRoutes(projection) {
  const layoutDirection = projection?.layoutDirection ?? 'LR';
  const nodeById = new Map((projection?.nodes ?? []).map((node) => [node.id, node]));
  const routes = [];

  for (const edge of projection?.edges ?? []) {
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    if (!fromNode || !toNode) {
      continue;
    }
    routes.push({
      id: edge.id ?? `${edge.from}-${edge.to}`,
      from: edge.from,
      to: edge.to,
      ...buildGraphCanvasEdgeGeometry({ ...edge, fromNode, toNode }, layoutDirection),
    });
  }

  return routes;
}
