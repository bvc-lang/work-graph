import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHomeSnapshot,
  HOME_REFRESH_BUDGETS,
  HOME_SNAPSHOT_SCHEMA,
} from '../src/homeSnapshotProjection.mjs';

function makeItem(overrides) {
  return {
    id: 'task-1',
    title: 'Task one',
    status: 'ready',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    dependsOn: [],
    targetFiles: [],
    labels: {},
    checks: [],
    evidence: [],
    nextAction: 'do thing',
    ...overrides,
  };
}

const baseItems = [
  makeItem({ id: 'phase-9-ui', status: 'ready', priority: 'high' }),
  makeItem({ id: 'task-b', status: 'ready', priority: 'medium', ownerRole: 'product_owner' }),
  makeItem({ id: 'task-c', status: 'blocked', blocker: { reason: 'waiting upstream' } }),
  makeItem({ id: 'task-d', status: 'doing' }),
  makeItem({ id: 'task-e', status: 'verify' }),
  makeItem({ id: 'task-f', status: 'done' }),
  makeItem({ id: 'task-g', status: 'verified' }),
  makeItem({ id: 'task-h', status: 'backlog' }),
];

const snapshot = {
  schema: 'workgraph.snapshot.v1',
  source: 'test',
  items: baseItems,
};

describe('buildHomeSnapshot', () => {
  it('produces home.snapshot.v1 with kpi, my queue and active runs', () => {
    const home = buildHomeSnapshot(snapshot, { now: '2026-05-31T15:00:00.000Z' });

    assert.equal(home.schema, HOME_SNAPSHOT_SCHEMA);
    assert.equal(home.sourceSchema, 'workgraph.snapshot.v1');
    assert.equal(home.generatedAt, '2026-05-31T15:00:00.000Z');
    assert.deepEqual(home.refreshBudgets, HOME_REFRESH_BUDGETS);

    assert.equal(home.kpi.ready, 2);
    assert.equal(home.kpi.blocked, 1);
    assert.equal(home.kpi.verify, 1);
    assert.equal(home.kpi.doing, 1);
    assert.equal(home.kpi.done, 2);
    assert.equal(home.kpi.backlog, 1);

    assert.equal(home.activeRuns.length, 2);
    const activeIds = home.activeRuns.map((entry) => entry.workId);
    assert.deepEqual(activeIds, ['task-e', 'task-d'], 'verify first, then doing; blocked excluded');
  });

  it('orders active runs as verify > doing > claimed', () => {
    const items = [
      makeItem({ id: 'a-claimed', status: 'claimed' }),
      makeItem({ id: 'b-doing', status: 'doing' }),
      makeItem({ id: 'c-verify', status: 'verify' }),
      makeItem({ id: 'd-doing', status: 'in_progress' }),
    ];
    const home = buildHomeSnapshot({ schema: 'workgraph.snapshot.v1', items });
    const ids = home.activeRuns.map((entry) => entry.workId);
    assert.deepEqual(ids, ['c-verify', 'b-doing', 'd-doing', 'a-claimed']);
  });

  it('filters My queue by ownerRole when provided', () => {
    const home = buildHomeSnapshot(snapshot, { ownerRole: 'product_owner' });
    assert.equal(home.myQueue.ownerRole, 'product_owner');
    assert.equal(home.myQueue.items.length, 1);
    assert.equal(home.myQueue.items[0].workId, 'task-b');
  });

  it('falls back to priority/risk ordering when ownerRole absent', () => {
    const home = buildHomeSnapshot(snapshot);
    assert.equal(home.myQueue.items.length, 2);
    assert.equal(home.myQueue.items[0].workId, 'phase-9-ui', 'high priority first');
    assert.equal(home.myQueue.items[1].workId, 'task-b');
  });

  it('reports cycle progress when current cycle resolved', () => {
    const home = buildHomeSnapshot(snapshot, { currentCycle: 'phase-9-ui' });
    assert.equal(home.kpi.cycleProgress.cycleId, 'phase-9-ui');
    assert.equal(home.kpi.cycleProgress.total, 1);
    assert.equal(home.kpi.cycleProgress.done, 0);
    assert.equal(home.kpi.cycleProgress.percent, 0);
  });

  it('aggregates totals when cycle resolves to all', () => {
    const home = buildHomeSnapshot(snapshot, { currentCycle: 'all' });
    assert.equal(home.kpi.cycleProgress.cycleId, 'all');
    assert.equal(home.kpi.cycleProgress.total, baseItems.length);
    assert.equal(home.kpi.cycleProgress.done, 2);
    assert.equal(home.kpi.cycleProgress.percent, 25);
  });

  it('returns unavailable kpi sections when no telemetry provided', () => {
    const home = buildHomeSnapshot(snapshot);
    assert.equal(home.kpi.verifyPassRate.rate, null);
    assert.equal(home.kpi.verifyPassRate.source, 'unavailable');
    assert.equal(home.kpi.throughput.perDay, null);
    assert.equal(home.kpi.daemonUptime.startedAt, null);
    assert.equal(home.kpi.agentRunsToday.count, null);
  });

  it('passes optional telemetry through verify/throughput/daemon/runs', () => {
    const now = Date.now();
    const home = buildHomeSnapshot(snapshot, {
      verifyPassRate: 0.875,
      verifyWindowRuns: 16,
      throughputPerDay: 4.5,
      throughputWindowDays: 7,
      daemonStartedAt: new Date(now - 60_000).toISOString(),
      agentRunsToday: 7,
    });
    assert.equal(home.kpi.verifyPassRate.rate, 0.875);
    assert.equal(home.kpi.verifyPassRate.windowRuns, 16);
    assert.equal(home.kpi.throughput.perDay, 4.5);
    assert.equal(home.kpi.throughput.windowDays, 7);
    assert.ok(home.kpi.daemonUptime.uptimeMs >= 60_000);
    assert.equal(home.kpi.agentRunsToday.count, 7);
  });

  it('limits inbox preview and preserves unread flag default', () => {
    const home = buildHomeSnapshot(snapshot, {
      inboxPreview: [
        { id: 'evt-1', kind: 'agent-run', severity: 'info', title: 'Run started' },
        { id: 'evt-2', kind: 'analytics', severity: 'info', title: 'AN-24 draft' },
        { id: 'evt-3', kind: 'daemon', severity: 'warning', title: 'Daemon restart' },
      ],
      inboxPreviewLimit: 2,
    });
    assert.equal(home.inboxPreview.limit, 2);
    assert.equal(home.inboxPreview.items.length, 2);
    assert.equal(home.inboxPreview.items[0].id, 'evt-1');
    assert.equal(home.inboxPreview.items[0].unread, true);
  });

  it('throws on non-object snapshot input', () => {
    assert.throws(() => buildHomeSnapshot(null), TypeError);
  });
});
