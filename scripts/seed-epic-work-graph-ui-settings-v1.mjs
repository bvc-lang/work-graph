#!/usr/bin/env node
/**
 * Seed: UI Settings — sidebar nav, header theme icon, settings view, i18n + version.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const PLAN = 'docs/plan-work-graph-ui-settings-v1.md';
const I18N_ANALYTICS = 'work/analytics/work-graph-ui-i18n-best-practices.md';
const EPIC_ID = 'epic-work-graph-ui-settings-v1';
const I18N_EPIC = 'epic-work-graph-ui-i18n-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'UI Settings v1: sidebar Настройки, header theme, язык, версия (AN-55)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [],
    basis: [
      'Тема только в sidebar-footer (кнопка «Тёмная тема» на всю ширину) — нет пункта Настройки.',
      'Нет страницы: язык, версия приложения, проверка обновлений.',
      'UI chrome на RU; оператор просит EN/RU и централизованные настройки.',
    ],
    vector: [
      'P0: «Настройки» внизу sidebar + иконка темы справа в header.',
      'P0: view Настройки — секции тема, язык, версия/обновление.',
      'P1: locale switcher → wg_locale + epic-work-graph-ui-i18n-v1 rollout EN+RU.',
    ],
    goal: [
      'Оператор меняет тему и язык из Настроек или быстрой иконки; видит версию WG и может проверить обновление.',
    ],
    checks: [
      'Sidebar: пункт Настройки внизу открывает settings view',
      'Header: иконка темы справа переключает light/dark',
      'Settings: тема, язык (en|ru), версия + check update',
      'UI chrome переведён EN+RU через locales/*/ui.json',
    ],
    analysis: [
      'Тема: localStorage + body[data-theme] — уже есть; продублировать в settings и header icon.',
      'Язык: AN-55 — cookie wg_locale, не смешать с BVC dialect.',
      'Версия: package.json / build stamp; npm view @work-graph/cli для update hint.',
    ],
    decision: [
      'Вердикт: полезно',
      'Исполнять по docs/plan-work-graph-ui-settings-v1.md; i18n infra — epic-work-graph-ui-i18n-v1.',
    ],
    targetFiles: [
      PLAN,
      I18N_ANALYTICS,
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/backlogShellButtons.mjs',
      'locales/en/ui.json',
      'locales/ru/ui.json',
      'docs/plan-work-graph-ui-i18n-v1.md',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'wire-sidebar-settings-nav-bottom',
    title: 'UI: пункт «Настройки» внизу sidebar',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'sidebar-footer сейчас только theme-toggle; нет settings nav.',
      'AN-45: sidebar 7 вкладок + advanced; settings — отдельный footer item (не смешать с канон-навигацией).',
    ],
    vector: [
      'renderNavTab({ view: settings, label }) в sidebar-footer над или вместо текстовой theme-кнопки.',
      'applyView(settings) → #settings-view; aria-selected на nav.',
      'data-testid=sidebar-settings-nav.',
    ],
    goal: ['Клик «Настройки» внизу sidebar открывает страницу настроек.'],
    checks: ['Settings nav visible in footer', 'View switches without full reload'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/backlogShellButtons.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'wire-header-theme-toggle-icon',
    title: 'UI: иконка переключения темы справа в page-header',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'theme-toggle — full-width кнопка в sidebar-footer; оператор хочет быстрый доступ справа в header.',
    ],
    vector: [
      'page-header: flex row — title слева, .page-header-actions справа с icon theme toggle.',
      'SVG sun/moon или emoji-less icon button; aria-label; sync с applyTheme/readStoredTheme.',
      'Убрать дублирующую full-width кнопку из footer (оставить только settings nav).',
    ],
    goal: ['Тема переключается одним кликом по иконке в header на любой странице.'],
    checks: ['Header icon toggles data-theme', 'State persists in localStorage'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/backlogShellButtons.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'implement-settings-view-shell',
    title: 'UI: страница «Настройки» — layout и секции-заглушки',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['wire-sidebar-settings-nav-bottom'],
    basis: ['Нет #settings-view — только analytics, workflow, board, …'],
    vector: [
      '#settings-view с карточками: «Оформление», «Язык», «О приложении».',
      'Gripe DS panel/card pattern как verification-panel.',
      'view-title «Настройки»; breadcrumbs Work Graph › Настройки.',
    ],
    goal: ['Settings view рендерится с тремя секциями-контейнерами.'],
    checks: ['settings-view visible when nav selected', 'Other views hidden'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'wire-settings-theme-and-locale-sections',
    title: 'Settings: переключение темы и выбор языка (en | ru)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      'implement-settings-view-shell',
      'wire-header-theme-toggle-icon',
      'implement-ui-locale-resolution',
      'implement-ui-message-catalog-v1',
    ],
    basis: [
      'Тема: дублировать control в секции «Оформление» — sync с header icon.',
      'Язык: AN-55 — select en/ru → cookie wg_locale → reload или client t() refresh.',
    ],
    vector: [
      'Секция тема: radio/toggle light|dark — тот же storage key что header.',
      'Секция язык: select «English» / «Русский»; POST /api/ui-locale или Set-Cookie + location.reload.',
      'Labels из locales/ui.json (settings.theme, settings.language).',
    ],
    goal: ['Тема и язык меняются из Настроек; header theme остаётся в sync.'],
    checks: ['Locale cookie set on change', 'Theme change reflects in header icon state'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/i18n/resolveUiLocale.mjs',
      'locales/en/ui.json',
      'locales/ru/ui.json',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'implement-app-version-check-update',
    title: 'Settings: версия, проверка обновления и подсказка npm update',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-settings-view-shell'],
    basis: [
      'Оператор не видит версию backlog UI / @work-graph/cli.',
      'npm-first distribution (AN-46): обновление через npm, не auto-install из UI v1.',
    ],
    vector: [
      'GET /api/app-version → { schema, version, buildAt, npmPackage: @work-graph/cli }.',
      'Optional: server npm view (cache 1h) → latestVersion, updateAvailable.',
      'Settings UI: текущая версия, кнопка «Проверить обновления», copyable `npm i -g @work-graph/cli`.',
      'tests/appVersionApi.test.mjs.',
    ],
    goal: ['Секция «О приложении» показывает версию и есть ли более новая на npm.'],
    checks: ['Version string visible', 'Check update shows latest or error gracefully'],
    targetFiles: [
      'src/appVersionApi.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/appVersionApi.test.mjs',
      'package.json',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'rollout-ui-multilingual-en-ru',
    title: 'Rollout: перевод UI chrome на EN и RU (settings + все views)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      I18N_EPIC,
      'wire-settings-theme-and-locale-sections',
      'extract-backlog-shell-i18n',
      'extract-kanban-workflow-i18n',
      'extract-detail-drawer-i18n',
    ],
    basis: [
      '~300+ hardcoded RU strings; settings/nav — первый extract, остальное по AN-55 strangler.',
      'Operator request: UI на нескольких языках (v1: en + ru).',
    ],
    vector: [
      'Завершить extract subtasks epic-work-graph-ui-i18n-v1 для shell, kanban, drawer, settings.',
      'Gate: locale=en → no Cyrillic in nav/settings/errors P0 chrome.',
      'Settings labels и sidebar «Settings» / «Настройки» в ui.json.',
    ],
    goal: ['Переключение языка в Настройках переводит весь operator chrome EN↔RU.'],
    checks: [
      'en locale: sidebar Settings, header labels EN',
      'ru locale: Настройки, nav RU',
      'uiCatalog key parity green',
    ],
    targetFiles: [
      I18N_ANALYTICS,
      'docs/plan-work-graph-ui-i18n-v1.md',
      'locales/en/ui.json',
      'locales/ru/ui.json',
      'src/workGraphBacklogUiServer.mjs',
      'tests/uiCatalog.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'write-closing-epic-work-graph-ui-settings-v1',
    title: 'Closing: epic-work-graph-ui-settings-v1',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'wire-settings-theme-and-locale-sections',
      'implement-app-version-check-update',
      'rollout-ui-multilingual-en-ru',
    ],
    basis: ['Closing с smoke: settings nav, header theme, locale, version.'],
    vector: ['work/analytics/closing-epic-work-graph-ui-settings-v1.md'],
    goal: ['Эпик settings закрыт с проверяемым UX.'],
    checks: ['Closing doc published'],
    targetFiles: [
      'work/analytics/closing-epic-work-graph-ui-settings-v1.md',
      PLAN,
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-55',
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
    schema: 'workgraph.seed-epic-work-graph-ui-settings-v1.v1',
    epicId: EPIC_ID,
    relatedEpic: I18N_EPIC,
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
