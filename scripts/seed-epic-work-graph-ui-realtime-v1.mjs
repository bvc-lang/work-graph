#!/usr/bin/env node
/**
 * Seed: AN-56 — Work Graph UI realtime updates (revision poll + kanban patch).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/work-graph-ui-realtime-updates-best-practices.md';
const PLAN = 'docs/plan-work-graph-ui-realtime-v1.md';
const EPIC_ID = 'epic-work-graph-ui-realtime-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Work Graph UI realtime v1: live kanban + revision sync (AN-56)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [],
    basis: [
      'Kanban/board загружается один раз; MCP/agent пишет .bvc — карточки не двигаются без F5.',
      'Poll есть только Home 30s, Agent dock 5s — не board/workflow.',
      'AN-20: polling preferred over WS for RAM; AN-28: read-only mirror WG, not TodoWrite sync.',
    ],
    vector: [
      'P0: ADR + backlog revision API + client live-sync coordinator.',
      'P1: incremental kanban patch, board/workflow poll, new item highlight, drawer reconcile.',
      'P2: optional SSE from fs watch; unify home/inbox/agent intervals.',
    ],
    goal: [
      'Статус карточки и колонка kanban обновляются ≤3s после изменения backlog извне UI.',
    ],
    checks: [
      'ADR work-graph-ui-realtime-v1 принят',
      'Card moves column without full page reload',
      'New work item appears on board with highlight',
      'AN-56 closing doc опубликован',
    ],
    analysis: [
      'Источник: operator UX — agent меняет status, board stale.',
      'v1: revision poll + DOM patch; SSE P2 optional.',
    ],
    decision: [
      'Вердикт: полезно',
      'Исполнять по docs/plan-work-graph-ui-realtime-v1.md.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-work-graph-ui-realtime-v1.md',
      'src/backlogRevision.mjs',
      'src/ui/liveSyncCoordinator.mjs',
      'src/ui/kanbanBoardPatcher.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'src/kanbanBoardProjection.mjs',
      'tests/kanbanBoardDelta.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'decide-work-graph-ui-realtime-adr',
    title: 'ADR: UI realtime — revision poll, kanban patch, SSE optional',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-56 §3–4: ETag revision, view-scoped poll, incremental DOM; WS deferred.',
      'Align intervals with AN-20 mission control RAM policy.',
    ],
    vector: [
      'docs/adr-work-graph-ui-realtime-v1.md — transport, intervals, anti-goals (TodoWrite).',
      'Fallback: full render when patch fails.',
    ],
    goal: ['Single documented pattern for all live UI surfaces.'],
    checks: ['ADR published', 'Linked from plan AN-56'],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-work-graph-ui-realtime-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'implement-backlog-snapshot-revision-api',
    title: 'API: backlog revision hash + conditional snapshot (304)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-work-graph-ui-realtime-adr'],
    basis: ['Cheap heartbeat before full snapshot reload.'],
    vector: [
      'src/backlogRevision.mjs — deterministic hash from work items (id, status, key labels).',
      'GET /api/backlog-revision; If-None-Match on /api/snapshot.',
      'tests/backlogRevision.test.mjs.',
    ],
    goal: ['Client detects backlog change in one lightweight request.'],
    checks: ['Same corpus → same revision', 'Status change → revision bump'],
    targetFiles: [
      'src/backlogRevision.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/backlogRevision.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'implement-ui-live-sync-coordinator',
    title: 'Client: view-scoped live sync coordinator',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-backlog-snapshot-revision-api'],
    basis: ['Scattered setInterval in monolith — home 30s, agent 5s, board none.'],
    vector: [
      'src/ui/liveSyncCoordinator.mjs — subscribe by view, backoff hidden tab.',
      'Wire into workGraphBacklogUiServer on applyView + visibilitychange.',
      'tests/uiLiveSyncCoordinator.test.mjs.',
    ],
    goal: ['One hub drives revision checks per active surface.'],
    checks: ['Board view starts poll; analytics view does not', 'Hidden tab slows interval'],
    targetFiles: [
      'src/ui/liveSyncCoordinator.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/uiLiveSyncCoordinator.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'implement-kanban-incremental-patch',
    title: 'Kanban incremental patcher (delta → DOM move)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-ui-live-sync-coordinator'],
    basis: ['renderKanbanBoard replaces innerHTML — loses scroll and causes flicker.'],
    vector: [
      'src/kanbanBoardDelta.mjs — diff two kanban projections → moves/adds/removes.',
      'src/ui/kanbanBoardPatcher.mjs — apply to DOM [data-work-id] cards.',
      'tests/kanbanBoardDelta.test.mjs.',
    ],
    goal: ['Status change moves card between columns without full board repaint.'],
    checks: ['doing→done moves card', 'Patch failure falls back to render()'],
    targetFiles: [
      'src/kanbanBoardDelta.mjs',
      'src/ui/kanbanBoardPatcher.mjs',
      'src/kanbanBoardProjection.mjs',
      'tests/kanbanBoardDelta.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'wire-board-workflow-live-refresh',
    title: 'Wire board + workflow views to live revision refresh',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-kanban-incremental-patch'],
    basis: ['Operator stays on Доска while agent completes tasks via MCP.'],
    vector: [
      'On revision change: patch kanban if board; refresh workflow epic groups if workflow.',
      '3s interval when view active (per ADR).',
      'Smoke in workGraphBacklogUiServer.test.mjs.',
    ],
    goal: ['Доска and Задачи reflect external status changes within poll window.'],
    checks: ['Board poll wired', 'Workflow list status badges update'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'wire-new-work-item-live-appearance',
    title: 'Live appearance of new work items (seed / create_work_item)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-kanban-incremental-patch'],
    basis: ['Seed epic creates 10 items — operator expects cards without reload.'],
    vector: [
      'item.added delta → insert card in backlog column.',
      'CSS .kanban-card.is-new flash 3s; update column counts.',
      'Same path for workflow list prepend.',
    ],
    goal: ['New work.id visible on board shortly after file appears in intent tree.'],
    checks: ['Added id renders card', 'Column count increments'],
    targetFiles: [
      'src/ui/kanbanBoardPatcher.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'src/style.css',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'reconcile-detail-drawer-on-remote-patch',
    title: 'Reconcile open detail drawer when work item changes remotely',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-ui-live-sync-coordinator'],
    basis: ['Drawer open while agent moves same task to verify — stale status in header.'],
    vector: [
      'If detailContext.workId in delta: refresh badges/buttons without closing drawer.',
      'Optional banner «Обновлено агентом»; do not overwrite unsaved editor fields.',
      'Compatible with AN-54 drawer stack (top frame workId).',
    ],
    goal: ['Open task detail stays accurate when backlog changes externally.'],
    checks: ['Remote status change updates drawer badge', 'Drawer stays open'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'implement-backlog-sse-push-optional',
    title: 'Optional SSE push on intent tree file changes (P2)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'low',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-backlog-snapshot-revision-api'],
    basis: ['Poll alone adds latency; fs watch can trigger immediate revision push.'],
    vector: [
      'GET /api/ui-events/stream — text/event-stream backlog-revision events.',
      'Debounced watch on intent/**/**/*.work.bvc; SSE adapter in liveSyncCoordinator.',
      'Poll remains fallback when SSE disconnected.',
    ],
    goal: ['Sub-second UI update when SSE enabled; poll-only mode still works.'],
    checks: ['SSE client receives revision on file write', 'Graceful degrade to poll'],
    targetFiles: [
      'src/ui/backlogFileWatch.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/liveSyncCoordinator.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'unify-home-inbox-agent-live-poll',
    title: 'Unify Home, inbox, and agent dock polling under live sync coordinator',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-ui-live-sync-coordinator'],
    basis: ['Three separate timers — homePollTimer, agentDockPollTimer, agentScopePollTimer.'],
    vector: [
      'Register home/inbox/agent scopes in liveSyncCoordinator.',
      'Remove duplicate setInterval blocks when migrated.',
      'Preserve 5s/20s/30s intervals from ADR.',
    ],
    goal: ['Single timer policy; easier to tune and test.'],
    checks: ['Agent dock still polls 5s when open', 'No duplicate revision fetches'],
    targetFiles: [
      'src/ui/liveSyncCoordinator.mjs',
      'src/workGraphBacklogUiServer.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'write-closing-epic-work-graph-ui-realtime-v1',
    title: 'Closing: epic-work-graph-ui-realtime-v1 (AN-56)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'wire-board-workflow-live-refresh',
      'wire-new-work-item-live-appearance',
      'reconcile-detail-drawer-on-remote-patch',
    ],
    basis: ['Closing with ADR, smoke evidence, known deferrals (SSE).'],
    vector: [
      'work/analytics/closing-epic-work-graph-ui-realtime-v1.md',
    ],
    goal: ['AN-56 epic closed with verifiable live kanban behavior.'],
    checks: ['Closing doc published', 'P0–P1 tasks done or deferred in closing'],
    targetFiles: [
      'work/analytics/closing-epic-work-graph-ui-realtime-v1.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-56',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (existingIds.has(task.workId)) {
      console.log(`skip ${task.workId}`);
      continue;
    }

    await createWorkItem({
      workId: task.workId,
      title: task.title,
      department: task.department,
      ownerRole: task.ownerRole,
      priority: task.priority,
      risk: task.risk,
      status: task.status,
      itemKind: task.itemKind,
      parentId: task.parentId,
      dependsOn: task.dependsOn?.join(', '),
      basis: task.basis.join('\n'),
      vector: task.vector.join('\n'),
      goal: task.goal.join('\n'),
      checks: task.checks.join('\n'),
      analysis: task.analysis?.join('\n'),
      decision: task.decision?.join('\n'),
      targetFiles: task.targetFiles.join(', '),
      intakeSourceKind: task.intakeSourceKind,
      intakeSourceRef: task.intakeSourceRef,
      analyticsKey: task.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${task.workId}`);
    created += 1;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-epic-work-graph-ui-realtime-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-56',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
