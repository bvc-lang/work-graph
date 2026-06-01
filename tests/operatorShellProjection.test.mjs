import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildIntentSidebarReadModel,
  buildOperatorShellSnapshotV2,
  findCrossHighlightTargets,
  OPERATOR_SHELL_SCHEMA,
} from '../src/operatorShellProjection.mjs';

const sampleSnapshot = {
  schema: 'workgraph.snapshot.v1',
  source: 'test',
  items: [
    {
      id: 'phase-9-ui-operator-shell',
      title: 'Фаза 9',
      status: 'ready',
      dependsOn: ['phase-8-agent-prompt-eval-tools'],
      department: 'frontend-ui',
      ownerRole: 'frontend_architect',
      targetFiles: ['src/workGraphBacklogUiServer.mjs'],
      labels: {},
      checks: [],
      evidence: [],
      nextAction: 'dashboard v2',
    },
    {
      id: 'design-workgraph-dashboard-v2',
      title: 'Dashboard v2',
      status: 'backlog',
      dependsOn: ['phase-9-ui-operator-shell'],
      department: 'frontend-ui',
      ownerRole: 'frontend_architect',
      targetFiles: ['ui/operator-dashboard.bvc'],
      labels: {},
      checks: [],
      evidence: [],
      nextAction: 'sections',
    },
  ],
  readyQueue: ['phase-9-ui-operator-shell'],
  statusCounts: { ready: 1, backlog: 1 },
};

describe('buildOperatorShellSnapshotV2', () => {
  it('combines dashboard, cycle slice, intent sidebar and semantic map', () => {
    const shell = buildOperatorShellSnapshotV2(sampleSnapshot);

    assert.equal(shell.schema, OPERATOR_SHELL_SCHEMA);
    assert.equal(shell.dashboard.schema, 'operator-dashboard.snapshot.v1');
    assert.equal(shell.cycleSlice.currentCycle, 'phase-9-ui-operator-shell');
    assert.ok(shell.intentSidebar.domains.length >= 1);
    assert.equal(shell.semanticCrossHighlight.length, 2);
    assert.ok(shell.phaseRoadmap.some((phase) => phase.id === 'phase-9-ui-operator-shell'));
    assert.equal(shell.runnerQueue.schema, 'workgraph.runner.queue.projection.v1');
    assert.ok(shell.runnerQueue.summary.total >= 1);
    assert.equal(shell.kanbanBoard.schema, 'workgraph.kanban-board-projection.v1');
    assert.equal(shell.kanbanBoard.columnCounts.ready, 1);
    assert.ok(shell.startupBudget.maxInitialFetchMs > 0);
  });
});

describe('buildIntentSidebarReadModel', () => {
  it('projects domain buckets for sidebar navigation', () => {
    const shell = buildOperatorShellSnapshotV2(sampleSnapshot);
    const sidebar = buildIntentSidebarReadModel(shell.intentSidebar);

    assert.equal(sidebar.schema, 'intent.sidebar.read.v1');
    assert.ok(sidebar.domains.some((domain) => domain.count >= 1));
  });
});

describe('findCrossHighlightTargets', () => {
  it('finds architecture block peers for cross-highlight', () => {
    const shell = buildOperatorShellSnapshotV2(sampleSnapshot);
    const targets = findCrossHighlightTargets(shell, 'design-workgraph-dashboard-v2');

    assert.equal(targets.architectureBlockId, 'derived-projections');
    assert.deepEqual(targets.relatedWorkIds, ['phase-9-ui-operator-shell']);
  });
});
