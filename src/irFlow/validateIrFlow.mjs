export const IR_FLOW_SCHEMA = 'ir.flow.v1';

const VALID_NODE_KINDS = new Set(['decision', 'action', 'merge', 'start', 'end']);

export function validateIrFlow(flow) {
  const errors = [];

  if (!flow || typeof flow !== 'object') {
    return { ok: false, errors: ['flow must be an object'] };
  }

  if (flow.schema !== IR_FLOW_SCHEMA) {
    errors.push(`schema must be ${IR_FLOW_SCHEMA}`);
  }

  if (!Array.isArray(flow.nodes) || flow.nodes.length === 0) {
    errors.push('nodes must be a non-empty array');
    return { ok: false, errors };
  }

  if (!Array.isArray(flow.edges)) {
    errors.push('edges must be an array');
    return { ok: false, errors };
  }

  const nodeIds = new Set();
  let startCount = 0;
  let endCount = 0;

  for (const node of flow.nodes) {
    if (!node?.id || typeof node.id !== 'string') {
      errors.push('each node requires string id');
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);

    if (!VALID_NODE_KINDS.has(node.kind)) {
      errors.push(`node ${node.id} has invalid kind: ${node.kind}`);
    }

    if (node.kind === 'start') {
      startCount += 1;
    }
    if (node.kind === 'end') {
      endCount += 1;
    }
  }

  if (startCount !== 1) {
    errors.push(`expected exactly one start node, found ${startCount}`);
  }
  if (endCount < 1) {
    errors.push('expected at least one end node');
  }

  for (const edge of flow.edges) {
    if (!edge?.from || !edge?.to) {
      errors.push('each edge requires from and to');
      continue;
    }
    if (!nodeIds.has(edge.from)) {
      errors.push(`edge from unknown node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`edge to unknown node: ${edge.to}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
