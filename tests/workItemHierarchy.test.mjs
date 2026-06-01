import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  attachDerivedWorkItemHierarchy,
  evaluateParentCloseGate,
  lintWorkItemHierarchyIssues,
} from '../src/workItemHierarchy.mjs';
import { parseWorkItems, transitionStatus } from '../src/workGraphRuntime.mjs';
import { lintBacklogItems } from '../src/backlogSchemaLint.mjs';
import { buildUnifiedLinkageProjectionV1 } from '../src/unifiedLinkageProjection.mjs';

describe('workItemHierarchy', () => {
  it('derives childIds from work.parent_id labels', () => {
    const items = attachDerivedWorkItemHierarchy([
      { id: 'epic-a', status: 'backlog', dependsOn: [], labels: { 'work.item_kind': 'epic' } },
      { id: 'child-b', status: 'ready', dependsOn: [], parentId: 'epic-a', labels: { 'work.parent_id': 'epic-a' } },
    ]);

    assert.deepEqual(items[0].childIds, ['child-b']);
    assert.equal(items[1].parentId, 'epic-a');
  });

  it('lints missing parent, cycles, and parent depends_on child', () => {
    const issues = lintWorkItemHierarchyIssues([
      { id: 'orphan', status: 'backlog', dependsOn: [], labels: { 'work.parent_id': 'missing' } },
      { id: 'loop-a', status: 'backlog', dependsOn: [], labels: { 'work.parent_id': 'loop-b' } },
      { id: 'loop-b', status: 'backlog', dependsOn: [], labels: { 'work.parent_id': 'loop-a' } },
      { id: 'parent', status: 'backlog', dependsOn: ['child'], labels: {} },
      { id: 'child', status: 'backlog', dependsOn: [], labels: { 'work.parent_id': 'parent' } },
    ]);

    assert.ok(issues.some((issue) => issue.code === 'missing_parent'));
    assert.ok(issues.some((issue) => issue.code === 'parent_cycle'));
    assert.ok(issues.some((issue) => issue.code === 'parent_depends_on_child'));
  });

  it('blocks parent close until children are done', () => {
    const items = [
      { id: 'epic', status: 'verify', dependsOn: [], evidence: [], checks: [], targetFiles: [], labels: { 'work.item_kind': 'epic' } },
      { id: 'sub', status: 'ready', dependsOn: [], evidence: [], checks: [], targetFiles: [], labels: { 'work.parent_id': 'epic' } },
    ];

    const gate = evaluateParentCloseGate(items, items[0], 'done');
    assert.equal(gate.ok, false);
    assert.equal(gate.code, 'parent_close_blocked_open_children');

    assert.throws(
      () => transitionStatus(items[0], 'done', { evidence: 'ok', allItems: items }),
      (error) => error.code === 'parent_close_blocked_open_children',
    );
  });
});

describe('parseWorkItems parent_id', () => {
  it('parses work.parent_id and work.item_kind', () => {
    const text = `#Задача_epic<[
Базис:
  Epic.
Вектор:
  Epic vector.
Цель:
  Epic goal.

Метки:
  atom.profile: work_item
  work.id: epic-x
  work.status: backlog
  work.parent_id: parent-y
  work.item_kind: epic
  migration.strategy: rebuild
]>`;

    const [item] = parseWorkItems(text);
    assert.equal(item.parentId, 'parent-y');
    assert.equal(item.itemKind, 'epic');
  });
});

describe('backlog lint hierarchy integration', () => {
  it('includes hierarchy issues in lintBacklogItems report', () => {
    const report = lintBacklogItems([
      {
        id: 'orphan',
        status: 'backlog',
        dependsOn: [],
        nextAction: 'go',
        labels: { 'migration.strategy': 'rebuild', 'work.parent_id': 'missing-parent' },
      },
    ]);

    assert.equal(report.ok, false);
    assert.ok(report.issues.some((issue) => issue.code === 'missing_parent'));
  });
});

describe('unified linkage parent_of', () => {
  it('emits parent_of edges from work.parent_id', () => {
    const projection = buildUnifiedLinkageProjectionV1([
      { id: 'epic', status: 'backlog', dependsOn: [], evidence: [], checks: [], targetFiles: [], labels: {} },
      { id: 'child', status: 'backlog', dependsOn: [], evidence: [], checks: [], targetFiles: [], parentId: 'epic', labels: { 'work.parent_id': 'epic' } },
    ], { traceLinks: [], reverseMarkers: [] });

    const parentEdge = projection.links.find((link) => link.relation === 'parent_of');
    assert.ok(parentEdge);
    assert.equal(parentEdge.from.id, 'epic');
    assert.equal(parentEdge.to.id, 'child');
  });
});
