import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWorkflowTreeDisplayUnits,
  buildWorkflowTreeForest,
} from '../src/workflowTreeProjection.mjs';

describe('workflowTreeProjection', () => {
  const items = [
    { id: 'epic-a', title: 'Epic A', itemKind: 'epic', parentId: '' },
    { id: 'sub-1', title: 'Sub 1', itemKind: 'subtask', parentId: 'epic-a' },
    { id: 'sub-2', title: 'Sub 2', itemKind: 'subtask', parentId: 'epic-a' },
    { id: 'orphan', title: 'Orphan', itemKind: 'task', parentId: '' },
  ];

  it('builds nested forest from parent_id', () => {
    const forest = buildWorkflowTreeForest(items);
    assert.equal(forest.length, 2);
    const epicRoot = forest.find((node) => node.item.id === 'epic-a');
    assert.ok(epicRoot);
    assert.equal(epicRoot.childCount, 2);
    assert.equal(epicRoot.children[0].depth, 1);
  });

  it('maps forest roots to display units', () => {
    const units = buildWorkflowTreeDisplayUnits(buildWorkflowTreeForest(items));
    assert.equal(units.length, 2);
    assert.equal(units[0].type, 'tree-root');
    assert.equal(units[0].root.item.id, 'epic-a');
  });
});
