import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyWorkItemStatusTransitionWithEpicEffects,
  closeOpenDescendantsForDoneEpic,
  collectOpenDescendantWorkItems,
  findDoneEpicsWithOpenDescendants,
  rollupCloseParentEpicsWhenChildrenDone,
  transitionWorkItemWithEpicCascade,
} from '../src/workItemEpicCascade.mjs';
import { transitionStatus } from '../src/workGraphRuntime.mjs';

const baseItem = {
  dependsOn: [],
  evidence: [],
  checks: [],
  targetFiles: [],
  labels: {},
};

describe('workItemEpicCascade', () => {
  it('collects open descendants transitively', () => {
    const items = [
      { ...baseItem, id: 'epic-a', status: 'backlog', labels: { 'work.item_kind': 'epic' } },
      { ...baseItem, id: 'child-b', status: 'ready', parentId: 'epic-a', labels: { 'work.parent_id': 'epic-a' } },
      { ...baseItem, id: 'child-c', status: 'backlog', parentId: 'child-b', labels: { 'work.parent_id': 'child-b' } },
    ];

    assert.deepEqual(
      collectOpenDescendantWorkItems(items, 'epic-a').map((item) => item.id),
      ['child-b', 'child-c'],
    );
  });

  it('cascades epic close to open descendants before closing epic', () => {
    const items = [
      {
        ...baseItem,
        id: 'epic-a',
        status: 'verify',
        labels: { 'work.item_kind': 'epic' },
      },
      {
        ...baseItem,
        id: 'sub-b',
        status: 'backlog',
        parentId: 'epic-a',
        labels: { 'work.parent_id': 'epic-a', 'work.item_kind': 'subtask' },
      },
    ];

    assert.throws(
      () => transitionStatus(items[0], 'done', { evidence: 'epic only', allItems: items }),
      (error) => error.code === 'parent_close_blocked_open_children',
    );

    const result = transitionWorkItemWithEpicCascade(items, items[0], 'done', {
      evidence: 'epic delivered',
    });

    assert.deepEqual(result.cascadedChildIds, ['sub-b']);
    assert.equal(result.items.find((item) => item.id === 'sub-b')?.status, 'done');
    assert.equal(result.items.find((item) => item.id === 'epic-a')?.status, 'done');
    assert.ok(result.items.find((item) => item.id === 'sub-b')?.evidence.some((line) => line.includes('cascade:')));
  });

  it('rolls up parent epic when the last direct child is completed', () => {
    const items = [
      {
        ...baseItem,
        id: 'epic-parent',
        status: 'verify',
        labels: { 'work.item_kind': 'epic' },
      },
      {
        ...baseItem,
        id: 'sub-done',
        status: 'done',
        evidence: ['child done'],
        parentId: 'epic-parent',
        labels: { 'work.parent_id': 'epic-parent', 'work.item_kind': 'subtask' },
      },
      {
        ...baseItem,
        id: 'sub-last',
        status: 'verify',
        parentId: 'epic-parent',
        labels: { 'work.parent_id': 'epic-parent', 'work.item_kind': 'subtask' },
      },
    ];

    const result = applyWorkItemStatusTransitionWithEpicEffects(items, items[2], 'done', {
      evidence: 'last child delivered',
    });

    assert.deepEqual(result.rolledUpParentIds, ['epic-parent']);
    assert.equal(result.items.find((item) => item.id === 'sub-last')?.status, 'done');
    assert.equal(result.items.find((item) => item.id === 'epic-parent')?.status, 'done');
    assert.ok(
      result.items.find((item) => item.id === 'epic-parent')?.evidence
        .some((line) => line.includes('epic rollup:')),
    );
  });

  it('does not roll up parent epic while a direct child remains open', () => {
    const items = [
      {
        ...baseItem,
        id: 'epic-parent',
        status: 'backlog',
        labels: { 'work.item_kind': 'epic' },
      },
      {
        ...baseItem,
        id: 'sub-open',
        status: 'ready',
        parentId: 'epic-parent',
        labels: { 'work.parent_id': 'epic-parent' },
      },
      {
        ...baseItem,
        id: 'sub-done',
        status: 'done',
        evidence: ['done'],
        parentId: 'epic-parent',
        labels: { 'work.parent_id': 'epic-parent' },
      },
    ];

    const rollup = rollupCloseParentEpicsWhenChildrenDone(items, 'sub-done');
    assert.deepEqual(rollup.rolledUpParentIds, []);
    assert.equal(rollup.items.find((item) => item.id === 'epic-parent')?.status, 'backlog');
  });

  it('finds done epics with open descendants and reconciles children only', () => {
    const items = [
      {
        ...baseItem,
        id: 'epic-done',
        status: 'done',
        evidence: ['manual close'],
        labels: { 'work.item_kind': 'epic' },
      },
      {
        ...baseItem,
        id: 'sub-open',
        status: 'backlog',
        parentId: 'epic-done',
        labels: { 'work.parent_id': 'epic-done' },
      },
    ];

    const drifts = findDoneEpicsWithOpenDescendants(items);
    assert.equal(drifts.length, 1);
    assert.deepEqual(drifts[0].openChildIds, ['sub-open']);

    const reconciled = closeOpenDescendantsForDoneEpic(items, 'epic-done');
    assert.deepEqual(reconciled.cascadedChildIds, ['sub-open']);
    assert.equal(reconciled.items.find((item) => item.id === 'sub-open')?.status, 'done');
    assert.equal(reconciled.items.find((item) => item.id === 'epic-done')?.status, 'done');
  });
});
