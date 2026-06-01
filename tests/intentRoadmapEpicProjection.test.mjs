import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { join } from 'node:path';

import { buildEpicRoadmapCanvasModel } from '../src/intentRoadmapCanvas.mjs';
import {
  EPIC_ROADMAP_PROJECTION_SCHEMA,
  buildEpicRoadmapProjection,
  parseCollapsedEpicIds,
} from '../src/intentRoadmapEpicProjection.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const FIXTURE_WORK_ITEMS = [
  {
    id: 'epic-decision-pipeline-canonization',
    title: 'Pipeline canonization epic',
    status: 'doing',
    labels: { 'work.item_kind': 'epic' },
  },
  {
    id: 'document-decision-pipeline-canon',
    title: 'Document canon',
    status: 'done',
    labels: { 'work.item_kind': 'subtask', 'work.parent_id': 'epic-decision-pipeline-canonization' },
  },
  {
    id: 'implement-closing-analysis-after-epic-done',
    title: 'Closing analysis hook',
    status: 'done',
    labels: { 'work.item_kind': 'subtask', 'work.parent_id': 'epic-decision-pipeline-canonization' },
  },
  {
    id: 'implement-pipeline-stage-dor-dod-gates',
    title: 'DoR/DoD gates',
    status: 'done',
    labels: { 'work.item_kind': 'subtask', 'work.parent_id': 'epic-decision-pipeline-canonization' },
  },
  {
    id: 'document-operational-bypass-and-epic-policy',
    title: 'Operational bypass',
    status: 'done',
    labels: { 'work.item_kind': 'subtask', 'work.parent_id': 'epic-decision-pipeline-canonization' },
  },
  {
    id: 'wire-roadmap-canvas-epic-grouping-rollup',
    title: 'Epic rollup canvas',
    status: 'ready',
    labels: { 'work.item_kind': 'subtask', 'work.parent_id': 'epic-decision-pipeline-canonization' },
  },
  {
    id: 'epic-closed',
    title: 'Closed epic',
    status: 'done',
    labels: { 'work.item_kind': 'epic' },
  },
  {
    id: 'closed-child',
    title: 'Done child',
    status: 'done',
    labels: { 'work.item_kind': 'subtask', 'work.parent_id': 'epic-closed' },
  },
];

describe('intentRoadmapEpicProjection', () => {
  it('parseCollapsedEpicIds accepts comma-separated ids', () => {
    const parsed = parseCollapsedEpicIds('epic-a, epic-b');
    assert.deepEqual([...parsed], ['epic-a', 'epic-b']);
  });

  it('builds rollup for epic with mixed child statuses', () => {
    const projection = buildEpicRoadmapProjection(FIXTURE_WORK_ITEMS);
    assert.equal(projection.schema, EPIC_ROADMAP_PROJECTION_SCHEMA);
    assert.equal(projection.epicCount, 2);

    const epic = projection.epics.find((entry) => entry.epicId === 'epic-decision-pipeline-canonization');
    assert.ok(epic);
    assert.equal(epic.childCount, 5);
    assert.equal(epic.doneChildCount, 4);
    assert.equal(epic.rollup.closed, 4);
    assert.equal(epic.rollup.total, 5);
    assert.equal(epic.rollup.inProgress, 1);
    assert.equal(epic.rollup.blocked, 0);
    assert.equal(epic.children.length, 5);
    assert.ok(epic.canvas?.nodes?.some((node) => node.kind === 'work_epic'));
    assert.ok(epic.canvas?.nodes?.some((node) => node.id === 'wire-roadmap-canvas-epic-grouping-rollup'));
  });

  it('respects collapsed epic ids in canvas output', () => {
    const projection = buildEpicRoadmapProjection(FIXTURE_WORK_ITEMS, {
      collapsed: 'epic-decision-pipeline-canonization',
    });
    const epic = projection.epics.find((entry) => entry.epicId === 'epic-decision-pipeline-canonization');
    assert.ok(epic);
    assert.equal(epic.canvas.nodes.filter((node) => node.kind === 'work_item').length, 0);
    assert.ok(epic.canvas.nodes.some((node) => node.kind === 'work_epic' && node.collapsed === true));
  });

  it('filters active epics only when active=1', () => {
    const projection = buildEpicRoadmapProjection(FIXTURE_WORK_ITEMS, { active: true });
    assert.equal(projection.epicCount, 1);
    assert.equal(projection.epics[0].epicId, 'epic-decision-pipeline-canonization');
  });

  it('buildEpicRoadmapCanvasModel stacks epic above children vertically', () => {
    const projection = buildEpicRoadmapProjection(FIXTURE_WORK_ITEMS);
    const epic = projection.epics.find((entry) => entry.epicId === 'epic-decision-pipeline-canonization');
    const canvas = buildEpicRoadmapCanvasModel(epic);
    const epicNode = canvas.nodes.find((node) => node.kind === 'work_epic');
    const childNode = canvas.nodes.find((node) => node.id === 'document-decision-pipeline-canon');
    assert.ok(epicNode && childNode);
    assert.ok(childNode.y > epicNode.y);
  });

  it('includes live epic-decision-pipeline-canonization from repo', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const workItems = await readWorkItemsFromRepo({ cwd: repoRoot });
    const projection = buildEpicRoadmapProjection(workItems);
    const epic = projection.epics.find((entry) => entry.epicId === 'epic-decision-pipeline-canonization');
    assert.ok(epic, 'expected live epic in repo projection');
    assert.ok(epic.childCount >= 5);
    assert.ok(epic.doneChildCount >= 4);
  });
});
