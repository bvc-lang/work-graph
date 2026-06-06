import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  createBacklogUiServer,
  createSnapshotFromText,
  readArchitectureSnapshot,
  renderBacklogHtml,
} from '../src/workGraphBacklogUiServer.mjs';
import { appendDaemonAuditJournal, buildDaemonTickAuditRecord } from '../src/workGraphDaemonTick.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const SAMPLE_BACKLOG = `#Задача_done_task<[
Базис:
  Done task.
Вектор:
  Ship done task.
Цель:
  Done.
Свидетельства:
  node --test passed.

Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
  work.owner_role: engineer
  work.department: frontend-ui
  work.priority: high
  work.risk: medium
  trace.status: verified
]>

#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Ship ready task.
Цель:
  Ready.
Анализ:
  Fixture analysis
Решение:
  Verdict: useful

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.depends_on: done-task
  work.next_action: implement
  work.target_files: src/sample-hybrid.mjs
  work.decision.verdict: useful
  trace.code_refs: src/sample-hybrid.mjs#marker
  trace.source_step: protocols/ui-test.bvc
  trace.status: pending
]>

#Задача_promote_me<[
Метки:
  atom.profile: work_item
  work.id: promote-me
  work.title: Promote Me
  work.status: backlog
  work.depends_on: done-task
]>

#Задача_edit_me<[
Базис:
  Original basis.
Вектор:
  Original vector.
Цель:
  Original goal.

Метки:
  atom.profile: work_item
  work.id: edit-me
  work.title: Edit Me
  work.status: backlog
  work.owner_role: engineer
  work.priority: high
]>
`;

describe('createSnapshotFromText', () => {
  it('returns a Work Graph snapshot from backlog .bvc text', () => {
    const snapshot = createSnapshotFromText(SAMPLE_BACKLOG);

    assert.equal(snapshot.schema, 'workgraph.snapshot.v1');
    assert.equal(snapshot.items.length, 4);
    assert.deepEqual(snapshot.statusCounts, { backlog: 2, done: 1, ready: 1 });
    assert.deepEqual(snapshot.readyQueue, ['ready-task']);
    assert.equal(snapshot.items.find((item) => item.id === 'ready-task')?.basis, 'Ready task.');
    assert.equal(snapshot.items.find((item) => item.id === 'ready-task')?.vector, 'Ship ready task.');
    assert.equal(snapshot.items.find((item) => item.id === 'ready-task')?.goal, 'Ready.');
  });
});

describe('renderBacklogHtml', () => {
  it('renders the static board shell and snapshot endpoint client', () => {
    const html = renderBacklogHtml();

    assert.doesNotMatch(html, /Русский read-only срез/);
    assert.match(html, /fetch\('\/api\/snapshot'\)/);
    assert.match(html, /--bg: #ffffff/);
    assert.match(html, /body\[data-theme="dark"\]/);
    assert.match(html, /--bg: rgb\(var\(--brand-bg-rgb/);
    assert.match(html, /design-tokens-workgraph-dark\.css/);
    assert.match(html, /data-iohasc-theme="workgraph-dark"/);
    assert.match(html, /wg-select/);
    assert.match(html, /id="search-mode"/);
    assert.match(html, /\/assets\/fonts\/GraphikLCG\/stylesheet\.css/);
    assert.match(html, /font-family: var\(--brand-font-sans/);
    assert.match(html, /font-size: var\(--text-base/);
    assert.match(html, /font-size: var\(--text-sm\)/);
    assert.match(html, /id="font-scale-bootstrap"/);
    assert.match(html, /workGraphFontScale/);
    assert.match(html, /--text-scale: 1/);
    assert.match(html, /html\.font-xl \{ --text-scale: 1\.25; \}/);
    assert.match(html, /--scrollbar-thumb-active: var\(--accent\)/);
    assert.match(html, /scrollbar-width: auto/);
    assert.match(html, /::-webkit-scrollbar-thumb:active/);
    assert.match(html, /document\.documentElement\.dataset\.theme = theme/);
    assert.match(html, /id="theme-toggle"/);
    assert.match(html, /data-testid="header-theme-toggle"/);
    assert.match(html, /data-testid="sidebar-settings-nav"/);
    assert.match(html, /id="settings-view"/);
    assert.match(html, /data-testid="settings-panel"/);
    assert.match(html, /data-testid="wg-notice-stack"/);
    assert.match(html, /registerScope\('app-version'/);
    assert.match(html, /checkAppVersionAndMaybeNotify/);
    assert.match(html, /data-testid="settings-locale-options"/);
    assert.match(html, /data-testid="settings-font-scale-control"/);
    assert.match(html, /data-testid="settings-font-scale-slider"/);
    assert.match(html, /applyFontScale\(readStoredFontScale\(\)\)/);
    assert.match(html, /data-settings-locale="ru"/);
    assert.match(html, /data-settings-locale="en"/);
    assert.match(html, /id="settings-locale-ru"/);
    assert.match(html, /page-header-actions/);
    assert.match(html, /body:not\(\[data-theme="dark"\]\) \.wg-btn--secondary/);
    assert.match(html, /class="nav-tab"/);
    assert.match(html, /class="nav-tab-icon"/);
    assert.match(html, /--sidebar-width-min: 56px/);
    assert.match(html, /--sidebar-width-max: 360px/);
    assert.match(html, /html\.is-sidebar-compact[\s\S]*\.nav-tab-label/);
    assert.match(html, /id="sidebar-resize-handle"/);
    assert.match(html, /data-testid="sidebar-resize-handle"/);
    assert.match(html, /sidebarWidthStorageKey = 'workGraphSidebarWidth'/);
    assert.match(html, /function applySidebarWidth\(/);
    assert.match(html, /function startSidebarResize\(/);
    assert.match(html, /localStorage\.getItem\(key\)/);
    assert.match(html, /aria-label="Аналитика"/);
    assert.match(html, /class="header-theme-toggle-icon"/);
    assert.match(html, /viewBox="0 0 256 256"/);
    assert.match(html, /class="nav-tab-icon" width="22"/);
    assert.match(html, /wg-btn/);
    assert.match(html, /renderClientUiButton/);
    assert.match(html, /data-testid="intent-composer-propose"/);
    assert.match(html, /data-testid="analytics-subtabs"/);
    assert.match(html, /data-testid="analytics-sort-options"/);
    assert.match(html, /rel="icon" href="\/assets\/favicon\.svg" type="image\/svg\+xml"/);
    assert.match(html, /data-testid="wg-page-loader"/);
    assert.match(html, /function showPageLoader/);
    assert.match(html, /data-analytics-sort="key-desc"/);
    assert.match(html, /data-testid="workflow-subtabs"/);
    assert.match(html, /data-analytics-tab="intake"/);
    assert.match(html, /data-workflow-tab="backlog"/);
    assert.match(html, /<button class="task-atom/);
    assert.match(html, /data-task-id="/);
    assert.match(html, /class="page-header"/);
    assert.match(html, /id="view-toolbar" class="toolbar" hidden/);
    assert.match(html, /\.toolbar\[hidden\]/);
    assert.match(html, /--column-bg: #f4f5f7/);
    assert.match(html, /--column-bg: rgb\(22 26 29\)/);
    assert.match(html, /id="workflow-filters"/);
    assert.match(html, /data-testid="kanban-board-panel"/);
    assert.match(html, /data-testid="board-columns-scroll"/);
    assert.match(html, /data-testid="board-column-mode"/);
    assert.match(html, /data-testid="semantic-search-mode"/);
    assert.match(html, /data-testid="settings-git-snapshot-enabled"/);
    assert.match(html, /settings\.gitSnapshot\.noPushNote/);
    assert.match(html, /function renderBoard\(/);
    assert.match(html, /function findEpicDependentsWithoutParent/);
    assert.match(html, /workflow-epic-hierarchy-warning/);
    assert.match(html, /workflow\.epicDependentsWithoutParent/);
    assert.match(html, /function applyBoardColumnModeClass/);
    assert.match(html, /\.board\.is-compact \.column/);
    assert.match(html, /kanbanColumnPageSize = 10/);
    assert.match(html, /function setupKanbanColumnLazyLoad/);
    assert.match(html, /data-kanban-column-sentinel/);
    assert.match(html, /data-testid="prompt-rule-editor"/);
    assert.match(html, /id="board-view" class="view"[^>]*>\s*<div class="board-columns-scroll"/);
    assert.match(html, /id="intent-domain-filter"/);
    assert.match(html, /id="cycle-filter"/);
    assert.match(html, /id="intent-domain-filter"/);
    assert.doesNotMatch(html, /class="board-filter-select"/);
    assert.match(html, /aria-label="Домен"/);
    assert.match(html, /id="intent-domain-clear"/);
    assert.doesNotMatch(html, /eyebrow/);
    assert.match(html, /class="issue-footer"/);
    assert.match(html, /\.owner-avatar \{/);
    assert.match(html, /function renderOwnerAvatar\(/);
    assert.match(html, /\/assets\/avatars\//);
    assert.match(html, /renderIssueFooter\(item, \{ queueKind, surface \}\)/);
    assert.match(html, /renderWorkItemClassifierBadge\(item\)/);
    assert.match(html, /function renderWorkItemClassifierBadge\(/);
    assert.match(html, /function classifyWorkItemBlock\(/);
    assert.match(html, /function renderStatusBadge\(status, queueKind = null\)/);
    assert.match(html, /renderClientUiBadge/);
    assert.match(html, /statusToBadgeTone/);
    assert.match(html, /\/api\/work-item\/promote-ready/);
    assert.match(html, /\/api\/atom-inspector\/draft/);
    assert.match(html, /testId: 'detail-mode-edit'/);
    assert.match(html, /data-testid="atom-inspector-form"/);
    assert.match(html, /BVC_DIALECT_SECTION_TITLES/);
    assert.match(html, /atomSectionTitle\(lang, 'basis'\)/);
    assert.match(html, /data-testid="atom-inspector-lang-badge"/);
    assert.match(html, /wg-badge/);
    assert.doesNotMatch(html, /status-badge is-/);
    assert.match(html, /done: 'Завершено'/);
    assert.match(html, /backlog: 'Бэклог'/);
    assert.match(html, /function sortDoneArchiveItems\(items\)/);
    assert.match(html, /function paginateItems\(items, page, pageSize\)/);
    assert.match(html, /function renderWorkflowPagination\(container, pagination, kind\)/);
    assert.match(html, /id="archive-pagination"/);
    assert.match(html, /id="backlog-pagination"/);
    assert.match(html, /id="prompts-pagination"/);
    assert.match(html, /id="memory-pagination"/);
    assert.match(html, /id="analytics-pagination"/);
    assert.match(html, /promptsPageStorageKey/);
    assert.match(html, /renderWorkflowPagination\(promptsPagination/);
    assert.match(html, /id="workflow-view"/);
    assert.match(html, /id="archive-list"/);
    assert.match(html, /archiveList\.addEventListener\('click', handleBoardClick\)/);
    assert.match(html, /function renderArchive\(items\)/);
    assert.match(html, /function renderListRow\(/);
    assert.match(html, /renderTaskAtom\(item, 'list-row'\)/);
    assert.match(html, /id="workflow-filters"/);
    assert.doesNotMatch(html, /id="board-archive"/);
    assert.match(html, /Архив завершённых/);
    assert.match(html, /data-workflow-tab="backlog"/);
    assert.match(html, /data-workflow-tab="archive"/);
    assert.match(html, /function applyWorkflowTab\(tab\)/);
    assert.match(html, /getActiveBoardColumnGroups\(\)/);
    assert.doesNotMatch(html, /column-archive/);
    assert.doesNotMatch(html, /statusGroups\.map\(\(group\) => \{\s*const count = group\.statuses\.reduce/);
    assert.match(html, /function renderIssueFooter\(item, \{ queueKind = null, surface = 'default' \} = \{\}\)/);
    assert.match(html, /function renderWorkItemIssueKeyChip\(/);
    assert.match(html, /\.issue-type-icon\.is-task/);
    assert.match(html, /\.issue-key-chip/);
    assert.doesNotMatch(html, /class="card-key"/);
    assert.doesNotMatch(html, /<strong>Вектор:<\/strong>/);
    assert.match(html, /Светлая тема/);
    assert.match(html, /Тёмная тема/);
    assert.match(html, /workGraphBacklogTheme/);
    assert.match(html, /localStorage\.getItem\(themeStorageKey\) === 'dark' \? 'dark' : 'light'/);
    assert.match(html, /localStorage\.setItem\(themeStorageKey, nextTheme\)/);
    assert.match(html, /Доступно агенту/);
    assert.match(html, /В работе/);
    assert.match(html, /Заблокировано/);
    assert.match(html, /Вектор/);
    assert.doesNotMatch(html, /полный Базис \/ Вектор \/ Цель/);
    assert.match(html, /Следующее действие/);
    assert.match(html, /Проверки/);
  });

  it('renders sidebar tabs and keeps Бэклог outside board status groups', () => {
    const html = renderBacklogHtml();

    assert.match(html, /class="app-shell layout-root"/);
    assert.match(html, /aria-label="Навигация Work Graph"/);
    assert.match(html, /data-testid="workgraph-logo"/);
    assert.match(html, /data-testid="workgraph-emblem"/);
    assert.doesNotMatch(html, /data-testid="workspace-switcher"/);
    assert.doesNotMatch(html, /id="workspace-select"/);
    assert.doesNotMatch(html, /bootstrapWorkspaceSwitcher/);
    assert.doesNotMatch(html, /class="project-title"[\s\S]*?<strong>Work Graph<\/strong>/);
    assert.doesNotMatch(html, /sidebar-section-label/);
    assert.doesNotMatch(html, /Центр управления/);
    assert.doesNotMatch(html, />Планирование</);
    assert.doesNotMatch(html, />Инструменты</);
    assert.doesNotMatch(html, /data-view="home"/);
    assert.match(html, /data-view="analytics"[\s\S]*?nav-tab-label">Аналитика</);
    assert.match(html, /data-view="workflow"[\s\S]*?nav-tab-label">Задачи</);
    assert.match(html, /data-view="board"[\s\S]*?nav-tab-label">Доска</);
    assert.match(html, /data-view="verification"[\s\S]*?nav-tab-label">Проверки</);
    assert.match(html, /data-view="memory"[\s\S]*?nav-tab-label">Память</);
    assert.match(html, /sidebar-nav-advanced[\s\S]*data-view="architecture"/);
    assert.match(html, /sidebar-nav-advanced[\s\S]*data-view="prompts"/);
    assert.doesNotMatch(html, /id="home-view"/);
    assert.doesNotMatch(html, /data-view="backlog"[^>]*>Бэклог/);
    assert.doesNotMatch(html, /data-view="archive"[^>]*>Архив/);
    assert.match(html, /id="workflow-view"/);
    assert.match(html, /graph-canvas-lit-flow\.js/);
    assert.match(html, /graph-canvas-lit-flow\.css/);
    assert.match(html, /buildGraphCanvasProjectionFromArchitectureLayout/);
    assert.match(html, /id="backlog-list"/);
    assert.match(html, /id="backlog-list" class="backlog-list list-rows"/);
    assert.match(html, /id="memory-list" class="backlog-list list-rows"/);
    assert.match(html, /id="analytics-list" class="backlog-list list-rows"/);
    assert.match(html, /Записи памяти/);
    assert.match(html, /Аналитические разборы/);
    assert.match(html, /Бэклог/);
    assert.match(html, /const backlogGroup = \{"id":"backlog","title":"Бэклог","statuses":\["backlog"\]\}/);
    assert.doesNotMatch(html, /const statusGroups = \[\{"id":"backlog"/);
    assert.ok(html.indexOf('"title":"Доступно агенту"') < html.indexOf('"title":"В работе"'));
  });

  it('renders EN nav labels when locale is en', () => {
    const html = renderBacklogHtml({ locale: 'en' });
    assert.match(html, /data-view="workflow"[\s\S]*?nav-tab-label">Tasks</);
    assert.match(html, /data-view="board"[\s\S]*?nav-tab-label">Board</);
    assert.match(html, /placeholder="Search tasks/);
  });

  it('renders EN verification panel header when locale is en', () => {
    const html = renderBacklogHtml({ locale: 'en' });
    assert.match(html, /Verification cycle/);
    assert.match(html, /Deterministic tier-A tests/);
  });

  it('exposes backlog revision poll client hook', () => {
    const html = renderBacklogHtml();
    assert.match(html, /fetch\('\/api\/backlog-revision'\)/);
    assert.match(html, /syncLivePollInterval/);
    assert.match(html, /createLiveSyncCoordinator/);
    assert.match(html, /connectLiveSyncRevisionSse/);
    assert.match(html, /\/api\/ui-events\/stream/);
    assert.match(html, /registerScope\('backlog-revision'/);
    assert.match(html, /registerScope\('home'/);
    assert.match(html, /registerScope\('agent-dock'/);
    assert.match(html, /computeKanbanBoardDelta/);
    assert.match(html, /applyKanbanBoardPatch/);
    assert.match(html, /patchKanbanBoardIncremental/);
    assert.match(html, /reconcileDetailDrawerOnRemotePatch/);
  });

  it('exposes detail drawer stack for hierarchy navigation', () => {
    const html = renderBacklogHtml();
    assert.match(html, /createDetailDrawerStack/);
    assert.match(html, /openTaskHierarchyStackDrawer/);
    assert.match(html, /task-hierarchy-sub-drawer/);
    assert.match(html, /detail-stack-breadcrumb/);
    assert.match(html, /popDetailStackNavigation/);
  });

  it('exposes repo file preview stack hooks', () => {
    const html = renderBacklogHtml();
    assert.match(html, /openRepoFileStackPreview/);
    assert.match(html, /renderRepoFilePreviewPanel/);
    assert.match(html, /data-testid="repo-file-link"/);
    assert.match(html, /data-testid="repo-file-preview-panel"/);
    assert.match(html, /repo-file-preview-sub-drawer/);
    assert.match(html, /fetch\('\/api\/repo-file\/preview\?path='/);
    assert.match(html, /linkRepoFiles: true/);
    assert.match(html, /autolinkRepoFilePathsInHtml/);
    assert.match(html, /renderDetailPathText/);
    assert.match(html, /renderRepoFilePathListItems/);
    assert.match(html, /renderOptionalDetailAccordion\('Пути артефактов', block\.artifactPaths, 'list', \{ linkRepoFiles: true \}\)/);
    assert.match(html, /renderOptionalDetailAccordion\('Корни intent', block\.intentRoots, 'list', \{ linkRepoFiles: true \}\)/);
    assert.match(html, /renderDetailPathText\('Путь', node\.path\)/);
    assert.match(html, /renderDetailPathText\('Файл', rule\.filePath\)/);
    assert.match(html, /\.repo-file-preview-panel pre\.repo-file-preview \.code-hl-keyword/);
    assert.match(html, /language === 'bvc'/);
    assert.match(html, /highlightBvcBlock\(preview\.content/);
    assert.match(html, /data-testid="repo-file-preview-bvc"/);
  });

  it('renders backlog html with pseudolocale without throw', () => {
    const html = renderBacklogHtml({ locale: 'ps' });
    assert.match(html, /\[!! ~~/);
    assert.match(html, /<html lang="ps"/);
  });

  it('renders a Jira-like task detail drawer and card click hooks', () => {
    const html = renderBacklogHtml();

    assert.match(html, /id="detail-overlay"/);
    assert.match(html, /id="detail-drawer"/);
    assert.match(html, /id="detail-resize-handle"/);
    assert.match(html, /aria-label="Изменить ширину панели"/);
    assert.match(html, /workGraphDetailDrawerWidth/);
    assert.match(html, /function startDetailDrawerResize\(event\)/);
    assert.match(html, /function handleDetailDrawerResizeKeydown\(event\)/);
    assert.match(html, /detailResizeHandle\.addEventListener\('pointerdown', startDetailDrawerResize\)/);
    assert.match(html, /aria-label="Подробности задачи"/);
    assert.match(html, /id="detail-close"/);
    assert.match(html, /boardView\) boardView\.addEventListener\('click', handleBoardClick\)/);
    assert.match(html, /backlogList\.addEventListener\('click', handleBoardClick\)/);
    assert.match(html, /detailBody\.addEventListener\('click', handleBoardClick\)/);
    assert.match(html, /detailOverlay\.addEventListener\('click', closeTaskDetails\)/);
    assert.match(html, /function openDetailDrawer\(\)/);
    assert.match(html, /function openTaskDetails\(itemOrId, \{ parentContext = null, mode = 'view' \} = \{\}\)/);
    assert.match(html, /function renderAtomInspectorForm\(payload\)/);
    assert.match(html, /function submitAtomInspectorApply\(workId\)/);
    assert.match(html, /function renderDetailBackButton\(label\)/);
    assert.match(html, /parentContext: detailContext/);
    assert.match(html, /function closeTaskDetails\(\)/);
    assert.match(html, /detail-drawer-open/);
    assert.match(html, /document\.documentElement\.classList\.add\('detail-drawer-open'\)/);
    assert.match(html, /document\.documentElement\.classList\.remove\('detail-drawer-open'\)/);
    assert.match(html, /event\.key !== 'Escape'/);
    assert.match(html, /renderDetailText\(t\('drawer\.section\.basis'\), item\.basis\)/);
    assert.match(html, /renderDetailText\(t\('drawer\.section\.vector'\), item\.vector\)/);
    assert.match(html, /renderDetailText\(t\('drawer\.section\.goal'\), item\.goal\)/);
    assert.match(html, /renderOptionalDetailAccordion\(t\('drawer\.section\.targetFiles'\), item\.targetFiles, 'list', \{ linkRepoFiles: true \}\)/);
    assert.match(html, /function renderParentChildHierarchy\(item\)/);
    assert.match(html, /data-testid="hierarchy-children"/);
    assert.match(html, /data-testid="hierarchy-parent"/);
    assert.match(html, /data-testid="intent-roadmap-epic-/);
    assert.match(html, /function renderIntentGraphPanel\(\)/);
    assert.match(html, /testId: 'intent-roadmap-canvas'/);
    assert.match(html, /fill: true/);
    assert.match(html, /function renderIntentRoadmapCanvas/);
    assert.match(html, /function handleWorkGraphGraphNodeClick/);
    assert.match(html, /workgraph-graph-node-click/);
    assert.match(html, /function initGraphCanvasLitFlowMounts/);
    assert.match(html, /renderAnalyticsIntentGraphSections/);
    assert.match(html, /data-testid="intent-graph-drilldown"/);
  });

  it('renders graph canvas hooks without home landing', () => {
    const html = renderBacklogHtml();

    assert.match(html, /data-view="analytics"/);
    assert.doesNotMatch(html, /id="home-view"/);
    assert.match(html, /graph-canvas-lit-flow\.js/);
    assert.match(html, /fill: true/);
    assert.match(html, /function renderIntentRoadmapCanvas/);
    assert.doesNotMatch(html, /ReactFlow/);
  });

  it('renders prompts review panel hooks and API client', () => {
    const html = renderBacklogHtml();

    assert.match(html, /data-view="prompts"/);
    assert.match(html, /id="prompts-view"/);
    assert.match(html, /data-testid="prompts-panel"/);
    assert.match(html, /data-testid="prompts-list"/);
    assert.match(html, /function renderPromptsPanel\(\)/);
    assert.match(html, /function getPanelSearchQuery\(\)/);
    assert.match(html, /const query = getPanelSearchQuery\(\)/);
    assert.match(html, /function openPromptRuleDetails\(rule\)/);
    assert.match(html, /fetch\('\/api\/prompt-rules-projection'\)/);
    assert.match(html, /fetch\('\/api\/code-gap-projection'\)/);
    assert.match(html, /data-testid="code-gap-list"/);
    assert.match(html, /data-testid="code-gap-intake-preview"/);
    assert.match(html, /fetch\('\/api\/code-gap-intake\/proposal'/);
    assert.match(html, /fetch\('\/api\/code-gap-intake\/apply'/);
    assert.match(html, /function submitCodeGapIntakeProposal\(suggestedWorkId\)/);
    assert.match(html, /promptsView\.hidden = !isPrompts/);
    assert.match(html, /function applyPromptsNavVisibility\(total\)/);
    assert.match(html, /function loadPromptsNavVisibility\(\)/);
    assert.match(html, /data-view="prompts"[^>]*hidden/);
  });

  it('does not expose intent composer as a sidebar tab', () => {
    const html = renderBacklogHtml();

    assert.doesNotMatch(html, /data-view="intent"/);
    assert.match(html, /data-testid="intent-composer-panel"/);
    assert.match(html, /data-testid="intent-composer-input"/);
    assert.match(html, /data-testid="intent-composer-propose"/);
    assert.match(html, /data-testid="intent-composer-apply"/);
    assert.match(html, /function renderIntentComposerPanel\(\)/);
    assert.match(html, /function submitIntentProposal\(\)/);
    assert.match(html, /fetch\('\/api\/intent-composer\/proposal'/);
    assert.match(html, /fetch\('\/api\/intent-composer\/apply'/);
    assert.match(html, /intentView\.hidden = !isIntent/);
  });

  it('renders memory panel hooks and API client', () => {
    const html = renderBacklogHtml();

    assert.match(html, /data-view="memory"/);
    assert.match(html, /id="memory-view"/);
    assert.match(html, /data-testid="memory-panel"/);
    assert.match(html, /data-testid="memory-list"/);
    assert.match(html, /function renderMemoryPanel\(\)/);
    assert.match(html, /function renderMemoryRecordListRow\(record\)/);
    assert.match(html, /data-testid="memory-record-status-badge"/);
    assert.match(html, /fetch\('\/api\/memory-projection'\)/);
    assert.match(html, /data-testid="open-memory-for-task"/);
    assert.match(html, /work:/);
    assert.match(html, /data-testid="evidence-timeline-panel"/);
    assert.match(html, /fetch\('\/api\/evidence-timeline/);
    assert.match(html, /memoryView\.hidden = !isMemory/);
    assert.doesNotMatch(html, /disabled>Память/);
  });

  it('renders analytics panel hooks and API client', () => {
    const html = renderBacklogHtml();

    assert.match(html, /data-view="analytics"/);
    assert.match(html, /id="analytics-view"/);
    assert.match(html, /data-testid="analytics-panel"/);
    assert.match(html, /data-testid="analytics-list"/);
    assert.match(html, /data-testid="analytics-subtabs"/);
    assert.match(html, /data-analytics-tab="intake"/);
    assert.match(html, /data-analytics-tab="closing"/);
    assert.match(html, /function renderAnalyticsPanel\(\)/);
    assert.match(html, /function readAnalyticsRecordKind\(record\)/);
    assert.match(html, /function applyAnalyticsTab\(tab\)/);
    assert.match(html, /fetch\('\/api\/analytics-projection'\)/);
    assert.match(html, /data-testid="analytics-record-body"/);
    assert.match(html, /data-testid="analytics-related-tasks"/);
    assert.match(html, /renderAnalyticsRelatedWorkItemsSection/);
    assert.match(html, /renderAnalyticsLineageSections/);
    assert.match(html, /buildAnalyticsLineageListBadge/);
    assert.match(html, /function formatAnalyticsRelatedTasksCardNote\(relatedWorkItems\)/);
    assert.match(html, /renderClientUiBadge\(\{\s*label: doneCount \+ '\/' \+ related\.length \+ ' задач'/);
    assert.match(html, /data-testid="analytics-related-tasks-count"/);
    assert.match(html, /renderAnalyticsRecordKeyChip\(record\)/);
    assert.match(html, /data-testid="analytics-lineage-section"/);
    assert.match(html, /data-testid="analytics-lineage-badge"/);
    assert.match(html, /data-testid="analytics-lineage-nav"/);
    assert.match(html, /function openAnalyticsRelatedTaskSubDrawer\(/);
    assert.match(html, /fromAnalyticsRelated/);
    assert.match(html, /analytics-related-task-sub-drawer/);
    assert.match(html, /renderTopDetailStackFrame/);
    assert.match(html, /analytics-section-title">Запрос/);
    assert.match(html, /bodySectionTitle = isClosing \? 'Итоги эпика' : 'Ответ'/);
    assert.match(html, /function stripAnalyticsBodyPreamble\(/);
    assert.match(html, /function mountMarkdownMermaidDiagrams\(/);
    assert.match(html, /theme: 'base'/);
    assert.match(html, /function fixMermaidSvgSizing\(/);
    assert.match(html, /function dedupeMermaidClusterLabelText\(/);
    assert.match(html, /function alignMermaidClusterLabels\(/);
    assert.match(html, /htmlLabels: false/);
    assert.match(html, /subGraphTitleMargin: \{ top: 24, bottom: 10 \}/);
    assert.match(html, /function highlightCodeBlock\(/);
    assert.match(html, /src="\/vendor\/mermaid.min.js"/);
    assert.match(html, /function openAnalyticsRecordDetails\(record\)/);
    assert.match(html, /function buildAnalyticsMarkdownForLlm\(record\)/);
    assert.match(html, /function copyAnalyticsMarkdownForLlm\(record, button\)/);
    assert.match(html, /testId: 'analytics-copy-md'/);
    assert.match(html, /'data-action': 'copy-analytics-md'/);
    assert.match(html, /analytics-section-header/);
    assert.match(html, /record\.key \|\| record\.id/);
    assert.match(html, /renderDetailText\('Ключ', record\.key/);
    assert.match(html, /analyticsView\.hidden = !isAnalytics/);
  });

  it('does not expose NLUX or embedded agent chat UI', () => {
    const html = renderBacklogHtml();

    assert.doesNotMatch(html, /data-view="agent"/);
    assert.doesNotMatch(html, /\/vendor\/nlux\//);
    assert.doesNotMatch(html, /data-testid="agent-run-panel"/);
    assert.doesNotMatch(html, /data-testid="agent-nlux-shell"/);
    assert.doesNotMatch(html, /createAiChat\(\)/);
    assert.doesNotMatch(html, /function mountAgentNlUXChat\(\)/);
    assert.doesNotMatch(html, /function renderAgentRunPanel\(\)/);
    assert.doesNotMatch(html, /function openAgentChatForTask\(taskId\)/);
    assert.doesNotMatch(html, /data-agent-task-id/);
    assert.match(html, /MCP tools/);
  });

  it('renders verification loop panel and dashboard snapshot hooks', () => {
    const html = renderBacklogHtml();

    assert.match(html, /data-view="verification"[\s\S]*?nav-tab-label">Проверки</);
    assert.match(html, /id="verification-view" class="view"[^>]*hidden/);
    assert.match(html, /id="verification-panel"/);
    assert.match(html, /function renderVerificationPanel\(\)/);
    assert.match(html, /fetch\('\/api\/dashboard-snapshot'\)/);
    assert.match(html, /Цикл проверки/);
    assert.match(html, /Недавние свидетельства/);
    assert.match(html, /id="verification-evidence-list"/);
    assert.match(html, /id="verification-worker-runs"/);
    assert.match(html, /Запуски воркера/);
    assert.match(html, /data-testid="daemon-audit-list"/);
    assert.match(html, /fetch\('\/api\/daemon-audit-tail\?limit=12'\)/);
    assert.match(html, /function renderDaemonAuditPanel\(\)/);
    assert.match(html, /id="codegen-gate-list"/);
    assert.match(html, /id="codegen-gate-summary"/);
    assert.match(html, /function renderCodegenGatePanel\(\)/);
    assert.match(html, /Гейт codegen/);
    assert.match(html, /verificationView\.hidden = !isVerification/);
    assert.doesNotMatch(html, /data-view="verification"[^>]*>Проверки <span id="verification-count"/);
  });

  it('renders readonly architecture view hooks from snapshot data', () => {
    const html = renderBacklogHtml();

    assert.doesNotMatch(html, /id="graph-view"/);
    assert.doesNotMatch(html, /data-view="graph"/);
    assert.match(html, /data-view="architecture"[\s\S]*?nav-tab-label">Архитектура</);
    assert.match(html, /id="architecture-view"/);
    assert.match(html, /architecture-view-shell/);
    assert.match(html, /data-testid="architecture-blocks-list"/);
    assert.doesNotMatch(html, /data-testid="architecture-subtabs"/);
    assert.doesNotMatch(html, /data-testid="intent-plane-panel"/);
    assert.doesNotMatch(html, /function loadIntentPlaneGraph\(/);
    assert.match(html, /function renderBlockBvcDescription\(block\)/);
    assert.match(html, /function renderBvcDescription\(source/);
    assert.match(html, /testid: 'architecture-bvc-description'/);
    assert.match(html, /renderPipelineReadOnly\(block, \{ testid: 'architecture-pipeline-panel' \}\)/);
    assert.match(html, /id="workflow-display-mode"/);
    assert.match(html, /function buildWorkflowTreeForest\(items\)/);
    assert.match(html, /function renderArchitecturePanels\(\)/);
    assert.doesNotMatch(html, /data-architecture-tab="graph"/);
    assert.doesNotMatch(html, /data-testid="architecture-matrix"/);
    assert.doesNotMatch(html, /data-testid="architecture-graph-panel"/);
    assert.doesNotMatch(html, /data-testid="architecture-canvas-host"/);
    assert.match(html, /function ensureLazyViewData\(view\)/);
    assert.match(html, /function renderArchitecture\(\)/);
    assert.match(html, /function openBlockDetails\(block, \{ resetNav = true \} = \{\}\)/);
    assert.match(html, /function renderBlockL2Graph\(l2Graph\)/);
    assert.match(html, /function renderBlockL2GraphSvg\(l2Graph, width, height\)/);
    assert.match(html, /const inSpread = to\.height \/ \(edge\.inLaneCount \+ 1\)/);
    assert.match(html, /block-l2-canvas/);
    assert.match(html, /data-l2-node-id="/);
    assert.match(html, /id="detail-sub-drawer"/);
    assert.match(html, /id="detail-sub-resize-handle"/);
    assert.match(html, /detailSubDrawerWidthStorageKey/);
    assert.match(html, /function renderL2NodeBvcDescription\(source\)/);
    assert.match(html, /testid: 'l2-bvc-description'/);
    assert.doesNotMatch(html, /architecture-l2-open-block/);
    assert.match(html, /function architectureBlockBackLabel\(\)/);
    assert.match(html, /function openL2NodeDetails\(block, nodeId, \{ fromBlockDrawer = false \} = \{\}\)/);
    assert.match(html, /function buildL2NodeDetailSections\(node, l2Graph, block\)/);
    assert.match(html, /l2-node-paths-accordion/);
    assert.match(html, /block-tasks-accordion/);
    assert.match(html, /id="detail-nav-back"/);
    assert.match(html, /← К списку блоков/);
    assert.match(html, /Блоки архитектуры/);
    assert.match(html, /function buildArchitectureLayout\(architecture, focusBlockId/);
    assert.match(html, /function assignArchitectureEdgeLanes\(edges\)/);
    assert.match(html, /function architectureEdgeGeometry\(edge\)/);
    assert.match(html, /edge\.geometry/);
    assert.match(html, /function applyCrossHighlight\(taskId\)/);
    assert.match(html, /function crossHighlightTargets\(taskId\)/);
    assert.match(html, /task-atom\.is-highlighted/);
    assert.match(html, /applyCrossHighlight\(item\.id\);[\s\S]*?const fromAnalyticsRelated[\s\S]*?const fromDrawer[\s\S]*?\n\s*render\(\);/);
    assert.match(html, /id="cycle-filter"/);
    assert.match(html, /id="workflow-filters"/);
    assert.match(html, /data-testid="kanban-board-panel"/);
    assert.match(html, /data-testid="board-columns-scroll"/);
    assert.match(html, /data-testid="board-column-mode"/);
    assert.match(html, /data-testid="semantic-search-mode"/);
    assert.match(html, /data-testid="settings-git-snapshot-enabled"/);
    assert.match(html, /settings\.gitSnapshot\.noPushNote/);
    assert.match(html, /function renderBoard\(/);
    assert.match(html, /function findEpicDependentsWithoutParent/);
    assert.match(html, /workflow-epic-hierarchy-warning/);
    assert.match(html, /workflow\.epicDependentsWithoutParent/);
    assert.match(html, /function applyBoardColumnModeClass/);
    assert.match(html, /\.board\.is-compact \.column/);
    assert.match(html, /kanbanColumnPageSize = 10/);
    assert.match(html, /function setupKanbanColumnLazyLoad/);
    assert.match(html, /data-kanban-column-sentinel/);
    assert.match(html, /data-testid="prompt-rule-editor"/);
    assert.match(html, /id="board-view" class="view"[^>]*>\s*<div class="board-columns-scroll"/);
    assert.doesNotMatch(html, /id="dashboard-v2-strip"/);
    assert.doesNotMatch(html, /id="runner-queue-strip"/);
    assert.match(html, /function renderIntentDomainFilter\(\)/);
    assert.match(html, /data-task-id="/);
    assert.match(html, /renderOptionalDetailAccordion\(t\('drawer\.section\.dependencies'\), item\.dependsOn, 'list'\)/);
    assert.match(html, /function wrapDetailAccordion\(title, innerHtml/);
    assert.match(html, /function renderPipelineProse\(text\)/);
    assert.match(html, /renderPipelineProse\(analysis\)/);
    assert.doesNotMatch(html, /\.split\(\/\r?\n\/\)/);
    const scriptMatch = html.match(/<script id="workgraph-app">([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, 'inline script block expected');
    assert.doesNotThrow(() => {
      // eslint-disable-next-line no-new-func
      new Function(scriptMatch[1]);
    }, 'embedded UI script must parse');
    assert.match(html, /pvrg-task-scope-panel/);
    assert.match(html, /fetchPvrgTaskScopeSection/);
    assert.match(html, /linkage-drilldown-panel/);
    assert.match(html, /handleLinkageRefClick/);
    assert.doesNotMatch(html, /function renderGraph\(items\)/);
    assert.doesNotMatch(html, /ReactFlow/);
  });
});

const SAMPLE_PROMPT_RULE = `#Правило_Ui_Test<[
Базис:
  UI server test prompt rule.
Вектор:
  Projection scan.
Цель:
  API test.

Метки:
  atom.profile: prompt_rule
  rule.id: ui-test-prompt-rule
  trace.status: verified
]>
`;

describe('createBacklogUiServer', () => {
  it('serves HTML and JSON snapshot without external dependencies', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'workgraph-ui-'));
    await writeFile(join(cwd, 'backlog.bvc'), SAMPLE_BACKLOG, 'utf8');
    await mkdir(join(cwd, 'architecture'), { recursive: true });
    await cp(
      join(repoRoot, 'packages/work-graph-cli/templates/starter/architecture/main.bvc'),
      join(cwd, 'architecture/main.bvc'),
    );
    await mkdir(join(cwd, 'charter'), { recursive: true });
    await writeFile(join(cwd, 'charter/main.bvc'), `#Устав_Ui_Test<[
Базис:
  UI server promote-ready test charter with enough meaningful content to pass classifyCharterBody heuristics for temporary fixture workspaces used in dashboard API integration tests.
Вектор:
  Promote-ready API must respect charter preflight before backlog to ready transitions in operator dashboard flows.
Цель:
  Fixture charter for deterministic UI server tests without touching canonical repo charter files.

Метки:
  atom.profile: charter
  project.slug: work-graph-rebuild
  trace.status: verified
]>
`, 'utf8');
    await mkdir(join(cwd, 'protocols'), { recursive: true });
    await writeFile(join(cwd, 'protocols', 'ui-test.bvc'), SAMPLE_PROMPT_RULE, 'utf8');
    await mkdir(join(cwd, 'tests', 'fixtures'), { recursive: true });
    await mkdir(join(cwd, 'src'), { recursive: true });
    await writeFile(
      join(cwd, 'src', 'sample-hybrid.mjs'),
      '// buildSemanticSearchDocuments hybrid excerpt for dashboard API test\nexport const marker = "hybrid";\n',
      'utf8',
    );
    await writeFile(
      join(cwd, 'tests', 'fixtures', 'code-gap-report.v1.json'),
      readFileSync(new URL('./fixtures/code-gap-report.v1.json', import.meta.url), 'utf8'),
      'utf8',
    );
    await mkdir(join(cwd, 'work'), { recursive: true });
    await mkdir(join(cwd, 'work', 'analytics'), { recursive: true });
    await writeFile(
      join(cwd, 'work', 'analytics-records.jsonl'),
      readFileSync(join(repoRoot, 'work', 'analytics-records.jsonl'), 'utf8'),
      'utf8',
    );
    await writeFile(
      join(cwd, 'work', 'analytics', 'graph-canvas-layout-mess.md'),
      readFileSync(join(repoRoot, 'work', 'analytics', 'graph-canvas-layout-mess.md'), 'utf8'),
      'utf8',
    );
    await writeFile(
      join(cwd, 'work', 'analytics', 'parent-subtask-hierarchy.md'),
      readFileSync(join(repoRoot, 'work', 'analytics', 'parent-subtask-hierarchy.md'), 'utf8'),
      'utf8',
    );
    await writeFile(
      join(cwd, 'work', 'analytics', 'intent-graph-storage-roadmap.md'),
      readFileSync(join(repoRoot, 'work', 'analytics', 'intent-graph-storage-roadmap.md'), 'utf8'),
      'utf8',
    );
    await appendDaemonAuditJournal(buildDaemonTickAuditRecord({
      tickId: 'tick-ui-test',
      event: 'worker_run_finished',
      taskId: 'ready-task',
      workerStatus: 'succeeded',
      recoveryClass: 'succeeded',
      summary: 'daemon tick for UI test',
    }), { cwd, auditPath: join(cwd, 'work', 'daemon-audit.jsonl') });

    const server = createBacklogUiServer({
      cwd,
      backlogPath: 'backlog.bvc',
      journalPath: 'worker-runs.jsonl',
      auditPath: 'work/daemon-audit.jsonl',
      registryPath: join(cwd, 'workspaces.json'),
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });

    try {
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const page = await fetch(`${baseUrl}/app`);
      assert.equal(page.status, 200);
      const pageHtml = await page.text();
      assert.match(pageHtml, /Поиск задач/);

      const uiKitResponse = await fetch(`${baseUrl}/dev/ui-kit`);
      assert.equal(uiKitResponse.status, 200);
      const uiKitHtml = await uiKitResponse.text();
      assert.match(uiKitHtml, /data-testid="ui-kit-root"/);
      assert.match(uiKitHtml, /ui-kit-section-button/);

      const logoSvg = await fetch(`${baseUrl}/assets/workgraph-logo.svg`);
      assert.equal(logoSvg.status, 200);
      assert.match(logoSvg.headers.get('content-type') || '', /image\/svg\+xml/);

      const emblemSvg = await fetch(`${baseUrl}/assets/workgraph-emblem.svg`);
      assert.equal(emblemSvg.status, 200);
      assert.match(emblemSvg.headers.get('content-type') || '', /image\/svg\+xml/);

      const fontCss = await fetch(`${baseUrl}/assets/fonts/GraphikLCG/stylesheet.css`);
      assert.equal(fontCss.status, 200);
      assert.match(fontCss.headers.get('content-type') || '', /text\/css/);

      const moonIcon = await fetch(`${baseUrl}/assets/icons/bold/moon-bold.svg`);
      assert.equal(moonIcon.status, 200);
      assert.match(moonIcon.headers.get('content-type') || '', /image\/svg\+xml/);
      assert.match(await moonIcon.text(), /viewBox="0 0 256 256"/);

      const avatarIcon = await fetch(`${baseUrl}/assets/avatars/avatar-01.svg`);
      assert.equal(avatarIcon.status, 200);
      assert.match(avatarIcon.headers.get('content-type') || '', /image\/svg\+xml/);
      assert.match(await avatarIcon.text(), /viewBox="0 0 32 32"/);

      const designTokensCss = await fetch(`${baseUrl}/assets/design-tokens-workgraph-dark.css`);
      assert.equal(designTokensCss.status, 200);
      const cssText = await designTokensCss.text();
      assert.match(cssText, /--brand-font-sans: 'Graphik LCG'/);
      assert.match(cssText, /--text-sm: 0\.8125rem/);
      assert.match(cssText, /--text-base: 0\.9375rem/);

      const localeResponse = await fetch(`${baseUrl}/api/ui-locale`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: 'en' }),
      });
      assert.equal(localeResponse.status, 200);
      const localePayload = await localeResponse.json();
      assert.equal(localePayload.locale, 'en');
      assert.match(localeResponse.headers.get('set-cookie') || '', /wg_locale=en/);

      const enHtmlResponse = await fetch(`${baseUrl}/app`, {
        headers: { cookie: localeResponse.headers.get('set-cookie') || '' },
      });
      assert.equal(enHtmlResponse.status, 200);
      assert.match(await enHtmlResponse.text(), /nav-tab-label">Tasks</);

      const snapshotResponse = await fetch(`${baseUrl}/api/snapshot`);
      assert.equal(snapshotResponse.status, 200);
      const snapshot = await snapshotResponse.json();
      assert.equal(snapshot.items.find((item) => item.id === 'ready-task')?.nextAction, 'implement');
      assert.equal(snapshot.items.find((item) => item.id === 'ready-task')?.goal, 'Ready.');

      const revisionResponse = await fetch(`${baseUrl}/api/backlog-revision`);
      assert.equal(revisionResponse.status, 200);
      const revision = await revisionResponse.json();
      assert.equal(revision.schema, 'workgraph.backlog-revision.v1');
      assert.match(revision.revision, /^sha256:/);

      const architectureResponse = await fetch(`${baseUrl}/api/architecture-snapshot`);
      assert.equal(architectureResponse.status, 200);
      const architectureSnapshot = await architectureResponse.json();
      assert.equal(architectureSnapshot.schema, 'architecture.snapshot.v1');
      assert.ok(architectureSnapshot.blocks.length >= 1);
      assert.ok(architectureSnapshot.blocks.every((block) => block.l2Graph?.layoutNodes?.length >= 0));

      const intentPlaneResponse = await fetch(`${baseUrl}/api/intent-plane/graph?start=ready-task&depth=1&drift=1`);
      assert.equal(intentPlaneResponse.status, 200);
      const intentPlaneGraph = await intentPlaneResponse.json();
      assert.equal(intentPlaneGraph.schema, 'intent.plane.graph.v1');
      assert.ok(intentPlaneGraph.projection.nodes.length >= 1);

      const driftBatchResponse = await fetch(`${baseUrl}/api/semantic-drift/batch?limit=10`);
      assert.equal(driftBatchResponse.status, 200);
      const driftBatch = await driftBatchResponse.json();
      assert.equal(driftBatch.schema, 'semantic.drift.batch.v1');
      assert.ok(Array.isArray(driftBatch.entries));

      const dashboardResponse = await fetch(`${baseUrl}/api/dashboard-snapshot`);
      assert.equal(dashboardResponse.status, 200);
      const dashboardSnapshot = await dashboardResponse.json();
      assert.equal(dashboardSnapshot.schema, 'operator-dashboard.snapshot.v1');
      assert.equal(dashboardSnapshot.verification.schema, 'verification.summary.v1');
      assert.ok(dashboardSnapshot.verification.matrix.length >= 6);
      assert.equal(dashboardSnapshot.verification.codegenGate?.schema, 'verification.codegen-gate.v1');

      const operatorShellResponse = await fetch(`${baseUrl}/api/operator-shell-snapshot`);
      assert.equal(operatorShellResponse.status, 200);
      const operatorShellSnapshot = await operatorShellResponse.json();
      assert.equal(operatorShellSnapshot.schema, 'operator-shell.snapshot.v2');
      assert.ok(operatorShellSnapshot.cycleSlice.cycles.length >= 1);
      assert.ok(operatorShellSnapshot.intentSidebar.domains.length >= 1);
      assert.equal(operatorShellSnapshot.runnerQueue.schema, 'workgraph.runner.queue.projection.v1');

      const runnerQueueResponse = await fetch(`${baseUrl}/api/runner-queue-projection`);
      assert.equal(runnerQueueResponse.status, 200);
      const runnerQueueProjection = await runnerQueueResponse.json();
      assert.equal(runnerQueueProjection.schema, 'workgraph.runner.queue.projection.v1');

      const providerCatalogResponse = await fetch(`${baseUrl}/api/worker-provider-catalog`);
      assert.equal(providerCatalogResponse.status, 200);
      const providerCatalog = await providerCatalogResponse.json();
      assert.equal(providerCatalog.schema, 'workgraph.worker.provider.catalog.v1');

      const promptRulesResponse = await fetch(`${baseUrl}/api/prompt-rules-projection`);
      assert.equal(promptRulesResponse.status, 200);
      const promptRulesProjection = await promptRulesResponse.json();
      assert.equal(promptRulesProjection.schema, 'workgraph.prompt-rules-projection.v1');
      assert.ok(promptRulesProjection.summary.total >= 1);
      assert.ok(promptRulesProjection.rules.some((rule) => rule.profile === 'prompt_rule'));

      const codeGapResponse = await fetch(`${baseUrl}/api/code-gap-projection`);
      assert.equal(codeGapResponse.status, 200);
      const codeGapProjection = await codeGapResponse.json();
      assert.equal(codeGapProjection.schema, 'workgraph.code-gap-projection.v1');
      assert.ok(codeGapProjection.suggestionCount >= 1);

      const semanticResponse = await fetch(`${baseUrl}/api/semantic-search?q=workgraph`);
      assert.equal(semanticResponse.status, 200);
      const semanticResult = await semanticResponse.json();
      assert.equal(semanticResult.schema, 'semantic-search.result.v1');
      assert.equal(semanticResult.embeddingsUsed, false);

      const hybridResponse = await fetch(`${baseUrl}/api/semantic-search?q=buildSemanticSearchDocuments+hybrid&mode=hybrid-lexical-bm25-v1`);
      assert.equal(hybridResponse.status, 200);
      const hybridResult = await hybridResponse.json();
      assert.equal(hybridResult.mode, 'hybrid-lexical-bm25-v1');
      assert.ok(hybridResult.hitCount >= 1);
      assert.ok(hybridResult.hits.some((hit) => hit.workId === 'ready-task'));
      assert.ok(hybridResult.hits[0].bm25Score >= 0);

      const kanbanResponse = await fetch(`${baseUrl}/api/kanban-board-projection`);
      assert.equal(kanbanResponse.status, 200);
      const kanbanProjection = await kanbanResponse.json();
      assert.equal(kanbanProjection.schema, 'workgraph.kanban-board-projection.v1');
      assert.ok(kanbanProjection.columnCounts.ready >= 1);

      const promptSourceResponse = await fetch(`${baseUrl}/api/prompt-rules/source?ruleId=golden-path`);
      if (promptSourceResponse.status === 200) {
        const promptSource = await promptSourceResponse.json();
        assert.match(promptSource.filePath, /^rules\/agent-behavior\//u);
        assert.ok(promptSource.sourceText.length > 20);
      }

      const pvrgResponse = await fetch(`${baseUrl}/api/pvrg-task-scope?workId=ready-task`);
      assert.equal(pvrgResponse.status, 200);
      const pvrgSlice = await pvrgResponse.json();
      assert.equal(pvrgSlice.schema, 'pvrg.task-scope.slice.v1');
      assert.equal(pvrgSlice.seedWorkId, 'ready-task');
      assert.ok(pvrgSlice.nodeCount >= 2);
      assert.ok(pvrgSlice.edges.some((edge) => edge.relation === 'depends_on'));

      const linkageResponse = await fetch(`${baseUrl}/api/work-item-linkage?workId=ready-task`);
      assert.equal(linkageResponse.status, 200);
      const linkage = await linkageResponse.json();
      assert.equal(linkage.schema, 'workgraph.work-item-linkage-drilldown.v1');
      assert.equal(linkage.workId, 'ready-task');
      assert.ok(linkage.refs.some((entry) => entry.kind === 'file' && entry.ref === 'src/sample-hybrid.mjs'));
      assert.ok(linkage.refs.some((entry) => entry.kind === 'step' && entry.ref === 'protocols/ui-test.bvc'));
      assert.ok(linkage.refs.some((entry) => entry.kind === 'work' && entry.ref === 'done-task'));

      const daemonAuditResponse = await fetch(`${baseUrl}/api/daemon-audit-tail?limit=5`);
      assert.equal(daemonAuditResponse.status, 200);
      const daemonAuditTail = await daemonAuditResponse.json();
      assert.equal(daemonAuditTail.schema, 'workgraph.daemon-audit.tail.v1');
      assert.equal(daemonAuditTail.entries.length, 1);
      assert.equal(daemonAuditTail.entries[0].tickId, 'tick-ui-test');
      assert.equal(daemonAuditTail.entries[0].taskId, 'ready-task');

      const codeGapSuggestion = codeGapProjection.suggestions[0];
      const codeGapProposalResponse = await fetch(`${baseUrl}/api/code-gap-intake/proposal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          suggestion: codeGapSuggestion,
          sourceReportPath: codeGapProjection.sourceReportPath,
        }),
      });
      assert.equal(codeGapProposalResponse.status, 200);
      const codeGapProposal = await codeGapProposalResponse.json();
      assert.equal(codeGapProposal.schema, 'code-gap.draft-intake.proposal.v1');
      assert.equal(codeGapProposal.ok, true);

      const agentJournalResponse = await fetch(`${baseUrl}/api/agent-run/journal`);
      assert.equal(agentJournalResponse.status, 200);
      const agentJournal = await agentJournalResponse.json();
      assert.equal(agentJournal.schema, 'operator.agent-run.journal.v1');

      assert.match(pageHtml, /Сделать доступной агенту/);

      const promoteResponse = await fetch(`${baseUrl}/api/work-item/promote-ready`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workId: 'promote-me' }),
      });
      assert.equal(promoteResponse.status, 200);
      const promotePayload = await promoteResponse.json();
      assert.equal(promotePayload.schema, 'operator.promote-ready.response.v1');
      assert.equal(promotePayload.ok, true);
      assert.equal(promotePayload.newStatus, 'ready');
      assert.equal(promotePayload.persistedBacklog, true);

      const snapshotAfterPromote = await fetch(`${baseUrl}/api/snapshot`);
      assert.equal(snapshotAfterPromote.status, 200);
      const snapshotPayload = await snapshotAfterPromote.json();
      assert.equal(snapshotPayload.items.find((item) => item.id === 'promote-me')?.status, 'ready');
      assert.ok(snapshotPayload.readyQueue.includes('promote-me'));

      const agentRunResponse = await fetch(`${baseUrl}/api/agent-run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: 'ready-task', provider: 'local' }),
      });
      assert.equal(agentRunResponse.status, 200);
      const agentRun = await agentRunResponse.json();
      assert.equal(agentRun.schema, 'operator.agent-run.response.v1');
      assert.equal(agentRun.ok, true);
      assert.equal(agentRun.taskId, 'ready-task');
      assert.equal(agentRun.persistedBacklog, true);
      assert.equal(agentRun.appliedTransition, 'verify');

      const snapshotAfterRun = await fetch(`${baseUrl}/api/snapshot`);
      assert.equal(snapshotAfterRun.status, 200);
      const snapshotAfterRunPayload = await snapshotAfterRun.json();
      assert.equal(snapshotAfterRunPayload.items.find((item) => item.id === 'ready-task')?.status, 'verify');

      const draftResponse = await fetch(`${baseUrl}/api/atom-inspector/draft?workId=edit-me`);
      assert.equal(draftResponse.status, 200);
      const draftPayload = await draftResponse.json();
      assert.equal(draftPayload.schema, 'atom-inspector.draft.v1');
      assert.equal(draftPayload.draft.labels['work.id'], 'edit-me');

      const proposalResponse = await fetch(`${baseUrl}/api/atom-inspector/proposal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workId: 'edit-me',
          draft: {
            ...draftPayload.draft,
            basis: ['Updated basis.'],
            labels: {
              ...draftPayload.draft.labels,
              'work.status': 'ready',
            },
          },
        }),
      });
      assert.equal(proposalResponse.status, 200);
      const proposalPayload = await proposalResponse.json();
      assert.equal(proposalPayload.ok, true);
      assert.match(proposalPayload.generatedStep, /Updated basis\./u);

      const applyResponse = await fetch(`${baseUrl}/api/atom-inspector/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workId: 'edit-me',
          draft: proposalPayload.draft,
        }),
      });
      assert.equal(applyResponse.status, 200);
      const applyPayload = await applyResponse.json();
      assert.equal(applyPayload.ok, true);
      assert.equal(applyPayload.persistedBacklog, true);

      const snapshotAfterApply = await fetch(`${baseUrl}/api/snapshot`);
      assert.equal(snapshotAfterApply.status, 200);
      const snapshotAfterApplyPayload = await snapshotAfterApply.json();
      assert.equal(snapshotAfterApplyPayload.items.find((item) => item.id === 'edit-me')?.status, 'ready');
      assert.equal(snapshotAfterApplyPayload.items.find((item) => item.id === 'edit-me')?.basis, 'Updated basis.');

      const intentProposalResponse = await fetch(`${baseUrl}/api/intent-composer/proposal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Smoke intent composer intake', workId: 'intent-smoke-ui-server' }),
      });
      assert.equal(intentProposalResponse.status, 200);
      const intentProposal = await intentProposalResponse.json();
      assert.equal(intentProposal.schema, 'intent-composer.proposal.v1');
      assert.equal(intentProposal.ok, true);

      const intentApplyResponse = await fetch(`${baseUrl}/api/intent-composer/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ proposal: intentProposal }),
      });
      assert.equal(intentApplyResponse.status, 200);
      const intentApply = await intentApplyResponse.json();
      assert.equal(intentApply.ok, true);
      assert.equal(intentApply.workId, 'intent-smoke-ui-server');

      const memoryResponse = await fetch(`${baseUrl}/api/memory-projection`);
      assert.equal(memoryResponse.status, 200);
      const memoryProjection = await memoryResponse.json();
      assert.equal(memoryProjection.schema, 'memory-panel.projection.v1');
      assert.ok(memoryProjection.summary.total >= 1);

      const memoryRecordsResponse = await fetch(`${baseUrl}/api/memory-records?workId=done-task&limit=2`);
      assert.equal(memoryRecordsResponse.status, 200);
      const memoryRecords = await memoryRecordsResponse.json();
      assert.equal(memoryRecords.schema, 'memory-records.api.v1');
      assert.ok(memoryRecords.count <= 2);
      assert.ok(memoryRecords.records.every((record) => record.sourceWorkItem === 'done-task'));

      const analyticsResponse = await fetch(`${baseUrl}/api/analytics-projection`);
      assert.equal(analyticsResponse.status, 200);
      const analyticsProjection = await analyticsResponse.json();
      assert.equal(analyticsProjection.schema, 'analytics-panel.projection.v1');
      assert.ok(analyticsProjection.summary.total >= 1);

      const analyticsRecordsResponse = await fetch(`${baseUrl}/api/analytics-records?topic=ui/graph-layout&limit=5`);
      assert.equal(analyticsRecordsResponse.status, 200);
      const analyticsRecords = await analyticsRecordsResponse.json();
      assert.equal(analyticsRecords.schema, 'analytics-records.api.v1');
      assert.ok(analyticsRecords.count >= 1);
      assert.ok(analyticsRecords.records.every((record) => record.topic === 'ui/graph-layout'));
      assert.ok(analyticsRecords.records.every((record) => typeof record.key === 'string' && record.key.startsWith('AN-')));

      const mermaidVendorResponse = await fetch(`${baseUrl}/vendor/mermaid.min.js`);
      assert.equal(mermaidVendorResponse.status, 200);
      assert.match(mermaidVendorResponse.headers.get('content-type') || '', /javascript/u);
      const mermaidVendorSource = await mermaidVendorResponse.text();
      assert.ok(mermaidVendorSource.includes('mermaid'));

      const timelineResponse = await fetch(`${baseUrl}/api/evidence-timeline?workId=done-task`);
      assert.equal(timelineResponse.status, 200);
      const timeline = await timelineResponse.json();
      assert.equal(timeline.schema, 'evidence.timeline.v1');
      assert.ok(timeline.count >= 1);

      const repoPreviewOk = await fetch(`${baseUrl}/api/repo-file/preview?path=src/sample-hybrid.mjs`);
      assert.equal(repoPreviewOk.status, 200);
      const previewPayload = await repoPreviewOk.json();
      assert.equal(previewPayload.schema, 'workgraph.repo-file-preview.v1');
      assert.equal(previewPayload.ok, true);
      assert.match(previewPayload.content, /hybrid/);

      const repoPreviewDenied = await fetch(`${baseUrl}/api/repo-file/preview?path=..%2Fsecret.txt`);
      assert.equal(repoPreviewDenied.status, 400);
      const deniedPayload = await repoPreviewDenied.json();
      assert.equal(deniedPayload.ok, false);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('createBacklogUiServer multiproject host', () => {
  it('switches active repoRoot without server restart', async () => {
    const hostDir = await mkdtemp(join(tmpdir(), 'wg-host-'));
    const projectA = join(hostDir, 'project-a');
    const projectB = join(hostDir, 'project-b');
    await mkdir(projectA, { recursive: true });
    await mkdir(projectB, { recursive: true });
    await writeFile(join(projectA, 'backlog.bvc'), SAMPLE_BACKLOG, 'utf8');
    await writeFile(join(projectB, 'backlog.bvc'), `#Задача_only_b<[
Базис:
  Only in project B.
Вектор:
  B vector.
Цель:
  B goal.

Метки:
  atom.profile: work_item
  work.id: only-b
  work.title: Only B
  work.status: backlog
]>`, 'utf8');

    const server = createBacklogUiServer({
      hostRoot: hostDir,
      cwd: projectA,
      backlogPath: 'backlog.bvc',
      registryPath: join(hostDir, 'workspaces.json'),
    });

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });

    try {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;

      await fetch(`${baseUrl}/api/workspace/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'a', root: projectA, label: 'Project A' }),
      });
      await fetch(`${baseUrl}/api/workspace/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'b', root: projectB, label: 'Project B' }),
      });

      assert.equal((await fetch(`${baseUrl}/api/workspace/switch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: 'a' }),
      })).status, 200);

      const before = await (await fetch(`${baseUrl}/api/snapshot`)).json();
      assert.ok(before.items.some((item) => item.id === 'ready-task'));

      const switchResponse = await fetch(`${baseUrl}/api/workspace/switch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: 'b' }),
      });
      assert.equal(switchResponse.status, 200);

      const after = await (await fetch(`${baseUrl}/api/snapshot`)).json();
      assert.equal(after.items.length, 1);
      assert.equal(after.items[0].id, 'only-b');
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await rm(hostDir, { recursive: true, force: true });
    }
  });
});

describe('readArchitectureSnapshot', () => {
  it('derives architecture.snapshot.v1 from backlog text', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'workgraph-arch-'));
    await writeFile(join(cwd, 'backlog.bvc'), SAMPLE_BACKLOG, 'utf8');

    try {
      const architectureSnapshot = await readArchitectureSnapshot({
        cwd,
        backlogPath: 'backlog.bvc',
        repoRoot,
      });
      assert.equal(architectureSnapshot.schema, 'architecture.snapshot.v1');
      assert.equal(architectureSnapshot.counts.tasks, 4);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
