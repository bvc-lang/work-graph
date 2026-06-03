#!/usr/bin/env node
/**
 * Seed: resizable sidebar with min (icon rail) / max width limits.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const EPIC_ID = 'epic-work-graph-ui-sidebar-resize-v1';
const RESIZE_ROOT = 'src/workGraphBacklogUiServer.mjs';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'UI Sidebar resize v1: ручная ширина с min (иконки) и max',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-work-graph-ui-classifier-badges-v1'],
    basis: [
      'Sidebar фиксирован 252px; на mobile автоматически 56px icon rail через media query.',
      'Оператор хочет drag-resize с ограничениями: min → icon-only, max → cap.',
    ],
    vector: [
      'P0: sidebar-resize-handle + pointer drag как detail drawer.',
      'P0: --sidebar-width 56–360px, localStorage workGraphSidebarWidth.',
      'P0: html.is-sidebar-compact вместо @media forced compact.',
      'P1: keyboard ArrowLeft/Right на separator.',
    ],
    goal: [
      'Оператор тянет правый край sidebar; при min ширине — только иконки; ширина сохраняется.',
    ],
    checks: [
      'id="sidebar-resize-handle" в HTML',
      'workGraphSidebarWidth persist',
      'html.is-sidebar-compact hides nav-tab-label',
      'tests/workGraphBacklogUiServer.test.mjs green',
    ],
    analysis: ['Reuse detail-resize-handle pattern; early head script avoids layout flash.'],
    decision: ['Вердикт: полезно', 'Max 360px; compact UI threshold ≤80px.'],
    targetFiles: [
      RESIZE_ROOT,
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: RESIZE_ROOT,
    analyticsKey: 'AN-62',
  },
  {
    workId: 'implement-sidebar-resize-handle',
    title: 'UI: sidebar-resize-handle + CSS + compact class',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['Нет resize handle и is-sidebar-compact стилей.'],
    vector: [
      '.sidebar-resize-handle на правом краю aside.',
      'html.is-sidebar-compact — icon rail (скрыть labels, logo).',
      '--sidebar-width-min/max/default CSS tokens.',
    ],
    goal: ['Визуальный handle и compact styling по классу, не media query.'],
    checks: ['sidebar-resize-handle', 'is-sidebar-compact'],
    targetFiles: [RESIZE_ROOT],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: RESIZE_ROOT,
    analyticsKey: 'AN-62',
  },
  {
    workId: 'wire-sidebar-width-persist',
    title: 'UI: applySidebarWidth + localStorage + head bootstrap',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-sidebar-resize-handle'],
    basis: ['Ширина sidebar не сохраняется между сессиями.'],
    vector: [
      'Early <script> in head sets --sidebar-width from localStorage.',
      'clampSidebarWidth, startSidebarResize, window resize re-clamp.',
    ],
    goal: ['Ширина sidebar стабильна после reload.'],
    checks: ['workGraphSidebarWidth', 'applyStoredSidebarWidth on init'],
    targetFiles: [RESIZE_ROOT, 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: RESIZE_ROOT,
    analyticsKey: 'AN-62',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const known = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (known.has(task.workId)) {
      console.log(`skip ${task.workId} (exists)`);
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
    schema: 'workgraph.seed-epic-work-graph-ui-sidebar-resize-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-62',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
