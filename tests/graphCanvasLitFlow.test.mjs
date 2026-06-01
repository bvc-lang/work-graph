import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA,
  buildGraphCanvasProjectionFromIntentCanvas,
  buildGraphCanvasProjectionFromArchitectureLayout,
  buildGraphCanvasProjectionFromSchematicModel,
} from '../src/graphCanvasLitFlow/graphCanvasProjection.mjs';
import { graphCanvasProjectionToFlow } from '../src/graphCanvasLitFlow/graphCanvasProjectionToFlow.mjs';
import {
  getDownstreamNodeIds,
  getIncomingNodeIds,
  getOutgoingNodeIds,
  getUpstreamNodeIds,
} from '../src/graphCanvasLitFlow/graphCanvasTraversal.mjs';
import { buildIntentRoadmapCanvasModel } from '../src/intentRoadmapCanvas.mjs';

describe('graphCanvasLitFlow projection', () => {
  it('builds intent roadmap projection with task and intent ids', () => {
    const canvas = buildIntentRoadmapCanvasModel({
      decisionId: 'decision:test',
      decisionTitle: 'Decision',
      question: { id: 'iq:test', title: 'Question' },
      selectedOption: { id: 'option-a', title: 'Option A', selected: true },
      allOptions: [{ id: 'option-a', title: 'Option A', selected: true }],
      decision: { id: 'decision:test', title: 'Decision' },
      roots: [{
        workId: 'epic-1',
        title: 'Epic',
        status: 'done',
        childCount: 0,
        doneChildCount: 0,
        children: [],
      }],
    });

    const projection = buildGraphCanvasProjectionFromIntentCanvas(canvas);
    assert.equal(projection.schema, GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA);
    assert.equal(projection.layoutDirection, 'LR');
    assert.ok(projection.nodes.some((node) => node.taskId === 'epic-1'));
    assert.ok(projection.nodes.some((node) => node.intentNodeId === 'iq:test'));
  });

  it('converts projection to lit-flow nodes and edges', () => {
    const projection = {
      schema: GRAPH_CANVAS_LIT_FLOW_PROJECTION_SCHEMA,
      nodes: [
        { id: 'a', kind: 'architecture_block', title: 'A', x: 0, y: 0, width: 200, height: 80, blockId: 'a' },
        { id: 'b', kind: 'architecture_block', title: 'B', x: 240, y: 0, width: 200, height: 80, blockId: 'b' },
      ],
      edges: [{ id: 'e1', from: 'a', to: 'b', label: 'link' }],
    };

    const flow = graphCanvasProjectionToFlow(projection);
    assert.equal(flow.nodes.length, 2);
    assert.equal(flow.edges.length, 1);
    assert.equal(flow.nodes[0].type, 'graph-card');
    assert.equal(flow.nodes[0].position.x, 0);
    assert.equal(flow.edges[0].source, 'a');
    assert.equal(flow.edges[0].target, 'b');
    assert.equal(flow.nodes[0].draggable, false);
    assert.equal(flow.edges[0].label, '');
    assert.match(flow.edges[0].data.startLabelHtml, /link/);
  });

  it('builds themed edge labels and stroke styles', async () => {
    const { buildGraphCanvasEdgeLabelHtml, buildGraphCanvasEdgeStrokeStyle } = await import('../src/graphCanvasLitFlow/graphCanvasEdgeLabels.mjs');

    const html = buildGraphCanvasEdgeLabelHtml('вариант', 'dark', { rejected: true });
    assert.match(html, /font-style:italic/);
    assert.match(html, /вариант/);

    const stroke = buildGraphCanvasEdgeStrokeStyle({ rejected: false, upstream: true }, 'dark');
    assert.equal(stroke.strokeDasharray, '5 4');
  });

  it('traverses upstream and downstream node ids', () => {
    const edges = [
      { id: 'e1', from: 'q', to: 'a' },
      { id: 'e2', from: 'a', to: 'b' },
    ];
    assert.deepEqual(getOutgoingNodeIds('a', edges), ['b']);
    assert.deepEqual(getIncomingNodeIds('b', edges), ['a']);
    assert.deepEqual(getUpstreamNodeIds('b', edges), ['a', 'q']);
    assert.deepEqual(getDownstreamNodeIds('q', edges), ['a', 'b']);
  });

  it('builds architecture and schematic projections', () => {
    const architecture = buildGraphCanvasProjectionFromArchitectureLayout({
      nodes: [{ block: { id: 'work-graph', title: 'Work Graph', layer: 'L1', summary: '' }, x: 0, y: 0, width: 220, height: 90 }],
      edges: [],
    });
    assert.equal(architecture.nodes[0].blockId, 'work-graph');

    const schematic = buildGraphCanvasProjectionFromSchematicModel({
      nodes: [{ id: 'ui', title: 'UI', layer: 'L1', summary: 'panel', x: 10, y: 10, width: 180, height: 80 }],
      edges: [],
    });
    assert.equal(schematic.nodes[0].schematicId, 'ui');
  });
});
