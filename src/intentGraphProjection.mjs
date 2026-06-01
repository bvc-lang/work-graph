import { attachDerivedWorkItemHierarchy, readWorkItemParentId } from './workItemHierarchy.mjs';
import {
  attachDerivedIntentNodeChildren,
  readIntentNodeLink,
} from './intentNodeRuntime.mjs';

export const INTENT_GRAPH_PROJECTION_SCHEMA = 'workgraph.intent-graph.projection.v1';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });
const DONE_STATUSES = new Set(['done', 'verified']);

function summarizeIntentNode(node) {
  return {
    id: node.id,
    nodeKind: node.nodeKind,
    parentId: node.parentId,
    title: node.title,
    selected: node.selected === true,
    childIds: [...(node.childIds ?? [])],
    links: { ...(node.links ?? {}) },
  };
}

function summarizeWorkItemBranch(item, itemsById) {
  const enriched = itemsById.get(item.id) ?? item;
  const childIds = enriched.childIds ?? [];
  const doneChildCount = childIds.filter((childId) => {
    const child = itemsById.get(childId);
    return child && DONE_STATUSES.has(child.status);
  }).length;

  return {
    id: item.id,
    title: item.title ?? item.id,
    status: item.status ?? '',
    parentId: readWorkItemParentId(item),
    childIds,
    doneChildCount,
    childCount: childIds.length,
    intentQuestionId: String(item.labels?.['intent.question_id'] ?? '').trim(),
    intentOptionId: String(item.labels?.['intent.option_id'] ?? '').trim(),
    intentDecisionId: String(item.labels?.['intent.decision_id'] ?? '').trim(),
  };
}

export function buildIntentGraphLinks(nodes) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const links = [];

  for (const node of nodes) {
    if (node.parentId !== '' && nodeById.has(node.parentId)) {
      const parent = nodeById.get(node.parentId);
      let relation = 'child_of';
      if (parent.nodeKind === 'question' && node.nodeKind === 'option') {
        relation = 'offers_option';
      } else if (parent.nodeKind === 'question' && node.nodeKind === 'decision') {
        relation = 'analyzes';
      } else if (node.nodeKind === 'work_ref') {
        relation = 'creates_work';
      }

      links.push({
        id: `intent:${parent.id}:${relation}:${node.id}`,
        from: { kind: 'intent_node', id: parent.id },
        to: { kind: 'intent_node', id: node.id },
        relation,
      });
    }

    const analyticsRef = readIntentNodeLink(node, 'analytics_ref');
    if (analyticsRef !== '') {
      links.push({
        id: `intent:${node.id}:analyzes:${analyticsRef}`,
        from: { kind: 'intent_node', id: node.id },
        to: { kind: 'analytics_record', id: analyticsRef },
        relation: 'analyzes',
      });
    }

    const optionId = readIntentNodeLink(node, 'option_id');
    if (node.nodeKind === 'decision' && optionId !== '') {
      links.push({
        id: `intent:${node.id}:selects:${optionId}`,
        from: { kind: 'intent_node', id: node.id },
        to: { kind: 'intent_node', id: optionId },
        relation: 'selects',
      });
    }

    const workId = readIntentNodeLink(node, 'work_id');
    if (node.nodeKind === 'work_ref' && workId !== '') {
      links.push({
        id: `intent:${node.id}:creates_work:${workId}`,
        from: { kind: 'intent_node', id: node.id },
        to: { kind: 'work', id: workId },
        relation: 'creates_work',
      });
    }
  }

  return links.sort((left, right) => compareText(left.id, right.id));
}

export function buildIntentGraphProjection(intentNodes, workItems = [], options = {}) {
  const nodes = attachDerivedIntentNodeChildren(intentNodes);
  const enrichedWorkItems = attachDerivedWorkItemHierarchy(workItems);
  const itemsById = new Map(enrichedWorkItems.map((item) => [item.id, item]));

  return {
    schema: INTENT_GRAPH_PROJECTION_SCHEMA,
    readOnly: true,
    source: options.source ?? 'intent-tree',
    nodeCount: nodes.length,
    linkCount: 0,
    nodes: nodes.map(summarizeIntentNode),
    links: buildIntentGraphLinks(nodes),
    workItems: enrichedWorkItems.map((item) => summarizeWorkItemBranch(item, itemsById)),
  };
}

export function resolveIntentBranchForAnalyticsRecord(record, projection) {
  const analyticsRef = String(record?.id ?? '').trim();
  if (analyticsRef === '' || !projection) {
    return null;
  }

  const nodes = projection.nodes ?? [];
  const question = nodes.find((node) =>
    node.nodeKind === 'question'
    && (readIntentNodeLink(node, 'analytics_ref') === analyticsRef
      || node.links?.analytics_ref === analyticsRef),
  ) ?? nodes.find((node) => node.nodeKind === 'question' && node.childIds?.length > 0
    && nodes.some((child) => child.parentId === node.id && readIntentNodeLink(child, 'analytics_ref') === analyticsRef));

  if (!question) {
    const fallbackQuestion = nodes.find((node) =>
      node.nodeKind === 'question'
      && String(node.id).includes(analyticsRef.replace(/^analytics:/u, '')),
    );
    if (!fallbackQuestion) {
      return null;
    }
    return buildBranchFromQuestion(fallbackQuestion, nodes, projection.workItems ?? []);
  }

  return buildBranchFromQuestion(question, nodes, projection.workItems ?? []);
}

function buildBranchFromQuestion(question, nodes, workItems) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const decisions = nodes.filter((node) => node.nodeKind === 'decision');
  const selectedDecision = decisions.find((node) => node.selected === true)
    ?? decisions.find((node) => readIntentNodeLink(node, 'analytics_ref') !== '')
    ?? null;
  const selectedOptionId = selectedDecision
    ? readIntentNodeLink(selectedDecision, 'option_id')
    : '';

  const options = (question.childIds ?? [])
    .map((childId) => nodeById.get(childId))
    .filter((node) => node?.nodeKind === 'option')
    .map((node) => ({
      ...summarizeIntentNode(node),
      selected: node.selected === true || node.id === selectedOptionId,
    }));

  const decisionId = selectedDecision?.id ?? '';
  const branchWorkItems = workItems.filter((item) =>
    item.intentDecisionId === decisionId
    || (decisionId !== '' && item.intentQuestionId === question.id),
  );

  const relatedIntentNodes = nodes.filter((node) =>
    node.id === question.id
    || node.parentId === question.id
    || (selectedDecision && (node.id === selectedDecision.id || node.parentId === selectedDecision.id)),
  ).map(summarizeIntentNode);

  return {
    question: summarizeIntentNode(question),
    options,
    selectedDecision: selectedDecision ? summarizeIntentNode(selectedDecision) : null,
    relatedIntentNodes,
    branchWorkItems,
  };
}

export function attachIntentGraphToAnalyticsRecords(records, intentGraph) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  return records.map((record) => {
    const branch = resolveIntentBranchForAnalyticsRecord(record, intentGraph);
    if (!branch) {
      return record;
    }

    return {
      ...record,
      intentGraph: branch,
      relatedIntentNodes: branch.relatedIntentNodes,
      intentQuestion: branch.question,
      intentOptions: branch.options,
      selectedDecision: branch.selectedDecision,
    };
  });
}
