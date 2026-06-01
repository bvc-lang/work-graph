import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import { buildPvrgTaskScopeSlice } from '../src/pvrgTaskScope.mjs';

const ITEMS = parseWorkItems(`#Задача_seed<[
Метки:
  atom.profile: work_item
  work.id: seed-task
  work.title: Seed
  work.status: ready
  work.target_files: src/pvrgTaskScope.mjs
  work.depends_on: parent-task
]>

#Задача_parent<[
Метки:
  atom.profile: work_item
  work.id: parent-task
  work.title: Parent
  work.status: done
]>
`);

describe('pvrgTaskScope dashboard contract', () => {
  it('builds bounded subgraph with work, file and depends_on edges', () => {
    const slice = buildPvrgTaskScopeSlice(ITEMS, 'seed-task', { maxNodes: 12, maxDepth: 2 });

    assert.equal(slice.schema, 'pvrg.task-scope.slice.v1');
    assert.equal(slice.seedWorkId, 'seed-task');
    assert.ok(slice.nodes.some((node) => node.kind === 'work' && node.id === 'parent-task'));
    assert.ok(slice.nodes.some((node) => node.kind === 'file'));
    assert.ok(slice.edges.some((edge) => edge.relation === 'depends_on'));
    assert.ok(slice.edges.some((edge) => edge.relation === 'targets'));
  });
});
