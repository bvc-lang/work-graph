#!/usr/bin/env node
/**
 * Seed: app update mechanism — CLI version source, npm cache, background check, notice stack.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const PLAN = 'docs/plan-app-update-mechanism-v1.md';
const ANALYSIS = 'docs/analysis/2026-06-app-update-mechanism.md';
const EPIC_ID = 'epic-app-update-mechanism-v1';
const SETTINGS_EPIC = 'epic-work-graph-ui-settings-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Механизм обновлений: версия CLI, npm check, toast слева снизу',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'doing',
    itemKind: 'epic',
    dependsOn: [SETTINGS_EPIC],
    basis: [
      'Секция «О приложении» показывает версию project package.json, а не @work-graph/cli.',
      'Оператор не узнаёт об обновлении, пока не откроет Настройки вручную.',
      'Нет toast-уведомления слева снизу при доступном обновлении на npm.',
    ],
    vector: [
      'P0: readLocalAppVersion → @work-graph/cli package.json (npm-first + monorepo).',
      'P1: npm registry cache 1h + semver compare.',
      'P1: фоновая проверка on load + liveSync scope app-version (6h).',
      'P1: wg-notice-stack bottom-left + dismiss per latestVersion.',
    ],
    goal: [
      'Оператор видит корректную версию WG; при новой версии на npm получает notice слева снизу и команду npm update.',
    ],
    checks: [
      'Settings shows @work-graph/cli version',
      'Background check calls /api/app-version?checkUpdate=1',
      'Notice appears when updateAvailable and not dismissed',
      'npm run test:deterministic green',
    ],
    targetFiles: [
      PLAN,
      ANALYSIS,
      'src/appVersionApi.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/appVersionApi.test.mjs',
      'locales/en/ui.json',
      'locales/ru/ui.json',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ANALYSIS,
    analyticsKey: 'AN-66',
  },
  {
    workId: 'fix-app-version-read-from-cli-package',
    title: 'App version: читать версию из @work-graph/cli package.json',
    department: 'engineering',
    ownerRole: 'backend_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'doing',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['readLocalAppVersion читает cwd/package.json — неверно для npm-first.'],
    vector: [
      'resolveCliPackageJsonPath: node_modules → monorepo packages/work-graph-cli → fallback.',
      'buildAppVersionResponse возвращает source + installRoot.',
    ],
    goal: ['GET /api/app-version возвращает версию @work-graph/cli.'],
    checks: ['Monorepo test reads 0.2.x from packages/work-graph-cli'],
    targetFiles: ['src/appVersionApi.mjs', 'tests/appVersionApi.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ANALYSIS,
    analyticsKey: 'AN-66',
  },
  {
    workId: 'implement-app-version-npm-cache',
    title: 'App version: in-memory cache npm registry 1h',
    department: 'engineering',
    ownerRole: 'backend_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'doing',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['fix-app-version-read-from-cli-package'],
    basis: ['Каждый checkUpdate бьёт в registry без кэша.'],
    vector: ['fetchNpmLatestVersion cache Map ttl 1h; stale on HTTP error.'],
    goal: ['Повторные проверки используют cache within ttl.'],
    checks: ['Test: second call does not fetch'],
    targetFiles: ['src/appVersionApi.mjs', 'tests/appVersionApi.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ANALYSIS,
    analyticsKey: 'AN-66',
  },
  {
    workId: 'wire-app-version-background-check',
    title: 'UI: фоновая проверка версии on load + liveSync 6h',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'doing',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-app-version-npm-cache'],
    basis: ['Обновление видно только после ручного захода в Settings.'],
    vector: [
      'liveSync.registerScope app-version interval 6h.',
      'setTimeout 5s after load → checkAppVersionAndMaybeNotify.',
    ],
    goal: ['UI проверяет npm без клика в настройках.'],
    checks: ['HTML contains registerScope app-version'],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ANALYSIS,
    analyticsKey: 'AN-66',
  },
  {
    workId: 'implement-wg-notice-stack-bottom-left',
    title: 'UI: wg-notice-stack — info-окно слева снизу',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'doing',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['Нет глобального toast для update-available.'],
    vector: [
      '#wg-notice-stack fixed bottom-left; role=status aria-live=polite.',
      'CSS tokens --panel, --border, --shadow-card.',
      'i18n notice.updateAvailable.* EN/RU.',
    ],
    goal: ['Notice stack рендерится в HTML и стилизован.'],
    checks: ['data-testid=wg-notice-stack in renderBacklogHtml'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'locales/en/ui.json',
      'locales/ru/ui.json',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ANALYSIS,
    analyticsKey: 'AN-66',
  },
  {
    workId: 'wire-update-notice-from-app-version',
    title: 'UI: notice при updateAvailable + dismiss localStorage',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'doing',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-wg-notice-stack-bottom-left', 'wire-app-version-background-check'],
    basis: ['Notice без wiring к API бесполезен.'],
    vector: [
      'showUpdateAvailableNotice(info) on checkAppVersionAndMaybeNotify.',
      'localStorage wg_dismissed_update_notice = latestVersion.',
      'Open settings → applyView(settings) + renderSettingsPanel checkUpdate.',
    ],
    goal: ['При новой версии на npm оператор видит notice слева снизу.'],
    checks: ['Notice hidden when dismissed for same latestVersion'],
    targetFiles: ['src/workGraphBacklogUiServer.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ANALYSIS,
    analyticsKey: 'AN-66',
  },
  {
    workId: 'test-app-version-npm-first-integration',
    title: 'Tests: app version npm-first + cache + notice HTML smoke',
    department: 'engineering',
    ownerRole: 'backend_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'doing',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      'fix-app-version-read-from-cli-package',
      'implement-app-version-npm-cache',
      'implement-wg-notice-stack-bottom-left',
    ],
    basis: ['Регрессия version source не ловится.'],
    vector: ['tests/appVersionApi.test.mjs — node_modules layout, cache, semver.'],
    goal: ['npm run test:deterministic покрывает app version path.'],
    checks: ['appVersionApi tests pass', 'workGraphBacklogUiServer smoke notice stack'],
    targetFiles: ['tests/appVersionApi.test.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ANALYSIS,
    analyticsKey: 'AN-66',
  },
  {
    workId: 'write-closing-epic-app-update-mechanism-v1',
    title: 'Closing: epic-app-update-mechanism-v1',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      'fix-app-version-read-from-cli-package',
      'implement-app-version-npm-cache',
      'wire-app-version-background-check',
      'implement-wg-notice-stack-bottom-left',
      'wire-update-notice-from-app-version',
      'test-app-version-npm-first-integration',
    ],
    basis: ['Closing с smoke после delivery всех subtasks.'],
    vector: ['work/analytics/closing-epic-app-update-mechanism-v1.md'],
    goal: ['Эпик закрыт с проверяемым UX обновлений.'],
    checks: ['Closing doc published', 'test:deterministic green'],
    targetFiles: ['work/analytics/closing-epic-app-update-mechanism-v1.md', PLAN],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-66',
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
    schema: 'workgraph.seed-epic-app-update-mechanism-v1.v1',
    epicId: EPIC_ID,
    relatedEpic: SETTINGS_EPIC,
    created,
    totalTasks: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
