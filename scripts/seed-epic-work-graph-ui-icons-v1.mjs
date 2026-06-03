#!/usr/bin/env node
/**
 * Seed: UI icons — Phosphor bold pack in sidebar nav + header theme toggle.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const EPIC_ID = 'epic-work-graph-ui-icons-v1';
const ICONS_ROOT = 'public/assets/icons';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'UI Icons v1: Phosphor pack в sidebar и header theme toggle',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-work-graph-ui-settings-v1'],
    basis: [
      'Оператор добавил public/assets/icons (Phosphor bold/fill); sidebar и theme toggle используют inline SVG-заглушки.',
      'Нет единого модуля iconAssets и статической раздачи /assets/icons/*.',
    ],
    vector: [
      'P0: src/ui/iconAssets.mjs — чтение SVG, inline render, mapping view→icon.',
      'P0: sidebar nav tabs — иконка + label для analytics/workflow/board/…/settings.',
      'P0: header theme toggle — moon/sun из asset pack; applyTheme sync.',
      'P1: GET /assets/icons/** для img/src и будущих поверхностей.',
    ],
    goal: [
      'Sidebar и переключатель темы используют единый набор иконок из public/assets/icons.',
    ],
    checks: [
      'Nav tabs render nav-tab-icon inline SVG',
      'Theme toggle uses moon-bold / sun-bold',
      '/assets/icons/bold/*.svg served with cache',
      'tests/iconAssets.test.mjs + workGraphBacklogUiServer smoke',
    ],
    analysis: [
      'Phosphor stroke icons inherit currentColor — подходят для light/dark без дублирования файлов.',
    ],
    decision: [
      'Вердикт: полезно',
      'Bold variant для nav chrome; fill — позже при необходимости.',
    ],
    targetFiles: [
      ICONS_ROOT,
      'src/ui/iconAssets.mjs',
      'src/ui/backlogShellButtons.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/iconAssets.test.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ICONS_ROOT,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'wire-icon-asset-pipeline',
    title: 'UI: pipeline iconAssets + static /assets/icons',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['Нет модуля чтения SVG и HTTP route для icons.'],
    vector: [
      'src/ui/iconAssets.mjs — readPublicIconSvg, renderInlineIcon, NAV_VIEW_ICON_FILES.',
      'tryServePublicIconsAsset в workGraphBacklogUiServer.mjs.',
    ],
    goal: ['Иконки доступны для SSR inline и прямых URL.'],
    checks: ['iconAssets tests pass', 'GET /assets/icons/bold/moon-bold.svg → 200'],
    targetFiles: [
      'src/ui/iconAssets.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/iconAssets.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ICONS_ROOT,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'wire-sidebar-nav-icons',
    title: 'UI: иконки в пунктах sidebar nav',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'wire-icon-asset-pipeline'],
    basis: ['Nav tabs — только текст; оператор просит визуальные маркеры разделов.'],
    vector: [
      'renderNavTab/renderSettingsNavTab — labelHtml с nav-tab-icon + nav-tab-label.',
      'CSS flex gap; selected state наследует color на stroke currentColor.',
    ],
    goal: ['Каждый пункт sidebar показывает иконку слева от подписи.'],
    checks: ['HTML contains nav-tab-icon', 'All 8 nav views mapped'],
    targetFiles: [
      'src/ui/backlogShellButtons.mjs',
      'src/ui/iconAssets.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ICONS_ROOT,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'wire-header-theme-toggle-phosphor-icons',
    title: 'UI: Phosphor moon/sun в header theme toggle',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'wire-icon-asset-pipeline'],
    basis: ['Theme toggle использует ad hoc inline SVG paths.'],
    vector: [
      'renderHeaderThemeToggleButton — renderThemeIcon(moon).',
      'Client applyTheme — THEME_ICON_MOON/SUN из SSR JSON.stringify.',
    ],
    goal: ['Переключатель темы использует те же asset icons, что и остальной chrome.'],
    checks: ['header-theme-toggle-icon in HTML', 'applyTheme swaps moon/sun'],
    targetFiles: [
      'src/ui/backlogShellButtons.mjs',
      'src/ui/iconAssets.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ICONS_ROOT,
    analyticsKey: 'AN-56',
  },
  {
    workId: 'write-closing-epic-work-graph-ui-icons-v1',
    title: 'Closing: epic-work-graph-ui-icons-v1',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'wire-icon-asset-pipeline',
      'wire-sidebar-nav-icons',
      'wire-header-theme-toggle-phosphor-icons',
    ],
    basis: ['Эпик требует closing doc в work/analytics.'],
    vector: ['work/analytics/closing-epic-work-graph-ui-icons-v1.md'],
    goal: ['Зафиксировать mapping и evidence для AN-56.'],
    checks: ['Closing doc published', 'Epic marked done'],
    targetFiles: ['work/analytics/closing-epic-work-graph-ui-icons-v1.md'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: ICONS_ROOT,
    analyticsKey: 'AN-56',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ root: process.cwd() });
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
    schema: 'workgraph.seed-epic-work-graph-ui-icons-v1.v1',
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
