import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildWorkflowDisplayUnits, buildWorkflowEpicGroups, findEpicDependentsWithoutParent } from '../src/workflowEpicGrouping.mjs';

const FIXTURE = [
  { id: 'epic-a', title: 'Epic A', status: 'backlog', itemKind: 'epic', parentId: '' },
  { id: 'sub-1', title: 'Sub 1', status: 'backlog', itemKind: 'subtask', parentId: 'epic-a' },
  { id: 'sub-2', title: 'Sub 2', status: 'done', itemKind: 'subtask', parentId: 'epic-a' },
  { id: 'task-orphan', title: 'Standalone', status: 'backlog', itemKind: 'task', parentId: '' },
];

describe('workflowEpicGrouping', () => {
  it('groups children under epic and leaves orphans separate', () => {
    const { epicGroups, orphans } = buildWorkflowEpicGroups(FIXTURE);
    assert.equal(epicGroups.length, 1);
    assert.equal(epicGroups[0].epic.id, 'epic-a');
    assert.equal(epicGroups[0].childCount, 2);
    assert.equal(epicGroups[0].doneChildCount, 1);
    assert.deepEqual(epicGroups[0].children.map((child) => child.id), ['sub-1', 'sub-2']);
    assert.deepEqual(orphans.map((item) => item.id), ['task-orphan']);
  });

  it('builds display units with epics before orphans', () => {
    const units = buildWorkflowDisplayUnits(FIXTURE);
    assert.equal(units.length, 2);
    assert.equal(units[0].type, 'epic');
    assert.equal(units[1].type, 'orphan');
    assert.equal(units[1].item.id, 'task-orphan');
  });

  it('finds dependents on epic that are not nested as children', () => {
    const dependents = findEpicDependentsWithoutParent([
      { id: 'epic-a', itemKind: 'epic', dependsOn: [] },
      { id: 'orphan-task', itemKind: 'task', dependsOn: ['epic-a'], parentId: '' },
      { id: 'child-task', itemKind: 'task', dependsOn: ['epic-a'], parentId: 'epic-a' },
    ], 'epic-a');

    assert.deepEqual(dependents.map((item) => item.id), ['orphan-task']);
  });
});
