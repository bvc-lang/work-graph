export const GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA = 'workgraph.graph-canvas-lit-flow-projection.v1';

/**
 * @param {object} canvas intent roadmap canvas model
 * @param {{ viewId?: string }} [options]
 */
export function buildGraphCanvasProjectionFromIntentCanvas(canvas, options = {}) {
  const nodes = (canvas?.nodes ?? []).map((node) => ({
    id: node.id,
    kind: node.kind ?? 'unknown',
    title: node.title ?? node.id,
    layer: node.layer ?? '',
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 220,
    height: node.height ?? 78,
    selected: node.selected === true,
    rejected: node.kind === 'intent_option' && node.selected !== true,
    status: node.status ?? '',
    taskId: node.kind === 'work_item' || node.kind === 'work_epic' ? (node.workId ?? node.id) : undefined,
    intentNodeId: String(node.kind ?? '').startsWith('intent_') ? node.id : undefined,
    doneChildCount: node.doneChildCount,
    childCount: node.childCount,
  }));

  const edges = (canvas?.edges ?? []).map((edge, index) => ({
    id: edge.id ?? `${edge.from}-${edge.to}-${index}`,
    from: edge.from,
    to: edge.to,
    label: edge.label ?? '',
    rejected: edge.rejected === true,
    upstream: false,
  }));

  return {
    schema: GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA,
    layoutDirection: canvas?.layoutDirection ?? 'LR',
    viewId: options.viewId ?? 'intent-roadmap',
    nodes,
    edges,
  };
}

/**
 * @param {object} layout architecture layout from buildArchitectureLayout
 * @param {{ viewId?: string }} [options]
 */
export function buildGraphCanvasProjectionFromArchitectureLayout(layout, options = {}) {
  const nodes = (layout?.nodes ?? []).map((node) => ({
    id: node.block?.id ?? node.id,
    kind: 'architecture_block',
    title: node.block?.title ?? node.block?.id ?? node.id,
    layer: node.block?.layer ?? '',
    summary: node.block?.summary ?? '',
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 220,
    height: node.height ?? 78,
    focused: node.focused === true,
    blockId: node.block?.id ?? node.id,
  }));

  const edges = (layout?.edges ?? []).map((edge, index) => ({
    id: edge.id ?? `${edge.from}-${edge.to}-${index}`,
    from: edge.from,
    to: edge.to,
    label: edge.label ?? edge.type ?? '',
    rejected: false,
    upstream: edge.upstream === true || edge.type === 'maps_to',
  }));

  return {
    schema: GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA,
    layoutDirection: 'LR',
    viewId: options.viewId ?? 'architecture',
    nodes,
    edges,
  };
}

/**
 * @param {object} model schematic view model
 * @param {{ viewId?: string }} [options]
 */
export function buildGraphCanvasProjectionFromSchematicModel(model, options = {}) {
  const nodes = (model?.nodes ?? []).map((node) => ({
    id: node.id,
    kind: 'schematic_block',
    title: node.title ?? node.id,
    layer: node.layer ?? '',
    summary: node.summary ?? '',
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 220,
    height: node.height ?? 78,
    schematicId: node.id,
  }));

  const edges = (model?.edges ?? []).map((edge, index) => ({
    id: edge.id ?? `${edge.from}-${edge.to}-${index}`,
    from: edge.from,
    to: edge.to,
    label: edge.label ?? edge.type ?? '',
    rejected: false,
    upstream: edge.upstream === true,
  }));

  return {
    schema: GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA,
    layoutDirection: 'LR',
    viewId: options.viewId ?? 'schematic',
    nodes,
    edges,
  };
}

/**
 * @param {{ nodes?: Array<object>, edges?: Array<object> }} planeLayout
 * @param {{ viewId?: string }} [options]
 */
export function buildGraphCanvasProjectionFromIntentPlane(planeLayout, options = {}) {
  const nodes = (planeLayout?.nodes ?? []).map((node) => ({
    id: node.id,
    kind: node.kind ?? 'work_item',
    title: node.title ?? node.id,
    layer: node.layer ?? 'intent-plane',
    summary: node.summary ?? '',
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 220,
    height: node.height ?? 78,
    status: node.status ?? '',
    taskId: node.taskId ?? node.id,
    focused: node.focused === true,
    driftTier: node.driftTier ?? '',
  }));

  const edges = (planeLayout?.edges ?? []).map((edge, index) => ({
    id: edge.id ?? `${edge.from}-${edge.to}-${index}`,
    from: edge.from,
    to: edge.to,
    label: edge.label ?? '',
    rejected: false,
    upstream: edge.upstream === true,
  }));

  return {
    schema: GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA,
    layoutDirection: 'LR',
    viewId: options.viewId ?? 'intent-plane',
    nodes,
    edges,
  };
}
