#!/usr/bin/env node
/**
 * Seed: AN-54 — Detail drawer stack (modal queue + typed frames).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/detail-drawer-stack-modal-queue.md';
const PLAN = 'docs/plan-detail-drawer-stack-v1.md';
const EPIC_ID = 'epic-detail-drawer-stack-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Detail drawer stack v1: typed modal frames + push/pop queue (AN-54)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['wire-analytics-related-task-sub-drawer'],
    basis: [
      'L1 detail-drawer + L2 detail-sub-drawer — два ad hoc слоя; каждый drill-down добавляет хак.',
      'Клик «Родитель (эпик)» в task drawer заменяет контент вместо push поверх.',
      'AN-54: единый shell + очередь detail-stack.frame.v1 с типами task/analytics/architecture-l2/…',
    ],
    vector: [
      'P0: ADR frame types + stack API.',
      'P0: task hierarchy parent/child → stack.push.',
      'P1: migrate analytics related task + lineage to stack.',
      'P1: migrate architecture L2 to stack; deprecate #detail-sub-drawer.',
      'P2: uniform Esc/back/overlay.',
    ],
    goal: [
      'Drill-down task → epic → subtask без потери контекста; один паттерн на всех страницах WG UI.',
    ],
    checks: [
      'ADR detail-drawer-stack-v1 принят',
      'Parent epic opens on stack push from task drawer',
      'Analytics + architecture migrated or wrapped',
      'AN-54 closing doc опубликован',
    ],
    analysis: [
      'Источник: operator UX — epic parent поверх task; обобщение modal queue.',
      'Interim: wire-analytics-related-task-sub-drawer — refactor в stack P1.',
    ],
    decision: [
      'Вердикт: полезно',
      'Исполнять по docs/plan-detail-drawer-stack-v1.md.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-detail-drawer-stack-v1.md',
      'src/detailDrawerStack.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
  },
  {
    workId: 'decide-detail-drawer-stack-adr',
    title: 'ADR: detail drawer stack — frame types and push/pop canon',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['AN-54 §2–3: shell vs queue; deprecate fixed L2 DOM.'],
    vector: [
      'docs/adr-detail-drawer-stack-v1.md — detail-stack.frame.v1 types table.',
      'Push rules: list open = reset+push; in-drawer = push only.',
    ],
    goal: ['Команда не добавляет L3 DOM; только stack.push.'],
    checks: ['ADR published', 'Linked from plan-detail-drawer-stack-v1.md'],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-detail-drawer-stack-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
  },
  {
    workId: 'implement-detail-drawer-stack-core',
    title: 'Implement detailDrawerStack core + renderer registry',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-detail-drawer-stack-adr'],
    basis: ['detailContext singleton не масштабируется на N уровней.'],
    vector: [
      'src/detailDrawerStack.mjs — push, pop, reset, peek, depth, subscribe.',
      'Frame registry: type → async render(payload, { stack, shell }).',
      'Wire shell to #detail-drawer; tests/detailDrawerStack.test.mjs.',
    ],
    goal: ['Stack module unit-tested; shell renders top frame.'],
    checks: ['push/pop depth correct', 'Unknown type throws clear error'],
    targetFiles: ['src/detailDrawerStack.mjs', 'tests/detailDrawerStack.test.mjs', 'src/workGraphBacklogUiServer.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
  },
  {
    workId: 'wire-task-hierarchy-stack-navigation',
    title: 'UI: task parent epic / child — stack push (not L1 replace)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-detail-drawer-stack-core'],
    basis: [
      'renderParentChildHierarchy: task-atom click → handleTaskCardClick → openTaskDetails replaces L1.',
      'Operator request: epic parent opens поверх текущей задачи.',
    ],
    vector: [
      'From #detail-body hierarchy-parent/children: stack.push({ type: task, workId }).',
      'Back label «← {previous.title}»; preserve underlying frame.',
      'works in L1 and after analytics-related stack depth.',
    ],
    goal: ['Клик «Родитель» не уничтожает контекст текущей задачи.'],
    checks: [
      'task → parent epic → back returns to task',
      'Sub-drawer depth + parent epic smoke',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
  },
  {
    workId: 'migrate-analytics-drilldown-to-drawer-stack',
    title: 'Migrate analytics related task + lineage nav to drawer stack',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-detail-drawer-stack-core', 'wire-analytics-related-task-sub-drawer'],
    basis: ['openAnalyticsRelatedTaskSubDrawer — interim L2 hack.'],
    vector: [
      'Replace openAnalyticsRelatedTaskSubDrawer with stack.push analytics→task.',
      'Lineage parent/continuation clicks → stack.push analytics frames.',
      'Remove or thin #detail-sub-drawer for analytics path.',
    ],
    goal: ['Analytics drill-down uses same stack API as task hierarchy.'],
    checks: ['AN-50.1 related task + lineage nav on stack', 'No duplicate L2 path'],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'intent/ui/dashboard/work/wire-analytics-related-task-sub-drawer.work.bvc'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
  },
  {
    workId: 'migrate-architecture-l2-to-drawer-stack',
    title: 'Migrate Architecture L2 node drill-down to drawer stack',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-detail-drawer-stack-core'],
    basis: ['openL2NodeDetails uses #detail-sub-drawer — second parallel stack.'],
    vector: [
      'architecture-l2 frame type; openL2NodeDetails → stack.push.',
      'Block drawer stays frame[0]; L2 is frame[1+].',
      'Deprecate detail-sub-drawer when no callers remain.',
    ],
    goal: ['Architecture uses unified stack; L2 DOM optional wrapper only.'],
    checks: ['block → L2 node → back → block', 'L2 related tasks push task frame'],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
  },
  {
    workId: 'wire-drawer-stack-uniform-back-esc',
    title: 'Uniform Esc / overlay / breadcrumb for drawer stack',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['wire-task-hierarchy-stack-navigation'],
    basis: ['Esc/back semantics differ between L1, L2, analytics interim.'],
    vector: [
      'Esc: pop if depth>1 else reset.',
      'Overlay click: reset stack.',
      'Optional breadcrumb trail in drawer header (depth>1).',
    ],
    goal: ['Predictable keyboard and pointer exit from nested drill-down.'],
    checks: ['Esc pops one frame at depth 2+', 'Overlay closes entire stack'],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'src/detailDrawerStack.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
  },
  {
    workId: 'write-closing-epic-detail-drawer-stack-v1',
    title: 'Closing: epic-detail-drawer-stack-v1 (AN-54)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'wire-task-hierarchy-stack-navigation',
      'migrate-analytics-drilldown-to-drawer-stack',
    ],
    basis: ['Closing with ADR, test evidence, L2 deprecation note.'],
    vector: [
      'work/analytics/closing-epic-detail-drawer-stack-v1.md',
      'journal closing record.',
    ],
    goal: ['AN-54 закрыт с проверяемыми артефактами.'],
    checks: ['Closing doc published'],
    targetFiles: [
      'work/analytics/closing-epic-detail-drawer-stack-v1.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-54',
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
    schema: 'workgraph.seed-epic-detail-drawer-stack-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-54',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
