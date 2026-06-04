import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  DEFAULT_CLAIM_LEASE_MS,
  WorkGraphPolicyError,
  buildOperatorDashboardSnapshot,
  buildSnapshot,
  claimNext,
  claimWorkItemWithLease,
  evaluateWorkItemClaimEligibility,
  parseTraceLinksV1,
  parseWorkItems,
  scanReverseTraceMarkers,
  recordEvidence,
  transitionStatus,
  validateTraceLinksV1,
} from '../src/workGraphRuntime.mjs';
import { buildIntentTreeEntries } from '../src/intentTreeMigration.mjs';
import { readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';
const SAMPLE_BACKLOG = `#Задача_first_task<[
Базис:
  First task.
Вектор:
  Do first task.
Цель:
  Finish first task.
Свидетельства:
  npm test passed.

Метки:
  atom.profile: work_item
  work.id: first-task
  work.title: First task
  work.status: done
  work.owner_role: engineer
  work.priority: high
  trace.status: verified

критерии_готовности:
  - has evidence
]>

#Задача_second_task<[
Базис:
  Second task.
Вектор:
  Do second task after first.
Цель:
  Finish second task.

Метки:
  atom.profile: work_item
  work.id: second-task
  work.title: Second task
  work.status: ready
  work.owner_role: engineer
  work.depends_on: first-task
  work.target_files: src/runtime.mjs, tests/runtime.test.mjs
  trace.status: pending

критерии_готовности:
  - dependency is done
]>

#Задача_blocked_task<[
Базис:
  Blocked task.
Вектор:
  Wait for second.
Цель:
  Finish blocked task.

Метки:
  atom.profile: work_item
  work.id: blocked-task
  work.title: Blocked task
  work.status: ready
  work.depends_on: second-task
  trace.status: pending
]>

#Задача_current_task<[
Базис:
  Current task.
Вектор:
  Do current task.
Цель:
  Finish current task.

Метки:
  atom.profile: work_item
  work.id: current-task
  work.title: Current task
  work.status: doing
  work.next_action: continue
  trace.status: pending
]>

#Задача_blocked_actual<[
Базис:
  Blocked actual.
Вектор:
  Wait for input.
Цель:
  Unblock.

Метки:
  atom.profile: work_item
  work.id: blocked-actual
  work.title: Blocked actual
  work.status: blocked
  work.blocker: missing token
  work.next_action: ask operator
  trace.status: pending
]>
`;

describe('parseWorkItems', () => {
  it('extracts work items from .bvc backlog text', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);

    assert.equal(items.length, 5);
    assert.deepEqual(
      items.slice(0, 3).map((item) => item.id),
      ['first-task', 'second-task', 'blocked-task'],
    );
    assert.deepEqual(items[1].dependsOn, ['first-task']);
    assert.deepEqual(items[1].targetFiles, ['src/runtime.mjs', 'tests/runtime.test.mjs']);
    assert.deepEqual(items[0].evidence, ['npm test passed.']);
    assert.equal(items[0].basis, 'First task.');
    assert.equal(items[0].vector, 'Do first task.');
    assert.equal(items[0].goal, 'Finish first task.');
  });

  it('does not absorb template subheadings into goal after Цель', () => {
    const text = `#T<[
Базис:
  b
Вектор:
  v
Цель:
  real goal only
  Зависимости:
  dep-a
  Target files:
  src/a.mjs
  Options:
  useful: yes
Анализ:
  Контекст:
  analysis body
Метки:
  atom.profile: work_item
  work.id: polluted-goal
]>`;

    const [item] = parseWorkItems(text);
    assert.equal(item.goal, 'real goal only');
    assert.match(item.analysis, /analysis body/u);
  });

  it('keeps inner Цель heading inside analysis without duplicating goal', () => {
    const text = `#T<[
Базис:
  b
Вектор:
  v
Цель:
  only goal
Анализ:
  Контекст:
  ctx
  Цель:
  repeated in template
  must stay in analysis
Метки:
  atom.profile: work_item
  work.id: inner-goal
]>`;

    const [item] = parseWorkItems(text);
    assert.equal(item.goal, 'only goal');
    assert.match(item.analysis, /repeated in template/u);
    assert.doesNotMatch(item.goal, /repeated in template/u);
  });

  it('parses the current rebuild intent tree', async () => {
    const items = await readWorkItemsFromIntentTree({
      cwd: fileURLToPath(new URL('..', import.meta.url)),
    });

    assert.ok(items.length >= 10);
    assert.ok(items.some((item) => item.id === 'implement-workgraph-minimal-runtime'));
  });
});

describe('buildOperatorDashboardSnapshot', () => {
  it('derives dashboard-ready queues from workgraph.snapshot.v1', () => {
    const snapshot = buildSnapshot(parseWorkItems(SAMPLE_BACKLOG));
    const dashboard = buildOperatorDashboardSnapshot(snapshot, {
      evidenceLimit: 3,
      workerRunSummaries: [{ runId: 'run-1', taskId: 'current-task', status: 'running' }],
      memoryUpdates: [{ id: 'mem-1', sourceWorkItem: 'first-task', status: 'draft' }],
    });

    assert.equal(dashboard.schema, 'operator-dashboard.snapshot.v1');
    assert.equal(dashboard.sourceSchema, 'workgraph.snapshot.v1');
    assert.deepEqual(
      dashboard.currentTasks.map((item) => item.id),
      ['current-task'],
    );
    assert.equal(dashboard.currentTask.id, 'current-task');
    assert.deepEqual(
      dashboard.readyQueue.map((item) => [item.id, item.claimable]),
      [
        ['blocked-task', false],
        ['second-task', true],
      ],
    );
    assert.deepEqual(
      dashboard.blocked.map((item) => [item.id, item.blocker, item.nextUnblockAction]),
      [['blocked-actual', 'missing token', 'ask operator']],
    );
    assert.deepEqual(dashboard.statusCounts, {
      blocked: 1,
      doing: 1,
      done: 1,
      ready: 2,
    });
    assert.deepEqual(dashboard.viewCounts, {
      board: 5,
      backlog: 0,
      current: 1,
      blocked: 1,
    });
    assert.deepEqual(dashboard.actionFeed, []);
    assert.equal(dashboard.recentEvidence[0].taskId, 'first-task');
    assert.equal(dashboard.recentEvidence[0].status, 'succeeded');
    assert.deepEqual(dashboard.workerRunSummaries, [{ runId: 'run-1', taskId: 'current-task', status: 'running' }]);
    assert.deepEqual(dashboard.memoryUpdates, [{ id: 'mem-1', sourceWorkItem: 'first-task', status: 'draft' }]);
  });
});

describe('Trace Links v1 validator', () => {
  it('accepts a valid trace code ref and reverse work marker', () => {
    const items = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace task.
Вектор:
  Link code.
Цель:
  Verified trace.

Метки:
  atom.profile: work_item
  work.id: trace-task
  work.title: Trace task
  work.status: done
  trace.code_refs: src/runtime.mjs#parseWorkItems
  trace.status: verified
]>
`);

    assert.deepEqual(
      parseTraceLinksV1(items).map((link) => [link.sourceWorkId, link.sourceLabel, link.to.kind, link.to.locator.path]),
      [['trace-task', 'trace.code_refs', 'symbol', 'src/runtime.mjs']],
    );
    const diagnostics = validateTraceLinksV1(items, {
      fileContentsByPath: {
        'src/runtime.mjs': '// iohasc-ref: work:trace-task\nexport function parseWorkItems() {}\n',
      },
    });

    assert.deepEqual(diagnostics, []);
  });

  it('reports broken trace file refs', () => {
    const items = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace task.
Вектор:
  Link code.
Цель:
  Broken trace.

Метки:
  atom.profile: work_item
  work.id: trace-task
  work.title: Trace task
  work.status: ready
  trace.code_refs: src/missing.mjs#parseWorkItems
  trace.status: pending
]>
`);

    const diagnostics = validateTraceLinksV1(items, {
      filePaths: ['src/runtime.mjs'],
    });

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, 'error');
    assert.equal(diagnostics[0].code, 'trace.broken_file_ref');
    assert.match(diagnostics[0].message, /src\/missing\.mjs/u);
    assert.equal(diagnostics[0].source.workId, 'trace-task');
  });

  it('reports orphan reverse markers for unknown work ids', () => {
    const items = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace task.
Вектор:
  Scan marker.
Цель:
  Find orphan.

Метки:
  atom.profile: work_item
  work.id: trace-task
  work.title: Trace task
  work.status: ready
  trace.status: pending
]>
`);

    const diagnostics = validateTraceLinksV1(items, {
      fileContentsByPath: {
        'src/runtime.mjs': '// iohasc-ref: work:missing-task\n',
      },
    });

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, 'error');
    assert.equal(diagnostics[0].code, 'trace.orphan_reverse_marker');
    assert.equal(diagnostics[0].source.path, 'src/runtime.mjs');
    assert.equal(diagnostics[0].source.line, 1);
  });

  it('warns about done work with only target_files coverage', () => {
    const items = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace task.
Вектор:
  Use only target files.
Цель:
  Warn about weak trace.
Свидетельства:
  npm test passed.

Метки:
  atom.profile: work_item
  work.id: trace-task
  work.title: Trace task
  work.status: done
  work.target_files: src/runtime.mjs
  trace.status: verified
]>
`);

    const diagnostics = validateTraceLinksV1(items, {
      filePaths: ['src/runtime.mjs'],
    });

    assert.deepEqual(
      diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.code]),
      [['warning', 'trace.weak_target_files_only']],
    );
  });

  it('scans reverse markers deterministically from file contents', () => {
    const markers = scanReverseTraceMarkers({
      'src/two.mjs': '// iohasc-ref: work:second\n',
      'src/one.mjs': '// @iohasc-id: step:550e8400-e29b-41d4-a716-446655441001\n',
    });

    assert.deepEqual(
      markers.map((marker) => [marker.sourcePath, marker.ref, marker.endpoint.kind]),
      [
        ['src/one.mjs', 'atom:550e8400-e29b-41d4-a716-446655441001', 'atom'],
        ['src/two.mjs', 'work:second', 'work'],
      ],
    );
  });
});

describe('claimWorkItemWithLease', () => {
  it('rejects second claim with different run id while lease is active', () => {
    const [task] = parseWorkItems(SAMPLE_BACKLOG).filter((item) => item.id === 'second-task');
    const nowMs = Date.parse('2026-05-29T10:00:00.000Z');

    const first = claimWorkItemWithLease(task, { claimRunId: 'run-a', nowMs });
    assert.equal(first.ok, true);
    assert.equal(first.newStatus, 'claimed');
    assert.match(first.leaseUntil, /2026-05-29T10:15:00/u);

    const second = claimWorkItemWithLease(first.item, { claimRunId: 'run-b', nowMs: nowMs + 1000 });
    assert.equal(second.ok, false);
    assert.equal(second.error, 'claim_lease_active');
    assert.equal(second.claimedBy, 'run-a');
  });

  it('allows idempotent claim with the same run id while lease is active', () => {
    const [task] = parseWorkItems(SAMPLE_BACKLOG).filter((item) => item.id === 'second-task');
    const nowMs = Date.parse('2026-05-29T10:00:00.000Z');
    const first = claimWorkItemWithLease(task, { claimRunId: 'run-a', nowMs });
    const second = claimWorkItemWithLease(first.item, { claimRunId: 'run-a', nowMs: nowMs + 1000 });

    assert.equal(second.ok, true);
    assert.equal(second.idempotent, true);
    assert.equal(second.newStatus, 'claimed');
  });

  it('allows reclaim after lease expiry', () => {
    const [task] = parseWorkItems(SAMPLE_BACKLOG).filter((item) => item.id === 'second-task');
    const nowMs = Date.parse('2026-05-29T10:00:00.000Z');
    const first = claimWorkItemWithLease(task, { claimRunId: 'run-a', nowMs, leaseMs: DEFAULT_CLAIM_LEASE_MS });
    const expiredAt = nowMs + DEFAULT_CLAIM_LEASE_MS + 1;
    const second = claimWorkItemWithLease(first.item, { claimRunId: 'run-b', nowMs: expiredAt });

    assert.equal(second.ok, true);
    assert.equal(second.reclaim, true);
    assert.equal(second.claimRunId, 'run-b');
    assert.equal(second.item.labels['work.claimed_by'], 'run-b');
  });

  it('evaluates ready tasks as claimable', () => {
    const [task] = parseWorkItems(SAMPLE_BACKLOG).filter((item) => item.id === 'second-task');
    const eligibility = evaluateWorkItemClaimEligibility(task);
    assert.equal(eligibility.ok, true);
    assert.equal(eligibility.reclaim, false);
  });
});

describe('claimNext', () => {
  it('selects the next ready item whose dependencies are done', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);

    assert.equal(claimNext(items)?.id, 'second-task');
  });

  it('does not claim items while dependencies are not done', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG).map((item) =>
      item.id === 'first-task' ? { ...item, status: 'verify' } : item,
    );

    assert.equal(claimNext(items), null);
  });
});

describe('transitionStatus', () => {
  it('rejects done without evidence', () => {
    const item = parseWorkItems(SAMPLE_BACKLOG).find((candidate) => candidate.id === 'second-task');

    assert.throws(
      () => transitionStatus(item, 'done'),
      (error) =>
        error instanceof WorkGraphPolicyError &&
        error.message === 'cannot mark done without evidence',
    );
  });

  it('allows done when evidence is recorded', () => {
    const item = parseWorkItems(SAMPLE_BACKLOG).find((candidate) => candidate.id === 'second-task');
    const withEvidence = recordEvidence(item, 'node --test tests/workGraphRuntime.test.mjs passed');
    const done = transitionStatus(withEvidence, 'done');

    assert.equal(done.status, 'done');
    assert.equal(done.labels['work.status'], 'done');
    assert.match(done.labels['work.closed_at'], /^\d{4}-\d{2}-\d{2}T/u);
  });

  it('rejects blocked without reason', () => {
    const item = parseWorkItems(SAMPLE_BACKLOG).find((candidate) => candidate.id === 'second-task');

    assert.throws(
      () => transitionStatus(item, 'blocked'),
      (error) =>
        error instanceof WorkGraphPolicyError &&
        error.message === 'cannot mark blocked without reason',
    );
  });

  it('records blocker reason when blocking an item', () => {
    const item = parseWorkItems(SAMPLE_BACKLOG).find((candidate) => candidate.id === 'second-task');
    const blocked = transitionStatus(item, 'blocked', { reason: 'waiting for domain fixture' });

    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.blocker, 'waiting for domain fixture');
    assert.equal(blocked.labels['work.blocker'], 'waiting for domain fixture');
  });
});

describe('buildSnapshot', () => {
  it('returns a deterministic JSON-serializable snapshot v1', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const snapshot = buildSnapshot([items[2], items[1], items[0]]);

    assert.deepEqual(snapshot, {
      schema: 'workgraph.snapshot.v1',
      source: '.bvc',
      items: [
        {
          key: 'WG-001',
          id: 'blocked-task',
          title: 'Blocked task',
          status: 'ready',
          ownerRole: '',
          department: '',
          priority: '',
          risk: '',
          dependsOn: ['second-task'],
          targetFiles: [],
          traceStatus: 'pending',
          nextAction: '',
          evidence: [],
          checks: [],
          blocker: '',
          basis: 'Blocked task.',
          vector: 'Wait for second.',
          goal: 'Finish blocked task.',
          analysis: '',
          decision: '',
          uiRefs: '',
          parentId: '',
          itemKind: 'task',
          childIds: [],
          closedAt: '',
          labels: {
            'atom.profile': 'work_item',
            'work.id': 'blocked-task',
            'work.title': 'Blocked task',
            'work.status': 'ready',
            'work.depends_on': 'second-task',
            'trace.status': 'pending',
          },
        },
        {
          key: 'WG-002',
          id: 'first-task',
          title: 'First task',
          status: 'done',
          ownerRole: 'engineer',
          department: '',
          priority: 'high',
          risk: '',
          dependsOn: [],
          targetFiles: [],
          traceStatus: 'verified',
          nextAction: '',
          evidence: ['npm test passed.'],
          checks: ['has evidence'],
          blocker: '',
          basis: 'First task.',
          vector: 'Do first task.',
          goal: 'Finish first task.',
          analysis: '',
          decision: '',
          uiRefs: '',
          parentId: '',
          itemKind: 'task',
          childIds: [],
          closedAt: '',
          labels: {
            'atom.profile': 'work_item',
            'work.id': 'first-task',
            'work.title': 'First task',
            'work.status': 'done',
            'work.owner_role': 'engineer',
            'work.priority': 'high',
            'trace.status': 'verified',
          },
        },
        {
          key: 'WG-003',
          id: 'second-task',
          title: 'Second task',
          status: 'ready',
          ownerRole: 'engineer',
          department: '',
          priority: '',
          risk: '',
          dependsOn: ['first-task'],
          targetFiles: ['src/runtime.mjs', 'tests/runtime.test.mjs'],
          traceStatus: 'pending',
          nextAction: '',
          evidence: [],
          checks: ['dependency is done'],
          blocker: '',
          basis: 'Second task.',
          vector: 'Do second task after first.',
          goal: 'Finish second task.',
          analysis: '',
          decision: '',
          uiRefs: '',
          parentId: '',
          itemKind: 'task',
          childIds: [],
          closedAt: '',
          labels: {
            'atom.profile': 'work_item',
            'work.id': 'second-task',
            'work.title': 'Second task',
            'work.status': 'ready',
            'work.owner_role': 'engineer',
            'work.depends_on': 'first-task',
            'work.target_files': 'src/runtime.mjs, tests/runtime.test.mjs',
            'trace.status': 'pending',
          },
        },
      ],
      edges: [
        { from: 'first-task', to: 'second-task', type: 'depends_on' },
        { from: 'second-task', to: 'blocked-task', type: 'depends_on' },
      ],
      statusCounts: {
        done: 1,
        ready: 2,
      },
      readyQueue: ['blocked-task', 'second-task'],
    });

    assert.equal(JSON.stringify(snapshot), JSON.stringify(buildSnapshot([items[0], items[1], items[2]])));
  });
});

describe('intent tree migration scaffold', () => {
  it('plans deterministic task-file paths for every WorkItem atom', async () => {
    const workFilePaths = await listWorkStepFiles(fileURLToPath(new URL('../intent/', import.meta.url)));
    const intentText = (await Promise.all(workFilePaths.map((filePath) => readFile(filePath, 'utf8')))).join('\n');
    const intentItems = parseWorkItems(intentText);
    const entries = buildIntentTreeEntries(intentText);

    assert.equal(entries.length, intentItems.length);
    assert.equal(new Set(entries.map((entry) => entry.id)).size, intentItems.length);
    assert.ok(entries.every((entry) => entry.path.endsWith(`${entry.id}.work.bvc`)));
    assert.ok(entries.every((entry) => entry.path.startsWith('intent/')));
  });

  it('keeps intent/index.bvc equivalent to intent work files', async () => {
    const indexedItems = await readWorkItemsFromIntentTree({
      cwd: fileURLToPath(new URL('..', import.meta.url)),
    });
    const indexedSnapshot = buildSnapshot(indexedItems);
    const workFilePaths = await listWorkStepFiles(fileURLToPath(new URL('../intent/', import.meta.url)));
    const intentText = (await Promise.all(workFilePaths.map((filePath) => readFile(filePath, 'utf8')))).join('\n');
    const intentSnapshot = buildSnapshot(parseWorkItems(intentText));

    assert.equal(workFilePaths.length, indexedSnapshot.items.length);
    assert.deepEqual(intentSnapshot, indexedSnapshot);
  });
});

async function listWorkStepFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return listWorkStepFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.work.bvc') ? [entryPath] : [];
    }),
  );

  return nested.flat().sort();
}
