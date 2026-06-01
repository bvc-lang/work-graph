import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { estimateGraphCardHeight, GRAPH_CARD_MIN_HEIGHT } from '../src/graphCanvasLitFlow/graphCanvasNodeMetrics.mjs';
import { layoutIntentRoadmapWorkStack } from '../src/graphCanvasLitFlow/layoutIntentRoadmapWorkStack.mjs';
import {
  graphCanvasNodesOverlap,
  resolveGraphCanvasOverlaps,
} from '../src/graphCanvasLitFlow/resolveGraphCanvasOverlaps.mjs';
import { buildIntentRoadmapCanvasModel } from '../src/intentRoadmapCanvas.mjs';

function buildFixtureCanvas() {
  return buildIntentRoadmapCanvasModel({
    decisionId: 'decision:test',
    decisionTitle: 'IntentNode canon + roadmap view',
    question: { id: 'iq:test', title: 'Как хранить граф намерений?' },
    analyticsRef: 'analytics:intent-graph-storage-roadmap',
    selectedOption: { id: 'option-c', title: 'IntentNode canon (B -> C)', selected: true },
    allOptions: [
      { id: 'option-a', title: 'Событийный журнал intent graph' },
      { id: 'option-b', title: 'Structured metadata -> labels' },
      { id: 'option-c', title: 'IntentNode canon (B -> C)', selected: true },
      { id: 'option-d', title: 'Только markdown в аналитике' },
    ],
    decision: { id: 'decision:test', title: 'IntentNode canon + roadmap view' },
    roots: [{
      workId: 'epic-1',
      title: 'спроектировать хранение графа намерений',
      status: 'done',
      childCount: 5,
      doneChildCount: 5,
      children: [
        { workId: 'sub-1', title: 'построить дорожную карту как выбранную ветку графа намерений', status: 'done', childCount: 0, doneChildCount: 0, children: [] },
        { workId: 'sub-2', title: 'реализовать atom.profile intent_node и parser/projection', status: 'done', childCount: 0, doneChildCount: 0, children: [] },
        { workId: 'sub-3', title: 'добавить lineage labels на WorkItem из выбранного решения', status: 'done', childCount: 0, doneChildCount: 0, children: [] },
        { workId: 'sub-4', title: 'реализовать drilldown графа намерений', status: 'done', childCount: 0, doneChildCount: 0, children: [] },
        { workId: 'sub-5', title: 'структурировать варианты и выбранное решение', status: 'done', childCount: 0, doneChildCount: 0, children: [] },
      ],
    }],
  });
}

describe('graph canvas layout quality', () => {
  it('estimates card height with layer and status headroom', () => {
    const plain = estimateGraphCardHeight({ title: 'Short' });
    const rich = estimateGraphCardHeight({
      title: 'спроектировать хранение графа намерений и lineage labels',
      status: 'done',
    });
    assert.ok(plain >= GRAPH_CARD_MIN_HEIGHT);
    assert.ok(rich > plain);
  });

  it('separates stacked nodes in the same dagre rank', () => {
    const nodes = [
      { id: 'a', x: 400, y: 100, width: 240, height: 120 },
      { id: 'b', x: 400, y: 150, width: 240, height: 120 },
      { id: 'c', x: 400, y: 210, width: 240, height: 120 },
    ];
    resolveGraphCanvasOverlaps(nodes, { gap: 32, layoutDirection: 'LR' });
    assert.equal(graphCanvasNodesOverlap(nodes), false);
  });

  it('stacks work items in one column to the right of decision', () => {
    const canvas = buildFixtureCanvas();
    const workNodes = canvas.nodes.filter((node) => node.kind === 'work_item');
    const xs = workNodes.map((node) => node.x);
    assert.equal(new Set(xs).size, 1);
    assert.equal(workNodes.length, 6);

    const epic = workNodes.find((node) => node.id === 'epic-1');
    const sub1 = workNodes.find((node) => node.id === 'sub-1');
    const sub5 = workNodes.find((node) => node.id === 'sub-5');
    assert.ok(epic && sub1 && sub5);
    assert.ok(sub1.y > epic.y + epic.height);
    assert.ok(sub5.y > sub1.y + sub1.height);
  });

  it('intent roadmap canvas has no overlapping node boxes after layout', () => {
    const canvas = buildFixtureCanvas();
    assert.equal(graphCanvasNodesOverlap(canvas.nodes), false);
    assert.ok(canvas.nodes.every((node) => node.height >= GRAPH_CARD_MIN_HEIGHT));
    assert.equal(canvas.layoutEngine, 'dagre+work-stack');
  });

  it('layoutIntentRoadmapWorkStack preserves chain order', () => {
    const anchor = { id: 'decision', x: 100, y: 80, width: 240, height: 110 };
    const workNodes = [
      { id: 'epic', kind: 'work_item', width: 240, height: 120 },
      { id: 'sub-1', kind: 'work_item', width: 240, height: 120 },
      { id: 'sub-2', kind: 'work_item', width: 240, height: 120 },
    ];
    const placed = layoutIntentRoadmapWorkStack(workNodes, [
      { from: 'epic', to: 'sub-1' },
      { from: 'sub-1', to: 'sub-2' },
    ], anchor, { ranksep: 128, gap: 32 });

    assert.equal(placed.get('epic')?.x, anchor.x + anchor.width + 128);
    assert.ok((placed.get('sub-1')?.y ?? 0) > (placed.get('epic')?.y ?? 0) + 120);
    assert.ok((placed.get('sub-2')?.y ?? 0) > (placed.get('sub-1')?.y ?? 0) + 120);
  });
});
