import { attachDerivedWorkItemHierarchy, readWorkItemKind } from './workItemHierarchy.mjs';
import { buildIntentGraphProjection, resolveIntentBranchForAnalyticsRecord } from './intentGraphProjection.mjs';
import { enrichIntentRoadmapBranchWithCanvas } from './intentRoadmapCanvas.mjs';
import { parseCollapsedEpicIds } from './intentRoadmapEpicProjection.mjs';

export const INTENT_ROADMAP_PROJECTION_SCHEMA = 'workgraph.intent-roadmap.projection.v1';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });
const DONE_STATUSES = new Set(['done', 'verified']);

function buildRoadmapBranch(decision, intentGraph, workItems) {
  const decisionId = decision.id;
  const roots = workItems.filter((item) => {
    const labels = item.labels ?? {};
    return String(labels['intent.decision_id'] ?? '').trim() === decisionId
      && readWorkItemParentId(item) === '';
  });

  const buildNode = (item) => {
    const childItems = (item.childIds ?? [])
      .map((childId) => workItems.find((candidate) => candidate.id === childId))
      .filter(Boolean);

    const doneChildCount = childItems.filter((child) => DONE_STATUSES.has(child.status)).length;

    return {
      workId: item.id,
      title: item.title ?? item.id,
      status: item.status ?? '',
      parentId: item.parentId ?? '',
      itemKind: readWorkItemKind(item),
      childCount: childItems.length,
      doneChildCount,
      closeBlocked: childItems.length > 0 && doneChildCount < childItems.length,
      children: childItems.map(buildNode).sort((left, right) => compareText(left.workId, right.workId)),
    };
  };

  return {
    decisionId,
    decisionTitle: decision.title ?? decisionId,
    analyticsRef: decision.links?.analytics_ref ?? '',
    roots: roots.map(buildNode).sort((left, right) => compareText(left.workId, right.workId)),
  };
}

function readWorkItemParentId(item) {
  return String(item.parentId ?? item.labels?.['work.parent_id'] ?? '').trim();
}

export function buildIntentRoadmapProjection(intentNodes, workItems, options = {}) {
  const intentGraph = buildIntentGraphProjection(intentNodes, workItems, options);
  const enrichedWorkItems = attachDerivedWorkItemHierarchy(workItems);
  const selectedDecisions = intentGraph.nodes.filter((node) => node.nodeKind === 'decision' && node.selected === true);
  const canvasOptions = {
    collapsedEpicIds: parseCollapsedEpicIds(options.collapsed),
  };

  const branches = selectedDecisions.map((decision) =>
    enrichIntentRoadmapBranchWithCanvas(
      buildRoadmapBranch(decision, intentGraph, enrichedWorkItems),
      intentGraph.nodes,
      canvasOptions,
    ),
  ).sort((left, right) => compareText(left.decisionId, right.decisionId));

  return {
    schema: INTENT_ROADMAP_PROJECTION_SCHEMA,
    readOnly: true,
    branchCount: branches.length,
    branches,
    intentGraphSchema: intentGraph.schema,
  };
}

export function buildIntentRoadmapForAnalyticsRecord(record, intentNodes, workItems) {
  const intentGraph = buildIntentGraphProjection(intentNodes, workItems);
  const branch = resolveIntentBranchForAnalyticsRecord(record, intentGraph);
  if (!branch?.selectedDecision) {
    return null;
  }

  const projection = buildIntentRoadmapProjection(intentNodes, workItems);
  return projection.branches.find((entry) => entry.decisionId === branch.selectedDecision.id) ?? null;
}
