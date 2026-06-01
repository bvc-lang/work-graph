import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPhasePromoteReadyQueue } from '../src/workGraphPhasePromoteReadyQueue.mjs';

function item(overrides) {
  return {
    id: 'task',
    title: 'Task',
    status: 'backlog',
    priority: 'medium',
    dependsOn: [],
    evidence: [],
    checks: [],
    nextAction: 'go',
    labels: {},
    ...overrides,
  };
}

describe('buildPhasePromoteReadyQueue', () => {
  it('returns promotable phase-8+ backlog items with satisfied deps', () => {
    const items = [
      item({ id: 'phase-8-agent-prompt-eval-tools', status: 'done' }),
      item({
        id: 'run-mandatory-prompt-eval-fixtures',
        status: 'backlog',
        dependsOn: ['phase-8-agent-prompt-eval-tools'],
        priority: 'high',
        labels: { 'migration.target_phase': 'phase-8-agent-prompt-eval-tools' },
      }),
      item({
        id: 'blocked-phase-9-task',
        status: 'backlog',
        dependsOn: ['missing-parent'],
        labels: { 'migration.target_phase': 'phase-9-ui-operator-shell' },
      }),
    ];

    const queue = buildPhasePromoteReadyQueue(items);
    assert.equal(queue.schema, 'workgraph.promote-ready-queue.v1');
    assert.equal(queue.promotableCount, 1);
    assert.equal(queue.queue[0].workId, 'run-mandatory-prompt-eval-fixtures');
    assert.equal(queue.queue[0].phase, 8);
    assert.equal(queue.blocked.length, 1);
    assert.equal(queue.blocked[0].workId, 'blocked-phase-9-task');
  });

  it('infers phase from depends_on anchor when label missing', () => {
    const items = [
      item({ id: 'phase-9-ui-operator-shell', status: 'done' }),
      item({
        id: 'implement-semantic-map-ui',
        status: 'backlog',
        dependsOn: ['phase-9-ui-operator-shell', 'design-semantic-map-backlog-cross-highlight'],
      }),
      item({ id: 'design-semantic-map-backlog-cross-highlight', status: 'done' }),
    ];

    const queue = buildPhasePromoteReadyQueue(items);
    assert.equal(queue.queue.length, 1);
    assert.equal(queue.queue[0].phase, 9);
  });

  it('respects minPhase filter', () => {
    const items = [
      item({ id: 'phase-7-onebase-vertical', status: 'done' }),
      item({
        id: 'phase-7-child',
        status: 'backlog',
        dependsOn: ['phase-7-onebase-vertical'],
      }),
    ];

    const queue = buildPhasePromoteReadyQueue(items, { minPhase: 8 });
    assert.equal(queue.backlogCount, 0);
    assert.equal(queue.promotableCount, 0);
  });

  it('includes phase-4 backlog item when minPhase is 0', () => {
    const items = [
      item({ id: 'phase-4-trace-pvrg-semantic-map', status: 'done' }),
      item({
        id: 'wire-pvrg-task-scope-dashboard-panel',
        status: 'backlog',
        dependsOn: ['phase-4-trace-pvrg-semantic-map'],
        priority: 'high',
      }),
    ];

    const queue = buildPhasePromoteReadyQueue(items, { minPhase: 0 });
    assert.equal(queue.minPhase, 0);
    assert.equal(queue.promotableCount, 1);
    assert.equal(queue.queue[0].workId, 'wire-pvrg-task-scope-dashboard-panel');
    assert.equal(queue.queue[0].phase, 4);
  });
});
