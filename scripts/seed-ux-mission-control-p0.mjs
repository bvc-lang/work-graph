#!/usr/bin/env node
/**
 * Seed WorkItems: UX Mission Control phase P0 (closes AN-20 B1/B2/B3/B4).
 * Idempotent: skips existing work.id.
 * Default status: backlog (не doing). Перевод в ready/doing — после operator review / claim.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const PLAN = 'docs/plan-ux-mission-control-p0.md';
const ANALYTICS = 'work/analytics/ux-current-state-and-vector.md';
const EPIC_ID = 'ux-mission-control-p0';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'UX Mission Control P0: Home + Right dock + Cmd+K + Inbox',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    basis: [
      'AN-20 выявил четыре острые UX-боли (B1 нет домашнего экрана, B2 невидим Agent Run, B3 нет cmd+k, B4 нет inbox).',
      'Существующая база: operatorShellProjection.mjs, /api/operator-shell-snapshot, /api/agent-run*, protocols/operator-agent-run-panel-v1.bvc, ui/operator-dashboard-v2.bvc.',
      'BVC tooling трек закрыт (@bvc-lang/cli@0.1.3, GitHub bvc-lang/cli) — высвобождает bandwidth для UX P0.',
    ],
    vector: [
      'Home view как default landing с HERMES-pattern: KPI tiles + Inbox + My queue + Active runs.',
      'Persistent right dock с Agent Run panel (live log + retry/cancel), Cursor-style.',
      'Cmd+K палитра со скоупами task:/an:/mem:/evidence:/run:/cmd: + fuzzy + опциональный semantic.',
      'Inbox events stream с unread badge на сайдбаре.',
    ],
    goal: [
      'Operator видит «что делать сейчас» с первого экрана и запускает agent run одной командной нажатие.',
      'Кликов до запуска worker = 1; кликов до My ready next task = 0; time-to-first-action < 5s.',
    ],
    checks: [
      '/ открывает Home по умолчанию (KPI + Inbox + My queue + Active runs)',
      'Cmd+K палитра запускает run за 1 Enter',
      'Right dock виден после toggle и показывает live log',
      'Inbox badge корректен по unread count',
      'npm run lint:backlog без новых errors',
      'AN-24 closing analysis опубликован',
    ],
    targetFiles: [
      PLAN,
      ANALYTICS,
      'src/operatorShellProjection.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'ui/operator-dashboard-v2.bvc',
      'protocols/operator-agent-run-panel-v1.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-20',
  },
  {
    workId: 'design-home-mission-control-view',
    title: 'спека Home (mission control): KPI tiles + Inbox + My queue + Active runs',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'Home требует канонического описания секций и refresh budget — иначе MVP размоется по чату.',
      'ui/operator-dashboard-v2.bvc описывает sections, но без HERMES-pattern KPI tiles и Inbox.',
    ],
    vector: [
      'ui/home-mission-control-v1.bvc — BVC-спека секций (top KPI, Inbox, My queue, Active runs), layout grid, refresh.',
      'Mapping секций на источники данных: cycle slice, runner queue, agent-run journal, daemon audit, analytics-records.',
    ],
    goal: [
      'Канонический контракт Home view, на который опираются T2 (API) и T3 (UI mount).',
    ],
    checks: [
      'ui/home-mission-control-v1.bvc создан и линтуется',
      'все секции имеют источники данных и refresh budget',
    ],
    targetFiles: ['ui/home-mission-control-v1.bvc', 'docs/plan-ux-mission-control-p0.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'implement-home-snapshot-api',
    title: '/api/home-snapshot — агрегатор KPI + my queue + active runs',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'design-home-mission-control-view'],
    basis: [
      'Home tiles требуют единого snapshot endpoint, иначе клиент дергает 5+ API подряд.',
      'Существующие проекции (cycleSlice, runnerQueue, kanban) уже строятся, нужен композитор.',
    ],
    vector: [
      'src/homeSnapshotProjection.mjs: schema home.snapshot.v1 (kpi, myQueue, activeRuns, inboxPreview).',
      'GET /api/home-snapshot в src/workGraphBacklogUiServer.mjs.',
      'Unit-тесты для проекции (mock workgraph snapshot + agent-run journal).',
    ],
    goal: [
      'Клиент Home рендерится из одного fetch ≤ 200ms на тестовых данных.',
    ],
    checks: [
      'tests/homeSnapshotProjection.test.mjs зелёный',
      'curl /api/home-snapshot возвращает home.snapshot.v1',
    ],
    targetFiles: [
      'src/homeSnapshotProjection.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/homeSnapshotProjection.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'implement-home-page-mount',
    title: 'смонтировать Home как default landing view',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-home-snapshot-api'],
    basis: [
      'Сейчас стартовый экран — Доска (kanban); это блокирует B1.',
      'workGraphBacklogUiServer.mjs монолитный — view нужно встроить аккуратно.',
    ],
    vector: [
      'Новый sidebar item «🏠 Home» становится default landing.',
      'Render KPI tiles + Inbox preview + My queue + Active runs из /api/home-snapshot.',
      'E2E smoke: открыть «/» → видим KPI и My queue.',
    ],
    goal: [
      'Default-навигация в Home; Доска и Задачи остаются в сайдбаре, но не landing.',
    ],
    checks: [
      'e2e: первый GET / возвращает Home с тайлами',
      'sidebar содержит Home, остальные вкладки сохранены',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'e2e/home-mission-control-smoke.spec.js'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'implement-inbox-event-stream',
    title: 'Inbox events: журнал → unread feed',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'design-home-mission-control-view'],
    basis: [
      'Источники событий уже есть: agent-run journal, daemon audit tail, analytics-records.',
      'Нет единой агрегации в read model inbox.events.v1 и нет статуса unread.',
    ],
    vector: [
      'src/inboxEventStream.mjs: builder из journal sources, ordered, severity/kind/link.',
      'GET /api/inbox-events; POST /api/inbox-events/read для mark-read.',
      'Хранение состояния прочитанного в .iohasc/inbox-read-state.json (single-tenant pilot).',
    ],
    goal: [
      'Operator видит свежие события одной лентой, помечает прочитанным, badge обнуляется.',
    ],
    checks: [
      'tests/inboxEventStream.test.mjs зелёный',
      'unread count корректно меняется после mark-read',
    ],
    targetFiles: [
      'src/inboxEventStream.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/inboxEventStream.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'implement-sidebar-inbox-badge',
    title: 'badge unread count на сайдбаре',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-inbox-event-stream'],
    basis: [
      'Без badge оператор не узнаёт о новых событиях; B4 не закрыт без визуального сигнала.',
    ],
    vector: [
      'Sidebar badge у Home/Inbox с числом unread; poll /api/inbox-events каждые 30s.',
      'Аккуратное затухание при mark-read.',
    ],
    goal: [
      'Visual cue для unread events без расход RAM (polling, не WS).',
    ],
    checks: [
      'badge показывает корректное число unread',
      'после mark-read badge скрывается',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'implement-cmd-k-palette',
    title: 'Cmd+K палитра: tasks/AN/commands + fuzzy + semantic',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-home-snapshot-api'],
    basis: [
      '9 вкладок + 256 WorkItems + 23 AN без палитры = боль навигации (B3).',
      'Бекенд semantic-search уже есть (/api/semantic-search lexical/BM25), не нужно строить с нуля.',
    ],
    vector: [
      'Глобальный keybinding Ctrl+K/Cmd+K — overlay-палитра.',
      'Скоупы: task:, an:, mem:, evidence:, run:, cmd:.',
      'Fuzzy match по локальному индексу + опциональный semantic boost.',
      'Top-N результатов; Enter — open / run.',
    ],
    goal: [
      'Запуск worker и переход к задаче за 2 keystrokes (Cmd+K → Enter).',
    ],
    checks: [
      'e2e: Cmd+K → ввод workId → Enter → задача открыта',
      'e2e: Cmd+K → run: → выбор → Enter → POST /api/agent-run',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'e2e/cmd-k-palette-smoke.spec.js',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'implement-right-dock-agent-run-panel',
    title: 'Persistent right dock: Agent Run panel + live log + retry',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'design-home-mission-control-view'],
    basis: [
      'Agent Run сейчас только через API/CLI; нет постоянного места в UI (B2).',
      'Cursor-pattern: persistent right dock — лучшее место для long-running выполнения.',
    ],
    vector: [
      'Dock виден на всех страницах после toggle; width resizable 320–640px; collapse в иконку.',
      'Body: live log + tool calls (poll 5s GET /api/agent-run/journal).',
      'Footer: retry / cancel / open task / scroll-to-bottom toggle.',
      'POST /api/agent-run уже есть — используется без правок.',
    ],
    goal: [
      'Operator запускает и наблюдает agent run, не покидая текущий view.',
    ],
    checks: [
      'dock отображается на Home, Доске, Задачах',
      'retry / cancel вызывают соответствующие API',
      'live log обновляется без перезагрузки страницы',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'e2e/right-dock-agent-run-smoke.spec.js',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'update-protocols-operator-agent-run-panel-v2',
    title: 'protocols/operator-agent-run-panel-v2.bvc: dock-mode + retry contract',
    department: 'ui-dashboard',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-right-dock-agent-run-panel'],
    basis: [
      'v1-protocol описывает modal-стиль panel; dock-режим требует обновления контракта.',
    ],
    vector: [
      'protocols/operator-agent-run-panel-v2.bvc: persistent dock, retry contract, diff binding, collapsed state.',
      'v1 остаётся как legacy reference, v2 — canon после P0.',
    ],
    goal: [
      'Канонический протокол для T7 и будущих UI evolution.',
    ],
    checks: [
      'protocols/operator-agent-run-panel-v2.bvc создан и линтуется',
    ],
    targetFiles: ['protocols/operator-agent-run-panel-v2.bvc'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'add-home-mission-control-tests',
    title: 'тесты: home snapshot + inbox stream + e2e Home/Cmd+K/dock',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-home-snapshot-api',
      'implement-inbox-event-stream',
      'implement-cmd-k-palette',
      'implement-right-dock-agent-run-panel',
    ],
    basis: [
      'P0 затрагивает корневой UX; без тестов регрессии неизбежны.',
    ],
    vector: [
      'Unit: homeSnapshotProjection, inboxEventStream.',
      'E2E smoke: home landing, cmd+k roundtrip, right-dock live log.',
      'Lint: npm run lint:backlog после seed без новых errors.',
    ],
    goal: [
      'Гарантия повторяемости P0 на чистой машине.',
    ],
    checks: [
      'npm test зелёный',
      'npm run test:e2e — smoke specs зелёные',
    ],
    targetFiles: [
      'tests/homeSnapshotProjection.test.mjs',
      'tests/inboxEventStream.test.mjs',
      'e2e/home-mission-control-smoke.spec.js',
      'e2e/cmd-k-palette-smoke.spec.js',
      'e2e/right-dock-agent-run-smoke.spec.js',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
  },
  {
    workId: 'write-an24-closing-ux-mission-control-p0',
    title: 'AN-24 closing analysis: UX Mission Control P0 (post-done)',
    department: 'ui-dashboard',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'add-home-mission-control-tests'],
    basis: [
      'Правило epic_closed_without_closing_analysis: эпик нельзя закрывать без AN.',
      'AN-23 закрыл pipeline-canonization тем же шаблоном.',
    ],
    vector: [
      'work/analytics/closing-ux-mission-control-p0.md + запись в analytics-records.jsonl (AN-24).',
      'Метрики до/после: clicks-to-run, time-to-first-action, % action через cmd+k.',
    ],
    goal: [
      'Закрытие эпика с зафиксированными outcomes и метриками; основа для P1.',
    ],
    checks: [
      'analytics-records.jsonl содержит AN-24 запись',
      'эпик ux-mission-control-p0 закрыт через close-script с verified evidence',
    ],
    targetFiles: [
      'work/analytics/closing-ux-mission-control-p0.md',
      'work/analytics-records.jsonl',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
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

  console.log(JSON.stringify({ schema: 'workgraph.seed-ux-mission-control-p0.v1', created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
