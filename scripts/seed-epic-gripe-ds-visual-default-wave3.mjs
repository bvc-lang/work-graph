#!/usr/bin/env node
/**
 * Seed: AN-33 — Gripe visual default + WG UI wave 3 (kanban, toolbar, badges).
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/gripe-ds-visual-default-wave3.md';
const PLAN = 'docs/plan-gripe-ds-visual-default-wave3.md';
const EPIC_ID = 'epic-gripe-ds-visual-default-wave3';
const PARENT_EPIC = 'epic-gripe-ds-adoption-phase2';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Gripe visual default + WG UI wave 3 (kanban, toolbar, badges)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [PARENT_EPIC],
    basis: [
      'AN-33: phase 2 не менял палитру — WG остался Cursor blue; пользователь не видит Gripe.',
      'Gripe = marketplace-default amber brand; WG shell остаётся тёмным IDE.',
      'Wave 3: kanban cards, view toolbar, status badges, detail toolbar → atoms.',
    ],
    vector: [
      'Track A: theme gripe-dark-default as single default CSS (no preview toggle).',
      'Track B: renderUiBadge/renderUiButton в kanban, toolbar, badges.',
      'Tests + AN-33 closing.',
    ],
    goal: [
      'Backlog UI http://127.0.0.1:4177/ визуально Gripe-by-default; wave 3 atomify завершён.',
    ],
    checks: [
      'default CSS gripe-dark-default; accent amber 245 158 11',
      'kanban/toolbar/badges через atoms',
      'AN-33 closing опубликован',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'packages/design-tokens/tokens/themes/gripe-dark-default.json',
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/atoms/badge.mjs',
      'src/ui/atoms/button.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'gripe-dark-default-theme-json-and-css',
    title: 'Theme gripe-dark-default: Gripe brand + WG dark shell (JSON + CSS)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'marketplace-default: primaryRgb 245 158 11; workgraph-dark: dark surfaces.',
      'Hybrid без копирования всего light marketplace UI.',
    ],
    vector: [
      'packages/design-tokens/tokens/themes/gripe-dark-default.json',
      'build/tokens-to-css.mjs → generated/gripe-dark-default.css',
      'npm run build:design-tokens; test asserts amber primary.',
    ],
    goal: ['Один канонический Gripe-dark theme file в monorepo.'],
    checks: [
      'gripe-dark-default.json валиден по schema',
      'generated CSS содержит --brand-primary-rgb: 245 158 11',
      'tests/design-tokens.test.mjs покрывает theme id',
    ],
    targetFiles: [
      'packages/design-tokens/tokens/themes/gripe-dark-default.json',
      'packages/design-tokens/generated/gripe-dark-default.css',
      'packages/design-tokens/build/tokens-to-css.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'backlog-default-gripe-theme-wireup',
    title: 'Backlog UI: Gripe theme as default (CSS link + accent bridge)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'gripe-dark-default-theme-json-and-css'],
    basis: [
      'Сейчас: design-tokens-workgraph-dark.css + Cursor blue.',
      'Пользователь: Gripe default сразу, не preview toggle.',
    ],
    vector: [
      'workGraphBacklogUiServer: link gripe-dark-default.css; serve /assets/ route.',
      'uiKitPage тот же default theme.',
      'applyTheme: brand fixed; toggle только light/dark luminance if kept.',
      'data-iohasc-theme=gripe-dark-default on html.',
    ],
    goal: ['Открытие backlog сразу показывает Gripe amber accent.'],
    checks: [
      'GET /assets/design-tokens-gripe-dark-default.css 200',
      'renderBacklogHtml ссылается на gripe-dark-default',
      'workGraphBacklogUiServer.test.mjs обновлён',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/pages/uiKitPage.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'wg-ui-wave3-status-badges-atoms',
    title: 'Wave 3: status badges → renderUiBadge (server + client)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'backlog-default-gripe-theme-wireup'],
    basis: [
      'renderStatusBadge() — inline pills; duplicate tone logic.',
      'Gripe DS: x-ui.atoms.badge patterns.',
    ],
    vector: [
      'Map work.status → badge tone (ready=accent, done=ok, blocked=danger, …).',
      'UI_BADGE_CSS в backlog head.',
      'badgeClient.mjs для inline script renderStatusBadge replacement.',
    ],
    goal: ['Все status pills в списках/kanban/detail на wg-badge.'],
    checks: [
      'renderStatusBadge uses renderUiBadge or client helper',
      'tests/uiAtoms.test.mjs tone map',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/atoms/badge.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'wg-ui-wave3-kanban-cards-atoms',
    title: 'Wave 3: kanban cards → atoms (badge + card actions)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'wg-ui-wave3-status-badges-atoms'],
    basis: [
      'renderKanbanBoard → renderTaskAtomCard inline HTML.',
      'Kanban — главный экран «Доска».',
    ],
    vector: [
      'renderTaskAtomCard: status badge atom, optional promote btn wg-btn--sm.',
      'Column headers: count badge atom.',
      'Preserve data-task-id / kanban-card hooks for tests.',
    ],
    goal: ['Kanban визуально aligned с Gripe DS cards.'],
    checks: [
      'kanban HTML contains wg-badge',
      'e2e/smoke: data-testid kanban-board-panel still works',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/atoms/badge.mjs',
      'src/ui/atoms/button.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'wg-ui-wave3-view-toolbar-atoms',
    title: 'Wave 3: view toolbar → wg-btn (filters, domain clear)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'backlog-default-gripe-theme-wireup'],
    basis: [
      '#view-toolbar: search + selects + intent-domain-clear board-tab.',
    ],
    vector: [
      'intent-domain-clear уже atom; align selects styling with --ui-control-* tokens.',
      'Optional: board-toolbar promote actions on wg-btn.',
    ],
    goal: ['Toolbar использует Gripe semantic control tokens + buttons.'],
    checks: [
      'view-toolbar wg-btn or semantic input borders from gripe theme',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/backlogShellButtons.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'wg-ui-wave3-detail-toolbar-atoms',
    title: 'Wave 3: detail drawer toolbar → renderUiButton',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'backlog-default-gripe-theme-wireup'],
    basis: [
      'renderDetailToolbar: .detail-toolbar-btn raw buttons.',
    ],
    vector: [
      'Просмотр/Редактор modes → wg-btn secondary + flat active state.',
      'Preserve data-detail-mode hooks.',
    ],
    goal: ['Detail drawer toolbar on Gripe buttons.'],
    checks: [
      'detail-toolbar contains wg-btn',
      'data-testid detail-mode-edit unchanged',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'wg-ui-wave3-client-badge-button-helpers',
    title: 'Wave 3: badgeClient + shared tone map module',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'wg-ui-wave3-status-badges-atoms'],
    basis: [
      'Client script duplicates server badge HTML; need DRY tone map.',
    ],
    vector: [
      'src/ui/atoms/badgeClient.mjs + workItemStatusTone.mjs shared map.',
      'loadBrowserBadgeClientSource in backlog server.',
    ],
    goal: ['Server/client badge rendering consistent.'],
    checks: [
      'tests for status→tone map',
    ],
    targetFiles: [
      'src/ui/atoms/badgeClient.mjs',
      'src/ui/workItemStatusTone.mjs',
      'src/workGraphBacklogUiServer.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'tests-gripe-visual-default-wave3',
    title: 'Tests: Gripe default theme + wave 3 regression',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'backlog-default-gripe-theme-wireup',
      'wg-ui-wave3-kanban-cards-atoms',
      'wg-ui-wave3-view-toolbar-atoms',
      'wg-ui-wave3-detail-toolbar-atoms',
    ],
    basis: [
      'Visual epic needs automated guards on theme URL and wg-badge presence.',
    ],
    vector: [
      'design-tokens.test.mjs: gripe-dark-default',
      'workGraphBacklogUiServer.test.mjs: default css path, wg-badge in kanban path',
    ],
    goal: ['CI ловит откат на workgraph-blue-only default.'],
    checks: [
      'npm test subset green',
    ],
    targetFiles: [
      'tests/design-tokens.test.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
  },
  {
    workId: 'write-an33-closing-gripe-ds-visual-default-wave3',
    title: 'AN-33 closing analysis: epic-gripe-ds-visual-default-wave3',
    department: 'product-integration',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'tests-gripe-visual-default-wave3',
      'wg-ui-wave3-kanban-cards-atoms',
      'wg-ui-wave3-status-badges-atoms',
      'wg-ui-wave3-client-badge-button-helpers',
    ],
    basis: [
      'Closing loop AN-22; before/after accent screenshot note.',
    ],
    vector: [
      'work/analytics/closing-epic-gripe-ds-visual-default-wave3.md + journal.',
    ],
    goal: ['Эпик закрыт с visual acceptance criteria.'],
    checks: [
      'analytics-records.jsonl содержит AN-33 closing',
      'epic closed с evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-gripe-ds-visual-default-wave3.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-33',
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
      targetFiles: task.targetFiles.join(', '),
      intakeSourceKind: task.intakeSourceKind,
      intakeSourceRef: task.intakeSourceRef,
      analyticsKey: task.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${task.workId}`);
    created += 1;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-epic-gripe-ds-visual-default-wave3.v1',
    epicId: EPIC_ID,
    parentEpic: PARENT_EPIC,
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
