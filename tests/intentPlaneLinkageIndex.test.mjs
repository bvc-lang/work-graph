import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildIntentPlaneLinkageIndex, queryIntentPlaneIndex } from '../src/intentPlaneLinkageIndex.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const ITEMS = parseWorkItems(`#Задача_child<[
Базис: Child.
Вектор: Link.
Цель: Child goal.
Метки:
  atom.profile: work_item
  work.id: child-task
  work.title: Child
  work.status: backlog
  work.target_files: src/child.mjs
  work.depends_on: parent-task
]>

#Задача_parent<[
Базис: Parent.
Вектор: Root.
Цель: Parent goal.
Метки:
  atom.profile: work_item
  work.id: parent-task
  work.title: Parent
  work.status: done
  work.target_files: src/parent.mjs
]>
`);

describe('intentPlaneLinkageIndex', () => {
  it('builds index from work items', () => {
    const index = buildIntentPlaneLinkageIndex(ITEMS);
    assert.equal(index.schema, 'intent.plane.linkage.index.v1');
    assert.equal(index.nodeCount, 2);
    assert.ok(index.edgeCount >= 1);
  });

  it('queries neighborhood by workId', () => {
    const index = buildIntentPlaneLinkageIndex(ITEMS);
    const result = queryIntentPlaneIndex(index, { workId: 'child-task', depth: 1 });
    assert.equal(result.focusWorkId, 'child-task');
    assert.ok(result.nodes.some((node) => node.id === 'child-task'));
  });
});
