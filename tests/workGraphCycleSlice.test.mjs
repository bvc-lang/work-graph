import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCycleSliceProjection,
  deriveWorkCycle,
  filterItemsByCycleSlice,
  partitionBoardItems,
  resolveCurrentCycle,
  selectDoneArchiveItems,
  sortDoneArchiveItems,
} from '../src/workGraphCycleSlice.mjs';

const phase7 = {
  id: 'phase-7-onebase-vertical',
  status: 'done',
  dependsOn: [],
  labels: {},
};

const phase9 = {
  id: 'phase-9-ui-operator-shell',
  status: 'ready',
  dependsOn: ['phase-8-agent-prompt-eval-tools'],
  labels: {},
};

const leafDone = {
  id: 'design-onebase-workitem-template',
  status: 'done',
  dependsOn: ['phase-7-onebase-vertical'],
  labels: {},
};

const leafReady = {
  id: 'design-workgraph-dashboard-v2',
  status: 'ready',
  dependsOn: ['phase-9-ui-operator-shell'],
  labels: {},
};

const manyDone = Array.from({ length: 20 }, (_, index) => ({
  id: `done-item-${index}`,
  status: 'done',
  dependsOn: ['phase-7-onebase-vertical'],
  labels: {},
}));

describe('deriveWorkCycle', () => {
  it('uses explicit work.cycle label when present', () => {
    const itemById = new Map();
    const item = { id: 'x', dependsOn: [], labels: { 'work.cycle': '2026-05' } };
    assert.equal(deriveWorkCycle(item, itemById), '2026-05');
  });

  it('derives cycle from nearest phase epic dependency', () => {
    const items = [phase7, leafDone];
    const itemById = new Map(items.map((item) => [item.id, item]));
    assert.equal(deriveWorkCycle(leafDone, itemById), 'phase-7-onebase-vertical');
  });

  it('returns phase epic id for phase items', () => {
    const itemById = new Map([[phase9.id, phase9]]);
    assert.equal(deriveWorkCycle(phase9, itemById), 'phase-9-ui-operator-shell');
  });
});

describe('resolveCurrentCycle', () => {
  it('prefers active phase epic cycle from ready tasks', () => {
    const items = [phase7, leafDone, phase9, leafReady];
    const itemById = new Map(items.map((item) => [item.id, item]));
    assert.equal(resolveCurrentCycle(items, itemById), 'phase-9-ui-operator-shell');
  });

  it('falls back to backlog-heavy phase cycle when no operational items', () => {
    const items = [
      phase7,
      phase9,
      { id: 'task-a1', status: 'backlog', dependsOn: ['phase-9-ui-operator-shell'], labels: {} },
      { id: 'task-a2', status: 'backlog', dependsOn: ['phase-9-ui-operator-shell'], labels: {} },
      { id: 'task-a3', status: 'backlog', dependsOn: ['phase-9-ui-operator-shell'], labels: {} },
      { id: 'task-b', status: 'backlog', dependsOn: ['phase-0-inventory-boundaries'], labels: {} },
    ];
    const itemById = new Map(items.map((item) => [item.id, item]));
    assert.equal(resolveCurrentCycle(items, itemById), 'phase-9-ui-operator-shell');
  });
});

describe('sortDoneArchiveItems', () => {
  it('sorts done items in reverse id order for archive column', () => {
    const items = [
      { id: 'alpha-task', status: 'done' },
      { id: 'zeta-task', status: 'done' },
      { id: 'middle-task', status: 'done' },
    ];

    assert.deepEqual(
      sortDoneArchiveItems(items).map((item) => item.id),
      ['zeta-task', 'middle-task', 'alpha-task'],
    );
  });
});

describe('selectDoneArchiveItems', () => {
  it('returns newest done items first within archive cap', () => {
    const items = manyDone.map((item, index) => ({
      ...item,
      id: `done-item-${String(index).padStart(2, '0')}`,
    }));

    const selected = selectDoneArchiveItems(items, 3);
    assert.deepEqual(selected.map((item) => item.id), ['done-item-19', 'done-item-18', 'done-item-17']);
  });
});

describe('filterItemsByCycleSlice', () => {
  it('returns operational items plus capped done archive for current cycle', () => {
    const items = [phase7, ...manyDone, leafReady, phase9];
    const filtered = filterItemsByCycleSlice(items, { cycleId: 'phase-7-onebase-vertical' });

    assert.ok(filtered.some((item) => item.id === 'design-workgraph-dashboard-v2') === false);
    assert.equal(filtered.filter((item) => item.status === 'done').length, 12);
  });
});

describe('partitionBoardItems', () => {
  it('reports hidden done count beyond archive cap', () => {
    const items = [phase7, ...manyDone, leafReady, phase9];
    const partition = partitionBoardItems(items, { cycleId: 'phase-7-onebase-vertical' });

    assert.equal(partition.doneArchive.length, 12);
    assert.equal(partition.hiddenDoneCount, 9);
    assert.ok(partition.operational.every((item) => item.status !== 'done'));
  });
});

describe('buildCycleSliceProjection', () => {
  it('builds cycle buckets with current cycle hint', () => {
    const items = [phase7, leafDone, phase9, leafReady];
    const projection = buildCycleSliceProjection(items);

    assert.equal(projection.schema, 'workgraph.cycle.slice.v1');
    assert.equal(projection.currentCycle, 'phase-9-ui-operator-shell');
    assert.ok(projection.cycles.some((cycle) => cycle.id === 'phase-7-onebase-vertical' && cycle.done >= 1));
  });
});
