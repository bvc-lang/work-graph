import {
  buildGraphCanvasEdgeLabelHtml,
  buildGraphCanvasEdgeStrokeStyle,
} from './graphCanvasEdgeLabels.mjs';

/**
 * @param {object} edge
 * @param {Array<{ id: string, x?: number, y?: number, width?: number, height?: number }>} layoutNodes
 */
function buildFlowEdgeHandles(edge, layoutNodes) {
  const from = layoutNodes.find((node) => node.id === edge.from);
  const to = layoutNodes.find((node) => node.id === edge.to);
  if (!from || !to) {
    return { sourceHandle: 'source', targetHandle: 'target', edgeType: 'default' };
  }

  const dx = (to.x ?? 0) - (from.x ?? 0);
  const dy = (to.y ?? 0) - (from.y ?? 0);
  const horizontal = dx > ((from.width ?? 0) * 0.35);
  const verticalDown = !horizontal && dy > 12;

  if (verticalDown) {
    return {
      sourceHandle: 'source-bottom',
      targetHandle: 'target-top',
      edgeType: 'smoothstep',
    };
  }

  if (horizontal) {
    return {
      sourceHandle: 'source',
      targetHandle: 'target',
      edgeType: 'default',
    };
  }

  return { sourceHandle: 'source', targetHandle: 'target', edgeType: 'default' };
}

/**
 * @param {object} edge
 * @param {Array<{ id: string, x?: number, y?: number, width?: number, height?: number }>} layoutNodes
 * @param {'dark' | 'light'} theme
 */
function buildFlowEdgeLabelFields(edge, layoutNodes, theme) {
  const label = String(edge.label ?? '').trim();
  if (label === '') {
    return {};
  }

  const from = layoutNodes.find((node) => node.id === edge.from);
  const to = layoutNodes.find((node) => node.id === edge.to);
  const html = buildGraphCanvasEdgeLabelHtml(label, theme, { rejected: edge.rejected === true });
  const handles = buildFlowEdgeHandles(edge, layoutNodes);

  if (handles.edgeType === 'smoothstep' && label === 'подзадача') {
    return {};
  }

  if (handles.edgeType === 'default' && (to?.x ?? 0) > (from?.x ?? 0) + ((from?.width ?? 0) * 0.35)) {
    return { startLabel: label, startLabelHtml: html };
  }

  return {};
}

/**
 * @param {import('./graphCanvasProjection.mjs').GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA extends string ? object : never} projection
 * @param {{ theme?: 'dark' | 'light' }} [options]
 */
export function graphCanvasProjectionToFlow(projection, options = {}) {
  const theme = options.theme === 'light' ? 'light' : 'dark';
  const layoutNodes = projection?.nodes ?? [];
  const nodes = (projection?.nodes ?? []).map((node) => ({
    id: node.id,
    type: 'graph-card',
    position: { x: node.x, y: node.y },
    data: {
      kind: node.kind,
      title: node.title,
      layer: node.layer ?? '',
      summary: node.summary ?? '',
      status: node.status ?? '',
      selected: node.selected === true,
      rejected: node.rejected === true,
      focused: node.focused === true,
      taskId: node.taskId ?? '',
      intentNodeId: node.intentNodeId ?? '',
      blockId: node.blockId ?? '',
      schematicId: node.schematicId ?? '',
      doneChildCount: node.doneChildCount ?? 0,
      childCount: node.childCount ?? 0,
      driftTier: node.driftTier ?? '',
    },
    width: node.width,
    height: node.height,
    draggable: false,
    selectable: true,
  }));

  const edges = (projection?.edges ?? []).map((edge) => {
    const rejected = edge.rejected === true;
    const handles = buildFlowEdgeHandles(edge, layoutNodes);
    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: '',
      type: handles.edgeType,
      animated: false,
      selectable: false,
      markerEnd: {
        type: 'ArrowClosed',
        width: 14,
        height: 14,
        color: buildGraphCanvasEdgeStrokeStyle(edge, theme).stroke,
      },
      data: {
        rejected,
        upstream: edge.upstream === true,
        ...buildFlowEdgeLabelFields(edge, layoutNodes, theme),
      },
      style: {
        ...buildGraphCanvasEdgeStrokeStyle(edge, theme),
        strokeWidth: rejected ? 1.75 : 2.25,
      },
    };
  });

  return { nodes, edges };
}
