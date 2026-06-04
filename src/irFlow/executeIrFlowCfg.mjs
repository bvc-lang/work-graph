import { validateIrFlow } from './validateIrFlow.mjs';

export const IR_FLOW_EXECUTION_SCHEMA = 'ir.flow.execution.v1';

function nodeById(flow) {
  return new Map(flow.nodes.map((node) => [node.id, node]));
}

function outgoingEdges(flow, nodeId) {
  return flow.edges.filter((edge) => edge.from === nodeId);
}

function pickNextEdge(edges, context = {}) {
  if (edges.length === 0) {
    return null;
  }

  const conditioned = edges.filter((edge) => edge.condition);
  if (conditioned.length > 0) {
    for (const edge of conditioned) {
      const key = String(edge.condition);
      if (context[key] === true || context.decisions?.[key] === true) {
        return edge;
      }
    }
  }

  return edges[0];
}

export function executeIrFlowCfg(flow, context = {}) {
  const validation = validateIrFlow(flow);
  if (!validation.ok) {
    throw new Error(`invalid ir flow: ${validation.errors.join('; ')}`);
  }

  const nodes = nodeById(flow);
  const start = flow.nodes.find((node) => node.kind === 'start');
  /** @type {Array<{ nodeId: string, kind: string, at: string }>} */
  const trace = [];
  const visited = new Set();
  let currentId = start.id;
  let steps = 0;
  const maxSteps = flow.nodes.length * 4;

  while (steps < maxSteps) {
    steps += 1;
    const node = nodes.get(currentId);
    if (!node) {
      throw new Error(`missing node during execution: ${currentId}`);
    }

    trace.push({
      nodeId: node.id,
      kind: node.kind,
      at: new Date().toISOString(),
    });

    if (node.kind === 'end') {
      return {
        schema: IR_FLOW_EXECUTION_SCHEMA,
        status: 'completed',
        trace,
        endNodeId: node.id,
      };
    }

    if (visited.has(currentId) && node.kind !== 'merge') {
      return {
        schema: IR_FLOW_EXECUTION_SCHEMA,
        status: 'cycle_detected',
        trace,
        endNodeId: null,
      };
    }
    visited.add(currentId);

    const edges = outgoingEdges(flow, currentId);
    const nextEdge = pickNextEdge(edges, context);
    if (!nextEdge) {
      return {
        schema: IR_FLOW_EXECUTION_SCHEMA,
        status: 'blocked',
        trace,
        endNodeId: null,
      };
    }

    currentId = nextEdge.to;
  }

  return {
    schema: IR_FLOW_EXECUTION_SCHEMA,
    status: 'step_limit',
    trace,
    endNodeId: null,
  };
}
