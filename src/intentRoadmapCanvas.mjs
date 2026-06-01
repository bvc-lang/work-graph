import { layoutGraphWithDagre } from './dagreGraphLayout.mjs';
import { buildGraphCanvasEdgeGeometry } from './graphCanvasLitFlow/graphCanvasEdgeRouter.mjs';
import { N8N_INSPIRED_DAGRE_LR } from './graphCanvasLitFlow/graphCanvasLayoutProfile.mjs';
import {
  GRAPH_CARD_MIN_HEIGHT,
  GRAPH_CARD_WIDTH,
  estimateGraphCardHeight,
} from './graphCanvasLitFlow/graphCanvasNodeMetrics.mjs';
import {
  isIntentRoadmapIntentKind,
  layoutIntentRoadmapWorkStack,
} from './graphCanvasLitFlow/layoutIntentRoadmapWorkStack.mjs';
import { findAllOptionsForQuestion } from './intentRoadmapMermaid.mjs';

export const INTENT_ROADMAP_CANVAS_SCHEMA = 'workgraph.intent-roadmap.canvas.v1';

const NODE_WIDTH = GRAPH_CARD_WIDTH;
const NODE_MIN_HEIGHT = GRAPH_CARD_MIN_HEIGHT;
const OFFSET_PADDING = 40;

function estimateCanvasNodeHeight(title, options = {}) {
  return estimateGraphCardHeight({
    title,
    status: options.status,
    summary: options.summary,
    layer: options.layer !== false,
  });
}

const KIND_LABELS = {
  intent_question: 'вопрос',
  intent_analysis: 'анализ',
  intent_option: 'вариант',
  intent_decision: 'решение',
  work_item: 'задача',
  work_epic: 'эпик',
};

function readOptionId(decision) {
  return String(decision?.links?.option_id ?? decision?.links?.['intent.link.option_id'] ?? '').trim();
}

function findQuestionForDecision(decision, intentNodes) {
  const parentId = String(decision?.parentId ?? '').trim();
  const parent = intentNodes.find((node) => node.id === parentId);
  if (parent?.nodeKind === 'question') {
    return parent;
  }
  return intentNodes.find((node) =>
    node.nodeKind === 'question'
    && (node.childIds ?? []).includes(decision.id),
  ) ?? null;
}

function findSelectedOption(decision, intentNodes) {
  const optionId = readOptionId(decision);
  if (optionId === '') {
    return null;
  }
  return intentNodes.find((node) => node.id === optionId && node.nodeKind === 'option') ?? null;
}

function analyticsNodeId(analyticsRef) {
  return `analysis:${String(analyticsRef).replace(/^analytics:/u, '')}`;
}

function analyticsTitle(analyticsRef) {
  const ref = String(analyticsRef ?? '').trim();
  if (ref === '') {
    return 'Анализ';
  }
  return `Анализ ${ref.replace(/^analytics:/u, '')}`;
}

function flattenWorkTree(roots, options = {}) {
  const collapsedEpicIds = options.collapsedEpicIds instanceof Set ? options.collapsedEpicIds : new Set();
  /** @type {Array<{ id: string, kind: 'work_item'|'work_epic', title: string, status: string, workId: string, doneChildCount?: number, childCount?: number, collapsible?: boolean, collapsed?: boolean }>} */
  const nodes = [];
  /** @type {Array<{ from: string, to: string, label: string }>} */
  const edges = [];

  function walk(node, parentWorkId = '') {
    const isEpic = node.itemKind === 'epic';
    const kind = isEpic ? 'work_epic' : 'work_item';
    const collapsed = isEpic && collapsedEpicIds.has(node.workId);

    nodes.push({
      id: node.workId,
      kind,
      title: node.title ?? node.workId,
      status: node.status ?? '',
      workId: node.workId,
      doneChildCount: node.doneChildCount ?? 0,
      childCount: node.childCount ?? 0,
      collapsible: isEpic && (node.childCount ?? 0) > 0,
      collapsed,
    });
    if (parentWorkId !== '') {
      edges.push({ from: parentWorkId, to: node.workId, label: 'подзадача' });
    }
    if (!collapsed) {
      for (const child of node.children ?? []) {
        walk(child, node.workId);
      }
    }
  }

  for (const root of roots) {
    walk(root);
  }

  return { nodes, edges };
}

/**
 * @param {{
 *   decisionId: string,
 *   decisionTitle?: string,
 *   analyticsRef?: string,
 *   question?: object | null,
 *   selectedOption?: object | null,
 *   allOptions?: Array<object>,
 *   decision?: object,
 *   roots?: Array<object>,
 * }} branch
 */
export function buildIntentRoadmapCanvasModel(branch, options = {}) {
  const decision = branch.decision ?? { id: branch.decisionId, title: branch.decisionTitle };
  const decisionId = decision.id ?? branch.decisionId;
  const selectedOptionId = branch.selectedOption?.id ?? readOptionId(decision);
  const allOptions = branch.allOptions ?? (branch.selectedOption ? [branch.selectedOption] : []);

  /** @type {Array<{ id: string, kind: string, title: string, width: number, height: number, selected?: boolean, status?: string, workId?: string, doneChildCount?: number, childCount?: number }>} */
  const specNodes = [];
  /** @type {Array<{ from: string, to: string, label: string, rejected?: boolean }>} */
  const specEdges = [];

  let optionAnchorId = null;

  if (branch.question) {
    const title = branch.question.title ?? branch.question.id;
    specNodes.push({
      id: branch.question.id,
      kind: 'intent_question',
      title,
      width: NODE_WIDTH,
      height: estimateCanvasNodeHeight(title),
    });
    optionAnchorId = branch.question.id;
  }

  if (branch.analyticsRef) {
    const analysisId = analyticsNodeId(branch.analyticsRef);
    const title = analyticsTitle(branch.analyticsRef);
    specNodes.push({
      id: analysisId,
      kind: 'intent_analysis',
      title,
      width: NODE_WIDTH,
      height: estimateCanvasNodeHeight(title),
    });
    if (optionAnchorId) {
      specEdges.push({ from: optionAnchorId, to: analysisId, label: 'разбор' });
    }
    optionAnchorId = analysisId;
  }

  for (const option of allOptions) {
    const title = option.title ?? option.id;
    const selected = option.id === selectedOptionId || option.selected === true;
    specNodes.push({
      id: option.id,
      kind: 'intent_option',
      title,
      width: NODE_WIDTH,
      height: estimateCanvasNodeHeight(title),
      selected,
    });
    if (optionAnchorId) {
      specEdges.push({
        from: optionAnchorId,
        to: option.id,
        label: 'вариант',
        rejected: !selected,
      });
    }
    if (selected) {
      specEdges.push({ from: option.id, to: decisionId, label: 'выбрано' });
    }
  }

  const decisionTitle = decision.title ?? branch.decisionTitle ?? branch.decisionId;
  specNodes.push({
    id: decisionId,
    kind: 'intent_decision',
    title: decisionTitle,
    width: NODE_WIDTH,
    height: estimateCanvasNodeHeight(decisionTitle),
  });

  if (!allOptions.some((option) => option.id === selectedOptionId) && optionAnchorId) {
    specEdges.push({ from: optionAnchorId, to: decisionId, label: 'решение' });
  }

  const workTree = flattenWorkTree(branch.roots ?? [], options);
  for (const workNode of workTree.nodes) {
    specNodes.push({
      ...workNode,
      width: NODE_WIDTH,
      height: estimateCanvasNodeHeight(workNode.title, { status: workNode.status }),
    });
  }

  for (const root of branch.roots ?? []) {
    specEdges.push({ from: decisionId, to: root.workId, label: 'порождает' });
  }
  specEdges.push(...workTree.edges);

  const layoutDirection = 'LR';
  const intentSpecNodes = specNodes.filter((node) => isIntentRoadmapIntentKind(node.kind));
  const workSpecNodes = specNodes.filter((node) => node.kind === 'work_item' || node.kind === 'work_epic');
  const intentSpecEdges = specEdges.filter((edge) => {
    const fromKind = specNodes.find((node) => node.id === edge.from)?.kind;
    const toKind = specNodes.find((node) => node.id === edge.to)?.kind;
    return isIntentRoadmapIntentKind(fromKind) && isIntentRoadmapIntentKind(toKind);
  });

  const placedIntent = layoutGraphWithDagre(intentSpecNodes, intentSpecEdges, {
    ...N8N_INSPIRED_DAGRE_LR,
    rankdir: layoutDirection,
  });

  const decisionPlaced = placedIntent.find((node) => node.id === decisionId);
  const placedWork = decisionPlaced
    ? layoutIntentRoadmapWorkStack(workSpecNodes, workTree.edges, decisionPlaced, {
      ranksep: N8N_INSPIRED_DAGRE_LR.ranksep,
      gap: N8N_INSPIRED_DAGRE_LR.overlapGap,
    })
    : new Map();

  const placed = [
    ...placedIntent,
    ...workSpecNodes.map((node) => placedWork.get(node.id) ?? node),
  ];
  const nodeById = new Map(placed.map((node) => [node.id, {
    ...node,
    layer: KIND_LABELS[node.kind] ?? node.kind,
  }]));

  const edges = specEdges
    .map((edge) => ({
      ...edge,
      fromNode: nodeById.get(edge.from),
      toNode: nodeById.get(edge.to),
    }))
    .filter((edge) => edge.fromNode && edge.toNode)
    .map((edge) => ({
      ...edge,
      geometry: intentRoadmapEdgeGeometry(edge, layoutDirection),
    }));

  const layoutNodes = [...nodeById.values()];
  const maxX = Math.max(...layoutNodes.map((node) => node.x + node.width), NODE_WIDTH);
  const maxY = Math.max(...layoutNodes.map((node) => node.y + node.height), NODE_MIN_HEIGHT);

  return {
    schema: INTENT_ROADMAP_CANVAS_SCHEMA,
    layoutEngine: 'dagre+work-stack',
    layoutDirection,
    nodes: layoutNodes,
    edges,
    width: maxX + OFFSET_PADDING,
    height: maxY + OFFSET_PADDING,
  };
}

export function buildEpicRoadmapCanvasModel(epicEntry, options = {}) {
  const collapsedEpicIds = options.collapsedEpicIds instanceof Set ? options.collapsedEpicIds : new Set();
  const collapsed = collapsedEpicIds.has(epicEntry.epicId);
  const layoutDirection = 'TB';

  /** @type {Array<{ id: string, kind: string, title: string, width: number, height: number, status?: string, workId?: string, doneChildCount?: number, childCount?: number, collapsible?: boolean, collapsed?: boolean }>} */
  const specNodes = [];
  /** @type {Array<{ from: string, to: string, label: string }>} */
  const specEdges = [];

  specNodes.push({
    id: epicEntry.epicId,
    kind: 'work_epic',
    title: epicEntry.title ?? epicEntry.epicId,
    status: epicEntry.status ?? '',
    workId: epicEntry.epicId,
    doneChildCount: epicEntry.doneChildCount ?? 0,
    childCount: epicEntry.childCount ?? 0,
    collapsible: (epicEntry.childCount ?? 0) > 0,
    collapsed,
    width: NODE_WIDTH,
    height: estimateCanvasNodeHeight(epicEntry.title ?? epicEntry.epicId, {
      status: epicEntry.status,
    }),
  });

  if (!collapsed) {
    for (const child of epicEntry.children ?? []) {
      specNodes.push({
        id: child.workId,
        kind: 'work_item',
        title: child.title ?? child.workId,
        status: child.status ?? '',
        workId: child.workId,
        width: NODE_WIDTH,
        height: estimateCanvasNodeHeight(child.title ?? child.workId, { status: child.status }),
      });
      specEdges.push({ from: epicEntry.epicId, to: child.workId, label: 'подзадача' });
    }
  }

  let y = OFFSET_PADDING;
  const x = OFFSET_PADDING;
  const gap = 36;
  const layoutNodes = specNodes.map((node) => {
    const placed = {
      ...node,
      x,
      y,
      layer: KIND_LABELS[node.kind] ?? node.kind,
    };
    y += node.height + gap;
    return placed;
  });

  const nodeById = new Map(layoutNodes.map((node) => [node.id, node]));
  const edges = specEdges
    .map((edge) => ({
      ...edge,
      fromNode: nodeById.get(edge.from),
      toNode: nodeById.get(edge.to),
    }))
    .filter((edge) => edge.fromNode && edge.toNode)
    .map((edge) => ({
      ...edge,
      geometry: intentRoadmapEdgeGeometry(edge, layoutDirection),
    }));

  const maxX = Math.max(...layoutNodes.map((node) => node.x + node.width), NODE_WIDTH);
  const maxY = Math.max(...layoutNodes.map((node) => node.y + node.height), NODE_MIN_HEIGHT);

  return {
    schema: INTENT_ROADMAP_CANVAS_SCHEMA,
    layoutEngine: 'epic-stack',
    layoutDirection,
    nodes: layoutNodes,
    edges,
    width: maxX + OFFSET_PADDING,
    height: maxY + OFFSET_PADDING,
  };
}

export function enrichIntentRoadmapBranchWithCanvas(branch, intentNodes, options = {}) {
  const decisionNode = intentNodes.find((node) => node.id === branch.decisionId && node.nodeKind === 'decision')
    ?? {
      id: branch.decisionId,
      nodeKind: 'decision',
      title: branch.decisionTitle,
      parentId: '',
      links: {},
    };

  const question = findQuestionForDecision(decisionNode, intentNodes);
  const enriched = {
    ...branch,
    question,
    selectedOption: findSelectedOption(decisionNode, intentNodes),
    allOptions: findAllOptionsForQuestion(question, intentNodes).map((option) => ({
      id: option.id,
      title: option.title,
      selected: option.selected === true || option.id === readOptionId(decisionNode),
    })),
    decision: decisionNode,
  };

  enriched.canvas = buildIntentRoadmapCanvasModel(enriched, options);
  return enriched;
}

export function intentRoadmapEdgeGeometry(edge, layoutDirection = 'LR') {
  return buildGraphCanvasEdgeGeometry(edge, layoutDirection);
}

export {
  findQuestionForDecision,
  findSelectedOption,
};
