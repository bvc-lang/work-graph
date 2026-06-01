import {
  INTENT_NODE_KINDS,
  attachDerivedIntentNodeChildren,
  readIntentNodeLink,
} from './intentNodeRuntime.mjs';

export function lintIntentNodeGraph(intentNodes, workItems = []) {
  if (!Array.isArray(intentNodes)) {
    throw new TypeError('intentNodes must be an array');
  }

  const issues = [];
  const nodeById = new Map(intentNodes.map((node) => [node.id, node]));
  const workIds = new Set((workItems ?? []).map((item) => item.id));

  for (const node of intentNodes) {
    if (!INTENT_NODE_KINDS.includes(node.nodeKind)) {
      issues.push({
        severity: 'error',
        code: 'invalid_intent_node_kind',
        message: `Invalid intent.node_kind "${node.nodeKind}" for ${node.id}`,
        intentId: node.id,
      });
    }

    if (node.parentId === node.id) {
      issues.push({
        severity: 'error',
        code: 'intent_self_parent',
        message: `Intent node cannot be its own parent: ${node.id}`,
        intentId: node.id,
      });
    }

    if (node.parentId !== '' && !nodeById.has(node.parentId)) {
      issues.push({
        severity: 'error',
        code: 'missing_intent_parent',
        message: `Missing intent.parent_id "${node.parentId}" for ${node.id}`,
        intentId: node.id,
        parentId: node.parentId,
      });
    }

    if (node.parentId !== '') {
      const visited = new Set();
      let current = node.id;
      while (current !== '') {
        if (visited.has(current)) {
          issues.push({
            severity: 'error',
            code: 'intent_parent_cycle',
            message: `Intent parent cycle detected for ${node.id}`,
            intentId: node.id,
          });
          break;
        }
        visited.add(current);
        current = nodeById.get(current)?.parentId ?? '';
      }
    }

    if (node.nodeKind === 'decision' && node.selected) {
      const optionId = readIntentNodeLink(node, 'option_id');
      if (optionId === '' || !nodeById.has(optionId)) {
        issues.push({
          severity: 'error',
          code: 'selected_decision_missing_option',
          message: `Selected decision ${node.id} missing valid intent.link.option_id`,
          intentId: node.id,
          optionId,
        });
      }
    }

    if (node.nodeKind === 'work_ref') {
      const workId = readIntentNodeLink(node, 'work_id') || String(node.labels?.['intent.link.work_id'] ?? '').trim();
      if (workId !== '' && workIds.size > 0 && !workIds.has(workId)) {
        issues.push({
          severity: 'error',
          code: 'work_ref_missing_work_item',
          message: `work_ref ${node.id} points to missing work.id ${workId}`,
          intentId: node.id,
          workId,
        });
      }
    }
  }

  return issues;
}

export function lintIntentNodeGraphReport(intentNodes, workItems = []) {
  const issues = lintIntentNodeGraph(intentNodes, workItems);
  const errors = issues.filter((issue) => issue.severity === 'error');
  return {
    schema: 'workgraph.intent-node.lint.v1',
    ok: errors.length === 0,
    nodeCount: intentNodes.length,
    errorCount: errors.length,
    issues,
  };
}

export function summarizeIntentNodeLint(intentNodes, workItems = []) {
  return lintIntentNodeGraphReport(attachDerivedIntentNodeChildren(intentNodes), workItems);
}
