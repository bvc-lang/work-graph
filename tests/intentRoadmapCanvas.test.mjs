import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { join } from 'node:path';

import { parseIntentNodes, readIntentNodesFromRepo } from '../src/intentNodeRuntime.mjs';
import {
  INTENT_ROADMAP_CANVAS_SCHEMA,
  buildIntentRoadmapCanvasModel,
  enrichIntentRoadmapBranchWithCanvas,
  intentRoadmapEdgeGeometry,
} from '../src/intentRoadmapCanvas.mjs';
import { buildIntentRoadmapProjection } from '../src/intentRoadmapProjection.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const FIXTURE_INTENT = `#IntentNode_iq<[
Метки:
  atom.profile: intent_node
  intent.id: iq:test
  intent.node_kind: question
  intent.title: Test question
]>

#IntentNode_option<[
Метки:
  atom.profile: intent_node
  intent.id: option-a
  intent.node_kind: option
  intent.parent_id: iq:test
  intent.title: Option A
  intent.selected: true
]>

#IntentNode_decision<[
Метки:
  atom.profile: intent_node
  intent.id: decision:test-v1
  intent.node_kind: decision
  intent.parent_id: iq:test
  intent.link.option_id: option-a
  intent.title: Selected path
  intent.selected: true
]>`;

describe('intentRoadmapCanvas', () => {
  it('builds canvas with question, option, decision and work tree', () => {
    const branch = {
      decisionId: 'decision:test-v1',
      decisionTitle: 'Selected path',
      question: { id: 'iq:test', title: 'Test question' },
      selectedOption: { id: 'option-a', title: 'Option A', selected: true },
      decision: { id: 'decision:test-v1', title: 'Selected path' },
      roots: [{
        workId: 'epic-1',
        title: 'Epic',
        status: 'done',
        itemKind: 'epic',
        childCount: 1,
        doneChildCount: 1,
        children: [{
          workId: 'sub-1',
          title: 'Subtask',
          status: 'done',
          itemKind: 'subtask',
          childCount: 0,
          doneChildCount: 0,
          children: [],
        }],
      }],
    };

    const canvas = buildIntentRoadmapCanvasModel(branch);
    assert.equal(canvas.schema, INTENT_ROADMAP_CANVAS_SCHEMA);
    assert.ok(canvas.nodes.some((node) => node.kind === 'intent_question'));
    assert.ok(canvas.nodes.some((node) => node.kind === 'intent_option'));
    assert.ok(canvas.nodes.some((node) => node.kind === 'intent_decision'));
    assert.ok(canvas.nodes.some((node) => node.id === 'epic-1' && node.kind === 'work_epic'));
    assert.ok(canvas.nodes.some((node) => node.id === 'sub-1'));
    assert.ok(canvas.edges.every((edge) => edge.geometry?.d));
    assert.equal(canvas.layoutDirection, 'LR');
    assert.ok(canvas.width > canvas.height);
  });

  it('hides epic children when collapsedEpicIds contains epic id', () => {
    const branch = {
      decisionId: 'decision:test-v1',
      decisionTitle: 'Selected path',
      decision: { id: 'decision:test-v1', title: 'Decision' },
      roots: [{
        workId: 'epic-1',
        title: 'Epic',
        status: 'doing',
        itemKind: 'epic',
        childCount: 2,
        doneChildCount: 1,
        children: [
          { workId: 'sub-1', title: 'Sub 1', status: 'done', itemKind: 'subtask', childCount: 0, doneChildCount: 0, children: [] },
          { workId: 'sub-2', title: 'Sub 2', status: 'ready', itemKind: 'subtask', childCount: 0, doneChildCount: 0, children: [] },
        ],
      }],
    };

    const collapsed = buildIntentRoadmapCanvasModel(branch, { collapsedEpicIds: new Set(['epic-1']) });
    assert.ok(collapsed.nodes.some((node) => node.id === 'epic-1' && node.collapsed === true));
    assert.equal(collapsed.nodes.filter((node) => node.kind === 'work_item').length, 0);

    const expanded = buildIntentRoadmapCanvasModel(branch, { collapsedEpicIds: new Set() });
    assert.equal(expanded.nodes.filter((node) => node.kind === 'work_item').length, 2);
  });

  it('embeds edge geometry for vertical decision → work link', () => {
    const canvas = buildIntentRoadmapCanvasModel({
      decisionId: 'decision:test-v1',
      decisionTitle: 'Decision',
      decision: { id: 'decision:test-v1', title: 'Decision' },
      roots: [{ workId: 'task-1', title: 'Task', status: 'backlog', childCount: 0, doneChildCount: 0, children: [] }],
    });
    const edge = canvas.edges.find((candidate) => candidate.from === 'decision:test-v1' && candidate.to === 'task-1');
    assert.ok(edge?.geometry);
    assert.match(intentRoadmapEdgeGeometry(edge).d, /^M /);
  });

  it('enriches AN-3 roadmap branch from repo intent nodes', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const intentNodes = await readIntentNodesFromRepo({ cwd: repoRoot });
    const workItems = await readWorkItemsFromRepo({ cwd: repoRoot });
    const projection = buildIntentRoadmapProjection(intentNodes, workItems);
    const branch = projection.branches.find((entry) => entry.decisionId === 'decision:intent-graph-storage-v1');

    assert.ok(branch);
    assert.ok(branch.question?.id === 'iq:intent-graph-storage');
    assert.ok(branch.selectedOption?.id === 'option-c-intent-node-canon');
    assert.ok(branch.canvas?.nodes?.length >= 8);
    assert.equal(branch.canvas.layoutEngine, 'dagre+work-stack');
    assert.equal(branch.canvas.layoutDirection, 'LR');
    const question = branch.canvas.nodes.find((node) => node.kind === 'intent_question');
    const decision = branch.canvas.nodes.find((node) => node.kind === 'intent_decision');
    assert.ok(question && decision && decision.x > question.x);
    assert.ok(branch.canvas.nodes.filter((node) => node.kind === 'intent_option').length === 4);
    assert.ok(branch.canvas.nodes.some((node) => node.id === 'design-intent-graph-storage-v1'));
  });

  it('enriches branch via enrichIntentRoadmapBranchWithCanvas', () => {
    const intentNodes = parseIntentNodes(FIXTURE_INTENT).map((node) => ({
      id: node.id,
      nodeKind: node.nodeKind,
      parentId: node.parentId,
      title: node.title,
      selected: node.selected,
      childIds: [],
      links: node.links ?? {},
    }));

    const enriched = enrichIntentRoadmapBranchWithCanvas({
      decisionId: 'decision:test-v1',
      decisionTitle: 'Selected path',
      roots: [],
    }, intentNodes);

    assert.equal(enriched.question?.id, 'iq:test');
    assert.equal(enriched.selectedOption?.id, 'option-a');
    assert.ok(enriched.canvas);
  });
});
