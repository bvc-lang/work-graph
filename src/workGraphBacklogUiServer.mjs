import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildArchitectureSnapshot } from './architectureSnapshot.mjs';
import {
  executeAgentRun,
  readAgentRunJournalResponse,
  readWorkerProviderCatalogResponse,
} from './agentRunApi.mjs';
import { buildPromptRulesProjection } from './promptRulesProjection.mjs';
import {
  executePromptRuleSourceRead,
  executePromptRuleSourceSave,
} from './promptRulesEditorApi.mjs';
import { buildCodeGapOperatorProjection } from './codeGapOperatorProjection.mjs';
import { buildEpicWorkScopeSlice } from './epicWorkScope.mjs';
import { renderUiKitPageHtml } from './ui/pages/uiKitPage.mjs';
import { UI_BUTTON_CSS } from './ui/atoms/button.mjs';
import { UI_BADGE_CSS } from './ui/atoms/badge.mjs';
import { UI_SELECT_CSS } from './ui/atoms/select.mjs';
import {
  renderNavTab,
  renderHeaderThemeToggleButton,
  renderSettingsNavTab,
  renderDetailCloseButton,
  renderDetailSubCloseButton,
  renderAgentRunDockCloseButton,
  renderAgentRunFooterButtons,
  renderIntentComposerActionButtons,
  renderIntentDomainClearButton,
  renderSearchModeSelect,
  renderCycleFilterSelect,
  renderIntentDomainFilterSelect,
  renderAnalyticsSubtabsShell,
  renderAnalyticsSortOptions,
  renderWorkflowSubtabsShell,
  renderWorkflowDisplayModeSelect,
  renderBoardColumnModeSelect,
  renderSettingsLocaleOptions,
} from './ui/backlogShellButtons.mjs';
import { renderInlineIcon, renderThemeIcon } from './ui/iconAssets.mjs';
import { buildAppVersionInstallResponse, buildAppVersionResponse } from './appVersionApi.mjs';
import {
  loadGitSnapshotPolicy,
  writeGitSnapshotSettingsFile,
} from './gitSnapshot.mjs';
import { readRepoFilePreviewFromRequest } from './repoFilePreviewApi.mjs';
import { computeBacklogRevision } from './backlogRevision.mjs';
import { createBacklogUiEventsHub } from './backlogUiEventsHub.mjs';
import { createUiTranslator, loadUiCatalogSync } from './ui/i18n/uiCatalog.mjs';
import { resolveUiLocale, UI_LOCALE_COOKIE } from './ui/i18n/resolveUiLocale.mjs';
import { UI_TABS_CSS } from './ui/molecules/tabs.mjs';
import { buildPvrgTaskScopeSlice } from './pvrgTaskScope.mjs';
import { buildWorkItemLinkageDrilldown } from './unifiedLinkageProjection.mjs';
import { executeSemanticSearchFromRepo } from './semanticSearchWorkflow.mjs';
import {
  executeCodeGapDraftApply,
  executeCodeGapDraftProposal,
} from './codeGapDraftIntakeApi.mjs';
import { buildMemoryPanelProjection, buildMemoryRecordsApiResponse } from './memoryPanelProjection.mjs';
import { buildAnalyticsPanelProjection, buildAnalyticsRecordsApiResponse } from './analyticsPanelProjection.mjs';
import { buildIntentRoadmapProjection } from './intentRoadmapProjection.mjs';
import { buildEpicRoadmapProjection } from './intentRoadmapEpicProjection.mjs';
import { readIntentNodesFromRepo } from './intentNodeRuntime.mjs';
import { buildEvidenceTimelineForTask } from './evidenceReadModel.mjs';
import { readWorkerRunJournal } from './agentWorkerLiveLoop.mjs';
import { readDaemonAuditJournal, readDaemonAuditTailResponse } from './workGraphDaemonTick.mjs';
import { buildOperatorShellSnapshotV2 } from './operatorShellProjection.mjs';
import { buildKanbanBoardProjection } from './kanbanBoardProjection.mjs';
import { buildSchematicViewModel, GRAPH_CANVAS_VIEW_FULL, GRAPH_CANVAS_VIEW_PIPELINE } from './schematicView.mjs';
import { DEFAULT_DONE_ARCHIVE_CAP } from './workGraphCycleSlice.mjs';
import { readRunnerQueueProjectionFromRepo } from './workGraphRunnerQueueProjection.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import { buildIntentPlaneGraphResponse } from './intentPlaneApi.mjs';
import { buildSemanticDriftBatch } from './semanticDrift.mjs';
import { buildSnapshot, buildOperatorDashboardSnapshot, parseWorkItems } from './workGraphRuntime.mjs';
import { buildVerificationSummary } from './verificationLoop.mjs';
import { executePromoteReady } from './workGraphPromoteReadyApi.mjs';
import {
  executeAtomInspectorApply,
  executeAtomInspectorProposal,
  readAtomInspectorDraftResponse,
} from './atomInspectorApi.mjs';
import {
  executeIntentComposerApply,
  executeIntentComposerProposal,
} from './intentComposerApi.mjs';
import { buildWorkItemPipelineView } from './workItemDecisionPipeline.mjs';
import { getFieldSectionsForDialect } from './bvcDialectRegistry.mjs';
import {
  attachUiReference,
  listUiReferences,
  mimeTypeForUiReferenceFileName,
  resolveUiReferenceFilePath,
} from './workItemUiReferences.mjs';
import { workItemStatusOptions } from './atomInspector.mjs';
import {
  buildWorkspacesApiResponse,
  createWorkGraphHostState,
  ensureHostStateInitialized,
  registerHostWorkspace,
  resolveWorkGraphRequestContext,
  switchHostWorkspace,
} from './workGraphProjectHost.mjs';
import { MISSION_CONTROL_CSS } from './missionControlServerHandlers.mjs';
import {
  handleHomeSnapshotRequest,
  handleInboxEventsReadRequest,
  handleInboxEventsRequest,
} from './missionControlServerHandlers.mjs';

import { resolveInstallLayout } from './workGraphInstallLayout.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const {
  installRoot: WG_INSTALL_ROOT,
  MERMAID_VENDOR_PATH,
  GRAPH_CANVAS_LIT_FLOW_JS_PATH,
  GRAPH_CANVAS_LIT_FLOW_CSS_PATH,
  WORKGRAPH_LOGO_SVG_PATH,
  WORKGRAPH_EMBLEM_SVG_PATH,
  PUBLIC_ROOT,
  DESIGN_TOKENS_GRIPE_CSS_PATH,
  DESIGN_TOKENS_WG_CSS_PATH,
  SRC_ROOT,
} = resolveInstallLayout({ moduleUrl: import.meta.url });
const FAVICON_SVG_PATH = join(PUBLIC_ROOT, 'assets', 'favicon.svg');

function serveFaviconSvg(response) {
  try {
    const source = readFileSync(FAVICON_SVG_PATH);
    response.writeHead(200, {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    });
    response.end(source);
  } catch {
    sendText(response, 404, 'not_found');
  }
}

function contentTypeForPublicFont(filePath) {
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  if (filePath.endsWith('.woff')) return 'font/woff';
  return 'application/octet-stream';
}

function tryServePublicIconsAsset(url, response) {
  if (!url.pathname.startsWith('/assets/icons/')) {
    return false;
  }
  return tryServePublicAssetDir(url, response, join(PUBLIC_ROOT, 'assets', 'icons'), '/assets/icons/');
}

function tryServePublicAvatarsAsset(url, response) {
  if (!url.pathname.startsWith('/assets/avatars/')) {
    return false;
  }
  return tryServePublicAssetDir(url, response, join(PUBLIC_ROOT, 'assets', 'avatars'), '/assets/avatars/');
}

function tryServePublicImagesAsset(url, response) {
  if (!url.pathname.startsWith('/assets/img/')) {
    return false;
  }
  return tryServePublicAssetDir(url, response, join(PUBLIC_ROOT, 'assets', 'img'), '/assets/img/');
}

function tryServePublicAssetDir(url, response, rootDir, urlPrefix) {
  const relativePath = decodeURIComponent(url.pathname.slice(urlPrefix.length));
  if (!relativePath || relativePath.includes('..')) {
    sendText(response, 403, 'forbidden');
    return true;
  }
  const filePath = join(rootDir, relativePath);
  if (!filePath.startsWith(rootDir)) {
    sendText(response, 403, 'forbidden');
    return true;
  }
  try {
    const source = readFileSync(filePath);
    const contentType = filePath.endsWith('.svg')
      ? 'image/svg+xml; charset=utf-8'
      : filePath.endsWith('.png')
        ? 'image/png'
        : 'application/octet-stream';
    response.writeHead(200, {
      'content-type': contentType,
      'cache-control': 'public, max-age=3600',
    });
    response.end(source);
    return true;
  } catch {
    sendText(response, 404, 'not_found');
    return true;
  }
}

function tryServePublicFontsAsset(url, response) {
  if (!url.pathname.startsWith('/assets/fonts/')) {
    return false;
  }
  const relativePath = decodeURIComponent(url.pathname.slice('/assets/fonts/'.length));
  if (!relativePath || relativePath.includes('..')) {
    sendText(response, 403, 'forbidden');
    return true;
  }
  const filePath = join(PUBLIC_ROOT, 'fonts', relativePath);
  if (!filePath.startsWith(join(PUBLIC_ROOT, 'fonts'))) {
    sendText(response, 403, 'forbidden');
    return true;
  }
  try {
    const source = readFileSync(filePath);
    response.writeHead(200, {
      'content-type': contentTypeForPublicFont(filePath),
      'cache-control': 'public, max-age=3600',
    });
    response.end(source);
    return true;
  } catch {
    sendText(response, 404, 'not_found');
    return true;
  }
}

function stripBrowserInlineLocalFunctions(source, names) {
  let result = source;
  for (const name of names) {
    result = result.replace(
      new RegExp(`\\nfunction ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n`, 'g'),
      '\n',
    );
  }
  return result;
}

function stripModuleForBrowserInline(source) {
  return source
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export /gm, '')
    .replace(/\/\*\*[\s\S]*?\*\//gm, '');
}

function loadBrowserGraphCanvasProjectionSource() {
  return [
    readFileSync(join(__dirname, 'graphCanvasLitFlow/graphCanvasProjection.mjs'), 'utf8'),
  ].map(stripModuleForBrowserInline).join('\n');
}

function loadBrowserArchitectureLayoutSource() {
  const graphCanvasLayout = stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'graphCanvasLayout.mjs'), 'utf8'),
  );
  const architectureLayout = stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'architectureLayout.mjs'), 'utf8'),
  );
  return `${graphCanvasLayout}\n${architectureLayout}`;
}

function loadBrowserMarkdownDocumentRenderSource() {
  const codeSyntaxHighlight = readFileSync(join(__dirname, 'codeSyntaxHighlight.mjs'), 'utf8')
    .replace(/^import\s.+$/gm, '')
    .replace(/^export /gm, '');
  const markdownDocumentRender = stripBrowserInlineLocalFunctions(
    readFileSync(join(__dirname, 'markdownDocumentRender.mjs'), 'utf8')
      .replace(/^import\s.+$/gm, '')
      .replace(/^export /gm, ''),
    ['escapeHtml'],
  );
  return `${codeSyntaxHighlight}\n${markdownDocumentRender}`;
}

function loadBrowserPipelineProseRenderSource() {
  return stripBrowserInlineLocalFunctions(
    readFileSync(join(__dirname, 'pipelineProseRender.mjs'), 'utf8')
      .replace(/^import\s.+$/gm, '')
      .replace(/^export /gm, ''),
    ['escapeHtml'],
  );
}

function loadBrowserMissionControlClientSource() {
  return stripBrowserInlineLocalFunctions(
    stripModuleForBrowserInline(
      readFileSync(join(__dirname, 'missionControlUiClient.mjs'), 'utf8'),
    ),
    ['escapeHtml'],
  );
}

function loadBrowserWorkflowEpicGroupingSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'workflowEpicGrouping.mjs'), 'utf8'),
  );
}

function loadBrowserArchitectureViewsProjectionSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'architectureViewsProjection.mjs'), 'utf8'),
  );
}

function loadBrowserWorkflowTreeProjectionSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'workflowTreeProjection.mjs'), 'utf8'),
  );
}

function loadBrowserUiButtonClientSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/atoms/buttonClient.mjs'), 'utf8'),
  );
}

function loadBrowserUiBadgeClientSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/atoms/badgeClient.mjs'), 'utf8'),
  );
}

function loadBrowserWorkItemStatusToneSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/workItemStatusTone.mjs'), 'utf8'),
  );
}

function loadBrowserKanbanBoardDeltaSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'kanbanBoardDelta.mjs'), 'utf8'),
  );
}

function loadBrowserKanbanBoardPatcherSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/kanbanBoardPatcher.mjs'), 'utf8'),
  );
}

function loadBrowserUserAvatarsSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/userAvatars.mjs'), 'utf8'),
  );
}

function loadBrowserWorkItemIssueTypeSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/workItemIssueType.mjs'), 'utf8'),
  );
}

function loadBrowserPromptRuleRowBadgeSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/promptRuleRowBadge.mjs'), 'utf8'),
  );
}

function loadBrowserMemoryRecordRowBadgeSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/memoryRecordRowBadge.mjs'), 'utf8'),
  );
}

function loadBrowserWorkItemClassifierSource() {
  return [
    stripModuleForBrowserInline(readFileSync(join(__dirname, 'workItemBlockClassifier.mjs'), 'utf8')),
    stripModuleForBrowserInline(readFileSync(join(__dirname, 'ui/workItemClassifierBadge.mjs'), 'utf8')),
  ].join('\n');
}

function loadBrowserDetailDrawerStackSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'detailDrawerStack.mjs'), 'utf8'),
  );
}

function loadBrowserLiveSyncCoordinatorSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/liveSyncCoordinator.mjs'), 'utf8'),
  );
}

function loadBrowserLiveSyncSseAdapterSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'ui/liveSyncSseAdapter.mjs'), 'utf8'),
  );
}

function loadBrowserAnalyticsRecordSortSource() {
  return stripModuleForBrowserInline(
    readFileSync(join(__dirname, 'analyticsRecordSort.mjs'), 'utf8'),
  );
}

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 4177;

const STATUS_GROUPS = [
  { id: 'ready', title: 'Доступно агенту', statuses: ['ready'] },
  { id: 'in_progress', title: 'В работе', statuses: ['claimed', 'doing', 'in_progress'] },
  { id: 'verify', title: 'Проверка', statuses: ['verify'] },
  { id: 'blocked', title: 'Заблокировано', statuses: ['blocked'] },
  { id: 'done', title: 'Завершено', statuses: ['done', 'verified'] },
];

const OPERATIONAL_BOARD_GROUPS = STATUS_GROUPS.filter((group) => group.id !== 'done');
const BACKLOG_GROUP = { id: 'backlog', title: 'Бэклог', statuses: ['backlog'] };
const DONE_ARCHIVE_GROUP = { id: 'done_archive', title: 'Архив завершённых', statuses: ['done', 'verified'] };
const BOARD_DONE_GROUP = STATUS_GROUPS.find((group) => group.id === 'done');
const BOARD_EXTENDED_COLUMN_GROUPS = [
  BACKLOG_GROUP,
  ...OPERATIONAL_BOARD_GROUPS,
  BOARD_DONE_GROUP,
].filter(Boolean);
const BOARD_COMPACT_OPERATIONAL_GROUPS = OPERATIONAL_BOARD_GROUPS.filter(
  (group) => group.id !== 'ready' && group.id !== 'blocked',
);
const BOARD_COMPACT_COLUMN_GROUPS = [
  BACKLOG_GROUP,
  ...BOARD_COMPACT_OPERATIONAL_GROUPS,
  BOARD_DONE_GROUP,
].filter(Boolean);

export function createSnapshotFromText(backlogText) {
  return buildSnapshot(parseWorkItems(backlogText));
}

export async function readBacklogSnapshot(options = {}) {
  const items = await readWorkItemsFromRepo(options);
  return buildSnapshot(items);
}

export async function readDashboardSnapshot(options = {}) {
  const fullItems = await readWorkItemsFromRepo(options);
  const workGraphSnapshot = buildSnapshot(fullItems);
  const workerRunSummaries = await readWorkerRunJournal({
    cwd: options.cwd,
    journalPath: options.journalPath,
  });
  const daemonAuditEntries = await readDaemonAuditJournal({
    cwd: options.cwd,
    auditPath: options.auditPath,
  });
  const dashboard = buildOperatorDashboardSnapshot(workGraphSnapshot, {
    evidenceLimit: options.evidenceLimit ?? 8,
    workerRunSummaries: workerRunSummaries.slice(-8).reverse(),
    actionFeed: daemonAuditEntries.slice(-8).reverse().map((entry) => ({
      type: 'daemon_tick',
      tickId: entry.tickId,
      taskId: entry.taskId,
      summary: entry.summary,
      status: entry.event,
      recordedAt: entry.recordedAt,
    })),
  });
  return {
    ...dashboard,
    verification: buildVerificationSummary(workGraphSnapshot, { items: fullItems }),
  };
}

export async function readEvidenceTimelineResponse(options = {}) {
  const workId = String(options.workId ?? options.taskId ?? '').trim();
  if (workId === '') {
    throw new TypeError('workId is required');
  }

  const items = await readWorkItemsFromRepo(options);
  const workerRuns = await readWorkerRunJournal({
    cwd: options.cwd,
    journalPath: options.journalPath,
  });

  return buildEvidenceTimelineForTask(items, workId, { workerRuns });
}

export async function readOperatorShellSnapshot(options = {}) {
  const workGraphSnapshot = await readBacklogSnapshot(options);
  const workerRunSummaries = await readWorkerRunJournal({
    cwd: options.cwd,
    journalPath: options.journalPath,
  });
  const daemonAuditEntries = await readDaemonAuditJournal({
    cwd: options.cwd,
    auditPath: options.auditPath,
  });
  const dashboardOptions = {
    evidenceLimit: options.evidenceLimit ?? 8,
    workerRunSummaries: workerRunSummaries.slice(-8).reverse(),
    actionFeed: daemonAuditEntries.slice(-8).reverse().map((entry) => ({
      type: 'daemon_tick',
      tickId: entry.tickId,
      taskId: entry.taskId,
      summary: entry.summary,
      status: entry.event,
      recordedAt: entry.recordedAt,
    })),
  };

  return buildOperatorShellSnapshotV2(workGraphSnapshot, {
    ...dashboardOptions,
    workerRuns: workerRunSummaries,
    cycleId: options.cycleId,
    doneArchiveCap: options.doneArchiveCap ?? DEFAULT_DONE_ARCHIVE_CAP,
    recordedAt: options.recordedAt,
    repoRoot: options.repoRoot ?? options.cwd,
  });
}

export async function readArchitectureSnapshot(options = {}) {
  const workGraphSnapshot = await readBacklogSnapshot(options);
  const repoRoot = options.repoRoot ?? options.cwd ?? process.cwd();
  return buildArchitectureSnapshot(workGraphSnapshot, {
    focusBlockId: options.focusBlockId ?? null,
    repoRoot,
  });
}

export async function readIntentPlaneGraph(options = {}) {
  const items = await readWorkItemsFromRepo(options);
  return buildIntentPlaneGraphResponse(items, {
    start: options.start ?? options.workId,
    direction: options.direction,
    depth: options.depth !== undefined ? Number(options.depth) : undefined,
    drift: options.drift,
  });
}

export async function readSemanticDriftBatch(options = {}) {
  const items = await readWorkItemsFromRepo(options);
  return buildSemanticDriftBatch(items, {
    department: options.department,
    parentId: options.parentId ?? options.epicId,
    limit: options.limit !== undefined ? Number(options.limit) : undefined,
  });
}

export function renderBacklogHtml(options = {}) {
  const catalog = options.catalog ?? loadUiCatalogSync(options.locale ?? 'ru', options);
  const { locale, t, messages } = createUiTranslator(catalog);
  const i18nBootstrapScript = JSON.stringify({ locale, messages });
  const schematicModelFull = buildSchematicViewModel({ viewMode: GRAPH_CANVAS_VIEW_FULL });
  const schematicModelPipeline = buildSchematicViewModel({ viewMode: GRAPH_CANVAS_VIEW_PIPELINE });
  const architectureLayoutSource = loadBrowserArchitectureLayoutSource();
  const graphCanvasProjectionSource = loadBrowserGraphCanvasProjectionSource();
  const markdownDocumentRenderSource = loadBrowserMarkdownDocumentRenderSource();
  const pipelineProseRenderSource = loadBrowserPipelineProseRenderSource();
  const workflowEpicGroupingSource = loadBrowserWorkflowEpicGroupingSource();
  const architectureViewsProjectionSource = loadBrowserArchitectureViewsProjectionSource();
  const workflowTreeProjectionSource = loadBrowserWorkflowTreeProjectionSource();
  const missionControlClientSource = loadBrowserMissionControlClientSource();
  const uiButtonClientSource = loadBrowserUiButtonClientSource();
  const uiBadgeClientSource = loadBrowserUiBadgeClientSource();
  const workItemStatusToneSource = loadBrowserWorkItemStatusToneSource();
  const kanbanBoardDeltaSource = loadBrowserKanbanBoardDeltaSource();
  const kanbanBoardPatcherSource = loadBrowserKanbanBoardPatcherSource();
  const userAvatarsSource = loadBrowserUserAvatarsSource();
  const workItemIssueTypeSource = loadBrowserWorkItemIssueTypeSource();
  const promptRuleRowBadgeSource = loadBrowserPromptRuleRowBadgeSource();
  const memoryRecordRowBadgeSource = loadBrowserMemoryRecordRowBadgeSource();
  const workItemClassifierSource = loadBrowserWorkItemClassifierSource();
  const detailDrawerStackSource = loadBrowserDetailDrawerStackSource();
  const liveSyncCoordinatorSource = loadBrowserLiveSyncCoordinatorSource();
  const liveSyncSseAdapterSource = loadBrowserLiveSyncSseAdapterSource();
  const analyticsRecordSortSource = loadBrowserAnalyticsRecordSortSource();
  const bvcDialectSectionTitles = Object.fromEntries(
    ['en', 'ru'].map((lang) => [lang, Object.fromEntries(getFieldSectionsForDialect(lang))]),
  );
  const shellNavAnalytics = renderNavTab({ view: 'analytics', label: t('nav.analytics'), selected: true });
  const shellNavWorkflow = renderNavTab({ view: 'workflow', label: t('nav.workflow'), selected: false });
  const shellNavBoard = renderNavTab({ view: 'board', label: t('nav.board'), selected: false });
  const shellNavVerification = renderNavTab({ view: 'verification', label: t('nav.verification'), selected: false });
  const shellNavMemory = renderNavTab({ view: 'memory', label: t('nav.memory'), selected: false });
  const shellNavArchitecture = renderNavTab({ view: 'architecture', label: t('nav.architecture'), selected: false });
  const shellNavPrompts = renderNavTab({ view: 'prompts', label: t('nav.prompts'), selected: false });
  const shellSettingsNav = renderSettingsNavTab({ label: t('nav.settings') });
  const shellHeaderThemeToggle = renderHeaderThemeToggleButton({ ariaLabel: t('theme.toggleAria') });
  const shellSettingsLocaleOptions = renderSettingsLocaleOptions({ locale, t });
  const shellDetailClose = renderDetailCloseButton();
  const shellDetailSubClose = renderDetailSubCloseButton();
  const shellAgentDockClose = renderAgentRunDockCloseButton();
  const shellAgentRunFooter = renderAgentRunFooterButtons();
  const shellIntentComposerActions = renderIntentComposerActionButtons();
  const shellIntentDomainClear = renderIntentDomainClearButton();
  const shellSearchModeSelect = renderSearchModeSelect();
  const shellCycleFilterSelect = renderCycleFilterSelect();
  const shellIntentDomainFilterSelect = renderIntentDomainFilterSelect();
  const shellAnalyticsSubtabs = renderAnalyticsSubtabsShell();
  const shellAnalyticsSortOptions = renderAnalyticsSortOptions({ t, sort: 'created-desc' });
  const shellWorkflowSubtabs = renderWorkflowSubtabsShell({
    backlog: t('workflow.tab.backlog'),
    archive: t('workflow.tab.archive'),
  });
  const shellWorkflowDisplayModeSelect = renderWorkflowDisplayModeSelect();
  const shellBoardColumnModeSelect = renderBoardColumnModeSelect({ t });
  const themeIconMoonHtml = renderThemeIcon('moon');
  const themeIconSunHtml = renderThemeIcon('sun');
  return `<!doctype html>
<html lang="${locale}" data-iohasc-theme="workgraph-dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script id="sidebar-width-bootstrap">
    (function () {
      var key = 'workGraphSidebarWidth';
      var min = 56;
      var max = 360;
      var fallback = 252;
      var compactMax = 80;
      var raw = Number(localStorage.getItem(key));
      var width = Number.isFinite(raw) ? Math.max(min, Math.min(max, raw)) : fallback;
      document.documentElement.style.setProperty('--sidebar-width', width + 'px');
      if (width <= compactMax) {
        document.documentElement.classList.add('is-sidebar-compact');
      }
    })();
  </script>
  <script id="font-scale-bootstrap">
    (function () {
      var key = 'workGraphFontScale';
      var modes = {
        'font-s': '0.875',
        'font-m': '1',
        'font-l': '1.125',
        'font-xl': '1.25'
      };
      var mode = localStorage.getItem(key) || 'font-m';
      if (!Object.prototype.hasOwnProperty.call(modes, mode)) {
        mode = 'font-m';
      }
      document.documentElement.classList.add(mode);
      document.documentElement.style.setProperty('--text-scale', modes[mode]);
    })();
  </script>
  <title>Work Graph: атомы задач</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/fonts/GraphikLCG/stylesheet.css">
  <link rel="stylesheet" href="/assets/graph-canvas-lit-flow.css">
  <link rel="stylesheet" href="/assets/design-tokens-workgraph-dark.css">
  <style>
    :root {
      color-scheme: light;
      --text-scale: 1;
      --bg: #ffffff;
      --header-bg: #ffffff;
      --panel: #ffffff;
      --panel-2: #f4f5f7;
      --column-bg: #f4f5f7;
      --card: #ffffff;
      --border: #dfe1e6;
      --text: #172b4d;
      --muted: #5e6c84;
      --accent: #0052cc;
      --accent-soft: #deebff;
      --warn: #9a6700;
      --danger: #d1242f;
      --ok: #1a7f37;
      --shadow-card: 0 1px 1px rgba(9, 30, 66, .13), 0 0 1px rgba(9, 30, 66, .25);
      --scrollbar-size: 12px;
      --scrollbar-track: var(--bg);
      --scrollbar-thumb: rgba(9, 30, 66, 0.28);
      --scrollbar-thumb-hover: rgba(9, 30, 66, 0.42);
      --scrollbar-thumb-active: var(--accent);
      --sidebar-width: 252px;
      --sidebar-width-compact: 56px;
      --sidebar-width-min: 56px;
      --sidebar-width-max: 360px;
      --sidebar-width-default: 252px;
      --sidebar-compact-ui-max: 80px;
      --text-xs: calc(0.75rem * var(--text-scale));
      --text-sm: calc(0.8125rem * var(--text-scale));
      --text-base: calc(0.9375rem * var(--text-scale));
      --text-lg: calc(1.0625rem * var(--text-scale));
      --text-xl: calc(1.25rem * var(--text-scale));
      --font-size-sm: var(--text-sm);
      --font-size-base: var(--text-base);
    }

    html.font-s { --text-scale: 0.875; }
    html.font-m { --text-scale: 1; }
    html.font-l { --text-scale: 1.125; }
    html.font-xl { --text-scale: 1.25; }

    body[data-theme="dark"] {
      color-scheme: dark;
      --bg: rgb(var(--brand-bg-rgb, 29 33 37));
      --header-bg: rgb(22 26 29);
      --panel: rgb(var(--ui-surface-rgb, 44 51 56));
      --panel-2: rgb(var(--ui-surface-muted-rgb, 56 65 74));
      --column-bg: rgb(22 26 29);
      --card: rgb(40 46 51);
      --border: rgb(var(--brand-border-rgb, 61 71 77));
      --text: rgb(var(--ui-text-rgb, 199 209 219));
      --muted: rgb(var(--ui-muted-rgb, 159 173 188));
      --accent: rgb(var(--ui-accent-rgb, 133 184 255));
      --accent-soft: rgba(9, 41, 87, 0.72);
      --warn: #e2b203;
      --danger: rgb(var(--ui-danger-rgb, 255 156 143));
      --ok: #4bce97;
      --shadow-card: 0 1px 1px rgba(0, 0, 0, .32);
      --scrollbar-track: var(--bg);
      --scrollbar-thumb: rgba(161, 189, 217, 0.22);
      --scrollbar-thumb-hover: rgba(161, 189, 217, 0.34);
      --scrollbar-thumb-active: var(--accent);
      --cursor-accent: rgb(var(--ui-accent-rgb, 133 184 255));
      --cursor-accent-hover: rgb(var(--ui-accent-hover-rgb, 87 157 255));
    }

    * { box-sizing: border-box; }

    html {
      color-scheme: light;
      font-family: var(--brand-font-sans, 'Graphik LCG', ui-sans-serif, system-ui, sans-serif);
      letter-spacing: 0.01em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    html[data-theme="dark"],
    body[data-theme="dark"] {
      color-scheme: dark;
    }

    b,
    strong {
      font-weight: var(--font-weight-strong, 600);
    }

    * {
      scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
      scrollbar-width: auto;
    }

    *::-webkit-scrollbar {
      height: var(--scrollbar-size);
      width: var(--scrollbar-size);
    }

    *::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
    }

    *::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb);
      border: 3px solid var(--scrollbar-track);
      border-radius: 999px;
      min-height: 48px;
    }

    *::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover);
    }

    *::-webkit-scrollbar-thumb:active {
      background-color: var(--scrollbar-thumb-active);
    }

    *::-webkit-scrollbar-corner {
      background: var(--scrollbar-track);
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: var(--text-base, 0.9375rem);
      letter-spacing: inherit;
      line-height: var(--text-base-line-height, 1.5rem);
    }

    .app-shell {
      display: grid;
      grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
      height: 100vh;
      overflow: hidden;
    }

    .app-shell.layout-root {
      min-height: 100vh;
    }

    .sidebar {
      background: var(--header-bg);
      border-right: 1px solid var(--border);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      gap: 10px;
      max-width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      overflow-x: hidden;
      overflow-y: auto;
      padding: 16px 0 12px;
      position: relative;
      width: var(--sidebar-width);
    }

    .sidebar-resize-handle {
      bottom: 0;
      cursor: col-resize;
      position: absolute;
      right: -6px;
      top: 0;
      width: 12px;
      z-index: 3;
    }

    .sidebar-resize-handle::after {
      background: transparent;
      bottom: 0;
      content: "";
      position: absolute;
      right: 5px;
      top: 0;
      width: 2px;
    }

    .sidebar-resize-handle:hover::after,
    body.is-resizing-sidebar .sidebar-resize-handle::after {
      background: var(--accent);
    }

    body.is-resizing-sidebar {
      cursor: col-resize;
      user-select: none;
    }

    .sidebar-footer {
      border-top: 1px solid var(--border);
      margin-top: auto;
      padding: 10px 12px 0;
    }

    .project-title {
      border-bottom: 1px solid var(--border);
      margin: 0 12px;
      padding: 10px 4px 12px;
    }

    .project-logo {
      display: block;
      height: 24px;
      max-width: 100%;
      width: auto;
    }

    .project-logo-emblem {
      display: none;
      height: 22px;
      margin: 0 auto;
      width: auto;
    }

    body[data-theme="dark"] .project-logo {
      filter: brightness(0) invert(1);
    }

    .sidebar-nav {
      display: grid;
      gap: 2px;
      padding: 8px 8px 0;
    }

    .sidebar-nav-advanced {
      border-top: 1px solid var(--border);
      margin-top: 8px;
      padding-top: 8px;
    }

    .nav-tab {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 10px;
      box-sizing: border-box;
      color: var(--text);
      cursor: pointer;
      display: flex;
      font: inherit;
      font-size: var(--text-base);
      gap: 10px;
      justify-content: flex-start;
      line-height: var(--text-base-line-height, 1.5rem);
      min-width: 0;
      padding: 9px 12px;
      position: relative;
      text-align: left;
      width: 100%;
    }

    .nav-tab:hover {
      background: var(--panel-2);
    }

    .nav-tab[aria-selected="true"] {
      background: #ebecf0;
      color: var(--accent);
      font-weight: 600;
    }

    body[data-theme="dark"] .nav-tab[aria-selected="true"] {
      background: #092957;
      color: #85b8ff;
    }

    .nav-tab[disabled] {
      color: var(--muted);
      cursor: not-allowed;
      opacity: .62;
    }

    .nav-tab-icon {
      display: block;
      flex-shrink: 0;
      height: 22px;
      width: 22px;
    }

    .nav-tab-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge {
      background: #ebecf0;
      border: 0;
      border-radius: 999px;
      color: #42526e;
      font-size: var(--text-sm);
      min-width: 26px;
      padding: 1px 6px;
      text-align: center;
    }

    .content {
      background: var(--bg);
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-height: 100vh;
      min-height: 0;
      min-width: 0;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 20px 32px 28px;
      position: relative;
    }

    .wg-page-loader {
      align-items: center;
      background: color-mix(in srgb, var(--bg) 82%, transparent);
      display: flex;
      inset: 0;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      position: absolute;
      transition: opacity 0.15s ease, visibility 0.15s ease;
      visibility: hidden;
      z-index: 90;
    }

    .wg-page-loader.is-visible {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    .wg-page-loader-panel {
      align-items: center;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 12px;
      justify-items: center;
      min-width: 220px;
      padding: 18px 22px;
    }

    .wg-page-loader-spinner {
      animation: wg-page-loader-spin 0.8s linear infinite;
      border: 3px solid var(--border);
      border-radius: 50%;
      border-top-color: var(--accent);
      height: 32px;
      width: 32px;
    }

    @keyframes wg-page-loader-spin {
      to { transform: rotate(360deg); }
    }

    .wg-page-loader-message {
      color: var(--muted);
      font-size: var(--text-sm);
      margin: 0;
      text-align: center;
    }

    .content.is-graph-workspace {
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      padding: 0;
    }

    .content.is-graph-workspace .page-header,
    .content.is-graph-workspace .toolbar {
      display: none !important;
    }

    .content.is-graph-workspace > .view:not([hidden]) {
      display: flex;
      flex: 1;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .content.is-board-workspace {
      --board-viewport-fill: calc(100vh - 168px);
    }

    .content.is-board-workspace > #board-view:not([hidden]) {
      min-height: var(--board-viewport-fill);
    }

    .graph-workspace-view {
      height: 100%;
      overflow: hidden;
    }

    .graph-workspace-panel {
      background: var(--bg);
      border: 0;
      box-shadow: none;
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0;
      height: 100%;
      min-height: 0;
      padding: 0;
    }

    .graph-workspace-toolbar-floating {
      align-items: center;
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      display: flex;
      gap: 12px;
      padding: 8px 10px;
      pointer-events: auto;
      position: absolute;
      right: 12px;
      top: 12px;
      z-index: 6;
    }

    .graph-workspace-canvas {
      flex: 1;
      height: 100%;
      min-height: 0;
      position: relative;
    }

    .graph-workspace-canvas .graph-canvas-lit-flow-host {
      border: 0 !important;
      border-radius: 0 !important;
      height: 100% !important;
      inset: 0;
      min-height: 0 !important;
      position: absolute;
      width: 100%;
    }

    .graph-workspace-stack {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0;
      height: 100%;
      min-height: 0;
      overflow: auto;
    }

    .graph-workspace-stack .graph-workspace-panel {
      flex: 1 0 100%;
      height: 100%;
      min-height: 100%;
    }

    .graph-workspace-panel.architecture-panel,
    .graph-workspace-panel.schematic-panel {
      background: var(--bg);
      border: 0;
      border-radius: 0;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0;
    }

    .graph-workspace-canvas.schematic-canvas-wrap {
      margin: 0;
      overflow: hidden;
      padding: 0;
    }

    .graph-workspace-canvas .schematic-canvas {
      height: 100%;
      inset: 0;
      position: absolute;
      width: 100%;
    }

    .page-header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .page-header-main {
      min-width: 0;
    }

    .page-header-actions {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      gap: 8px;
      margin-top: 2px;
    }

    .breadcrumbs {
      align-items: center;
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      font-size: var(--text-sm);
      gap: 6px;
      margin: 0 0 6px;
    }

    .breadcrumb-link,
    .breadcrumb-muted {
      color: var(--muted);
    }

    .breadcrumb-sep {
      color: #97a0af;
    }

    .breadcrumb-current {
      color: var(--text);
      font-weight: 500;
    }

    .page-header h1,
    #view-title {
      font-size: 2rem;
      font-weight: var(--font-weight-strong, 600);
      letter-spacing: var(--text-heading-letter-spacing, 0.01em);
      line-height: 2.5rem;
      margin: 0;
    }

    .workflow-filters[hidden] {
      display: none !important;
    }

    .workflow-subtabs {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .workflow-subtab {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 6px 12px;
    }

    .workflow-subtab.is-active,
    .workflow-subtab[aria-selected="true"] {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
    }

    body[data-theme="dark"] .workflow-subtab.is-active,
    body[data-theme="dark"] .workflow-subtab[aria-selected="true"] {
      background: #092957;
      border-color: #388bff;
      color: #85b8ff;
    }

    .workflow-panel[hidden] {
      display: none !important;
    }

    .topbar {
      align-items: center;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 0 0 12px;
    }

    .topbar-main {
      align-items: flex-start;
      display: flex;
      flex: 1;
      gap: 16px;
      justify-content: space-between;
      min-width: 0;
    }

    .topbar h1 {
      font-size: var(--text-xl);
      font-weight: 600;
      line-height: 1.25;
      margin: 0;
    }

    .topbar p {
      color: var(--muted);
      font-size: var(--font-size-sm);
      margin: 4px 0 0;
    }

    .board-toolbar {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .board-tabs {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .board-tabs[hidden] {
      display: none !important;
    }

    .board-tab {
      background: transparent;
      border: 0;
      border-radius: 3px;
      color: var(--muted);
      font: inherit;
      font-size: var(--text-sm);
      padding: 6px 8px;
    }

    .board-tab.is-active {
      background: #deebff;
      color: #0747a6;
      font-weight: 600;
    }

    body[data-theme="dark"] .board-tab.is-active {
      background: #092957;
      border-color: #388bff;
      color: #85b8ff;
    }

    .toolbar {
      align-items: center;
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .toolbar[hidden] {
      display: none !important;
    }

    .search {
      flex: 0 1 280px;
      min-width: 180px;
    }

    #board-view .board-columns-scroll {
      overflow-x: auto;
      overflow-y: visible;
      -webkit-overflow-scrolling: touch;
      transform: rotateX(180deg);
      width: 100%;
    }

    #board-view .board-columns-scroll > #board {
      transform: rotateX(180deg);
    }

    .board-column-mode-select {
      flex-shrink: 0;
      margin-left: auto;
    }

    .board-column-mode-select[hidden] {
      display: none !important;
    }

    .prompt-rule-editor {
      display: grid;
      gap: 8px;
    }

    .prompt-rule-editor textarea {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text);
      font-family: var(--mono, Consolas, monospace);
      font-size: var(--text-sm);
      min-height: 220px;
      padding: 10px;
      width: 100%;
    }

    .prompt-rule-editor-errors {
      color: #f48771;
      font-size: var(--text-sm);
      white-space: pre-wrap;
    }

    .workflow-filters {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      flex-wrap: nowrap;
      gap: 8px;
    }

    .theme-toggle {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text);
      cursor: pointer;
      padding: 7px 9px;
      text-align: left;
      width: 100%;
    }

    .header-theme-toggle {
      align-items: center;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      height: 36px;
      justify-content: center;
      padding: 0;
      width: 36px;
    }

    .header-theme-toggle:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .header-theme-toggle-icon {
      display: block;
    }

    .settings-panel {
      display: grid;
      gap: 12px;
      max-width: 720px;
    }

    .settings-section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 12px;
      padding: 14px 16px;
    }

    .settings-section h2 {
      font-size: var(--text-lg);
      margin: 0;
    }

    .settings-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      justify-content: space-between;
    }

    .settings-row label,
    .settings-row > span:first-child {
      color: var(--text);
      font-size: var(--text-sm);
      font-weight: 500;
    }

    .settings-about-actions {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-left: auto;
    }

    #settings-install-update[hidden],
    #settings-install-command[hidden] {
      display: none !important;
    }

    .settings-theme-options .wg-btn.is-active,
    .settings-locale-options .wg-btn.is-active {
      border-color: var(--accent);
    }

    body:not([data-theme="dark"]) .settings-theme-options .wg-btn--secondary.is-active,
    body:not([data-theme="dark"]) .settings-locale-options .wg-btn--secondary.is-active {
      background: var(--accent-soft);
      color: var(--accent);
    }

    body[data-theme="dark"] .settings-theme-options .wg-btn--secondary.is-active,
    body[data-theme="dark"] .settings-locale-options .wg-btn--secondary.is-active {
      background: #092957;
      border-color: #388bff;
      color: #85b8ff;
    }

    .settings-font-scale {
      align-items: stretch;
      display: grid;
      gap: 8px;
      min-width: min(100%, 320px);
    }

    .settings-font-scale-value {
      color: var(--muted);
      font-size: var(--text-sm);
      text-align: right;
    }

    .settings-font-scale-slider {
      accent-color: var(--accent);
      cursor: pointer;
      width: 100%;
    }

    .settings-font-scale-ticks {
      color: var(--muted);
      display: flex;
      font-size: var(--text-sm);
      justify-content: space-between;
    }

    .settings-version-value {
      font-family: var(--brand-font-mono, monospace);
      font-size: var(--text-sm);
    }

    .settings-update-status {
      color: var(--muted);
      font-size: var(--text-sm);
      margin: 0;
    }

    .settings-install-command-wrap {
      display: grid;
      gap: 6px;
      margin: 0;
    }

    .settings-install-command-hint {
      color: var(--muted);
      font-size: var(--text-sm);
      margin: 0;
    }

    .settings-install-code {
      align-items: stretch;
      display: flex;
      min-height: 42px;
      position: relative;
    }

    .settings-install-command-text {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-sizing: border-box;
      display: block;
      flex: 1 1 auto;
      font-family: var(--brand-font-mono, monospace);
      font-size: 12px;
      line-height: 1.45;
      min-height: 42px;
      padding: 10px 44px 10px 10px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .settings-install-copy-btn {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 6px;
      color: var(--muted);
      cursor: pointer;
      display: inline-flex;
      height: 32px;
      justify-content: center;
      padding: 0;
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
    }

    .settings-install-copy-btn:hover,
    .settings-install-copy-btn.is-copied {
      background: color-mix(in srgb, var(--accent) 14%, var(--panel-2));
      color: var(--accent);
    }

    .settings-install-copy-btn-text {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    .settings-install-copy-icon {
      display: block;
      flex: none;
    }

    .settings-install-copy-icon polyline,
    .settings-install-copy-icon rect {
      stroke: currentColor;
    }

    .settings-git-snapshot-note {
      color: var(--muted);
      font-size: var(--text-sm);
      margin: 0 0 12px;
    }

    .settings-git-snapshot-events {
      border: 0;
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
    }

    .settings-git-snapshot-events label {
      align-items: center;
      display: inline-flex;
      gap: 8px;
    }

    .wg-notice-stack {
      bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      left: 16px;
      max-width: min(360px, calc(100vw - 32px));
      pointer-events: none;
      position: fixed;
      z-index: 120;
    }

    .wg-notice {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      pointer-events: auto;
    }

    .wg-notice-title {
      font-size: var(--text-sm);
      font-weight: 600;
      margin: 0;
    }

    .wg-notice-body {
      color: var(--muted);
      font-size: var(--text-sm);
      margin: 0;
    }

    .wg-notice-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .nav-tab-settings {
      margin-top: 2px;
    }

    .theme-toggle:hover {
      border-color: var(--accent);
    }

    .verification-panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 10px;
      margin-bottom: 12px;
      padding: 12px 14px;
      width: 100%;
    }

    .verification-panel-header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .verification-panel-header h2 {
      font-size: var(--text-lg);
      margin: 0 0 4px;
    }

    .verification-panel-header p {
      color: var(--muted);
      font-size: var(--text-base);
      margin: 0;
    }

    .verification-tier-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .verification-tier-badge {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--muted);
      font-size: var(--text-sm);
      padding: 3px 8px;
    }

    .verification-matrix {
      border-collapse: collapse;
      font-size: var(--text-base);
      width: 100%;
    }

    .verification-matrix th,
    .verification-matrix td {
      border-bottom: 1px solid var(--border);
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }

    .verification-matrix th {
      color: var(--muted);
      font-weight: 600;
    }

    .verification-status {
      border-radius: 999px;
      display: inline-block;
      font-size: var(--text-sm);
      font-weight: 600;
      padding: 2px 8px;
      text-transform: lowercase;
    }

    .verification-status.is-passed { background: rgba(26, 127, 55, .16); color: var(--ok); }
    .verification-status.is-pending { background: rgba(154, 103, 0, .16); color: var(--warn); }
    .verification-status.is-blocked { background: rgba(209, 36, 47, .16); color: var(--danger); }
    .verification-status.is-not_run { background: var(--panel-2); color: var(--muted); }
    .verification-status.is-failed { background: rgba(209, 36, 47, .16); color: var(--danger); }

    .verification-evidence-list {
      display: grid;
      gap: 0;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .verification-evidence-list > li {
      border-bottom: 1px solid var(--border);
      font-size: var(--text-base);
      padding: 10px 12px;
    }

    .verification-evidence-list > li:last-child {
      border-bottom: 0;
    }

    .verification-evidence-list > li h3 {
      font-size: var(--text-base);
      font-weight: 600;
      line-height: 1.3;
      margin: 0;
    }

    .code-gap-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .code-gap-actions button {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      cursor: pointer;
      font-size: var(--font-size-sm);
      padding: 4px 10px;
    }

    .code-gap-actions button[data-action="code-gap-apply"] {
      border-color: var(--accent);
      color: var(--accent);
    }

    .code-gap-actions button[disabled] {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .code-gap-intake-preview,
    .code-gap-intake-errors {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: var(--font-size-sm);
      margin-top: 10px;
      max-height: 240px;
      overflow: auto;
      padding: 10px;
      white-space: pre-wrap;
    }

    .code-gap-intake-errors {
      border-color: rgba(209, 36, 47, .45);
      color: #f0a0a0;
    }

    .intent-composer-panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 12px;
      margin-bottom: 12px;
      padding: 12px 14px;
    }

    .intent-composer-panel-header h2 {
      font-size: var(--text-lg);
      margin: 0 0 4px;
    }

    .intent-composer-panel-header p {
      color: var(--muted);
      font-size: var(--text-sm);
      margin: 0;
    }

    .intent-composer-chat {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      display: grid;
      gap: 8px;
      max-height: 220px;
      overflow: auto;
      padding: 10px;
    }

    .intent-composer-message {
      border-radius: 6px;
      font-size: var(--text-sm);
      line-height: 1.45;
      padding: 8px 10px;
    }

    .intent-composer-message.is-user {
      background: rgba(0, 102, 255, .12);
      border: 1px solid rgba(0, 102, 255, .25);
    }

    .intent-composer-message.is-system {
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: var(--font-size-sm);
    }

    .intent-composer-input-row {
      display: grid;
      gap: 8px;
    }

    .intent-composer-input-row textarea {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-family: inherit;
      font-size: var(--text-sm);
      min-height: 88px;
      padding: 10px;
      resize: vertical;
    }

    .intent-composer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .intent-composer-actions button {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
      font-size: var(--text-sm);
      padding: 8px 12px;
    }

    .intent-composer-actions button[data-action="propose"] {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
      font-weight: 600;
    }

    .intent-composer-actions button[data-action="apply"] {
      background: #1f6f43;
      border-color: #1f6f43;
      color: #fff;
      font-weight: 600;
    }

    .intent-composer-actions button[disabled] {
      cursor: wait;
      opacity: .65;
    }

    .intent-composer-preview,
    .intent-composer-errors {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: var(--font-size-sm);
      max-height: 320px;
      overflow: auto;
      padding: 10px;
      white-space: pre-wrap;
    }

    .intent-composer-errors {
      border-color: #8b3a3a;
      color: #ffb4b4;
    }

    .memory-panel,
    .analytics-panel,
    .prompts-panel,
    .architecture-panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 3px;
      box-shadow: none;
      margin-bottom: 12px;
      overflow: hidden;
      width: 100%;
    }

    .memory-summary,
    .analytics-summary,
    .prompts-summary {
      display: none;
    }

    .analytics-panel-header {
      flex-wrap: wrap;
      gap: 8px 12px;
    }

    .architecture-panel-header {
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 4px 12px;
    }

    .architecture-panel-heading {
      align-items: center;
      display: flex;
      flex: 1 1 auto;
      gap: 8px;
      min-width: 0;
    }

    .analytics-panel-heading {
      align-items: center;
      display: flex;
      gap: 8px;
      min-width: 0;
    }

    .analytics-sort-options {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-left: auto;
    }

    body:not([data-theme="dark"]) .analytics-sort-options .wg-btn--secondary.is-active,
    body[data-theme="dark"] .analytics-sort-options .wg-btn--secondary.is-active {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
    }

    .pill {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--muted);
      font-size: var(--text-sm);
      padding: 4px 7px;
    }

    .pill strong {
      color: var(--text);
      font-weight: 600;
    }

    .board {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: 12px;
    }

    .board.is-extended {
      min-width: min-content;
      width: max-content;
    }

    .board.is-extended .column {
      flex: 0 0 350px;
      min-width: 350px;
      width: 350px;
    }

    .board.is-compact {
      align-items: stretch;
      min-height: 100%;
      min-width: min-content;
      width: 100%;
    }

    .board.is-compact .column {
      flex: 1 1 0;
      min-height: 100%;
      min-width: 350px;
      width: auto;
    }

    .column {
      background: var(--column-bg);
      border: 0;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      padding: 8px 8px 12px;
    }

    .column h2 {
      align-items: center;
      display: flex;
      color: var(--muted);
      font-size: var(--text-sm);
      font-weight: 700;
      justify-content: space-between;
      letter-spacing: .04em;
      line-height: 1.2;
      margin: 0 0 10px;
      min-height: 24px;
      padding: 0 4px;
      text-transform: uppercase;
    }

    .kanban-column-body {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 0;
      min-height: 0;
    }

    .kanban-column-more-hint {
      color: var(--muted);
      font-size: var(--text-xs);
      line-height: 1.3;
      margin-top: 6px;
      padding: 0 4px;
      text-align: center;
    }

    .kanban-column-sentinel {
      height: 1px;
      margin-top: 4px;
      width: 100%;
    }

    .count {
      background: #dfe1e6;
      border-radius: 999px;
      color: #42526e;
      font-size: var(--text-sm);
      font-weight: 700;
      min-width: 20px;
      padding: 1px 6px;
      text-align: center;
      text-transform: none;
    }

    body[data-theme="dark"] .count {
      background: rgb(var(--ui-surface-rgb, 44 51 56));
      color: var(--muted);
    }

    .task-atom {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 3px;
      box-shadow: var(--shadow-card);
      color: var(--text);
      cursor: pointer;
      display: block;
      font: inherit;
      margin-bottom: 8px;
      padding: 10px 10px 8px;
      text-align: left;
      width: 100%;
    }

    .task-atom:hover {
      background: #ffffff;
      border-color: #c1c7d0;
      box-shadow: 0 2px 6px rgba(9, 30, 66, .16), 0 0 1px rgba(9, 30, 66, .3);
    }

    .task-atom.list-row:hover {
      background: rgba(9, 30, 66, 0.04);
      border-color: transparent;
      box-shadow: none;
    }

    body[data-theme="dark"] .task-atom.list-row:hover {
      background: rgb(var(--ui-surface-hover-rgb, 56 65 74));
      border-color: transparent;
    }

    body[data-theme="dark"] .task-atom:hover {
      background: rgb(var(--ui-surface-hover-rgb, 56 65 74));
      border-color: rgb(var(--brand-border-rgb, 61 71 77));
    }

    .task-atom.kanban-card.is-new {
      animation: kanban-card-new 1.2s ease-out;
      box-shadow: 0 0 0 2px var(--accent-soft);
    }

    @keyframes kanban-card-new {
      0% { background: var(--accent-soft); }
      100% { background: var(--card); }
    }

    .detail-remote-update-banner {
      background: var(--accent-soft);
      border: 1px solid var(--accent);
      border-radius: 4px;
      color: var(--accent);
      font-size: 13px;
      margin-bottom: 10px;
      padding: 8px 10px;
    }

    .task-atom h3 {
      color: #172b4d;
      font-size: var(--text-base);
      font-weight: 500;
      line-height: 1.35;
      margin: 0;
    }

    body[data-theme="dark"] .task-atom h3 {
      color: var(--text);
    }

    .id {
      color: #6b778c;
      font: 14px/1.35 Consolas, "Cascadia Code", monospace;
      font-weight: 700;
      overflow-wrap: anywhere;
      text-transform: uppercase;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }

    .issue-footer {
      align-items: center;
      display: flex;
      gap: 6px;
      justify-content: space-between;
      margin-top: 9px;
      min-height: 22px;
    }

    .issue-footer-left,
    .issue-footer-right {
      align-items: center;
      display: flex;
      gap: 5px;
      min-width: 0;
    }

    .issue-key-chip {
      align-items: center;
      display: inline-flex;
      flex: 0 1 auto;
      gap: 6px;
      min-width: 0;
    }

    .issue-type-icon {
      align-items: center;
      border-radius: 2px;
      display: inline-flex;
      flex-shrink: 0;
      height: 16px;
      justify-content: center;
      width: 16px;
    }

    .issue-type-icon svg {
      display: block;
    }

    .issue-type-icon.is-task {
      background: #2684ff;
    }

    .issue-type-icon.is-story {
      background: #36b37e;
    }

    .issue-type-icon.is-epic {
      background: #6554c0;
    }

    .issue-type-icon.is-subtask {
      background: #0065ff;
    }

    .issue-type-icon.is-bug {
      background: #ff5630;
    }

    .issue-key-text {
      color: var(--muted);
      font-family: inherit;
      font-size: var(--text-sm);
      font-weight: 500;
      letter-spacing: 0;
      line-height: 1.2;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: none;
      white-space: nowrap;
    }

    .owner-avatar {
      border-radius: 50%;
      display: inline-flex;
      flex: 0 0 auto;
      height: 28px;
      overflow: hidden;
      width: 28px;
    }

    .owner-avatar img {
      display: block;
      height: 100%;
      object-fit: cover;
      width: 100%;
    }

    .owner-avatar.is-agent img {
      object-fit: contain;
    }

    .owner-avatar-stack {
      align-items: center;
      display: inline-flex;
      flex: 0 0 auto;
    }

    .owner-avatar-stack .owner-avatar {
      box-shadow: 0 0 0 2px var(--bg);
      margin-left: -8px;
    }

    .owner-avatar-stack .owner-avatar:first-child {
      margin-left: 0;
    }

    .semantic-core {
      margin-top: 6px;
    }

    .semantic-line {
      color: #5e6c84;
      font-size: var(--text-base);
      line-height: 1.35;
      overflow-wrap: break-word;
      word-break: normal;
    }

    body[data-theme="dark"] .semantic-line {
      color: var(--muted);
    }

    .tag {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--muted);
      font-size: var(--text-sm);
      line-height: 1.25;
      padding: 2px 5px;
    }

    .tag-compact {
      background: transparent;
      border: 0;
      color: #6b778c;
      font-size: var(--text-sm);
      font-weight: 700;
      line-height: 1.2;
      max-width: 115px;
      overflow: hidden;
      padding: 0;
      text-overflow: ellipsis;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .status-badge {
      align-items: center;
      border: 1px solid transparent;
      border-radius: 999px;
      display: inline-flex;
      font-size: var(--text-sm);
      font-weight: 700;
      line-height: 1;
      max-width: 130px;
      overflow: hidden;
      padding: 4px 7px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge.is-backlog {
      background: #f4f5f7;
      border-color: #dfe1e6;
      color: #5e6c84;
    }

    .status-badge.is-ready {
      background: #e9f2ff;
      border-color: #b6d4ff;
      color: #0747a6;
    }

    .status-badge.is-claimed,
    .status-badge.is-doing,
    .status-badge.is-in_progress {
      background: #fff7d6;
      border-color: #f0c36d;
      color: #7a4f01;
    }

    .status-badge.is-verify {
      background: #eae6ff;
      border-color: #c0b6f2;
      color: #403294;
    }

    .status-badge.is-blocked {
      background: #ffebe6;
      border-color: #ffbdad;
      color: #bf2600;
    }

    .status-badge.is-done,
    .status-badge.is-verified {
      background: #e3fcef;
      border-color: #abf5d1;
      color: #006644;
    }

    body[data-theme="dark"] .status-badge.is-backlog {
      background: #2d2d30;
      border-color: #3c3c3c;
      color: #c8c8c8;
    }

    body[data-theme="dark"] .status-badge.is-ready {
      background: #17324d;
      border-color: #24517a;
      color: #cce0ff;
    }

    body[data-theme="dark"] .status-badge.is-claimed,
    body[data-theme="dark"] .status-badge.is-doing,
    body[data-theme="dark"] .status-badge.is-in_progress {
      background: #3d2e12;
      border-color: #7a5a16;
      color: #ffd599;
    }

    body[data-theme="dark"] .status-badge.is-verify {
      background: #2f2a52;
      border-color: #5d55a3;
      color: #d6d0ff;
    }

    body[data-theme="dark"] .status-badge.is-blocked {
      background: #4a1f1a;
      border-color: #8f3328;
      color: #ffb3b3;
    }

    body[data-theme="dark"] .status-badge.is-done,
    body[data-theme="dark"] .status-badge.is-verified {
      background: #173b2b;
      border-color: #2f6f4f;
      color: #b5f2cf;
    }

    .status-badge.is-planned {
      background: #f0ecff;
      border-color: #c4b5fd;
      color: #5b21b6;
    }

    body[data-theme="dark"] .status-badge.is-planned {
      background: #2a2140;
      border-color: #5b4a8a;
      color: #d8ccff;
    }

    .task-atom-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .task-promote-button {
      align-self: flex-start;
      background: transparent;
      border: 1px solid var(--cursor-accent, #0066ff);
      border-radius: 4px;
      color: var(--cursor-accent, #0066ff);
      cursor: pointer;
      font-size: var(--font-size-sm);
      padding: 4px 8px;
    }

    .task-promote-button:hover {
      background: rgba(0, 102, 255, 0.12);
    }

    .detail-promote-row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .detail-promote-button {
      background: var(--cursor-accent, #0066ff);
      border: 0;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-size: var(--font-size-sm);
      padding: 8px 12px;
    }

    .detail-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .detail-toolbar .wg-btn--secondary {
      background: rgb(var(--ui-control-bg-rgb, 45 45 48));
      color: rgb(var(--ui-text-rgb, 212 212 212));
      border-color: rgb(var(--brand-border-rgb, 60 60 60));
    }

    body:not([data-theme="dark"]) .detail-toolbar .wg-btn--secondary {
      background: var(--panel-2);
      color: var(--text);
      border-color: var(--border);
    }

    .atom-inspector-form {
      display: grid;
      gap: 12px;
    }

    .atom-inspector-field label {
      color: var(--muted);
      display: block;
      font-size: var(--font-size-sm);
      margin-bottom: 4px;
    }

    .atom-inspector-field input,
    .atom-inspector-field select,
    .atom-inspector-field textarea {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font: inherit;
      padding: 8px;
      width: 100%;
    }

    .atom-inspector-field textarea {
      min-height: 72px;
      resize: vertical;
    }

    .atom-inspector-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .atom-inspector-actions button {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      cursor: pointer;
      font-size: var(--font-size-sm);
      padding: 8px 10px;
    }

    .atom-inspector-actions button[data-action="apply"] {
      background: var(--cursor-accent, #0066ff);
      border-color: var(--cursor-accent, #0066ff);
      color: #fff;
    }

    .atom-inspector-preview,
    .atom-inspector-errors {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: var(--font-size-sm);
      max-height: 240px;
      overflow: auto;
      padding: 10px;
      white-space: pre-wrap;
    }

    .atom-inspector-errors {
      border-color: var(--danger);
      color: #ffb3b3;
    }

    .priority-critical, .risk-high { border-color: var(--danger); color: var(--danger); }
    .priority-high, .risk-medium { border-color: var(--warn); color: var(--warn); }
    .trace-verified { border-color: var(--ok); color: var(--ok); }
    body[data-theme="dark"] .priority-critical,
    body[data-theme="dark"] .risk-high { color: #ffb3b3; }
    body[data-theme="dark"] .priority-high,
    body[data-theme="dark"] .risk-medium { color: #ffd599; }
    body[data-theme="dark"] .trace-verified { color: #b5cea8; }

    details {
      margin-top: 8px;
    }

    summary {
      color: var(--muted);
      cursor: pointer;
      font-size: var(--text-sm);
    }

    ul {
      margin: 6px 0 0;
      padding-left: 18px;
    }

    li {
      color: var(--muted);
      margin: 3px 0;
      overflow-wrap: anywhere;
    }

    .empty, .error {
      border: 1px dashed var(--border);
      border-radius: 3px;
      color: var(--muted);
      padding: 12px;
      text-align: center;
    }

    .error {
      border-color: var(--danger);
      color: #ffb3b3;
    }

    .view[hidden] {
      display: none;
    }

    .home-mission-control {
      width: 100%;
    }

    .backlog-panel,
    .list-panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 3px;
      width: 100%;
    }

    .backlog-panel-header,
    .list-panel-header {
      align-items: center;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
    }

    .backlog-panel-header h2,
    .list-panel-header h2 {
      font-size: var(--text-lg);
      margin: 0;
    }

    .backlog-list,
    .list-rows {
      display: grid;
      gap: 0;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .workflow-epic-group {
      border-bottom: 1px solid var(--border);
      display: block;
      margin: 0;
    }

    .list-rows > .workflow-epic-group:last-child {
      border-bottom: 0;
    }

    .workflow-epic-group .workflow-epic-children .list-row:last-child {
      border-bottom: 0;
    }

    .workflow-epic-group:not(:has(.workflow-epic-children)) .workflow-epic-row {
      border-bottom: 0;
    }

    .workflow-epic-row {
      box-shadow: inset 3px 0 0 #8250df;
    }

    body[data-theme="dark"] .workflow-epic-row {
      box-shadow: inset 3px 0 0 #c59cff;
    }

    .list-row-inner {
      align-items: center;
      display: flex;
      gap: 6px;
    }

    .list-row-inner .workflow-epic-toggle {
      align-self: center;
      flex-shrink: 0;
    }

    .list-row-body {
      flex: 1;
      min-width: 0;
    }

    .workflow-epic-meta {
      color: var(--muted);
      font-size: var(--text-xs);
      margin-left: 8px;
      white-space: nowrap;
    }

    .workflow-epic-toggle {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 999px;
      color: var(--muted);
      cursor: pointer;
      display: inline-flex;
      flex-shrink: 0;
      height: 28px;
      justify-content: center;
      line-height: 1;
      padding: 0;
      width: 28px;
    }

    .workflow-epic-toggle:hover {
      color: var(--accent);
    }

    .list-row:hover .workflow-epic-toggle {
      background: transparent;
    }

    .workflow-epic-caret-icon {
      display: block;
      height: 16px;
      width: 16px;
    }

    .workflow-epic-children {
      display: block;
      margin: 0;
      padding: 0;
    }

    .workflow-epic-child-row {
      padding-left: 42px;
    }

    .workflow-epic-empty {
      color: var(--muted);
      font-size: var(--text-sm);
      padding: 8px 12px 8px 28px;
    }

    .workflow-epic-hierarchy-warning {
      background: color-mix(in srgb, #ffab00 12%, var(--panel));
      border: 1px dashed color-mix(in srgb, #ffab00 55%, var(--border));
      border-radius: 3px;
      color: var(--text);
      font-size: var(--text-sm);
      line-height: 1.4;
      margin: 0 12px 8px;
      padding: 8px 10px;
    }

    .list-row,
    .backlog-row {
      border: 0;
      border-bottom: 1px solid var(--border);
      border-radius: 0;
      box-shadow: none;
      margin: 0;
    }

    .list-rows > .list-row:last-child,
    .list-rows > .backlog-row:last-child,
    .list-rows > li:last-child {
      border-bottom: 0;
    }

    .list-rows > li {
      border-bottom: 1px solid var(--border);
      padding: 10px 12px;
    }

    .list-row.is-selected,
    .list-row.is-highlighted {
      background: #ebecf0;
    }

    body[data-theme="dark"] .list-row.is-selected,
    body[data-theme="dark"] .list-row.is-highlighted {
      background: rgb(var(--ui-surface-rgb, 44 51 56));
    }

    .list-row.is-selected {
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .list-row-line {
      color: var(--muted);
      font-size: var(--text-sm);
      line-height: 1.35;
      margin: 4px 0 0;
    }

    .list-row-line:first-of-type {
      margin-top: 6px;
    }

    .list-row-tags {
      color: var(--muted);
      font-size: var(--text-sm);
      margin-top: 6px;
    }

    .list-row-tag {
      color: var(--muted);
    }

    .list-row-tag.is-valid { color: var(--ok); }
    .list-row-tag.is-invalid { color: var(--danger); }

    .workflow-pagination {
      align-items: center;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 10px 12px;
    }

    .workflow-pagination[hidden] {
      display: none !important;
    }

    .workflow-page-meta {
      color: var(--muted);
      font-size: var(--font-size-sm);
      text-align: center;
    }

    .workflow-page-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text);
      cursor: pointer;
      font: inherit;
      font-size: var(--font-size-sm);
      padding: 6px 10px;
    }

    .workflow-page-btn:hover:not(:disabled) {
      border-color: var(--accent);
      color: var(--accent);
    }

    .workflow-page-btn:disabled {
      cursor: not-allowed;
      opacity: .45;
    }

    .graph-canvas-mode-toggle {
      display: inline-flex;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .graph-canvas-mode-toggle button {
      border: 0;
      background: var(--panel-2);
      color: var(--muted);
      padding: 6px 12px;
      font-size: var(--text-sm);
      cursor: pointer;
    }

    .graph-canvas-mode-toggle button.is-active {
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 600;
    }

    .schematic-panel-header {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .architecture-canvas-wrap {
      flex: 1;
      min-height: 280px;
      min-width: 0;
      overflow: hidden;
      padding: 0;
    }

    .architecture-l2-focus {
      border-top: 1px solid var(--border);
      display: flex;
      flex: 0 0 auto;
      flex-direction: column;
      gap: 8px;
      max-height: min(42vh, 420px);
      min-height: 0;
      padding: 12px 0 0;
    }

    .architecture-l2-focus[hidden] {
      display: none !important;
    }

    .architecture-l2-focus-header {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      gap: 12px;
      justify-content: space-between;
    }

    .architecture-l2-focus-header h3 {
      font-size: var(--font-size-sm);
      font-weight: 600;
      letter-spacing: 0.04em;
      margin: 0;
      text-transform: uppercase;
    }

    .architecture-l2-focus-body {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }

    .architecture-l2-focus-body .detail-section + .detail-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .architecture-canvas {
      height: 100%;
      inset: 0;
      position: absolute;
      width: 100%;
    }

    .architecture-edges {
      inset: 0;
      pointer-events: none;
      position: absolute;
    }

    .architecture-edge {
      fill: none;
      stroke: var(--muted);
      stroke-width: 1.75;
    }

    .architecture-edge.is-upstream {
      stroke-dasharray: 5 4;
    }

    .architecture-edge-label {
      fill: var(--text);
      font-size: var(--text-sm);
      paint-order: stroke fill;
      stroke: var(--panel);
      stroke-width: 4px;
      text-anchor: middle;
    }

    .architecture-edge-labels {
      inset: 0;
      pointer-events: none;
      position: absolute;
      z-index: 3;
    }

    .architecture-edge-labels .architecture-edge-label {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--muted);
      font-size: var(--text-sm);
      line-height: 1.2;
      padding: 2px 6px;
      position: absolute;
      transform: translate(-50%, -50%);
      white-space: nowrap;
    }

    .architecture-edge-labels .architecture-edge-label.is-upstream {
      border-style: dashed;
    }

    .architecture-block-node {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: var(--shadow-card);
      box-sizing: border-box;
      color: inherit;
      cursor: pointer;
      font: inherit;
      min-height: 108px;
      padding: 12px 14px;
      position: absolute;
      text-align: left;
      z-index: 2;
    }

    .architecture-block-node:hover,
    .architecture-block-node.is-focused {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    .architecture-block-node .id {
      color: var(--muted);
      font-size: var(--text-sm);
      letter-spacing: .04em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .architecture-block-node strong {
      display: block;
      font-size: var(--text-base);
      margin-bottom: 6px;
    }

    .architecture-block-node p {
      color: var(--muted);
      font-size: var(--text-base);
      line-height: 1.35;
      margin: 0 0 8px;
    }

    .architecture-block-meta {
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      font-size: var(--text-sm);
      gap: 6px;
    }

    .architecture-block-meta span {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 2px 7px;
    }

    .schematic-panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .schematic-panel-header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .schematic-panel-header h2 {
      font-size: var(--text-lg);
      margin: 0 0 4px;
    }

    .schematic-panel-header p {
      color: var(--muted);
      margin: 0;
    }

    .schematic-canvas-wrap {
      overflow: visible;
      padding: 12px 0 24px;
    }

    .schematic-canvas {
      position: relative;
    }

    .schematic-edges {
      inset: 0;
      pointer-events: none;
      position: absolute;
    }

    .schematic-edge {
      fill: none;
      stroke: var(--muted);
      stroke-width: 1.75;
    }

    .schematic-edge.is-upstream {
      stroke-dasharray: 5 4;
    }

    .schematic-edge-label {
      fill: var(--text);
      font-size: var(--text-sm);
      paint-order: stroke fill;
      stroke: var(--panel);
      stroke-width: 4px;
      text-anchor: middle;
    }

    .schematic-edge-labels {
      inset: 0;
      pointer-events: none;
      position: absolute;
      z-index: 3;
    }

    .schematic-edge-labels .schematic-edge-label {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--muted);
      font-size: var(--text-sm);
      line-height: 1.2;
      padding: 2px 6px;
      position: absolute;
      transform: translate(-50%, -50%);
      white-space: nowrap;
    }

    .schematic-edge-labels .schematic-edge-label.is-upstream {
      border-style: dashed;
    }

    .schematic-node {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: var(--shadow-card);
      box-sizing: border-box;
      color: inherit;
      cursor: pointer;
      font: inherit;
      padding: 12px 14px;
      position: absolute;
      text-align: left;
      z-index: 2;
    }

    .schematic-node:hover,
    .schematic-node.is-focused {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    .schematic-node .layer {
      color: var(--muted);
      font-size: var(--text-sm);
      letter-spacing: .04em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .schematic-node strong {
      display: block;
      font-size: var(--text-base);
      margin-bottom: 6px;
    }

    .schematic-node p {
      color: var(--muted);
      font-size: var(--text-base);
      line-height: 1.35;
      margin: 0;
    }

    .detail-overlay {
      background: rgba(9, 30, 66, .32);
      cursor: pointer;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      position: fixed;
      transition: opacity .16s ease;
      z-index: 20;
    }

    .detail-overlay.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    .detail-drawer {
      background: var(--panel);
      border-left: 1px solid var(--border);
      bottom: 0;
      box-shadow: -12px 0 30px rgba(9, 30, 66, .18);
      display: flex;
      flex-direction: column;
      max-width: calc(100vw - 48px);
      min-width: min(420px, 100vw);
      position: fixed;
      right: 0;
      top: 0;
      transform: translateX(100%);
      transition: transform .18s ease;
      width: 720px;
      z-index: 21;
    }

    .detail-drawer.is-open {
      transform: translateX(0);
    }

    .detail-sub-overlay {
      z-index: 22;
    }

    .detail-sub-drawer {
      z-index: 23;
      box-shadow: -16px 0 40px rgba(9, 30, 66, .24);
      width: 640px;
    }

    .detail-sub-drawer.is-open {
      transform: translateX(0);
    }

    .detail-stack-breadcrumb {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
      margin-top: 4px;
    }

    .detail-stack-crumb-sep {
      margin: 0 4px;
      opacity: .65;
    }

    .repo-file-link {
      background: transparent;
      border: 0;
      color: var(--accent, #0052cc);
      cursor: pointer;
      font: inherit;
      padding: 0;
      text-align: left;
      text-decoration: underline;
      word-break: break-all;
    }

    .repo-file-link:hover {
      color: var(--accent-strong, #0065ff);
    }

    .repo-file-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }

    .repo-file-path {
      font-size: 13px;
      word-break: break-all;
    }

    .repo-file-preview-panel pre.repo-file-preview {
      background: var(--surface-sunken, #f4f5f7);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      max-height: min(70vh, 640px);
      overflow: auto;
      padding: 12px 14px;
      white-space: pre;
      word-break: normal;
    }

    .repo-file-truncated {
      color: var(--warning, #974f00);
      font-size: 12px;
    }

    .repo-file-markdown {
      max-height: min(70vh, 640px);
      overflow: auto;
    }

    .detail-stack-crumb.is-current {
      color: var(--text);
    }

    .atom-inspector-lang-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .04em;
      margin-left: 8px;
      opacity: .75;
      text-transform: uppercase;
    }

    .atom-inspector-warnings {
      background: rgba(255, 171, 0, .12);
      border: 1px solid rgba(255, 171, 0, .35);
      border-radius: 6px;
      color: var(--text);
      font-size: 12px;
      margin: 8px 0 12px;
      padding: 8px 10px;
    }

    .detail-resize-handle {
      bottom: 0;
      cursor: col-resize;
      left: -6px;
      position: absolute;
      top: 0;
      width: 12px;
      z-index: 2;
    }

    .detail-resize-handle::after {
      background: transparent;
      bottom: 0;
      content: "";
      left: 5px;
      position: absolute;
      top: 0;
      width: 2px;
    }

    .detail-resize-handle:hover::after,
    body.is-resizing-detail .detail-resize-handle::after {
      background: var(--accent);
    }

    body.is-resizing-detail {
      cursor: col-resize;
      user-select: none;
    }

    html.detail-drawer-open,
    body.detail-drawer-open {
      overflow: hidden;
    }

    .detail-header {
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 18px 20px 14px;
    }

    .detail-header h2 {
      font-size: var(--text-xl);
      letter-spacing: -.02em;
      line-height: 1.25;
      margin: 0 0 6px;
    }

    .detail-close {
      align-self: flex-start;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--muted);
      cursor: pointer;
      font: inherit;
      padding: 5px 8px;
    }

    .detail-close:hover {
      background: var(--panel-2);
      color: var(--text);
    }

    .detail-body {
      display: grid;
      gap: 0;
      overflow: auto;
      padding: 16px 20px 24px;
    }

    .detail-section {
      border-top: 1px solid var(--border);
      padding: 12px 0;
    }

    .detail-section:first-child {
      border-top: 0;
      padding-top: 0;
    }

    .detail-accordion {
      border-top: 1px solid var(--border);
    }

    .detail-accordion-summary {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      padding: 13px 0;
      font-size: var(--font-size-sm);
      font-weight: 600;
      line-height: 1.2;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      list-style: none;
      user-select: none;
    }

    .detail-accordion-summary::-webkit-details-marker {
      display: none;
    }

    .detail-accordion-summary::after {
      content: '';
      display: inline-block;
      width: 0.42em;
      height: 0.42em;
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: rotate(-45deg);
      flex-shrink: 0;
      color: var(--text-muted);
    }

    .detail-accordion[open] > .detail-accordion-summary::after {
      transform: rotate(45deg);
    }

    .detail-accordion-body {
      padding: 0 0 12px 14px;
    }

    .detail-accordion-body .detail-section {
      border-top: 0;
      padding-top: 0;
    }

    .pipeline-readonly-hint {
      margin: 0 0 10px;
      font-size: var(--font-size-sm);
    }

    .pipeline-readonly-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }

    .pipeline-readonly-text {
      margin: 0;
      color: var(--text);
      font-size: var(--font-size-base);
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .pipeline-prose {
      display: grid;
      gap: 0;
    }

    .pipeline-prose-heading {
      margin: 14px 0 6px;
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--text);
    }

    .pipeline-prose-heading:first-child {
      margin-top: 0;
    }

    .pipeline-prose-p {
      margin: 0 0 10px;
      padding-left: 0;
      color: var(--text);
      font-size: var(--font-size-base);
      line-height: 1.55;
    }

    .pipeline-prose-list {
      margin: 0 0 10px;
      padding-left: 1.25em;
      color: var(--text);
      font-size: var(--font-size-base);
      line-height: 1.55;
    }

    .pipeline-prose-list--check {
      list-style: none;
      padding-left: 0;
    }

    .pipeline-prose-list--check li {
      padding-left: 0;
    }

    .inline-term {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em;
      padding: 0 4px;
      border-radius: 3px;
      background: var(--panel-2);
      border: 1px solid var(--border);
    }

    .pipeline-prose-divider {
      margin: 10px 0 2px;
      border-top: 1px solid var(--border);
    }

    .pipeline-readonly-text + .pipeline-readonly-text {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .work-pipeline-panel {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      background: var(--panel-2);
    }

    .work-pipeline-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }

    .work-pipeline-meta .pill {
      font-size: var(--font-size-sm);
    }

    .work-pipeline-block {
      margin: 8px 0 0;
      padding: 10px;
      border-radius: 4px;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      white-space: pre-wrap;
      font-size: var(--font-size-sm);
      line-height: 1.45;
      max-height: 280px;
      overflow: auto;
    }

    .work-pipeline-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .work-pipeline-actions button {
      font-size: var(--font-size-sm);
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      cursor: pointer;
    }

    .work-pipeline-actions button[data-action="pipeline-advance"] {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-soft);
    }

    .verdict-useful { color: var(--ok); }
    .verdict-harmful { color: var(--danger); }
    .verdict-defer { color: var(--warn); }

    .ui-refs-panel {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      background: var(--panel-2);
    }

    .ui-refs-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 8px;
    }

    .ui-refs-card {
      width: 140px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--card);
      overflow: hidden;
    }

    .ui-refs-card img {
      display: block;
      width: 100%;
      height: 96px;
      object-fit: cover;
      background: var(--panel-2);
    }

    .ui-refs-caption {
      font-size: var(--font-size-sm);
      color: var(--muted);
      padding: 6px 8px;
      line-height: 1.3;
      word-break: break-word;
    }

    .ui-refs-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
      align-items: center;
    }

    .ui-refs-actions input[type="file"] {
      display: none;
    }

    .ui-refs-actions button {
      font-size: var(--font-size-sm);
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      cursor: pointer;
    }

    .detail-section h3 {
      font-size: var(--text-sm);
      letter-spacing: .04em;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .detail-section p {
      color: var(--muted);
      margin: 0;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .hierarchy-panel {
      display: grid;
      gap: 8px;
    }

    .hierarchy-panel .task-atom.list-row {
      margin-bottom: 0;
    }

    .hierarchy-close-gate {
      color: var(--warn);
      font-size: var(--font-size-sm);
      margin: 0 0 8px;
    }

    .detail-section h4 {
      font: var(--font-size-sm)/1.3 inherit;
      letter-spacing: .03em;
      margin: 10px 0 4px;
      text-transform: uppercase;
    }

    .analytics-body-pre {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      line-height: 1.5;
      margin: 0;
      overflow-wrap: anywhere;
      padding: 12px 14px;
      white-space: pre-wrap;
    }

    .markdown-doc {
      color: var(--text);
      display: grid;
      gap: 0;
      font-size: var(--font-size-base);
      line-height: 1.55;
    }

    .markdown-doc .markdown-h1 {
      font-size: 1.875rem;
      font-weight: 600;
      letter-spacing: -0.015em;
      line-height: 2.375rem;
      margin: 0 0 16px;
    }

    .markdown-doc .markdown-h2 {
      border-top: 1px solid var(--border);
      font-size: var(--text-2xl);
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: var(--text-2xl-line-height, 1.875rem);
      margin: 22px 0 14px;
      padding-top: 18px;
    }

    .markdown-doc .markdown-h2:first-child {
      border-top: 0;
      margin-top: 0;
      padding-top: 0;
    }

    .markdown-doc .markdown-h3 {
      font-size: var(--text-xl);
      font-weight: 600;
      line-height: var(--text-xl-line-height, 1.75rem);
      margin: 18px 0 10px;
    }

    .markdown-doc .markdown-p {
      color: var(--text);
      margin: 0 0 10px;
      overflow-wrap: anywhere;
    }

    .markdown-doc .markdown-list {
      margin: 0 0 12px;
      padding-left: 1.35em;
    }

    .markdown-doc .markdown-list--ordered {
      padding-left: 1.5em;
    }

    .markdown-doc .markdown-list li {
      margin: 0 0 6px;
    }

    .markdown-doc .markdown-list li:last-child {
      margin-bottom: 0;
    }

    .markdown-doc .markdown-hr {
      border: 0;
      border-top: 1px solid var(--border);
      margin: 16px 0;
    }

    .markdown-doc .markdown-table-wrap {
      margin: 0 0 14px;
      overflow-x: auto;
    }

    .markdown-doc .markdown-table {
      border-collapse: collapse;
      font-size: var(--font-size-base);
      min-width: 100%;
      width: max-content;
    }

    .markdown-doc .markdown-table th,
    .markdown-doc .markdown-table td {
      border: 1px solid var(--border);
      font-size: inherit;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }

    .markdown-doc .inline-term {
      font-size: inherit;
    }

    .markdown-doc .markdown-table th {
      background: var(--panel-2);
      color: var(--text);
      font-weight: 600;
    }

    .markdown-doc .markdown-code-block {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: var(--text-sm);
      line-height: 1.45;
      margin: 0 0 12px;
      overflow-x: auto;
      padding: 12px 14px;
      white-space: pre;
    }

    .markdown-doc .markdown-code-block code {
      background: transparent;
      border: 0;
      display: block;
      font: inherit;
      padding: 0;
      white-space: pre;
    }

    .markdown-doc .code-hl-key,
    .repo-file-preview-panel pre.repo-file-preview .code-hl-key {
      color: #0d7a6f;
    }

    .markdown-doc .code-hl-string,
    .repo-file-preview-panel pre.repo-file-preview .code-hl-string {
      color: #7b4bb7;
    }

    .markdown-doc .code-hl-number,
    .markdown-doc .code-hl-punct,
    .repo-file-preview-panel pre.repo-file-preview .code-hl-number,
    .repo-file-preview-panel pre.repo-file-preview .code-hl-punct {
      color: var(--text);
    }

    .markdown-doc .code-hl-keyword,
    .repo-file-preview-panel pre.repo-file-preview .code-hl-keyword {
      color: #0052cc;
    }

    .markdown-doc .code-hl-comment,
    .repo-file-preview-panel pre.repo-file-preview .code-hl-comment {
      color: var(--muted);
      font-style: italic;
    }

    body[data-theme="dark"] .markdown-doc .code-hl-key,
    body[data-theme="dark"] .repo-file-preview-panel pre.repo-file-preview .code-hl-key {
      color: #4ec9b0;
    }

    body[data-theme="dark"] .markdown-doc .code-hl-string,
    body[data-theme="dark"] .repo-file-preview-panel pre.repo-file-preview .code-hl-string {
      color: #c792ea;
    }

    body[data-theme="dark"] .markdown-doc .code-hl-keyword,
    body[data-theme="dark"] .repo-file-preview-panel pre.repo-file-preview .code-hl-keyword {
      color: #569cd6;
    }

    .markdown-doc .markdown-note {
      color: var(--muted);
      font-size: var(--text-sm);
      margin: -4px 0 12px;
    }

    .markdown-doc strong {
      color: var(--text);
      font-weight: 600;
    }

    .analytics-qna {
      display: grid;
      gap: 0;
    }

    .analytics-section-title {
      font-size: var(--text-sm);
      letter-spacing: .04em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .analytics-section-header {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 12px;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .analytics-section-header .analytics-section-title {
      margin: 0;
    }

    .analytics-query-section {
      margin-bottom: 14px;
    }

    .analytics-query-text {
      color: var(--text);
      font-size: var(--font-size-base);
      line-height: 1.55;
      margin: 0;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .analytics-record-body .markdown-doc {
      margin-top: 0;
    }

    .analytics-related-tasks {
      margin-top: 16px;
    }

    .analytics-related-tasks-list {
      display: grid;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .analytics-related-task-row {
      align-items: center;
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      padding: 10px 12px;
    }

    .analytics-related-task-btn {
      background: transparent;
      border: 0;
      color: var(--accent);
      cursor: pointer;
      font: inherit;
      padding: 0;
      text-align: left;
    }

    .analytics-related-task-btn:hover {
      text-decoration: underline;
    }

    .analytics-related-task-meta {
      color: var(--muted);
      font-size: var(--font-size-sm);
      white-space: nowrap;
    }

    .analytics-lineage-badge {
      color: var(--muted);
      font-size: var(--font-size-sm);
    }

    .issue-footer-left .wg-badge[data-testid="analytics-related-tasks-count"],
    .issue-footer-left .wg-badge[data-testid="architecture-block-tasks-count"],
    .issue-footer-left .wg-badge[data-testid="prompt-rule-validation-badge"],
    .issue-footer-left .wg-badge[data-testid="memory-record-status-badge"] {
      flex-shrink: 0;
      max-width: none;
      text-transform: uppercase;
    }

    .analytics-lineage-section {
      margin-top: 16px;
    }

    .analytics-lineage-list {
      display: grid;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .analytics-lineage-nav-btn {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--accent);
      cursor: pointer;
      display: block;
      font: inherit;
      padding: 10px 12px;
      text-align: left;
      width: 100%;
    }

    .analytics-lineage-nav-btn:hover {
      border-color: var(--accent);
    }

    .analytics-intent-options,
    .analytics-intent-decision,
    .intent-graph-drilldown {
      display: grid;
      gap: 8px;
    }

    .analytics-intent-option {
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px 10px;
      background: var(--panel-2);
    }

    .analytics-intent-option.is-selected {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .graph-workspace-stack .intent-roadmap-panel {
      background: var(--bg);
      border: 0;
      border-radius: 0;
      margin: 0;
      padding: 0;
    }

    .graph-workspace-canvas.intent-roadmap-canvas-wrap {
      margin: 0;
      overflow: hidden;
    }

    .intent-roadmap-panel {
      background: var(--bg);
      border: 0;
      border-radius: 0;
      margin: 0;
      padding: 0;
    }

    .intent-roadmap-branch + .intent-roadmap-branch {
      border-top: 1px solid var(--border);
      margin-top: 12px;
      padding-top: 12px;
    }

    .intent-roadmap-node {
      margin-left: 12px;
      padding-left: 10px;
      border-left: 2px solid var(--border);
    }

    .intent-roadmap-canvas-wrap {
      margin: 0;
      overflow: hidden;
    }

    .intent-roadmap-epic-panel {
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
      padding-bottom: 12px;
    }

    .intent-roadmap-epic-header {
      align-items: center;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 0 12px;
    }

    .intent-roadmap-epic-header h3 {
      font-size: var(--text-sm);
      font-weight: 600;
      margin: 0;
    }

    .intent-roadmap-epic-meta {
      align-items: center;
      color: var(--muted);
      display: flex;
      font-size: var(--text-xs);
      gap: 8px;
    }

    .intent-roadmap-epic-toggle {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
      font-size: var(--text-xs);
      padding: 4px 10px;
    }

    .intent-roadmap-epic-toggle:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .intent-roadmap-section-heading {
      color: var(--muted);
      font-size: var(--text-xs);
      letter-spacing: 0.06em;
      margin: 0 0 8px;
      padding: 0 12px;
      text-transform: uppercase;
    }

    .graph-canvas-lit-flow-host {
      width: 100%;
      min-height: 320px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      position: relative;
    }

    .graph-canvas-lit-flow-shell {
      width: 100%;
      height: 100%;
      background: var(--bg);
    }

    .graph-canvas-lit-flow-shell flow-controls {
      position: absolute;
      bottom: 12px;
      left: 12px;
      z-index: 4;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.28));
    }

    .graph-canvas-lit-flow-shell .graph-canvas-minimap-host {
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.28));
    }

    body[data-theme="dark"] .graph-canvas-lit-flow-shell .graph-canvas-minimap-host {
      filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.45));
    }

    .intent-roadmap-canvas {
      position: relative;
      min-height: 120px;
    }

    .intent-canvas-edges {
      position: absolute;
      inset: 0;
      color: var(--muted);
      pointer-events: none;
    }

    .intent-canvas-edge-labels {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .intent-canvas-edge-label {
      position: absolute;
      transform: translate(-50%, -100%);
      font-size: var(--font-size-sm, 14px);
      color: var(--muted);
      background: var(--panel);
      padding: 0 4px;
      white-space: nowrap;
    }

    .intent-canvas-node {
      position: absolute;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--card);
      box-shadow: var(--shadow-card);
      color: var(--text);
      cursor: pointer;
      padding: 8px 10px;
      text-align: left;
    }

    .intent-canvas-node:hover {
      border-color: var(--accent);
    }

    .intent-canvas-node .layer {
      color: var(--muted);
      font-size: var(--font-size-sm, 14px);
      letter-spacing: 0.02em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .intent-canvas-node strong {
      display: block;
      font-size: var(--text-sm);
      line-height: 1.25;
    }

    .intent-canvas-node .status {
      color: var(--muted);
      font-size: var(--font-size-sm, 14px);
      margin-top: 6px;
    }

    .intent-canvas-node.is-question {
      border-color: #6554c0;
    }

    .intent-canvas-node.is-analysis {
      border-color: #5e6c84;
    }

    .intent-canvas-edge.is-rejected {
      opacity: 0.45;
      stroke-dasharray: 5 4;
    }

    .intent-canvas-node.is-option.is-rejected {
      opacity: 0.72;
      border-style: dashed;
    }

    .intent-canvas-node.is-option.is-selected {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .intent-canvas-node.is-decision {
      border-color: #00875a;
    }

    .intent-canvas-node.is-work.is-done {
      border-color: #00875a;
    }

    .intent-roadmap-list-heading {
      color: var(--muted);
      font-size: var(--font-size-sm, 14px);
      font-weight: 600;
      letter-spacing: 0.04em;
      margin: 8px 0;
      text-transform: uppercase;
    }

    .markdown-mermaid-wrap {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 3px;
      margin: 0 0 14px;
      min-height: min-content;
      overflow-x: auto;
      overflow-y: visible;
      padding: 12px;
    }

    .markdown-mermaid-wrap .mermaid {
      background: transparent;
      color: var(--text);
      display: block;
      font-family: inherit;
      font-size: var(--text-sm);
      margin: 0;
      min-height: min-content;
      overflow: visible;
      white-space: pre-wrap;
    }

    .markdown-mermaid-wrap svg {
      display: block;
      height: auto !important;
      max-width: 100%;
      overflow: visible;
      width: 100%;
    }

    .markdown-mermaid-wrap svg .node rect,
    .markdown-mermaid-wrap svg .node polygon,
    .markdown-mermaid-wrap svg .node circle {
      fill: var(--panel-2) !important;
      stroke: var(--border) !important;
    }

    .markdown-mermaid-wrap svg .cluster rect {
      fill: var(--panel) !important;
      stroke: var(--border) !important;
    }

    .markdown-mermaid-wrap svg g.cluster-label text {
      text-anchor: start;
    }

    .markdown-mermaid-wrap svg g.cluster-label foreignObject {
      display: none;
    }

    .markdown-mermaid-wrap svg g.cluster-label text,
    .markdown-mermaid-wrap svg .cluster-label .nodeLabel,
    .markdown-mermaid-wrap svg .label text,
    .markdown-mermaid-wrap svg .edgeLabel {
      color: var(--text);
      fill: var(--text) !important;
    }

    .markdown-mermaid-wrap svg .edgePath .path,
    .markdown-mermaid-wrap svg .flowchart-link {
      stroke: var(--muted) !important;
    }

    .markdown-mermaid-wrap svg .marker {
      fill: var(--muted) !important;
      stroke: var(--muted) !important;
    }

    .detail-link-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--accent);
      cursor: pointer;
      font: inherit;
      padding: 6px 10px;
    }

    .detail-link-btn:hover {
      border-color: var(--accent);
    }

    .evidence-timeline-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .evidence-timeline-item {
      border-left: 2px solid var(--border);
      margin: 0 0 10px;
      padding: 0 0 0 12px;
    }

    .evidence-timeline-item time,
    .evidence-timeline-kind {
      color: var(--muted);
      display: block;
      font: var(--font-size-sm)/1.3 var(--mono);
    }

    .evidence-timeline-summary {
      color: var(--text);
      margin: 4px 0 0;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .pvrg-scope-panel ul {
      margin: 0;
      padding-left: 18px;
    }

    .pvrg-scope-panel li {
      color: var(--muted);
      margin: 2px 0;
      overflow-wrap: anywhere;
    }

    .pvrg-edge-rel {
      color: var(--accent);
      font: var(--font-size-sm)/1.2 inherit;
    }

    .pvrg-node-kind {
      color: var(--text);
      font: var(--font-size-sm)/1.2 var(--mono);
    }

    .linkage-drilldown-panel ul {
      margin: 0;
      padding-left: 0;
      list-style: none;
    }

    .linkage-drilldown-panel li {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 4px 0;
    }

    .linkage-ref-button {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--accent);
      cursor: pointer;
      font: inherit;
      padding: 4px 8px;
      text-align: left;
    }

    .linkage-ref-button:hover {
      border-color: var(--accent);
    }

    .linkage-ref-kind {
      color: var(--muted);
      font: var(--font-size-sm)/1.2 var(--mono);
      text-transform: uppercase;
    }

    .detail-back-row {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
    }

    .detail-back-button {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
      font: inherit;
      padding: 6px 10px;
    }

    .detail-back-button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .block-l2-wrap {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: auto;
      padding: 8px;
    }

    .block-l2-canvas {
      min-height: 180px;
      position: relative;
    }

    .block-l2-node {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-card);
      box-sizing: border-box;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-size: var(--text-base);
      overflow: hidden;
      padding: 8px 10px;
      position: absolute;
      text-align: left;
      z-index: 2;
    }

    .block-l2-node:hover,
    .block-l2-node:focus-visible {
      border-color: var(--accent);
      outline: none;
    }

    .block-l2-node.container {
      border-left: 3px solid var(--accent);
    }

    .block-l2-node.file {
      border-left: 3px solid var(--ok);
    }

    .block-l2-node .kind {
      color: var(--muted);
      font-size: var(--text-sm);
      letter-spacing: .04em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .block-l2-node strong {
      display: block;
      font-size: var(--text-base);
      margin-bottom: 2px;
    }

    .block-l2-node span {
      color: var(--muted);
      display: block;
      overflow-wrap: anywhere;
    }

    .block-l2-edges {
      inset: 0;
      pointer-events: none;
      position: absolute;
    }

    .block-l2-edge {
      fill: none;
      stroke: var(--muted);
      stroke-width: 1.25;
    }

    .block-l2-edge-label {
      fill: var(--text);
      font-size: var(--text-sm);
      paint-order: stroke fill;
      stroke: var(--panel-2);
      stroke-width: 4px;
      text-anchor: middle;
    }

    .view[hidden] {
      display: none !important;
    }

    .board-filter-select {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text);
      font-size: var(--font-size-sm);
      line-height: 1.2;
      max-width: 148px;
      padding: 3px 6px;
    }

    .board-filter-select:focus {
      border-color: var(--accent);
      outline: none;
    }

    .task-atom.is-highlighted,
    .architecture-block.is-highlighted {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    .architecture-block.is-peer-highlight {
      border-color: var(--ok);
    }

    .architecture-block-group-header {
      padding: 10px 14px 6px;
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
      border-top: 1px solid var(--border);
      margin-top: 4px;
    }

    .architecture-block-group-header:first-child {
      border-top: none;
      margin-top: 0;
    }

    html.is-sidebar-compact .sidebar {
      padding: 8px 0;
    }

    html.is-sidebar-compact .project-title {
      margin: 0 6px;
      padding: 8px 4px 10px;
      text-align: center;
    }

    html.is-sidebar-compact .project-logo-full {
      display: none;
    }

    html.is-sidebar-compact .project-logo-emblem {
      display: block;
    }

    html.is-sidebar-compact .sidebar-nav,
    html.is-sidebar-compact .sidebar-nav-advanced {
      grid-template-columns: 1fr;
      padding: 4px 6px 0;
    }

    html.is-sidebar-compact .sidebar-nav-advanced {
      margin-top: 4px;
      padding-top: 4px;
    }

    html.is-sidebar-compact .sidebar-footer {
      padding: 8px 6px 0;
    }

    html.is-sidebar-compact .nav-tab {
      gap: 0;
      justify-content: center;
      padding: 10px 8px;
    }

    html.is-sidebar-compact .nav-tab-label {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    @media (max-width: 900px) {
      .board.is-extended .column,
      .board.is-compact .column { min-width: 350px; }
      .board.is-extended .column { flex-basis: 350px; width: 350px; }
      .detail-drawer { width: 100vw; }
    }
    ${MISSION_CONTROL_CSS}
    ${UI_BUTTON_CSS}
    body:not([data-theme="dark"]) .wg-btn--secondary {
      background: var(--panel-2);
      color: var(--text);
      border-color: var(--border);
    }
    body:not([data-theme="dark"]) .wg-btn--secondary:hover:not(:disabled) {
      background: #ebecf0;
      color: var(--text);
      border-color: #c1c7d0;
    }
    body:not([data-theme="dark"]) .wg-btn--inverse {
      background: var(--panel);
      color: var(--text);
      border-color: var(--border);
    }
    ${UI_BADGE_CSS}
    ${UI_SELECT_CSS}
    ${UI_TABS_CSS}
    .toolbar .search,
    .toolbar .wg-select {
      box-sizing: border-box;
      height: 36px;
      min-height: 36px;
      border: 1px solid var(--border);
      border-radius: 3px;
      background-color: var(--panel-2);
      color: var(--text);
      font-size: var(--text-sm);
      line-height: 1.2;
    }
    .toolbar .search {
      flex: 0 1 280px;
      min-width: 180px;
      padding: 0 10px;
    }
    .toolbar .wg-select {
      padding: 0 28px 0 10px;
      appearance: none;
      -webkit-appearance: none;
      background-repeat: no-repeat;
      background-size: 12px 12px;
      background-position: right 8px center;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235e6c84' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E");
    }
    body[data-theme="dark"] .toolbar .wg-select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239d9d9d' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E");
    }
    .toolbar .search:hover,
    .toolbar .wg-select:hover {
      background-color: var(--panel);
    }
    .toolbar .search:focus,
    .toolbar .wg-select:focus {
      background-color: var(--panel);
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
      outline: none;
    }
    .column h2 .wg-badge { flex-shrink: 0; text-transform: none; }
    .code-gap-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .workflow-page-controls { align-items: center; display: flex; gap: 8px; }
    .architecture-view-shell {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    }

    #architecture-list-panel .backlog-list {
      flex: none;
      min-height: auto;
      overflow: visible;
    }

    .architecture-matrix-panel .architecture-matrix {
      min-height: 320px;
    }
    .architecture-matrix {
      border: 1px solid var(--border);
      border-radius: 8px;
      display: grid;
      gap: 1px;
      background: var(--border);
      overflow: auto;
    }
    .architecture-matrix-cell,
    .architecture-matrix-header,
    .architecture-matrix-row-label {
      background: var(--panel);
      font-size: var(--font-size-sm);
      min-height: 36px;
      padding: 8px 10px;
    }
    .architecture-matrix-header {
      color: var(--muted);
      font-weight: 600;
      text-align: center;
    }
    .architecture-matrix-row-label {
      font-weight: 600;
      white-space: nowrap;
    }
    .architecture-matrix-cell {
      text-align: center;
    }
    .architecture-matrix-cell.is-zero {
      color: var(--muted);
    }

    .architecture-matrix-panel .architecture-matrix {
      min-height: 320px;
    }

    .workflow-tree-node { display: block; }
    .workflow-tree-node .workflow-tree-row {
      padding-left: calc(12px + var(--tree-depth, 0) * 16px);
    }

    .workflow-tree-node .workflow-tree-row .list-row-inner {
      margin-left: calc(var(--tree-depth, 0) * -16px);
      padding-left: calc(var(--tree-depth, 0) * 16px);
    }
    .workflow-tree-toggle {
      font-size: var(--font-size-sm);
      min-width: 1.5em;
      text-align: center;
    }
    #workflow-display-mode { max-width: 140px; }
  </style>
</head>
<body>
  <div class="app-shell layout-root" id="layout-root">
    <aside class="sidebar" aria-label="Навигация Work Graph">
      <div class="project-title">
        <img
          class="project-logo project-logo-full"
          src="/assets/workgraph-logo.svg"
          height="24"
          width="146"
          alt="Work Graph"
          data-testid="workgraph-logo"
        >
        <img
          class="project-logo project-logo-emblem"
          src="/assets/workgraph-emblem.svg"
          height="22"
          width="38"
          alt="Work Graph"
          data-testid="workgraph-emblem"
        >
      </div>
      <nav class="sidebar-nav" aria-label="Канон Work Graph">
        ${shellNavAnalytics}
        ${shellNavWorkflow}
        ${shellNavBoard}
        ${shellNavVerification}
        ${shellNavMemory}
      </nav>
      <nav class="sidebar-nav sidebar-nav-advanced" aria-label="Дополнительно">
        ${shellNavArchitecture}
        ${shellNavPrompts}
      </nav>
      <div class="sidebar-footer">
        ${shellSettingsNav}
      </div>
      <div
        id="sidebar-resize-handle"
        class="sidebar-resize-handle"
        role="separator"
        tabindex="0"
        aria-orientation="vertical"
        aria-label="Изменить ширину боковой панели"
        aria-valuemin="56"
        aria-valuemax="360"
        data-testid="sidebar-resize-handle"
      ></div>
    </aside>
    <main class="content">
      <header class="page-header">
        <div class="page-header-main">
          <h1 id="view-title">${t('view.analytics')}</h1>
        </div>
        <div class="page-header-actions">
          ${shellHeaderThemeToggle}
        </div>
      </header>
      <div id="wg-page-loader" class="wg-page-loader is-visible" data-testid="wg-page-loader" aria-live="polite" aria-busy="true">
        <div class="wg-page-loader-panel" role="status">
          <div class="wg-page-loader-spinner" aria-hidden="true"></div>
          <p id="wg-page-loader-message" class="wg-page-loader-message">${t('loader.bootstrap')}</p>
        </div>
      </div>
      <section id="view-toolbar" class="toolbar" hidden>
        <input id="search" class="search" type="search" placeholder="${t('search.placeholder')}" autocomplete="off">
        ${shellSearchModeSelect}
        <div id="workflow-filters" class="workflow-filters" aria-label="Фильтры потока">
          ${shellCycleFilterSelect}
          ${shellIntentDomainFilterSelect}
          ${shellIntentDomainClear}
          ${shellWorkflowDisplayModeSelect}
        </div>
        ${shellBoardColumnModeSelect}
      </section>
      <section id="verification-view" class="view" aria-live="polite" hidden>
        <article id="verification-panel" class="verification-panel">
          <header class="verification-panel-header">
            <div>
              <h2>${t('verification.title')}</h2>
              <p>${t('verification.subtitle')}</p>
            </div>
            <div id="verification-tier-badges" class="verification-tier-badges"></div>
          </header>
          <div id="verification-matrix-wrap"></div>
          <div>
            <h3 style="font-size:14px;margin:0 0 6px">Контракт gate-задач <span id="verification-contract-count" class="badge">0</span></h3>
            <p class="empty" style="margin:0 0 8px">Projection work-item-contract.v1 и readiness (violations[]) для задач из VERIFICATION_MATRIX.</p>
            <div id="verification-contract-health" class="prompts-summary" data-testid="verification-contract-health"></div>
            <ul id="verification-contract-list" class="verification-evidence-list" data-testid="verification-contract-list"></ul>
          </div>
          <div>
            <h3 style="font-size:14px;margin:0 0 6px">Гейт codegen <span id="codegen-gate-count" class="badge">0</span></h3>
            <p class="empty" style="margin:0 0 8px">Успех или провал проверки codegen для WorkItems с меткой trace.codegen (целостность, roundtrip, bracket IR).</p>
            <div id="codegen-gate-summary" class="prompts-summary" data-testid="codegen-gate-summary"></div>
            <ul id="codegen-gate-list" class="verification-evidence-list" data-testid="codegen-gate-list"></ul>
          </div>
          <div>
            <h3 style="font-size:14px;margin:0 0 6px">Запуски воркера</h3>
            <ul id="verification-worker-runs" class="verification-evidence-list"></ul>
          </div>
          <div>
            <h3 style="font-size:14px;margin:0 0 6px">Журнал daemon <span id="daemon-audit-count" class="badge">0</span></h3>
            <p class="empty" style="margin:0 0 8px">Последние tick-события планировщика: observe → schedule → run → recovery → audit. Хвост JSONL только для чтения.</p>
            <ul id="daemon-audit-list" class="verification-evidence-list" data-testid="daemon-audit-list"></ul>
          </div>
          <div>
            <h3 style="font-size:14px;margin:0 0 6px">Недавние свидетельства</h3>
            <ul id="verification-evidence-list" class="verification-evidence-list"></ul>
          </div>
          <div>
            <h3 style="font-size:14px;margin:0 0 6px">Пробелы code↔step <span id="code-gap-count" class="badge">0</span></h3>
            <p class="empty" style="margin:0 0 8px">Здесь — предложения задач по расхождениям «код ↔ step». Сначала «Просмотр черновика», затем «Добавить в бэклог». Без вашего нажатия задачи не создаются.</p>
            <div id="code-gap-summary" class="prompts-summary" data-testid="code-gap-summary"></div>
            <ul id="code-gap-list" class="verification-evidence-list" data-testid="code-gap-list"></ul>
            <pre id="code-gap-intake-preview" class="code-gap-intake-preview" data-testid="code-gap-intake-preview" hidden></pre>
            <pre id="code-gap-intake-errors" class="code-gap-intake-errors" data-testid="code-gap-intake-errors" hidden></pre>
          </div>
        </article>
      </section>
      <section id="intent-view" class="view" aria-live="polite" hidden>
        <article id="intent-composer-panel" class="intent-composer-panel" data-testid="intent-composer-panel">
          <header class="intent-composer-panel-header">
            <div>
              <h2>Замысел</h2>
              <p>Опишите намерение естественным языком. Chat transcript ephemeral; в backlog попадает только WorkItem draft после explicit apply.</p>
            </div>
          </header>
          <div id="intent-composer-chat" class="intent-composer-chat" data-testid="intent-composer-chat">
            <div class="intent-composer-message is-system">Введите намерение и нажмите «Preview draft».</div>
          </div>
          <div class="intent-composer-input-row">
            <label for="intent-composer-input">Намерение</label>
            <textarea id="intent-composer-input" data-testid="intent-composer-input" placeholder="Например: добавить вкладку памяти с журналом записей"></textarea>
          </div>
          <div class="intent-composer-actions">
            ${shellIntentComposerActions}
          </div>
          <pre id="intent-composer-preview" class="intent-composer-preview" data-testid="intent-composer-preview" hidden></pre>
          <pre id="intent-composer-errors" class="intent-composer-errors" data-testid="intent-composer-errors" hidden></pre>
        </article>
      </section>
      <section id="prompts-view" class="view" aria-live="polite" hidden>
        <article id="prompts-panel" class="list-panel prompts-panel" data-testid="prompts-panel">
          <header class="list-panel-header">
            <h2>Правила промптов</h2>
            <span id="prompts-panel-count" class="count">0</span>
          </header>
          <div id="prompts-summary" class="prompts-summary" data-testid="prompts-summary" hidden></div>
          <div id="prompts-list" class="backlog-list list-rows" data-testid="prompts-list"></div>
          <footer id="prompts-pagination" class="workflow-pagination" aria-label="Страницы промптов" hidden></footer>
        </article>
      </section>
      <section id="memory-view" class="view" aria-live="polite" hidden>
        <article id="memory-panel" class="list-panel memory-panel" data-testid="memory-panel">
          <header class="list-panel-header">
            <h2>Записи памяти</h2>
            <span id="memory-panel-count" class="count">0</span>
          </header>
          <div id="memory-summary" class="memory-summary" data-testid="memory-summary" hidden></div>
          <div id="memory-list" class="backlog-list list-rows" data-testid="memory-list"></div>
          <footer id="memory-pagination" class="workflow-pagination" aria-label="Страницы памяти" hidden></footer>
        </article>
      </section>
      <section id="analytics-view" class="view" aria-live="polite" hidden>
        ${shellAnalyticsSubtabs}
        <article id="analytics-panel" class="list-panel analytics-panel" data-testid="analytics-panel">
          <header class="list-panel-header analytics-panel-header">
            <div class="analytics-panel-heading">
              <h2 id="analytics-panel-title">Аналитические разборы</h2>
              <span id="analytics-panel-count" class="count">0</span>
            </div>
            ${shellAnalyticsSortOptions}
          </header>
          <div id="analytics-summary" class="analytics-summary" data-testid="analytics-summary" hidden></div>
          <div id="analytics-list" class="backlog-list list-rows" data-testid="analytics-list"></div>
          <footer id="analytics-pagination" class="workflow-pagination" aria-label="Страницы аналитики" hidden></footer>
        </article>
      </section>
      <section id="architecture-view" class="view architecture-view-shell" aria-live="polite" hidden>
        <article id="architecture-list-panel" class="list-panel architecture-panel" data-testid="architecture-list-panel">
          <header class="list-panel-header architecture-panel-header">
            <div class="architecture-panel-heading">
              <h2>Блоки архитектуры</h2>
              <span id="architecture-panel-count" class="count">0</span>
            </div>
          </header>
          <div id="architecture-blocks-list" class="backlog-list list-rows" data-testid="architecture-blocks-list"></div>
        </article>
      </section>
      <section id="settings-view" class="view" aria-live="polite" hidden>
        <div class="settings-panel" data-testid="settings-panel">
          <article class="settings-section" aria-labelledby="settings-appearance-title">
            <h2 id="settings-appearance-title">${t('settings.appearance.title')}</h2>
            <div class="settings-row">
              <label for="settings-theme-light">${t('settings.appearance.theme')}</label>
              <div class="settings-theme-options" role="group" aria-label="${t('settings.appearance.theme')}">
                <button type="button" class="wg-btn wg-btn--secondary wg-btn--sm" id="settings-theme-light" data-settings-theme="light">${t('settings.appearance.themeLight')}</button>
                <button type="button" class="wg-btn wg-btn--secondary wg-btn--sm" id="settings-theme-dark" data-settings-theme="dark">${t('settings.appearance.themeDark')}</button>
              </div>
            </div>
            <div class="settings-row">
              <label for="settings-font-scale">${t('settings.appearance.fontSize')}</label>
              <div class="settings-font-scale" data-testid="settings-font-scale-control">
                <span id="settings-font-scale-value" class="settings-font-scale-value" aria-live="polite">${t('settings.appearance.fontSizeNormal')}</span>
                <input type="range" min="0" max="3" step="1" value="1" class="settings-font-scale-slider" id="settings-font-scale" data-testid="settings-font-scale-slider" aria-describedby="settings-font-scale-value" aria-label="${t('settings.appearance.fontSize')}">
                <div class="settings-font-scale-ticks" aria-hidden="true">
                  <span>${t('settings.appearance.fontSizeSmall')}</span>
                  <span>${t('settings.appearance.fontSizeNormal')}</span>
                  <span>${t('settings.appearance.fontSizeLarge')}</span>
                  <span>${t('settings.appearance.fontSizeXLarge')}</span>
                </div>
              </div>
            </div>
          </article>
          <article class="settings-section" aria-labelledby="settings-language-title">
            <h2 id="settings-language-title">${t('settings.language.title')}</h2>
            <div class="settings-row">
              <span id="settings-language-label">${t('settings.language.label')}</span>
              <div class="settings-locale-options" role="group" aria-labelledby="settings-language-label" data-testid="settings-locale-options">
                ${shellSettingsLocaleOptions}
              </div>
            </div>
          </article>
          <article class="settings-section" aria-labelledby="settings-git-snapshot-title">
            <h2 id="settings-git-snapshot-title">${t('settings.gitSnapshot.title')}</h2>
            <p class="settings-git-snapshot-note">${t('settings.gitSnapshot.noPushNote')}</p>
            <div class="settings-row">
              <label for="settings-git-snapshot-enabled">${t('settings.gitSnapshot.enabled')}</label>
              <input type="checkbox" id="settings-git-snapshot-enabled" data-testid="settings-git-snapshot-enabled">
            </div>
            <div class="settings-row">
              <label for="settings-git-snapshot-record-sha">${t('settings.gitSnapshot.recordSha')}</label>
              <input type="checkbox" id="settings-git-snapshot-record-sha" data-testid="settings-git-snapshot-record-sha">
            </div>
            <fieldset class="settings-row settings-git-snapshot-events">
              <legend>${t('settings.gitSnapshot.events')}</legend>
              <label><input type="checkbox" value="work_item.done" data-settings-git-event> done</label>
              <label><input type="checkbox" value="work_item.status" data-settings-git-event> status</label>
              <label><input type="checkbox" value="work_item.created" data-settings-git-event> created</label>
              <label><input type="checkbox" value="analytics.created" data-settings-git-event> analytics</label>
            </fieldset>
            <p id="settings-git-snapshot-status" class="settings-update-status" data-testid="settings-git-snapshot-status" hidden></p>
          </article>
          <article class="settings-section" aria-labelledby="settings-about-title">
            <h2 id="settings-about-title">${t('settings.about.title')}</h2>
            <div class="settings-row">
              <label>${t('settings.about.version')}</label>
              <span id="settings-version-value" class="settings-version-value" data-testid="settings-version-value">—</span>
            </div>
            <div class="settings-row">
              <div class="settings-about-actions">
                <button type="button" class="wg-btn wg-btn--secondary wg-btn--sm" id="settings-check-update" data-testid="settings-check-update">${t('settings.about.checkUpdate')}</button>
                <button type="button" class="wg-btn wg-btn--primary wg-btn--sm" id="settings-install-update" data-testid="settings-install-update" hidden>${t('settings.about.installUpdate')}</button>
              </div>
            </div>
            <p id="settings-update-status" class="settings-update-status" data-testid="settings-update-status" hidden></p>
            <div id="settings-install-command" class="settings-install-command-wrap" data-testid="settings-install-command" hidden>
              <p class="settings-install-command-hint">${t('settings.about.installHint')}</p>
              <div class="settings-install-code">
                <code id="settings-install-command-text" class="settings-install-command-text" data-testid="settings-install-command-text"></code>
                <button type="button" class="settings-install-copy-btn" id="settings-install-copy-btn" data-testid="settings-install-copy-btn" aria-label="${t('settings.about.copy')}" title="${t('settings.about.copy')}">
                  ${renderInlineIcon('copy-bold.svg', { className: 'settings-install-copy-icon', size: 18 })}
                  <span class="settings-install-copy-btn-text">${t('settings.about.copy')}</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
      <section id="board-view" class="view" aria-live="polite" hidden>
        <div class="board-columns-scroll" data-testid="board-columns-scroll">
          <div id="board" class="board" data-testid="kanban-board-panel" aria-label="Board columns"></div>
        </div>
      </section>
      <section id="workflow-view" class="view" aria-live="polite" hidden>
        ${shellWorkflowSubtabs}
        <article id="workflow-backlog-panel" class="list-panel backlog-panel workflow-panel" role="tabpanel" aria-labelledby="workflow-tab-backlog">
          <header class="list-panel-header backlog-panel-header">
            <h2>${t('workflow.panel.backlog')}</h2>
            <span id="backlog-panel-count" class="count">0</span>
          </header>
          <div id="backlog-list" class="backlog-list list-rows"></div>
          <footer id="backlog-pagination" class="workflow-pagination" aria-label="Страницы backlog" hidden></footer>
        </article>
        <article id="workflow-archive-panel" class="list-panel backlog-panel workflow-panel" role="tabpanel" aria-labelledby="workflow-tab-archive" hidden>
          <header class="list-panel-header backlog-panel-header">
            <h2>${t('workflow.panel.archive')}</h2>
            <span id="archive-panel-count" class="count">0</span>
          </header>
          <div id="archive-list" class="backlog-list list-rows"></div>
          <footer id="archive-pagination" class="workflow-pagination" aria-label="Страницы архива" hidden></footer>
        </article>
      </section>
    </main>
  </div>
  <div id="detail-overlay" class="detail-overlay" hidden aria-hidden="true"></div>
  <aside id="detail-drawer" class="detail-drawer" aria-label="Подробности задачи" aria-hidden="true">
    <div id="detail-resize-handle" class="detail-resize-handle" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Изменить ширину панели"></div>
    <header class="detail-header">
      <div>
        <h2 id="detail-title">Задача</h2>
        <div id="detail-id" class="id"></div>
      </div>
      ${shellDetailClose}
    </header>
    <div id="detail-body" class="detail-body"></div>
  </aside>
  <div id="detail-sub-overlay" class="detail-overlay detail-sub-overlay" hidden aria-hidden="true"></div>
  <aside id="detail-sub-drawer" class="detail-drawer detail-sub-drawer" aria-label="Описание узла L2" aria-hidden="true">
    <div id="detail-sub-resize-handle" class="detail-resize-handle" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Изменить ширину панели L2"></div>
    <header class="detail-header">
      <div>
        <h2 id="detail-sub-title">Узел L2</h2>
        <div id="detail-sub-id" class="id"></div>
      </div>
      ${shellDetailSubClose}
    </header>
    <div id="detail-sub-body" class="detail-body"></div>
  </aside>
  <aside id="agent-run-dock" class="agent-run-dock" data-testid="agent-run-dock" aria-label="Панель запуска агента">
    <header class="agent-dock-header">
      <strong id="agent-run-dock-title">Запуск агента</strong>
      ${shellAgentDockClose}
    </header>
    <section id="agent-scope-panel" class="agent-scope-panel" data-testid="agent-scope-panel" aria-label="Scope эпика (read-only)">
      <div class="agent-scope-panel-header">Scope (read-only)</div>
      <div data-testid="agent-scope-summary"></div>
      <ul class="agent-scope-list" data-testid="agent-scope-list"></ul>
    </section>
    <div class="agent-dock-log-label">Журнал запуска</div>
    <div id="agent-run-dock-body" class="agent-dock-body"></div>
    <footer class="agent-dock-footer">
      ${shellAgentRunFooter}
    </footer>
  </aside>
  <div id="wg-notice-stack" class="wg-notice-stack" data-testid="wg-notice-stack" role="status" aria-live="polite" aria-atomic="true"></div>
  <div id="cmd-k-overlay" data-testid="cmd-k-overlay" aria-hidden="true">
    <div id="cmd-k-panel" role="dialog" aria-label="Палитра команд">
      <input id="cmd-k-input" type="search" placeholder="task: / an: / cmd: / run:" autocomplete="off">
      <div id="cmd-k-results"></div>
    </div>
  </div>
  <script src="/vendor/mermaid.min.js"></script>
  <script src="/assets/graph-canvas-lit-flow.js" defer></script>
  <script id="workgraph-app">
    ${uiButtonClientSource}
    ${uiBadgeClientSource}
    ${workItemStatusToneSource}
    ${kanbanBoardDeltaSource}
    ${kanbanBoardPatcherSource}
    ${userAvatarsSource}
    ${workItemIssueTypeSource}
    ${promptRuleRowBadgeSource}
    ${memoryRecordRowBadgeSource}
    ${workItemClassifierSource}
    ${detailDrawerStackSource}
    ${liveSyncCoordinatorSource}
    ${analyticsRecordSortSource}
    ${liveSyncSseAdapterSource}
    const detailStack = createDetailDrawerStack();
    const BVC_DIALECT_SECTION_TITLES = ${JSON.stringify(bvcDialectSectionTitles)};
    function resolveAtomInspectorLang(draft) {
      const fromDraft = String(draft?.lang ?? '').trim().toLowerCase();
      if (fromDraft === 'en' || fromDraft === 'ru') return fromDraft;
      const fromLabels = String(draft?.labels?.lang ?? '').trim().toLowerCase();
      if (fromLabels === 'en' || fromLabels === 'ru') return fromLabels;
      return 'ru';
    }
    function atomSectionTitle(lang, field) {
      const dialect = BVC_DIALECT_SECTION_TITLES[lang] || BVC_DIALECT_SECTION_TITLES.ru;
      return dialect[field] || field;
    }
    const statusGroups = ${JSON.stringify(STATUS_GROUPS)};
    const operationalBoardGroups = ${JSON.stringify(OPERATIONAL_BOARD_GROUPS)};
    const boardExtendedColumnGroups = ${JSON.stringify(BOARD_EXTENDED_COLUMN_GROUPS)};
    const boardCompactColumnGroups = ${JSON.stringify(BOARD_COMPACT_COLUMN_GROUPS)};
    const doneArchiveGroup = ${JSON.stringify(DONE_ARCHIVE_GROUP)};
    const doneArchiveCap = ${DEFAULT_DONE_ARCHIVE_CAP};
    const workflowPageSize = doneArchiveCap;
    const kanbanColumnPageSize = 10;
    const backlogGroup = ${JSON.stringify(BACKLOG_GROUP)};
    const workItemStatusOptions = ${JSON.stringify(workItemStatusOptions())};
    const schematicModelFull = ${JSON.stringify(schematicModelFull)};
    const schematicModelPipeline = ${JSON.stringify(schematicModelPipeline)};
    let schematicModel = schematicModelFull;
    ${architectureLayoutSource}
    ${graphCanvasProjectionSource}
    ${markdownDocumentRenderSource}
    ${pipelineProseRenderSource}
    ${workflowEpicGroupingSource}
    ${architectureViewsProjectionSource}
    ${workflowTreeProjectionSource}
    ${missionControlClientSource}
    const themeStorageKey = 'workGraphBacklogTheme';
    const fontScaleStorageKey = 'workGraphFontScale';
    const fontScaleModes = ['font-s', 'font-m', 'font-l', 'font-xl'];
    const fontScaleValues = { 'font-s': '0.875', 'font-m': '1', 'font-l': '1.125', 'font-xl': '1.25' };
    const i18nBootstrap = ${i18nBootstrapScript};
    window.__WG_LOCALE__ = i18nBootstrap.locale;
    window.__WG_I18N__ = i18nBootstrap.messages;
    function t(key, params) {
      let text = (window.__WG_I18N__ && window.__WG_I18N__[key]) || key;
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          text = text.split('{' + paramKey + '}').join(String(paramValue));
        }
      }
      return text;
    }
    const fontScaleLabels = {
      'font-s': t('settings.appearance.fontSizeSmall'),
      'font-m': t('settings.appearance.fontSizeNormal'),
      'font-l': t('settings.appearance.fontSizeLarge'),
      'font-xl': t('settings.appearance.fontSizeXLarge'),
    };
    function localizedKanbanColumnTitle(columnId, fallback) {
      const key = 'kanban.col.' + columnId;
      const value = t(key);
      return value === key ? (fallback || columnId) : value;
    }
    function localizedBoardGroupTitle(groupId, fallback) {
      const key = 'board.group.' + groupId;
      const value = t(key);
      return value === key ? (fallback || groupId) : value;
    }
    const THEME_ICON_MOON = ${JSON.stringify(themeIconMoonHtml)};
    const THEME_ICON_SUN = ${JSON.stringify(themeIconSunHtml)};
    const viewStorageKey = 'workGraphBacklogView';
    const workflowTabStorageKey = 'workGraphWorkflowTab';
    const analyticsTabStorageKey = 'workGraphAnalyticsTab';
    const analyticsSortStorageKey = 'workGraphAnalyticsSort';
    const backlogPageStorageKey = 'workGraphBacklogPage';
    const archivePageStorageKey = 'workGraphArchivePage';
    const promptsPageStorageKey = 'workGraphPromptsPage';
    const memoryPageStorageKey = 'workGraphMemoryPage';
    const analyticsPageStorageKey = 'workGraphAnalyticsPage';
    const cycleFilterStorageKey = 'workGraphCycleFilter';
    const intentDomainFilterStorageKey = 'workGraphIntentDomainFilter';
    const detailDrawerWidthStorageKey = 'workGraphDetailDrawerWidth';
    const detailSubDrawerWidthStorageKey = 'workGraphDetailSubDrawerWidth';
    const sidebarWidthStorageKey = 'workGraphSidebarWidth';
    const dismissedUpdateNoticeStorageKey = 'wg_dismissed_update_notice';
    const appVersionCheckDelayMs = 5000;
    const appVersionPollMs = 6 * 60 * 60 * 1000;
    const SIDEBAR_WIDTH_MIN = 56;
    const SIDEBAR_WIDTH_MAX = 360;
    const SIDEBAR_WIDTH_DEFAULT = 252;
    const SIDEBAR_COMPACT_UI_MAX = 80;
    const graphCanvasModeStorageKey = 'workGraphGraphCanvasMode';
    const workflowDisplayModeStorageKey = 'workGraphWorkflowDisplayMode';
    const boardColumnModeStorageKey = 'workGraphBoardColumnMode';
    const collapsedWorkflowTreeIdsStorageKey = 'workGraphWorkflowTreeCollapsed.v1';
    localStorage.removeItem('workGraphArchitectureMatrixFilter');

    let graphCanvasViewMode = localStorage.getItem(graphCanvasModeStorageKey) === 'full' ? 'full' : 'pipeline';
    let backlogRevision = null;
    const liveSyncViews = new Set(['board', 'workflow']);
    const liveSyncIntervalMs = 3000;
    let snapshot = null;
    let architectureSnapshot = null;
    let architectureLoaded = false;
    let architectureLoadError = null;
    let dashboardSnapshot = null;
    let operatorShellSnapshot = null;
    let focusedBlockId = null;
    let highlightTaskId = null;
    let intentDomainFilter = localStorage.getItem(intentDomainFilterStorageKey) || '';
    let cycleFilter = localStorage.getItem(cycleFilterStorageKey) || 'all';
    let detailContext = null;
    let detailInspectorState = { workId: null, draft: null, mode: 'view' };
    let promptsProjection = null;
    let promptsPanelLoaded = false;
    let selectedPromptRuleId = null;
    let codeGapProjection = null;
    let codeGapPanelLoaded = false;
    let daemonAuditTail = null;
    let daemonAuditPanelLoaded = false;
    let codeGapIntakeProposal = null;
    let codeGapIntakeActiveId = null;
    let intentComposerProposal = null;
    let intentComposerMessages = [];
    let memoryProjection = null;
    let memoryPanelLoaded = false;
    let selectedMemoryRecordId = null;
    let analyticsProjection = null;
    let analyticsPanelLoaded = false;
    let selectedAnalyticsRecordId = null;
    let intentRoadmapProjection = null;
    let epicRoadmapProjection = null;
    let intentRoadmapLoaded = false;
    const collapsedEpicIdsStorageKey = 'workgraph.intentRoadmap.collapsedEpics.v1';
    let collapsedEpicIds = new Set(JSON.parse(localStorage.getItem(collapsedEpicIdsStorageKey) || '[]'));
    let semanticSearchWorkIds = null;
    let semanticSearchTimer = null;
    let homeSnapshot = null;
    let cmdKRows = [];
    let cmdKActiveIndex = 0;
    let lastAgentRunTaskId = null;
    const agentScopePollMs = 20000;
    const ownerRoleStorageKey = 'workGraphOwnerRoleFilter';
    const agentDockOpenStorageKey = 'workGraphAgentDockOpen';
    let activeView = readStoredView();
    let activeWorkflowTab = readStoredWorkflowTab();
    let activeAnalyticsTab = readStoredAnalyticsTab();
    let activeAnalyticsSort = readStoredAnalyticsSort();
    let workflowDisplayMode = readStoredWorkflowDisplayMode();
    let boardColumnMode = readStoredBoardColumnMode();
    let collapsedWorkflowTreeIds = new Set(JSON.parse(localStorage.getItem(collapsedWorkflowTreeIdsStorageKey) || '[]'));
    let backlogPage = Math.max(1, Number(localStorage.getItem(backlogPageStorageKey)) || 1);
    let archivePage = Math.max(1, Number(localStorage.getItem(archivePageStorageKey)) || 1);
    let promptsPage = Math.max(1, Number(localStorage.getItem(promptsPageStorageKey)) || 1);
    let memoryPage = Math.max(1, Number(localStorage.getItem(memoryPageStorageKey)) || 1);
    let analyticsPage = Math.max(1, Number(localStorage.getItem(analyticsPageStorageKey)) || 1);
    let kanbanColumnVisibleCounts = Object.create(null);
    let kanbanColumnObserver = null;

    const architecturePanelCount = document.querySelector('#architecture-panel-count');
    const architectureView = document.querySelector('#architecture-view');
    const architectureBlocksList = document.querySelector('#architecture-blocks-list');
    const workflowDisplayModeSelect = document.querySelector('#workflow-display-mode');
    const boardColumnModeSelect = document.querySelector('#board-column-mode');
    const intentGraphView = document.querySelector('#intent-graph-view');
    const intentRoadmapBody = document.querySelector('#intent-roadmap-body');
    const contentRoot = document.querySelector('.content');
    const wgPageLoader = document.querySelector('#wg-page-loader');
    const wgPageLoaderMessage = document.querySelector('#wg-page-loader-message');
    let pageLoaderDepth = 0;
    const schematicCanvas = document.querySelector('#schematic-canvas');
    const schematicPanelCount = document.querySelector('#schematic-panel-count');
    const schematicView = document.querySelector('#schematic-view');

    const archiveList = document.querySelector('#archive-list');
    const archivePanelCount = document.querySelector('#archive-panel-count');
    const archivePagination = document.querySelector('#archive-pagination');
    const workflowArchivePanel = document.querySelector('#workflow-archive-panel');
    const workflowBacklogPanel = document.querySelector('#workflow-backlog-panel');
    const workflowArchiveTabCount = document.querySelector('#workflow-archive-tab-count');
    const workflowBacklogTabCount = document.querySelector('#workflow-backlog-tab-count');
    const workflowSubtabs = [...document.querySelectorAll('[data-workflow-tab]')];
    const workflowView = document.querySelector('#workflow-view');
    const board = document.querySelector('#board');
    const boardView = document.querySelector('#board-view');
    const layoutRoot = document.querySelector('#layout-root');
    const agentRunDock = document.querySelector('#agent-run-dock');
    const agentRunDockBody = document.querySelector('#agent-run-dock-body');
    const agentScopePanel = document.querySelector('#agent-scope-panel');
    const agentRunDockClose = document.querySelector('#agent-run-dock-close');
    const agentRunRetry = document.querySelector('#agent-run-retry');
    const agentRunOpenTask = document.querySelector('#agent-run-open-task');
    const cmdKOverlay = document.querySelector('#cmd-k-overlay');
    const cmdKInput = document.querySelector('#cmd-k-input');
    const cmdKResults = document.querySelector('#cmd-k-results');
    const workflowFilters = document.querySelector('#workflow-filters');
    const viewToolbar = document.querySelector('#view-toolbar');
    const backlogList = document.querySelector('#backlog-list');
    const backlogPagination = document.querySelector('#backlog-pagination');
    const promptsPagination = document.querySelector('#prompts-pagination');
    const memoryPagination = document.querySelector('#memory-pagination');
    const analyticsPagination = document.querySelector('#analytics-pagination');
    const backlogPanelCount = document.querySelector('#backlog-panel-count');
    const detailBody = document.querySelector('#detail-body');
    const detailClose = document.querySelector('#detail-close');
    const detailDrawer = document.querySelector('#detail-drawer');
    const detailId = document.querySelector('#detail-id');
    const detailOverlay = document.querySelector('#detail-overlay');
    const detailSubBody = document.querySelector('#detail-sub-body');
    const detailSubClose = document.querySelector('#detail-sub-close');
    const detailSubDrawer = document.querySelector('#detail-sub-drawer');
    const detailSubId = document.querySelector('#detail-sub-id');
    const detailSubOverlay = document.querySelector('#detail-sub-overlay');
    const detailSubTitle = document.querySelector('#detail-sub-title');
    const detailResizeHandle = document.querySelector('#detail-resize-handle');
    const detailSubResizeHandle = document.querySelector('#detail-sub-resize-handle');
    const sidebarResizeHandle = document.querySelector('#sidebar-resize-handle');
    const detailTitle = document.querySelector('#detail-title');
    const navTabs = [...document.querySelectorAll('.nav-tab[data-view]')];
    const search = document.querySelector('#search');
    const searchMode = document.querySelector('#search-mode');
    const themeToggle = document.querySelector('#theme-toggle');
    const verificationEvidenceList = document.querySelector('#verification-evidence-list');
    const verificationWorkerRuns = document.querySelector('#verification-worker-runs');
    const daemonAuditList = document.querySelector('#daemon-audit-list');
    const daemonAuditCount = document.querySelector('#daemon-audit-count');
    const verificationMatrixWrap = document.querySelector('#verification-matrix-wrap');
    const verificationContractCount = document.querySelector('#verification-contract-count');
    const verificationContractHealth = document.querySelector('#verification-contract-health');
    const verificationContractList = document.querySelector('#verification-contract-list');
    const codegenGateList = document.querySelector('#codegen-gate-list');
    const codegenGateSummary = document.querySelector('#codegen-gate-summary');
    const codegenGateCount = document.querySelector('#codegen-gate-count');
    const verificationTierBadges = document.querySelector('#verification-tier-badges');
    const verificationView = document.querySelector('#verification-view');
    const settingsView = document.querySelector('#settings-view');
    const settingsThemeLight = document.querySelector('#settings-theme-light');
    const settingsThemeDark = document.querySelector('#settings-theme-dark');
    const settingsFontScale = document.querySelector('#settings-font-scale');
    const settingsFontScaleValue = document.querySelector('#settings-font-scale-value');
    const settingsLocaleButtons = [...document.querySelectorAll('[data-settings-locale]')];
    const settingsVersionValue = document.querySelector('#settings-version-value');
    const settingsCheckUpdate = document.querySelector('#settings-check-update');
    const settingsInstallUpdate = document.querySelector('#settings-install-update');
    const settingsUpdateStatus = document.querySelector('#settings-update-status');
    const settingsInstallCommand = document.querySelector('#settings-install-command');
    const settingsInstallCommandText = document.querySelector('#settings-install-command-text');
    const settingsInstallCopyBtn = document.querySelector('#settings-install-copy-btn');
    const settingsGitSnapshotEnabled = document.querySelector('#settings-git-snapshot-enabled');
    const settingsGitSnapshotRecordSha = document.querySelector('#settings-git-snapshot-record-sha');
    const settingsGitSnapshotEvents = [...document.querySelectorAll('[data-settings-git-event]')];
    const settingsGitSnapshotStatus = document.querySelector('#settings-git-snapshot-status');
    const wgNoticeStack = document.querySelector('#wg-notice-stack');
    const codeGapSummary = document.querySelector('#code-gap-summary');
    const codeGapList = document.querySelector('#code-gap-list');
    const codeGapCount = document.querySelector('#code-gap-count');
    const codeGapIntakePreview = document.querySelector('#code-gap-intake-preview');
    const codeGapIntakeErrors = document.querySelector('#code-gap-intake-errors');
    const promptsView = document.querySelector('#prompts-view');
    const promptsList = document.querySelector('#prompts-list');
    const promptsSummary = document.querySelector('#prompts-summary');
    const promptsPanelCount = document.querySelector('#prompts-panel-count');
    const intentView = document.querySelector('#intent-view');
    const intentComposerChat = document.querySelector('#intent-composer-chat');
    const intentComposerInput = document.querySelector('#intent-composer-input');
    const intentComposerPreview = document.querySelector('#intent-composer-preview');
    const intentComposerErrors = document.querySelector('#intent-composer-errors');
    const intentComposerPanel = document.querySelector('#intent-composer-panel');
    const memoryView = document.querySelector('#memory-view');
    const memoryList = document.querySelector('#memory-list');
    const memorySummary = document.querySelector('#memory-summary');
    const memoryPanelCount = document.querySelector('#memory-panel-count');
    const analyticsView = document.querySelector('#analytics-view');
    const analyticsList = document.querySelector('#analytics-list');
    const analyticsSummary = document.querySelector('#analytics-summary');
    const analyticsPanelCount = document.querySelector('#analytics-panel-count');
    const analyticsPanelTitle = document.querySelector('#analytics-panel-title');
    const analyticsIntakeTabCount = document.querySelector('#analytics-intake-tab-count');
    const analyticsClosingTabCount = document.querySelector('#analytics-closing-tab-count');
    const analyticsSubtabs = [...document.querySelectorAll('[data-analytics-tab]')];
    const analyticsSortButtons = [...document.querySelectorAll('[data-analytics-sort]')];
    const viewTitle = document.querySelector('#view-title');
    const cycleFilterSelect = document.querySelector('#cycle-filter');
    const intentDomainFilterSelect = document.querySelector('#intent-domain-filter');
    const intentDomainClear = document.querySelector('#intent-domain-clear');

    applyTheme(readStoredTheme());
    applyFontScale(readStoredFontScale());
    applyStoredSidebarWidth();
    applyStoredDetailDrawerWidth();
    applyStoredDetailSubDrawerWidth();

    const liveSync = createLiveSyncCoordinator({
      tickMs: 1000,
      isDocumentHidden: () => document.hidden,
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (id) => window.clearTimeout(id),
    });
    liveSync.registerScope('backlog-revision', {
      intervalMs: liveSyncIntervalMs,
      enabled: () => liveSyncViews.has(activeView),
      onTick: () => { pollBacklogRevision().catch(() => undefined); },
    });
    liveSync.registerScope('home', {
      intervalMs: 30000,
      enabled: () => true,
      onTick: () => { refreshHomeSnapshot().catch(() => undefined); },
    });
    liveSync.registerScope('agent-dock', {
      intervalMs: 5000,
      enabled: () => agentRunDock?.classList.contains('is-open'),
      onTick: () => { refreshAgentRunDock().catch(() => undefined); },
    });
    liveSync.registerScope('agent-scope', {
      intervalMs: agentScopePollMs,
      enabled: () => agentRunDock?.classList.contains('is-open'),
      onTick: () => { refreshAgentScopePanel().catch(() => undefined); },
    });
    liveSync.registerScope('app-version', {
      intervalMs: appVersionPollMs,
      enabled: () => true,
      onTick: () => { checkAppVersionAndMaybeNotify().catch(() => undefined); },
    });
    document.addEventListener('visibilitychange', () => liveSync.sync());
    connectLiveSyncRevisionSse(liveSync);

    applyView(activeView);
    applyWorkflowTab(activeWorkflowTab);
    applyAnalyticsTab(activeAnalyticsTab);
    applyAnalyticsSortUi(activeAnalyticsSort);
    if (workflowDisplayModeSelect) {
      workflowDisplayModeSelect.value = workflowDisplayMode;
    }
    if (boardColumnModeSelect) {
      boardColumnModeSelect.value = boardColumnMode;
    }
    initMissionControlUi();
    liveSync.forceTick('home');
    window.setTimeout(() => {
      checkAppVersionAndMaybeNotify().catch(() => undefined);
    }, appVersionCheckDelayMs);

    function setPageLoaderMessage(message) {
      if (wgPageLoaderMessage && message) {
        wgPageLoaderMessage.textContent = message;
      }
    }

    function showPageLoader(message) {
      pageLoaderDepth += 1;
      if (message) {
        setPageLoaderMessage(message);
      }
      if (wgPageLoader) {
        wgPageLoader.classList.add('is-visible');
        wgPageLoader.setAttribute('aria-busy', 'true');
      }
    }

    function hidePageLoader() {
      pageLoaderDepth = Math.max(0, pageLoaderDepth - 1);
      if (pageLoaderDepth === 0 && wgPageLoader) {
        wgPageLoader.classList.remove('is-visible');
        wgPageLoader.setAttribute('aria-busy', 'false');
      }
    }

    function runWithPageLoader(task, message) {
      showPageLoader(message || t('loader.default'));
      return Promise.resolve().then(task).finally(() => hidePageLoader());
    }

    function isLazyViewPending(view) {
      if (view === 'prompts') return !promptsPanelLoaded;
      if (view === 'verification') return !codeGapPanelLoaded || !daemonAuditPanelLoaded;
      if (view === 'memory') return !memoryPanelLoaded;
      if (view === 'analytics') return !analyticsPanelLoaded;
      if (view === 'architecture') return !architectureLoaded;
      return false;
    }

    function loadActiveViewData(view) {
      return ensureLazyViewData(view).then(() => {
        if (view === 'architecture') {
          renderArchitecturePanels();
        }
        render();
      }).catch(() => {
        if (view === 'architecture') {
          renderArchitecturePanels();
        }
        render();
      });
    }

    function refreshActiveViewData(view) {
      const work = loadActiveViewData(view);
      if (isLazyViewPending(view)) {
        return runWithPageLoader(() => work, t('loader.view'));
      }
      return work;
    }

    showPageLoader(t('loader.bootstrap'));

    fetch('/api/snapshot')
      .then((response) => {
        if (!response.ok) throw new Error('запрос snapshot завершился с кодом ' + response.status);
        return response.json();
      })
      .then((data) => {
        snapshot = data;
        return fetch('/api/dashboard-snapshot').then((response) => {
          if (!response.ok) throw new Error('запрос dashboard snapshot завершился с кодом ' + response.status);
          return response.json();
        });
      })
      .then((data) => {
        dashboardSnapshot = data;
        return fetch('/api/operator-shell-snapshot').then((response) => {
          if (!response.ok) throw new Error('запрос operator shell snapshot завершился с кодом ' + response.status);
          return response.json();
        });
      })
      .then((data) => {
        operatorShellSnapshot = data;
        populateCycleFilterOptions();
        return fetch('/api/backlog-revision').then((response) => {
          if (!response.ok) return null;
          return response.json();
        }).catch(() => null);
      })
      .then((revisionPayload) => {
        if (revisionPayload?.revision) {
          backlogRevision = revisionPayload.revision;
        }
        return refreshHomeSnapshot().catch(() => undefined).then(() => loadActiveViewData(activeView));
      })
      .catch((error) => {
        const message = '<div class="error">Не удалось загрузить срез backlog: ' + escapeHtml(error.message) + '</div>';
        board.innerHTML = message;
        backlogList.innerHTML = message;
        verificationMatrixWrap.innerHTML = message;
        verificationEvidenceList.innerHTML = '';
        verificationTierBadges.innerHTML = '';
      })
      .finally(() => hidePageLoader());

    search.addEventListener('input', () => {
      resetListPages();
      scheduleSemanticSearchRefresh();
      render();
    });
    if (searchMode) {
      searchMode.addEventListener('change', () => {
        resetListPages();
        scheduleSemanticSearchRefresh();
        render();
      });
    }
    cycleFilterSelect.addEventListener('change', () => {
      cycleFilter = cycleFilterSelect.value;
      localStorage.setItem(cycleFilterStorageKey, cycleFilter);
      resetListPages();
      render();
    });
    intentDomainFilterSelect.addEventListener('change', () => {
      intentDomainFilter = intentDomainFilterSelect.value;
      if (intentDomainFilter) localStorage.setItem(intentDomainFilterStorageKey, intentDomainFilter);
      else localStorage.removeItem(intentDomainFilterStorageKey);
      resetListPages();
      render();
    });
    intentDomainClear.addEventListener('click', () => {
      intentDomainFilter = '';
      intentDomainFilterSelect.value = '';
      localStorage.removeItem(intentDomainFilterStorageKey);
      resetListPages();
      render();
    });
    if (boardView) boardView.addEventListener('click', handleBoardClick);
    archiveList.addEventListener('click', handleBoardClick);
    backlogList.addEventListener('click', handleBoardClick);
    backlogPagination.addEventListener('click', handleWorkflowPaginationClick);
    archivePagination.addEventListener('click', handleWorkflowPaginationClick);
    if (promptsPagination) promptsPagination.addEventListener('click', handleWorkflowPaginationClick);
    if (memoryPagination) memoryPagination.addEventListener('click', handleWorkflowPaginationClick);
    if (analyticsPagination) analyticsPagination.addEventListener('click', handleWorkflowPaginationClick);
    detailBody.addEventListener('click', handleBoardClick);
    document.addEventListener('workgraph-graph-node-click', handleWorkGraphGraphNodeClick);
    document.querySelectorAll('.graph-canvas-mode-toggle button[data-graph-canvas-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        setGraphCanvasViewMode(button.dataset.graphCanvasMode === 'pipeline' ? 'pipeline' : 'full');
      });
    });
    syncGraphCanvasModeUi();
    detailClose.addEventListener('click', closeTaskDetails);
    detailOverlay.addEventListener('click', closeTaskDetails);
    if (detailSubClose) detailSubClose.addEventListener('click', () => popDetailStackNavigation());
    if (detailSubOverlay) detailSubOverlay.addEventListener('click', () => closeDetailStackFully());
    if (detailSubBody) detailSubBody.addEventListener('click', handleBoardClick);
    detailResizeHandle.addEventListener('pointerdown', startDetailDrawerResize);
    detailResizeHandle.addEventListener('keydown', handleDetailDrawerResizeKeydown);
    if (sidebarResizeHandle) {
      sidebarResizeHandle.addEventListener('pointerdown', startSidebarResize);
      sidebarResizeHandle.addEventListener('keydown', handleSidebarResizeKeydown);
    }
    window.addEventListener('resize', handleSidebarViewportResize);
    if (detailSubResizeHandle) {
      detailSubResizeHandle.addEventListener('pointerdown', startDetailSubDrawerResize);
      detailSubResizeHandle.addEventListener('keydown', handleDetailSubDrawerResizeKeydown);
    }
    window.addEventListener('resize', () => {
      applyDetailDrawerWidth(clampDetailDrawerWidth(getDetailDrawerWidth()), { persist: true });
      applyDetailSubDrawerWidth(clampDetailSubDrawerWidth(getDetailSubDrawerWidth()), { persist: true });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (detailSubDrawer?.classList.contains('is-open')) {
        popDetailStackNavigation();
        return;
      }
      if (!detailDrawer.classList.contains('is-open')) return;
      closeDetailStackFully();
      const backButton = document.querySelector('#detail-nav-back');
      if (backButton) backButton.click();
      else closeTaskDetails();
    });
    promptsList.addEventListener('click', handlePromptRuleCardClick);
    intentComposerPanel.addEventListener('click', handleIntentComposerClick);
    memoryList.addEventListener('click', handleMemoryRecordClick);
    analyticsList.addEventListener('click', handleAnalyticsRecordClick);
    codeGapList.addEventListener('click', handleCodeGapIntakeClick);
    navTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activeView = ['workflow', 'verification', 'prompts', 'memory', 'analytics', 'board', 'architecture', 'settings'].includes(tab.dataset.view)
          ? tab.dataset.view
          : 'analytics';
        localStorage.setItem(viewStorageKey, activeView);
        applyView(activeView);
        refreshActiveViewData(activeView);
      });
    });

    if (architectureView) {
      architectureView.addEventListener('click', handleArchitectureBlocksListClick);
    }

    if (workflowDisplayModeSelect) {
      workflowDisplayModeSelect.addEventListener('change', () => {
        workflowDisplayMode = ['flat', 'tree'].includes(workflowDisplayModeSelect.value)
          ? workflowDisplayModeSelect.value
          : 'epic-groups';
        localStorage.setItem(workflowDisplayModeStorageKey, workflowDisplayMode);
        resetListPages();
        render();
      });
    }

    if (boardColumnModeSelect) {
      boardColumnModeSelect.addEventListener('change', () => {
        boardColumnMode = boardColumnModeSelect.value === 'compact' ? 'compact' : 'extended';
        localStorage.setItem(boardColumnModeStorageKey, boardColumnMode);
        kanbanColumnVisibleCounts = Object.create(null);
        render();
      });
    }

    workflowSubtabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activeWorkflowTab = tab.dataset.workflowTab === 'archive' ? 'archive' : 'backlog';
        localStorage.setItem(workflowTabStorageKey, activeWorkflowTab);
        applyWorkflowTab(activeWorkflowTab);
      });
    });
    analyticsSubtabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activeAnalyticsTab = tab.dataset.analyticsTab === 'closing' ? 'closing' : 'intake';
        localStorage.setItem(analyticsTabStorageKey, activeAnalyticsTab);
        selectedAnalyticsRecordId = null;
        analyticsPage = 1;
        localStorage.setItem(analyticsPageStorageKey, '1');
        applyAnalyticsTab(activeAnalyticsTab);
        renderAnalyticsPanel();
      });
    });
    analyticsSortButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeAnalyticsSort = normalizeAnalyticsRecordSortMode(button.dataset.analyticsSort);
        localStorage.setItem(analyticsSortStorageKey, activeAnalyticsSort);
        analyticsPage = 1;
        localStorage.setItem(analyticsPageStorageKey, '1');
        applyAnalyticsSortUi(activeAnalyticsSort);
        renderAnalyticsPanel();
      });
    });
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const nextTheme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
        localStorage.setItem(themeStorageKey, nextTheme);
      });
    }

    if (settingsThemeLight) {
      settingsThemeLight.addEventListener('click', () => {
        applyTheme('light');
        localStorage.setItem(themeStorageKey, 'light');
      });
    }
    if (settingsThemeDark) {
      settingsThemeDark.addEventListener('click', () => {
        applyTheme('dark');
        localStorage.setItem(themeStorageKey, 'dark');
      });
    }
    if (settingsFontScale) {
      settingsFontScale.addEventListener('input', () => {
        const mode = fontScaleModes[Number(settingsFontScale.value)] || 'font-m';
        applyFontScale(mode);
        localStorage.setItem(fontScaleStorageKey, mode);
      });
    }
    if (settingsLocaleButtons.length) {
      function applySettingsLocaleUi(nextLocale) {
        settingsLocaleButtons.forEach((button) => {
          const isActive = button.dataset.settingsLocale === nextLocale;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });
      }

      function setUiLocale(nextLocale) {
        if (!nextLocale || nextLocale === window.__WG_LOCALE__) return;
        fetch('/api/ui-locale', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ locale: nextLocale }),
        }).then((response) => {
          if (!response.ok) throw new Error('locale ' + response.status);
          window.location.reload();
        }).catch(() => {
          window.alert(t('settings.language.changeFailed'));
        });
      }

      settingsLocaleButtons.forEach((button) => {
        button.addEventListener('click', () => {
          setUiLocale(button.dataset.settingsLocale);
        });
      });
      applySettingsLocaleUi(window.__WG_LOCALE__);
    }
    if (settingsCheckUpdate) {
      settingsCheckUpdate.addEventListener('click', () => {
        settingsCheckUpdate.disabled = true;
        if (settingsUpdateStatus) {
          settingsUpdateStatus.hidden = false;
          settingsUpdateStatus.textContent = t('settings.about.checking');
        }
        renderSettingsPanel({ checkUpdate: true, fresh: true }).finally(() => {
          settingsCheckUpdate.disabled = false;
        });
      });
    }
    if (settingsInstallUpdate) {
      settingsInstallUpdate.addEventListener('click', () => {
        installAppVersionUpdate().catch(() => undefined);
      });
    }
    if (settingsInstallCopyBtn) {
      let settingsInstallCopyFeedbackTimer = null;
      settingsInstallCopyBtn.addEventListener('click', () => {
        const text = settingsInstallCopyBtn.dataset.copyText
          || settingsInstallCommandText?.textContent
          || '';
        if (!text) {
          return;
        }
        copyTextToClipboard(text).then(() => {
          const copiedLabel = t('settings.about.copied');
          const copyLabel = t('settings.about.copy');
          settingsInstallCopyBtn.classList.add('is-copied');
          settingsInstallCopyBtn.setAttribute('aria-label', copiedLabel);
          settingsInstallCopyBtn.setAttribute('title', copiedLabel);
          if (settingsInstallCopyFeedbackTimer) {
            clearTimeout(settingsInstallCopyFeedbackTimer);
          }
          settingsInstallCopyFeedbackTimer = window.setTimeout(() => {
            settingsInstallCopyBtn.classList.remove('is-copied');
            settingsInstallCopyBtn.setAttribute('aria-label', copyLabel);
            settingsInstallCopyBtn.setAttribute('title', copyLabel);
          }, 1600);
        }).catch(() => undefined);
      });
    }
    [settingsGitSnapshotEnabled, settingsGitSnapshotRecordSha, ...settingsGitSnapshotEvents].forEach((node) => {
      if (!node) return;
      node.addEventListener('change', () => {
        persistGitSnapshotSettingsFromForm().catch(() => undefined);
      });
    });

    function readStoredTheme() {
      return localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light';
    }

    function readStoredFontScale() {
      const mode = localStorage.getItem(fontScaleStorageKey) || 'font-m';
      return fontScaleModes.includes(mode) ? mode : 'font-m';
    }

    function readStoredView() {
      const storedView = localStorage.getItem(viewStorageKey);
      if (storedView === 'backlog' || storedView === 'archive') {
        return 'workflow';
      }
      if (storedView === 'architecture' || storedView === 'intent-graph' || storedView === 'schematic') {
        return storedView === 'architecture' ? 'architecture' : 'workflow';
      }
      if (storedView === 'home') {
        return 'analytics';
      }
      if (['workflow', 'verification', 'prompts', 'memory', 'analytics', 'board', 'architecture', 'settings'].includes(storedView)) {
        return storedView;
      }
      return 'analytics';
    }

    function readStoredWorkflowTab() {
      const storedTab = localStorage.getItem(workflowTabStorageKey);
      if (storedTab === 'archive') {
        return 'archive';
      }
      const storedView = localStorage.getItem(viewStorageKey);
      if (storedView === 'archive') {
        return 'archive';
      }
      return 'backlog';
    }

    function applyWorkflowTab(tab) {
      const isBacklog = tab !== 'archive';
      workflowBacklogPanel.hidden = !isBacklog;
      workflowArchivePanel.hidden = isBacklog;
      workflowSubtabs.forEach((button) => {
        const selected = button.dataset.workflowTab === tab;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', String(selected));
      });
    }

    function readStoredAnalyticsTab() {
      const storedTab = localStorage.getItem(analyticsTabStorageKey);
      if (storedTab === 'closing') {
        return 'closing';
      }
      return 'intake';
    }

    function readStoredAnalyticsSort() {
      return normalizeAnalyticsRecordSortMode(localStorage.getItem(analyticsSortStorageKey));
    }

    function applyAnalyticsSortUi(sort) {
      analyticsSortButtons.forEach((button) => {
        const selected = normalizeAnalyticsRecordSortMode(button.dataset.analyticsSort) === sort;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    }

    function readStoredWorkflowDisplayMode() {
      const storedMode = localStorage.getItem(workflowDisplayModeStorageKey);
      if (storedMode === 'flat' || storedMode === 'tree') {
        return storedMode;
      }
      return 'epic-groups';
    }

    function readStoredBoardColumnMode() {
      const storedMode = localStorage.getItem(boardColumnModeStorageKey);
      return storedMode === 'extended' ? 'extended' : 'compact';
    }

    function getActiveBoardColumnGroups() {
      return boardColumnMode === 'compact' ? boardCompactColumnGroups : boardExtendedColumnGroups;
    }

    function localizedBoardColumnTitle(group) {
      if (group.id === 'backlog' || group.id === 'done') {
        return localizedKanbanColumnTitle(group.id, group.title);
      }
      return localizedBoardGroupTitle(group.id, group.title);
    }

    function applyAnalyticsTab(tab) {
      const isClosing = tab === 'closing';
      analyticsSubtabs.forEach((button) => {
        const selected = (button.dataset.analyticsTab === 'closing') === isClosing;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', String(selected));
      });
      if (analyticsPanelTitle) {
        analyticsPanelTitle.textContent = isClosing
          ? 'Итоги закрытых эпиков'
          : 'Аналитические разборы';
      }
    }

    function readAnalyticsRecordKind(record) {
      if (record && record.recordKind === 'closing') {
        return 'closing';
      }
      if (record && record.recordKind === 'intake') {
        return 'intake';
      }
      const id = String(record?.id ?? '').trim().toLowerCase();
      const bodyPath = String(record?.bodyPath ?? '').trim().toLowerCase();
      const title = String(record?.title ?? '').trim().toLowerCase();
      if (
        id.includes('closing-')
        || bodyPath.includes('/closing-')
        || bodyPath.includes('closing-epic')
      ) {
        return 'closing';
      }
      if (/^an-\d+:\s*closing\b/iu.test(title)) {
        return 'closing';
      }
      return 'intake';
    }

    function getPanelSearchQuery() {
      const raw = search.value.trim();
      if (!raw) {
        return '';
      }

      const normalized = raw.toLowerCase();
      if (activeView === 'memory' && normalized.startsWith('work:')) {
        return normalized;
      }

      if (activeView === 'board' || activeView === 'workflow') {
        return normalized;
      }

      return '';
    }

    function getFilteredItems() {
      if (!snapshot) {
        return [];
      }

      const query = getPanelSearchQuery();
      let items = snapshot.items.filter((item) => matchesQuery(item, query));
      if (semanticSearchWorkIds && semanticSearchWorkIds.size > 0) {
        items = items.filter((item) => semanticSearchWorkIds.has(item.id));
      }
      items = applyIntentDomainFilter(items);
      items = applyCycleWorkflowFilter(items);
      return items;
    }

    function scheduleSemanticSearchRefresh() {
      if (!searchMode || searchMode.value === 'local') {
        semanticSearchWorkIds = null;
        return;
      }

      const query = search.value.trim();
      if (query.length < 2) {
        semanticSearchWorkIds = null;
        return;
      }

      if (semanticSearchTimer) {
        clearTimeout(semanticSearchTimer);
      }

      semanticSearchTimer = setTimeout(() => {
        const mode = searchMode.value;
        fetch('/api/semantic-search?q=' + encodeURIComponent(query) + '&mode=' + encodeURIComponent(mode))
          .then((response) => {
            if (!response.ok) throw new Error('semantic search HTTP ' + response.status);
            return response.json();
          })
          .then((payload) => {
            semanticSearchWorkIds = new Set((payload.hits ?? []).map((hit) => hit.workId).filter(Boolean));
            render();
          })
          .catch(() => {
            semanticSearchWorkIds = null;
          });
      }, 250);
    }

    function maxSidebarWidth() {
      return Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, window.innerWidth - 160));
    }

    function clampSidebarWidth(width) {
      return Math.max(SIDEBAR_WIDTH_MIN, Math.min(maxSidebarWidth(), Number(width) || SIDEBAR_WIDTH_DEFAULT));
    }

    function readStoredSidebarWidth() {
      const raw = Number(localStorage.getItem(sidebarWidthStorageKey));
      return Number.isFinite(raw) ? raw : SIDEBAR_WIDTH_DEFAULT;
    }

    function getSidebarWidth() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim();
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : readStoredSidebarWidth();
    }

    function applySidebarWidth(width, { persist = true } = {}) {
      const clamped = clampSidebarWidth(width);
      document.documentElement.style.setProperty('--sidebar-width', clamped + 'px');
      document.documentElement.classList.toggle('is-sidebar-compact', clamped <= SIDEBAR_COMPACT_UI_MAX);
      if (sidebarResizeHandle) {
        sidebarResizeHandle.setAttribute('aria-valuenow', String(Math.round(clamped)));
      }
      if (persist) {
        localStorage.setItem(sidebarWidthStorageKey, String(Math.round(clamped)));
      }
    }

    function applyStoredSidebarWidth() {
      applySidebarWidth(readStoredSidebarWidth(), { persist: false });
    }

    function handleSidebarViewportResize() {
      applySidebarWidth(getSidebarWidth(), { persist: true });
    }

    function startSidebarResize(event) {
      if (!sidebarResizeHandle) return;
      event.preventDefault();
      sidebarResizeHandle.setPointerCapture?.(event.pointerId);
      document.body.classList.add('is-resizing-sidebar');
      const onPointerMove = (moveEvent) => {
        applySidebarWidth(moveEvent.clientX, { persist: false });
      };
      const onPointerUp = (upEvent) => {
        document.body.classList.remove('is-resizing-sidebar');
        applySidebarWidth(upEvent.clientX, { persist: true });
        sidebarResizeHandle.releasePointerCapture?.(event.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    function handleSidebarResizeKeydown(event) {
      if (!sidebarResizeHandle || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 48 : 16;
      const current = getSidebarWidth();
      if (event.key === 'ArrowLeft') applySidebarWidth(current + step);
      if (event.key === 'ArrowRight') applySidebarWidth(current - step);
      if (event.key === 'Home') applySidebarWidth(SIDEBAR_WIDTH_MIN);
      if (event.key === 'End') applySidebarWidth(maxSidebarWidth());
    }

    function readStoredDetailDrawerWidth() {
      const raw = Number(localStorage.getItem(detailDrawerWidthStorageKey));
      return Number.isFinite(raw) ? raw : 720;
    }

    function getDetailDrawerWidth() {
      const rectWidth = detailDrawer.getBoundingClientRect().width;
      return rectWidth > 0 ? rectWidth : readStoredDetailDrawerWidth();
    }

    function minDetailDrawerWidth() {
      return Math.min(420, window.innerWidth);
    }

    function maxDetailDrawerWidth() {
      return Math.max(minDetailDrawerWidth(), window.innerWidth - 48);
    }

    function clampDetailDrawerWidth(width) {
      return Math.max(minDetailDrawerWidth(), Math.min(maxDetailDrawerWidth(), Number(width) || 720));
    }

    function applyStoredDetailDrawerWidth() {
      applyDetailDrawerWidth(clampDetailDrawerWidth(readStoredDetailDrawerWidth()), { persist: false });
    }

    function applyDetailDrawerWidth(width, { persist = true } = {}) {
      const clamped = clampDetailDrawerWidth(width);
      detailDrawer.style.width = clamped + 'px';
      if (persist) localStorage.setItem(detailDrawerWidthStorageKey, String(Math.round(clamped)));
    }

    function startDetailDrawerResize(event) {
      event.preventDefault();
      detailResizeHandle.setPointerCapture?.(event.pointerId);
      document.body.classList.add('is-resizing-detail');
      const onPointerMove = (moveEvent) => {
        applyDetailDrawerWidth(window.innerWidth - moveEvent.clientX, { persist: false });
      };
      const onPointerUp = (upEvent) => {
        document.body.classList.remove('is-resizing-detail');
        applyDetailDrawerWidth(window.innerWidth - upEvent.clientX, { persist: true });
        detailResizeHandle.releasePointerCapture?.(event.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    function handleDetailDrawerResizeKeydown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 80 : 24;
      const current = getDetailDrawerWidth();
      if (event.key === 'ArrowLeft') applyDetailDrawerWidth(current + step);
      if (event.key === 'ArrowRight') applyDetailDrawerWidth(current - step);
      if (event.key === 'Home') applyDetailDrawerWidth(minDetailDrawerWidth());
      if (event.key === 'End') applyDetailDrawerWidth(maxDetailDrawerWidth());
    }

    function readStoredDetailSubDrawerWidth() {
      const raw = Number(localStorage.getItem(detailSubDrawerWidthStorageKey));
      return Number.isFinite(raw) ? raw : 640;
    }

    function getDetailSubDrawerWidth() {
      if (!detailSubDrawer) return readStoredDetailSubDrawerWidth();
      const rectWidth = detailSubDrawer.getBoundingClientRect().width;
      return rectWidth > 0 ? rectWidth : readStoredDetailSubDrawerWidth();
    }

    function minDetailSubDrawerWidth() {
      return Math.min(360, window.innerWidth);
    }

    function maxDetailSubDrawerWidth() {
      return Math.max(minDetailSubDrawerWidth(), window.innerWidth - 48);
    }

    function clampDetailSubDrawerWidth(width) {
      return Math.max(minDetailSubDrawerWidth(), Math.min(maxDetailSubDrawerWidth(), Number(width) || 640));
    }

    function applyStoredDetailSubDrawerWidth() {
      if (!detailSubDrawer) return;
      applyDetailSubDrawerWidth(clampDetailSubDrawerWidth(readStoredDetailSubDrawerWidth()), { persist: false });
    }

    function applyDetailSubDrawerWidth(width, { persist = true } = {}) {
      if (!detailSubDrawer) return;
      const clamped = clampDetailSubDrawerWidth(width);
      detailSubDrawer.style.width = clamped + 'px';
      if (persist) localStorage.setItem(detailSubDrawerWidthStorageKey, String(Math.round(clamped)));
    }

    function startDetailSubDrawerResize(event) {
      if (!detailSubDrawer || !detailSubResizeHandle) return;
      event.preventDefault();
      detailSubResizeHandle.setPointerCapture?.(event.pointerId);
      document.body.classList.add('is-resizing-detail');
      const onPointerMove = (moveEvent) => {
        applyDetailSubDrawerWidth(window.innerWidth - moveEvent.clientX, { persist: false });
      };
      const onPointerUp = (upEvent) => {
        document.body.classList.remove('is-resizing-detail');
        applyDetailSubDrawerWidth(window.innerWidth - upEvent.clientX, { persist: true });
        detailSubResizeHandle.releasePointerCapture?.(event.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    function handleDetailSubDrawerResizeKeydown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 80 : 24;
      const current = getDetailSubDrawerWidth();
      if (event.key === 'ArrowLeft') applyDetailSubDrawerWidth(current + step);
      if (event.key === 'ArrowRight') applyDetailSubDrawerWidth(current - step);
      if (event.key === 'Home') applyDetailSubDrawerWidth(minDetailSubDrawerWidth());
      if (event.key === 'End') applyDetailSubDrawerWidth(maxDetailSubDrawerWidth());
    }

    function applyTheme(theme) {
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.iohascTheme = 'workgraph-dark';
      document.body.dataset.theme = theme;
      const isDark = theme === 'dark';
      if (themeToggle) {
        const inner = themeToggle.querySelector('.header-theme-toggle-inner');
        if (inner) {
          inner.innerHTML = isDark ? THEME_ICON_SUN : THEME_ICON_MOON;
        }
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', t(isDark ? 'theme.light' : 'theme.dark'));
      }
      if (settingsThemeLight) {
        settingsThemeLight.classList.toggle('is-active', theme === 'light');
      }
      if (settingsThemeDark) {
        settingsThemeDark.classList.toggle('is-active', theme === 'dark');
      }
    }

    function applyFontScale(mode) {
      const nextMode = fontScaleModes.includes(mode) ? mode : 'font-m';
      fontScaleModes.forEach((candidate) => {
        document.documentElement.classList.toggle(candidate, candidate === nextMode);
      });
      document.documentElement.style.setProperty('--text-scale', fontScaleValues[nextMode] || '1');
      if (settingsFontScale) {
        settingsFontScale.value = String(Math.max(0, fontScaleModes.indexOf(nextMode)));
      }
      if (settingsFontScaleValue) {
        settingsFontScaleValue.textContent = fontScaleLabels[nextMode] || nextMode;
      }
    }

    async function loadGitSnapshotSettings() {
      const response = await fetch('/api/git-snapshot-settings');
      if (!response.ok) {
        throw new Error('git-snapshot-settings ' + response.status);
      }
      return response.json();
    }

    async function saveGitSnapshotSettings(payload) {
      const response = await fetch('/api/git-snapshot-settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('git-snapshot-settings ' + response.status);
      }
      return response.json();
    }

    function applyGitSnapshotSettingsToForm(settings) {
      if (settingsGitSnapshotEnabled) {
        settingsGitSnapshotEnabled.checked = settings.enabled === true;
      }
      if (settingsGitSnapshotRecordSha) {
        settingsGitSnapshotRecordSha.checked = settings.recordShaInEvidence !== false;
      }
      const enabledEvents = new Set(Array.isArray(settings.events) ? settings.events : []);
      settingsGitSnapshotEvents.forEach((input) => {
        input.checked = enabledEvents.has(input.value);
      });
    }

    function readGitSnapshotSettingsFromForm() {
      return {
        enabled: settingsGitSnapshotEnabled?.checked === true,
        recordShaInEvidence: settingsGitSnapshotRecordSha?.checked !== false,
        events: settingsGitSnapshotEvents.filter((input) => input.checked).map((input) => input.value),
        push: 'never',
      };
    }

    async function persistGitSnapshotSettingsFromForm() {
      const payload = readGitSnapshotSettingsFromForm();
      await saveGitSnapshotSettings(payload);
      if (settingsGitSnapshotStatus) {
        settingsGitSnapshotStatus.hidden = false;
        settingsGitSnapshotStatus.textContent = t('settings.gitSnapshot.saved');
      }
    }

    async function loadSettingsVersionInfo(checkUpdate, options = {}) {
      const params = new URLSearchParams();
      if (checkUpdate) {
        params.set('checkUpdate', '1');
        if (options.fresh === true) {
          params.set('fresh', '1');
        }
      }
      const query = params.size > 0 ? ('?' + params.toString()) : '';
      const response = await fetch('/api/app-version' + query);
      if (!response.ok) {
        throw new Error('app-version ' + response.status);
      }
      return response.json();
    }

    function settingsUpdateCheckWasPerformed() {
      return Boolean(settingsUpdateStatus && !settingsUpdateStatus.hidden);
    }

    function applySettingsAboutUpdateUi(info) {
      const updateAvailable = info?.updateAvailable === true;
      const canInstallFromUi = info?.canInstallFromUi === true;
      const installCommand = String(info?.installCommand || info?.installCommandProject || '').trim();
      const userChecked = settingsUpdateCheckWasPerformed();

      if (settingsInstallUpdate) {
        settingsInstallUpdate.hidden = !(updateAvailable && canInstallFromUi && userChecked);
      }

      const showInstallCommand = updateAvailable && !canInstallFromUi && userChecked && installCommand !== '';
      if (settingsInstallCommand) {
        settingsInstallCommand.hidden = !showInstallCommand;
      }
      if (settingsInstallCommandText) {
        settingsInstallCommandText.textContent = showInstallCommand ? installCommand : '';
      }
      if (settingsInstallCopyBtn) {
        settingsInstallCopyBtn.dataset.copyText = showInstallCommand ? installCommand : '';
      }
    }

    async function installAppVersionUpdate() {
      if (settingsInstallUpdate) {
        settingsInstallUpdate.disabled = true;
      }
      if (settingsCheckUpdate) {
        settingsCheckUpdate.disabled = true;
      }
      if (settingsUpdateStatus) {
        settingsUpdateStatus.hidden = false;
        settingsUpdateStatus.textContent = t('settings.about.installing');
      }
      try {
        const response = await fetch('/api/app-version/install', { method: 'POST' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || payload.error || ('install ' + response.status));
        }
        if (settingsVersionValue) {
          settingsVersionValue.textContent = payload.version + ' · @work-graph/cli';
        }
        if (settingsUpdateStatus) {
          settingsUpdateStatus.textContent = t('settings.about.installSuccess', { version: payload.version });
        }
        if (settingsInstallCommand) {
          settingsInstallCommand.hidden = true;
        }
        applySettingsAboutUpdateUi({ updateAvailable: false });
      } catch (error) {
        if (settingsUpdateStatus) {
          settingsUpdateStatus.textContent = t('settings.about.installFailed');
        }
      } finally {
        if (settingsInstallUpdate) {
          settingsInstallUpdate.disabled = false;
        }
        if (settingsCheckUpdate) {
          settingsCheckUpdate.disabled = false;
        }
      }
    }

    async function renderSettingsPanel(options = {}) {
      if (!settingsView) return;
      try {
        const gitSettings = await loadGitSnapshotSettings().catch(() => null);
        if (gitSettings?.settings) {
          applyGitSnapshotSettingsToForm(gitSettings.settings);
        }
        const info = await loadSettingsVersionInfo(options.checkUpdate === true, {
          fresh: options.fresh === true,
        });
        if (settingsVersionValue) {
          settingsVersionValue.textContent = info.version + ' · ' + info.npmPackage;
        }
        if (!settingsUpdateStatus) return;
        if (options.checkUpdate !== true) {
          settingsUpdateStatus.hidden = true;
          applySettingsAboutUpdateUi(null);
          return;
        }
        settingsUpdateStatus.hidden = false;
        if (info.checkError) {
          settingsUpdateStatus.textContent = t('settings.about.checkFailed');
          applySettingsAboutUpdateUi(null);
          return;
        }
        if (info.updateAvailable) {
          settingsUpdateStatus.textContent = t('settings.about.updateAvailable', { latest: info.latestVersion });
          applySettingsAboutUpdateUi(info);
          return;
        }
        settingsUpdateStatus.textContent = t('settings.about.upToDate', {
          latest: info.latestVersion || info.version,
        });
        applySettingsAboutUpdateUi(info);
      } catch (error) {
        if (settingsUpdateStatus && options.checkUpdate === true) {
          settingsUpdateStatus.hidden = false;
          settingsUpdateStatus.textContent = t('settings.about.checkFailed');
        }
      }
    }

    function readDismissedUpdateNoticeVersion() {
      return localStorage.getItem(dismissedUpdateNoticeStorageKey) || '';
    }

    function dismissUpdateNotice(latestVersion) {
      if (latestVersion) {
        localStorage.setItem(dismissedUpdateNoticeStorageKey, String(latestVersion));
      }
      if (wgNoticeStack) {
        wgNoticeStack.replaceChildren();
      }
    }

    function showUpdateAvailableNotice(info) {
      if (!wgNoticeStack || !info?.updateAvailable || !info.latestVersion) {
        return;
      }
      if (String(info.version || '').includes('-dev')) {
        return;
      }
      if (readDismissedUpdateNoticeVersion() === String(info.latestVersion)) {
        return;
      }
      wgNoticeStack.replaceChildren();
      const notice = document.createElement('article');
      notice.className = 'wg-notice';
      notice.dataset.testid = 'wg-notice-update-available';
      notice.innerHTML =
        '<p class="wg-notice-title">' + escapeHtml(t('notice.updateAvailable.title')) + '</p>' +
        '<p class="wg-notice-body">' + escapeHtml(t('notice.updateAvailable.body', {
          current: info.version,
          latest: info.latestVersion,
        })) + '</p>' +
        '<div class="wg-notice-actions">' +
          '<button type="button" class="wg-btn wg-btn--secondary wg-btn--sm" data-notice-action="open-settings">' +
            escapeHtml(t('notice.updateAvailable.openSettings')) +
          '</button>' +
          '<button type="button" class="wg-btn wg-btn--flat wg-btn--sm" data-notice-action="dismiss">' +
            escapeHtml(t('notice.updateAvailable.dismiss')) +
          '</button>' +
        '</div>';
      notice.addEventListener('click', (event) => {
        const action = event.target instanceof Element
          ? event.target.closest('[data-notice-action]')?.dataset.noticeAction
          : null;
        if (action === 'open-settings') {
          activeView = 'settings';
          localStorage.setItem(viewStorageKey, activeView);
          applyView(activeView);
          renderSettingsPanel({ checkUpdate: true }).catch(() => undefined);
          dismissUpdateNotice(info.latestVersion);
          return;
        }
        if (action === 'dismiss') {
          dismissUpdateNotice(info.latestVersion);
        }
      });
      wgNoticeStack.appendChild(notice);
    }

    async function checkAppVersionAndMaybeNotify() {
      const info = await loadSettingsVersionInfo(true);
      if (settingsVersionValue) {
        settingsVersionValue.textContent = info.version + ' · ' + info.npmPackage;
      }
      applySettingsAboutUpdateUi(info);
      if (activeView === 'settings' && settingsUpdateStatus && !settingsUpdateStatus.hidden) {
        if (info.checkError) {
          settingsUpdateStatus.textContent = t('settings.about.checkFailed');
        } else if (info.updateAvailable) {
          settingsUpdateStatus.textContent = t('settings.about.updateAvailable', { latest: info.latestVersion });
        } else if (info.checkedAt) {
          settingsUpdateStatus.textContent = t('settings.about.upToDate', {
            latest: info.latestVersion || info.version,
          });
        }
      }
      showUpdateAvailableNotice(info);
      return info;
    }

    function remountActiveGraphWorkspace() {
      return;
    }

    let graphCanvasResizeTimer = null;
    window.addEventListener('resize', () => {
      return;
    });

    async function refreshHomeSnapshot() {
      const ownerRole = localStorage.getItem(ownerRoleStorageKey) || '';
      const query = ownerRole ? ('?ownerRole=' + encodeURIComponent(ownerRole)) : '';
      const response = await fetch('/api/home-snapshot' + query);
      if (!response.ok) throw new Error('home snapshot ' + response.status);
      homeSnapshot = await response.json();
      cmdKRows = buildCommandPaletteIndex(snapshot, analyticsProjection);
      return homeSnapshot;
    }

    async function refreshAgentRunDock() {
      if (!agentRunDockBody) return;
      const response = await fetch('/api/agent-run/journal');
      if (!response.ok) return;
      const journal = await response.json();
      renderAgentRunDockLog(agentRunDockBody, journal);
      const latest = Array.isArray(journal.entries) ? journal.entries[0] : null;
      if (latest?.taskId) lastAgentRunTaskId = latest.taskId;
      await refreshAgentScopePanel().catch(() => undefined);
    }

    async function resolveAgentScopeEpicId() {
      await ensureWorkSnapshotLoaded();
      const focusTaskId = lastAgentRunTaskId;
      const fromTask = resolveEpicIdForWorkItem(snapshot?.items ?? [], focusTaskId);
      if (fromTask) return fromTask;
      if (homeSnapshot?.sessionEpicId) return homeSnapshot.sessionEpicId;
      const activeRunIds = (homeSnapshot?.activeRuns ?? []).map((run) => run.workId).filter(Boolean);
      return resolveSessionEpicId(snapshot?.items ?? [], {
        focusTaskId,
        activeRunIds,
      });
    }

    async function refreshAgentScopePanel() {
      if (!agentScopePanel) return;
      const epicId = await resolveAgentScopeEpicId();
      if (!epicId) {
        renderAgentScopePanel(agentScopePanel, null);
        return;
      }
      const response = await fetch('/api/epic-scope?epicId=' + encodeURIComponent(epicId));
      if (!response.ok) {
        renderAgentScopePanel(agentScopePanel, null);
        return;
      }
      const scopeSlice = await response.json();
      renderAgentScopePanel(agentScopePanel, scopeSlice);
    }

    function stopAgentScopePoll() {
      liveSync.sync();
    }

    function startAgentScopePoll() {
      liveSync.sync();
      if (agentRunDock?.classList.contains('is-open')) {
        liveSync.forceTick('agent-scope');
      }
    }

    function setAgentDockOpen(open) {
      if (!agentRunDock || !layoutRoot) return;
      agentRunDock.classList.toggle('is-open', open);
      layoutRoot.classList.toggle('has-agent-dock', open);
      localStorage.setItem(agentDockOpenStorageKey, open ? '1' : '0');
      if (open) {
        refreshAgentRunDock().catch(() => undefined);
        liveSync.sync();
        liveSync.forceTick('agent-dock');
        liveSync.forceTick('agent-scope');
      } else {
        liveSync.sync();
      }
    }

    function openCommandPalette() {
      if (!cmdKOverlay || !cmdKInput) return;
      cmdKRows = buildCommandPaletteIndex(snapshot, analyticsProjection);
      cmdKActiveIndex = 0;
      cmdKOverlay.classList.add('is-open');
      cmdKOverlay.setAttribute('aria-hidden', 'false');
      cmdKInput.value = '';
      renderCommandPaletteResults('');
      cmdKInput.focus();
    }

    function closeCommandPalette() {
      if (!cmdKOverlay) return;
      cmdKOverlay.classList.remove('is-open');
      cmdKOverlay.setAttribute('aria-hidden', 'true');
    }

    function renderCommandPaletteResults(query) {
      if (!cmdKResults) return;
      const rows = filterCommandPaletteRows(cmdKRows, query);
      cmdKResults.innerHTML = rows.map((row, index) =>
        '<div class="cmd-k-row' + (index === cmdKActiveIndex ? ' is-active' : '') + '" data-cmd-index="' + index + '">' +
        '<strong>' + escapeHtml(row.scope + ':') + '</strong> ' + escapeHtml(row.label) +
        '</div>',
      ).join('');
      cmdKResults._rows = rows;
    }

    async function executeCommandPaletteRow(row) {
      if (!row) return;
      closeCommandPalette();
      if (row.view) {
        activeView = row.view;
        localStorage.setItem(viewStorageKey, activeView);
        applyView(activeView);
        refreshActiveViewData(activeView);
        return;
      }
      if (row.workId) {
        openTaskDetails(row.workId);
        return;
      }
      if (row.scope === 'run') {
        const ready = (snapshot?.items ?? []).find((item) => item.status === 'ready');
        const taskId = ready?.id ?? lastAgentRunTaskId;
        if (!taskId) return;
        setAgentDockOpen(true);
        await fetch('/api/agent-run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ taskId, provider: 'local', persistBacklog: true }),
        });
        await refreshAgentRunDock();
      }
    }

    async function ensureWorkSnapshotLoaded() {
      if (snapshot && Array.isArray(snapshot.items)) {
        return snapshot;
      }
      try {
        const response = await fetch('/api/snapshot');
        if (!response.ok) return null;
        snapshot = await response.json();
        return snapshot;
      } catch {
        return null;
      }
    }

    async function ensureAnalyticsProjectionLoaded() {
      if (analyticsProjection && Array.isArray(analyticsProjection.records)) {
        return analyticsProjection;
      }
      try {
        const response = await fetch('/api/analytics-projection');
        if (!response.ok) return null;
        analyticsProjection = await response.json();
        analyticsPanelLoaded = true;
        return analyticsProjection;
      } catch {
        return null;
      }
    }

    async function handleHomeWorkItemClick(workId) {
      const trimmed = String(workId ?? '').trim();
      if (!trimmed) return;
      const loaded = await ensureWorkSnapshotLoaded();
      const item = (loaded?.items ?? []).find((candidate) => candidate.id === trimmed);
      if (!item) {
        return;
      }
      openTaskDetails(item);
    }

    async function handleHomeAnalyticsClick(analyticsKey) {
      const trimmed = String(analyticsKey ?? '').trim();
      if (!trimmed) return;
      const projection = await ensureAnalyticsProjectionLoaded();
      const records = projection?.records ?? [];
      const record = records.find((entry) => entry.key === trimmed)
        ?? records.find((entry) => entry.id === trimmed);
      if (!record) {
        return;
      }
      selectedAnalyticsRecordId = record.id;
      openAnalyticsRecordDetails(record);
    }

    function initMissionControlUi() {
      if (localStorage.getItem(agentDockOpenStorageKey) === '1') {
        setAgentDockOpen(true);
      }
      if (agentRunDockClose) {
        agentRunDockClose.addEventListener('click', () => setAgentDockOpen(false));
      }
      if (agentRunRetry) {
        agentRunRetry.addEventListener('click', async () => {
          if (!lastAgentRunTaskId) return;
          await fetch('/api/agent-run', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ taskId: lastAgentRunTaskId, provider: 'local', persistBacklog: true }),
          });
          await refreshAgentRunDock();
        });
      }
      if (agentRunOpenTask) {
        agentRunOpenTask.addEventListener('click', () => {
          if (lastAgentRunTaskId) openTaskDetails(lastAgentRunTaskId);
        });
      }
      if (agentScopePanel) {
        agentScopePanel.addEventListener('click', (event) => {
          const row = event.target.closest('[data-work-id]');
          if (!row) return;
          const workId = row.getAttribute('data-work-id');
          if (workId) handleHomeWorkItemClick(workId).catch(() => undefined);
        });
      }
      if (cmdKOverlay) {
        cmdKOverlay.addEventListener('click', (event) => {
          if (event.target === cmdKOverlay) closeCommandPalette();
        });
      }
      if (cmdKInput) {
        cmdKInput.addEventListener('input', () => {
          cmdKActiveIndex = 0;
          renderCommandPaletteResults(cmdKInput.value);
        });
        cmdKInput.addEventListener('keydown', (event) => {
          const rows = cmdKResults?._rows ?? [];
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            cmdKActiveIndex = Math.min(cmdKActiveIndex + 1, Math.max(rows.length - 1, 0));
            renderCommandPaletteResults(cmdKInput.value);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            cmdKActiveIndex = Math.max(cmdKActiveIndex - 1, 0);
            renderCommandPaletteResults(cmdKInput.value);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            executeCommandPaletteRow(rows[cmdKActiveIndex]).catch(() => undefined);
          } else if (event.key === 'Escape') {
            closeCommandPalette();
          }
        });
      }
      if (cmdKResults) {
        cmdKResults.addEventListener('click', (event) => {
          const rowEl = event.target.closest('[data-cmd-index]');
          if (!rowEl) return;
          const index = Number(rowEl.getAttribute('data-cmd-index'));
          const rows = cmdKResults._rows ?? [];
          executeCommandPaletteRow(rows[index]).catch(() => undefined);
        });
      }
      document.addEventListener('keydown', (event) => {
        const isMac = navigator.platform.toLowerCase().includes('mac');
        const mod = isMac ? event.metaKey : event.ctrlKey;
        if (mod && String(event.key).toLowerCase() === 'k') {
          event.preventDefault();
          openCommandPalette();
        }
      });
    }

    function applyView(view) {
      const isWorkflow = view === 'workflow';
      const isVerification = view === 'verification';
      const isArchitecture = view === 'architecture';
      const isIntent = false;
      const isPrompts = view === 'prompts';
      const isMemory = view === 'memory';
      const isAnalytics = view === 'analytics';
      const isSettings = view === 'settings';
      if (contentRoot) {
        contentRoot.classList.remove('is-graph-workspace');
        contentRoot.classList.toggle('is-board-workspace', view === 'board');
      }
      workflowFilters.hidden = !(view === 'board' || isWorkflow);
      if (workflowDisplayModeSelect) {
        workflowDisplayModeSelect.hidden = !isWorkflow;
      }
      if (boardColumnModeSelect) {
        boardColumnModeSelect.hidden = view !== 'board';
      }
      if (view === 'board') {
        applyBoardColumnModeClass();
      }
      if (viewToolbar) viewToolbar.hidden = !(view === 'board' || isWorkflow);
      boardView.hidden = isWorkflow || isVerification || isIntent || isPrompts || isMemory || isAnalytics || isArchitecture || isSettings;
      workflowView.hidden = !isWorkflow;
      if (isWorkflow) {
        applyWorkflowTab(activeWorkflowTab);
      }
      verificationView.hidden = !isVerification;
      intentView.hidden = !isIntent;
      promptsView.hidden = !isPrompts;
      memoryView.hidden = !isMemory;
      analyticsView.hidden = !isAnalytics;
      if (settingsView) settingsView.hidden = !isSettings;
      if (architectureView) architectureView.hidden = !isArchitecture;
      if (isArchitecture) {
        renderArchitecturePanels();
      }
      if (isAnalytics) {
        applyAnalyticsTab(activeAnalyticsTab);
      }
      if (isSettings) {
        renderSettingsPanel().catch(() => undefined);
      }
      const viewCopy = {
        board: t('view.board'),
        workflow: t('view.workflow'),
        architecture: t('view.architecture'),
        verification: t('view.verification'),
        prompts: t('view.prompts'),
        memory: t('view.memory'),
        analytics: t('view.analytics'),
        settings: t('view.settings'),
      };
      const title = viewCopy[view] ?? viewCopy.analytics;
      viewTitle.textContent = title;
      navTabs.forEach((tab) => {
        tab.setAttribute('aria-selected', String(tab.dataset.view === view));
      });
      syncLivePollInterval();
    }

    async function pollBacklogRevision() {
      if (!liveSyncViews.has(activeView)) {
        return;
      }
      try {
        const response = await fetch('/api/backlog-revision');
        if (!response.ok) return;
        const payload = await response.json();
        if (backlogRevision && payload.revision !== backlogRevision) {
          const prevKanbanProjection = operatorShellSnapshot?.kanbanBoard ?? null;
          await reloadOperatorSnapshots();
          let patched = false;
          if (activeView === 'board' && prevKanbanProjection) {
            patched = patchKanbanBoardIncremental(prevKanbanProjection);
          }
          if (!patched) {
            render();
          } else {
            const items = getFilteredItems();
            renderIntentDomainFilter();
            renderNavigationCounts(items);
            renderBoard(items);
          }
          await reconcileDetailDrawerOnRemotePatch();
        }
        backlogRevision = payload.revision;
      } catch {
        // ignore transient poll errors
      }
    }

    function patchKanbanBoardIncremental(prevProjection) {
      if (!board || !prevProjection || !shouldUseKanbanIncrementalPatch()) {
        return false;
      }
      const nextProjection = operatorShellSnapshot?.kanbanBoard ?? null;
      if (!nextProjection) {
        return false;
      }
      const delta = computeKanbanBoardDelta(prevProjection, nextProjection);
      if (delta.fullRender) {
        return false;
      }
      const itemsById = new Map((snapshot?.items ?? []).map((item) => [item.id, item]));
      const doneColumn = nextProjection.columns.find((column) => column.id === 'done');
      const result = applyKanbanBoardPatch(board, delta, {
        renderCard: (item, options) => renderTaskAtomCard(item, 'kanban-card', options),
        emptyColumnHtml: '<div class="empty">' + escapeHtml(t('empty.noTasks')) + '</div>',
        itemsById,
        resortDoneColumnWorkIds: doneColumn?.workIds ?? [],
      });
      return result.ok === true;
    }

    async function reconcileDetailDrawerOnRemotePatch() {
      const l1Open = detailDrawer.classList.contains('is-open');
      const l2Open = detailSubDrawer?.classList.contains('is-open');
      if (!l1Open && !l2Open) {
        return;
      }

      async function refreshTaskDrawerBody(body, workId, mode) {
        const item = snapshot?.items?.find((candidate) => candidate.id === workId);
        if (!item || mode === 'edit') {
          return;
        }
        const storedStatus = body.dataset.remoteStatus ?? '';
        if (storedStatus && storedStatus !== item.status) {
          await renderTaskDetailContent(item, {
            parentContext: detailContext?.parent ?? null,
            mode: 'view',
            targetBody: body,
            subDrawer: body !== detailBody,
          });
          const banner = '<div class="detail-remote-update-banner" data-testid="detail-remote-update-banner">' +
            escapeHtml(t('drawer.remoteUpdate')) + '</div>';
          if (!body.querySelector('[data-testid="detail-remote-update-banner"]')) {
            body.insertAdjacentHTML('afterbegin', banner);
          }
        }
        body.dataset.remoteStatus = item.status;
      }

      if (l1Open && detailContext?.type === 'task' && detailContext.taskId) {
        await refreshTaskDrawerBody(detailBody, detailContext.taskId, detailInspectorState?.mode ?? 'view');
      }
      if (l2Open && detailStack.depth() > 0) {
        const top = detailStack.peek();
        if (top?.type === 'task' && top.payload?.workId && detailSubBody) {
          await refreshTaskDrawerBody(detailSubBody, top.payload.workId, 'view');
        }
      }
    }

    function syncLivePollInterval() {
      liveSync.sync();
      if (liveSyncViews.has(activeView)) {
        liveSync.forceTick('backlog-revision');
      }
    }

    function render() {
      if (!snapshot) return;
      const items = getFilteredItems();
      renderIntentDomainFilter();
      renderNavigationCounts(items);
      renderBoard(items);
      renderArchive(items);
      renderBacklog(items);
      renderVerificationPanel();
      renderIntentComposerPanel();
      renderPromptsPanel();
      renderMemoryPanel();
      renderAnalyticsPanel();
    }

    function ensureLazyViewData(view) {
      if (view === 'prompts' && !promptsPanelLoaded) {
        return fetch('/api/prompt-rules-projection').then((response) => {
          if (!response.ok) throw new Error('запрос prompt rules projection завершился с кодом ' + response.status);
          return response.json();
        }).then((data) => {
          promptsProjection = data;
          promptsPanelLoaded = true;
        });
      }

      if (view === 'verification' && (!codeGapPanelLoaded || !daemonAuditPanelLoaded)) {
        const requests = [];

        if (!codeGapPanelLoaded) {
          requests.push(
            fetch('/api/code-gap-projection').then((response) => {
              if (!response.ok) throw new Error('запрос code-gap projection завершился с кодом ' + response.status);
              return response.json().then((data) => {
                codeGapProjection = data;
                codeGapPanelLoaded = true;
              });
            }),
          );
        }

        if (!daemonAuditPanelLoaded) {
          requests.push(
            fetch('/api/daemon-audit-tail?limit=12').then((response) => {
              if (!response.ok) throw new Error('запрос daemon audit tail завершился с кодом ' + response.status);
              return response.json().then((data) => {
                daemonAuditTail = data;
                daemonAuditPanelLoaded = true;
              });
            }),
          );
        }

        return Promise.all(requests).then(() => undefined);
      }

      if (view === 'memory' && !memoryPanelLoaded) {
        return fetch('/api/memory-projection').then((response) => {
          if (!response.ok) throw new Error('запрос memory projection завершился с кодом ' + response.status);
          return response.json();
        }).then((data) => {
          memoryProjection = data;
          memoryPanelLoaded = true;
        });
      }

      if (view === 'analytics' && !analyticsPanelLoaded) {
        return fetch('/api/analytics-projection').then((response) => {
          if (!response.ok) throw new Error('запрос analytics projection завершился с кодом ' + response.status);
          return response.json();
        }).then((data) => {
          analyticsProjection = data;
          analyticsPanelLoaded = true;
        });
      }

      if (view === 'architecture' && !architectureLoaded) {
        return ensureArchitectureSnapshotLoaded().then(() => undefined);
      }

      return Promise.resolve();
    }

    function populateCycleFilterOptions() {
      const cycles = operatorShellSnapshot?.cycleSlice?.cycles ?? [];
      const existing = new Set([...cycleFilterSelect.options].map((option) => option.value));
      cycles.forEach((cycle) => {
        if (existing.has(cycle.id)) return;
        const option = document.createElement('option');
        option.value = cycle.id;
        option.textContent = cycle.label + ' (' + cycle.active + ' active / ' + cycle.done + ' done)';
        cycleFilterSelect.appendChild(option);
      });
      cycleFilterSelect.value = cycleFilter;
    }

    function applyCycleWorkflowFilter(items) {
      if (activeView !== 'board' && activeView !== 'workflow') {
        return items;
      }

      const derivedByWorkId = operatorShellSnapshot?.cycleSlice?.derivedByWorkId ?? {};
      const resolvedCycle = cycleFilter === 'current'
        ? (operatorShellSnapshot?.cycleSlice?.currentCycle ?? 'uncategorized')
        : cycleFilter;

      if (resolvedCycle === 'all') {
        return items;
      }

      return items.filter((item) => derivedByWorkId[item.id] === resolvedCycle);
    }

    function applyIntentDomainFilter(items) {
      if ((activeView !== 'board' && activeView !== 'workflow') || !intentDomainFilter || !operatorShellSnapshot?.intentSidebar?.nodes) {
        return items;
      }

      const allowedIds = new Set(
        operatorShellSnapshot.intentSidebar.nodes
          .filter((node) => node.domain === intentDomainFilter)
          .map((node) => node.workId),
      );

      return items.filter((item) => allowedIds.has(item.id));
    }

    function renderIntentDomainFilter() {
      const domains = operatorShellSnapshot?.intentSidebar?.domains ?? [];
      const current = intentDomainFilter;
      intentDomainFilterSelect.innerHTML =
        '<option value="">Все домены</option>' +
        domains.map((domain) =>
          '<option value="' + escapeHtml(domain.id) + '"' + (current === domain.id ? ' selected' : '') + '>' +
            escapeHtml(domain.label) + ' (' + domain.count + ')' +
          '</option>'
        ).join('');
      if (current && !domains.some((domain) => domain.id === current)) {
        intentDomainFilterSelect.innerHTML +=
          '<option value="' + escapeHtml(current) + '" selected>' + escapeHtml(current) + '</option>';
      }
      intentDomainFilterSelect.disabled = domains.length === 0;
      intentDomainClear.hidden = !current;
    }

    function crossHighlightTargets(taskId) {
      const row = operatorShellSnapshot?.semanticCrossHighlight?.find((entry) => entry.workId === taskId);
      if (!row) {
        return { architectureBlockId: null, peerIds: [] };
      }
      const peerIds = (operatorShellSnapshot.semanticCrossHighlight ?? [])
        .filter((entry) => entry.architectureBlockId === row.architectureBlockId && entry.workId !== taskId)
        .map((entry) => entry.workId);
      return { architectureBlockId: row.architectureBlockId, peerIds };
    }

    function applyCrossHighlight(taskId) {
      highlightTaskId = taskId;
      const targets = crossHighlightTargets(taskId);
      if (targets.architectureBlockId) {
        focusedBlockId = targets.architectureBlockId;
      }
    }

    function renderIntentComposerPanel() {
      const applyButton = intentComposerPanel.querySelector('[data-action="apply"]');
      if (applyButton) {
        applyButton.disabled = !intentComposerProposal?.ok;
      }

      if (intentComposerMessages.length === 0) {
        intentComposerChat.innerHTML = '<div class="intent-composer-message is-system">Введите намерение и нажмите «Preview draft».</div>';
        return;
      }

      intentComposerChat.innerHTML = intentComposerMessages.map((entry) =>
        '<div class="intent-composer-message is-' + escapeHtml(entry.role) + '">' + escapeHtml(entry.text) + '</div>'
      ).join('');
    }

    function resetIntentComposerDraft() {
      intentComposerProposal = null;
      intentComposerPreview.hidden = true;
      intentComposerPreview.textContent = '';
      intentComposerErrors.hidden = true;
      intentComposerErrors.textContent = '';
      renderIntentComposerPanel();
    }

    function handleIntentComposerClick(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }

      if (button.dataset.action === 'propose') {
        submitIntentProposal();
      } else if (button.dataset.action === 'apply') {
        submitIntentApply();
      } else if (button.dataset.action === 'cancel') {
        intentComposerMessages = [];
        intentComposerInput.value = '';
        resetIntentComposerDraft();
      }
    }

    async function submitIntentProposal() {
      const message = intentComposerInput.value.trim();
      if (!message) {
        intentComposerErrors.hidden = false;
        intentComposerErrors.textContent = 'Введите текст намерения.';
        return;
      }

      const proposeButton = intentComposerPanel.querySelector('[data-action="propose"]');
      const applyButton = intentComposerPanel.querySelector('[data-action="apply"]');
      proposeButton.disabled = true;
      applyButton.disabled = true;
      intentComposerErrors.hidden = true;
      intentComposerErrors.textContent = '';

      try {
        const response = await fetch('/api/intent-composer/proposal', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        const payload = await response.json();

        intentComposerMessages.push({ role: 'user', text: message });
        intentComposerProposal = payload;

        if (!response.ok || !payload.ok) {
          intentComposerPreview.hidden = true;
          intentComposerErrors.hidden = false;
          intentComposerErrors.textContent = (payload.validationErrors ?? [payload.error ?? 'proposal_failed']).join('\\n');
          intentComposerMessages.push({
            role: 'system',
            text: 'Draft не прошёл validation. Исправьте намерение и повторите preview.',
          });
        } else {
          intentComposerPreview.hidden = false;
          intentComposerPreview.textContent = payload.formattedAtom || JSON.stringify(payload.intentDraft, null, 2);
          intentComposerMessages.push({
            role: 'system',
            text: 'Draft готов: ' + payload.intentDraft.suggestedWorkId + '. Нажмите «Создать задачу» для apply в backlog.',
          });
        }
      } catch (error) {
        intentComposerErrors.hidden = false;
        intentComposerErrors.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        proposeButton.disabled = false;
        renderIntentComposerPanel();
      }
    }

    async function submitIntentApply() {
      if (!intentComposerProposal?.ok) {
        return;
      }

      const proposeButton = intentComposerPanel.querySelector('[data-action="propose"]');
      const applyButton = intentComposerPanel.querySelector('[data-action="apply"]');
      proposeButton.disabled = true;
      applyButton.disabled = true;

      try {
        const response = await fetch('/api/intent-composer/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ proposal: intentComposerProposal }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          intentComposerErrors.hidden = false;
          intentComposerErrors.textContent = (payload.validationErrors ?? [payload.error ?? 'apply_failed']).join('\\n');
          return;
        }

        intentComposerMessages.push({
          role: 'system',
          text: 'WorkItem ' + payload.workId + ' добавлен в backlog.',
        });
        intentComposerInput.value = '';
        resetIntentComposerDraft();
        intentComposerMessages = intentComposerMessages.slice(-6);

        await reloadOperatorSnapshots();
        render();
      } catch (error) {
        intentComposerErrors.hidden = false;
        intentComposerErrors.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        proposeButton.disabled = false;
        renderIntentComposerPanel();
      }
    }

    function matchesPromptRuleQuery(rule, query) {
      if (!query) {
        return true;
      }

      const haystack = [
        rule.id,
        rule.name,
        rule.filePath,
        rule.basis,
        rule.vector,
        rule.goal,
        rule.traceStatus,
        rule.protocolId,
        rule.decisionId,
        ...(rule.evidence ? [rule.evidence] : []),
        ...(rule.checks ? [rule.checks] : []),
        ...Object.entries(rule.labels || {}).map(([key, value]) => key + ' ' + value),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    }

    function renderListRow({
      title = '',
      titleHtml = '',
      lines = [],
      footerLeft = '',
      footerRight = '',
      leadingHtml = '',
      extraClass = '',
      selected = false,
      highlighted = false,
      rowTag = 'button',
      attrs = {},
    }) {
      const attrParts = Object.entries(attrs)
        .filter(([, value]) => value != null && value !== '')
        .map(([key, value]) => key + '="' + escapeHtml(String(value)) + '"');
      const className = 'task-atom list-row' +
        (extraClass ? ' ' + extraClass : '') +
        (selected ? ' is-selected' : '') +
        (highlighted ? ' is-highlighted' : '');
      const lineHtml = lines
        .filter((line) => line != null && line !== '')
        .map((line) => '<p class="list-row-line">' + line + '</p>')
        .join('');
      const footer = footerLeft || footerRight
        ? '<div class="issue-footer"><div class="issue-footer-left">' + footerLeft + '</div>' +
          '<div class="issue-footer-right">' + footerRight + '</div></div>'
        : '';
      const heading = titleHtml || escapeHtml(title);
      const body = '<h3>' + heading + '</h3>' + lineHtml + footer;
      const contents = leadingHtml
        ? '<div class="list-row-inner">' + leadingHtml + '<div class="list-row-body">' + body + '</div></div>'
        : body;
      if (rowTag === 'div') {
        return '<div class="' + className + '" role="button" tabindex="0" ' + attrParts.join(' ') + '>' +
          contents +
        '</div>';
      }
      return '<button class="' + className + '" type="button" ' + attrParts.join(' ') + '>' +
        contents +
      '</button>';
    }

    function renderWorkflowCaretIcon(direction) {
      const points = direction === 'down' ? '208 96 128 176 48 96' : '96 48 176 128 96 208';
      return '<svg class="workflow-epic-caret-icon" width="16" height="16" viewBox="0 0 256 256" aria-hidden="true" focusable="false">' +
        '<polyline points="' + points + '" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></polyline>' +
      '</svg>';
    }

    function renderWorkflowExpandToggle(itemId, collapsed, options = {}) {
      const attrName = options.attr ?? 'data-workflow-epic-toggle';
      const testIdPrefix = options.testIdPrefix ?? 'workflow-epic-toggle';
      const label = collapsed ? t('workflow.epic.expand') : t('workflow.epic.collapse');
      return renderClientUiButton({
        labelHtml: renderWorkflowCaretIcon(collapsed ? 'right' : 'down'),
        unstyled: true,
        className: 'workflow-epic-toggle',
        testId: testIdPrefix + '-' + itemId,
        attrs: {
          [attrName]: itemId,
          'aria-label': label,
          title: label,
        },
      });
    }

    function renderWorkflowTaskListRow(item, options = {}) {
      const queueKind = options.queueKind ?? null;
      const extraClass = options.extraClass ?? '';
      const titleHtml = options.titleHtml ?? '';
      const title = options.title ?? (item.title || item.id);
      const rowTag = options.rowTag ?? 'button';
      const leadingHtml = options.leadingHtml ?? '';
      const targets = highlightTaskId ? crossHighlightTargets(highlightTaskId) : { peerIds: [] };
      const highlighted = item.id === highlightTaskId || targets.peerIds.includes(item.id);
      const goalLine = item.goal ? escapeHtml(preview(item.goal)) : '';
      const lines = goalLine ? [goalLine] : [];
      const footerLeft = renderWorkItemIssueKeyChip(item) + renderWorkItemClassifierBadge(item);
      const owner = item.ownerRole || item.department || 'WG';
      const footerRight = renderOwnerAvatar(owner, { title: owner });
      return renderListRow({
        title,
        titleHtml,
        lines,
        footerLeft,
        footerRight,
        leadingHtml,
        extraClass,
        highlighted,
        rowTag,
        attrs: { 'data-task-id': item.id, 'data-work-id': item.id },
      });
    }

    function renderPromptRuleValidationBadge(rule) {
      return renderClientUiBadge({
        label: formatPromptRuleValidationBadgeLabel(rule),
        tone: resolvePromptRuleValidationBadgeTone(rule),
        testId: 'prompt-rule-validation-badge',
        title: rule.validationStatus === 'valid'
          ? 'Правило прошло валидацию'
          : 'Правило не прошло валидацию',
      });
    }

    function renderPromptRuleListRow(rule) {
      return renderListRow({
        title: rule.name,
        lines: [
          escapeHtml(rule.filePath),
          escapeHtml(preview(rule.basis || rule.vector || rule.goal || '')),
        ],
        footerLeft: renderWorkItemIssueKeyChip(
          { key: rule.id, itemKind: 'story', id: rule.id },
          { type: 'story' },
        ) + renderPromptRuleValidationBadge(rule),
        selected: selectedPromptRuleId === rule.id,
        attrs: { 'data-prompt-rule-id': rule.id },
      });
    }

    function renderPromptsPanel() {
      if (!promptsProjection) {
        if (promptsSummary) promptsSummary.innerHTML = '';
        promptsList.innerHTML = activeView === 'prompts'
          ? '<div class="empty">Загрузка prompt rules...</div>'
          : '';
        if (promptsPanelCount) promptsPanelCount.textContent = '0';
        if (promptsPagination) {
          promptsPagination.hidden = true;
          promptsPagination.innerHTML = '';
        }
        return;
      }

      const query = getPanelSearchQuery();
      const rules = (promptsProjection.rules ?? []).filter((rule) => matchesPromptRuleQuery(rule, query));
      const summary = promptsProjection.summary ?? { total: 0, valid: 0, invalid: 0 };

      if (promptsPanelCount) promptsPanelCount.textContent = String(rules.length);

      const pagination = paginateItems(rules, promptsPage, workflowPageSize);
      if (pagination.page !== promptsPage) {
        persistPanelPage('prompts', pagination.page);
      }

      promptsList.innerHTML = pagination.items.length
        ? pagination.items.map((rule) => renderPromptRuleListRow(rule)).join('')
        : '<div class="empty">Prompt rules не найдены для текущего фильтра.</div>';
      renderWorkflowPagination(promptsPagination, pagination, 'prompts');
    }

    function matchesMemoryRecordQuery(record, query) {
      if (!query) {
        return true;
      }

      if (query.startsWith('work:')) {
        const workId = query.slice(5).trim();
        return workId !== '' && record.sourceWorkItem === workId;
      }

      const haystack = [
        record.key,
        record.id,
        record.type,
        record.status,
        record.summary,
        record.sourceWorkItem,
        record.confidence,
        ...(record.relatedFiles ?? []),
        ...(record.relatedTasks ?? []),
        ...(record.evidenceIds ?? []),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    }

    function renderMemoryRecordStatusBadge(record) {
      return renderClientUiBadge({
        label: formatMemoryRecordStatusBadgeLabel(record),
        tone: resolveMemoryRecordStatusBadgeTone(record),
        testId: 'memory-record-status-badge',
        title: record.summary || record.id,
      });
    }

    function renderMemoryRecordListRow(record) {
      const owner = record.sourceWorkItem || record.type || 'WG';
      return renderListRow({
        title: record.summary,
        lines: [
          escapeHtml(record.type) + ' · confidence: ' + escapeHtml(record.confidence),
          escapeHtml((record.relatedFiles ?? []).join(', ') || 'no related files'),
        ],
        footerLeft: renderMemoryRecordKeyChip(record) +
          renderWorkItemIssueKeyChip(
            { id: record.sourceWorkItem, key: record.sourceWorkItem, itemKind: 'task' },
            { type: 'task' },
          ) +
          renderMemoryRecordStatusBadge(record),
        footerRight: renderOwnerAvatar(owner, { title: owner }),
        selected: selectedMemoryRecordId === record.id,
        attrs: { 'data-memory-record-id': record.id },
      });
    }

    function renderMemoryPanel() {
      if (!memoryProjection) {
        if (memorySummary) memorySummary.innerHTML = '';
        memoryList.innerHTML = activeView === 'memory'
          ? '<div class="empty">Загрузка memory projection...</div>'
          : '';
        if (memoryPanelCount) memoryPanelCount.textContent = '0';
        if (memoryPagination) {
          memoryPagination.hidden = true;
          memoryPagination.innerHTML = '';
        }
        return;
      }

      const query = getPanelSearchQuery();
      const records = (memoryProjection.records ?? []).filter((record) => matchesMemoryRecordQuery(record, query));
      const summary = memoryProjection.summary ?? { total: 0, reviewRequired: 0 };

      if (memoryPanelCount) memoryPanelCount.textContent = String(records.length);

      const pagination = paginateItems(records, memoryPage, workflowPageSize);
      if (pagination.page !== memoryPage) {
        persistPanelPage('memory', pagination.page);
      }

      memoryList.innerHTML = pagination.items.length
        ? pagination.items.map((record) => renderMemoryRecordListRow(record)).join('')
        : '<div class="empty">Memory records не найдены для текущего фильтра.</div>';
      renderWorkflowPagination(memoryPagination, pagination, 'memory');
    }

    function handleMemoryRecordClick(event) {
      const button = event.target.closest('.list-row[data-memory-record-id]');
      if (!button || !memoryProjection) {
        return;
      }

      const record = (memoryProjection.records ?? []).find((entry) => entry.id === button.dataset.memoryRecordId);
      if (!record) {
        return;
      }

      selectedMemoryRecordId = record.id;
      renderMemoryPanel();
      openMemoryRecordDetails(record);
    }

    function openMemoryRecordDetails(record) {
      detailTitle.textContent = record.summary;
      detailId.textContent = record.key || record.id;
      detailBody.innerHTML =
        renderDetailBackButton('← К памяти') +
        renderDetailText('Key', record.key || '—') +
        renderDetailText('Id', record.id) +
        renderDetailText('Type', record.type) +
        renderDetailText('Status', record.status) +
        renderDetailText('Confidence', record.confidence) +
        renderDetailText('Source WorkItem', record.sourceWorkItem) +
        renderDetailList('Related files', record.relatedFiles ?? [], { linkRepoFiles: true }) +
        renderDetailList('Related tasks', record.relatedTasks ?? []) +
        renderDetailList('Evidence ids', record.evidenceIds ?? []) +
        renderDetailText('Review required', record.reviewRequired ? 'yes' : 'no');
      openDetailDrawer();
      bindDetailNavBack(() => {
        selectedMemoryRecordId = null;
        renderMemoryPanel();
        closeTaskDetails();
      });
      detailClose.focus();
    }

    function matchesAnalyticsRecordQuery(record, query) {
      if (!query) {
        return true;
      }

      const haystack = [
        record.key,
        record.id,
        record.title,
        record.query,
        record.topic,
        record.status,
        ...(record.tags ?? []),
        ...(record.relatedFiles ?? []),
        record.body ?? '',
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    }

    function renderAnalyticsPanel() {
      if (!analyticsProjection) {
        if (analyticsSummary) analyticsSummary.innerHTML = '';
        analyticsList.innerHTML = activeView === 'analytics'
          ? '<div class="empty">Загрузка analytics projection...</div>'
          : '';
        if (analyticsPanelCount) analyticsPanelCount.textContent = '0';
        if (analyticsIntakeTabCount) analyticsIntakeTabCount.textContent = '0';
        if (analyticsClosingTabCount) analyticsClosingTabCount.textContent = '0';
        if (analyticsPagination) {
          analyticsPagination.hidden = true;
          analyticsPagination.innerHTML = '';
        }
        return;
      }

      const query = getPanelSearchQuery();
      const queryMatched = (analyticsProjection.records ?? []).filter((record) => matchesAnalyticsRecordQuery(record, query));
      const intakeRecords = sortAnalyticsRecords(
        queryMatched.filter((record) => readAnalyticsRecordKind(record) === 'intake'),
        activeAnalyticsSort,
      );
      const closingRecords = sortAnalyticsRecords(
        queryMatched.filter((record) => readAnalyticsRecordKind(record) === 'closing'),
        activeAnalyticsSort,
      );
      const records = activeAnalyticsTab === 'closing' ? closingRecords : intakeRecords;

      if (analyticsIntakeTabCount) analyticsIntakeTabCount.textContent = String(intakeRecords.length);
      if (analyticsClosingTabCount) analyticsClosingTabCount.textContent = String(closingRecords.length);
      if (analyticsPanelCount) analyticsPanelCount.textContent = String(records.length);

      const pagination = paginateItems(records, analyticsPage, workflowPageSize);
      if (pagination.page !== analyticsPage) {
        persistPanelPage('analytics', pagination.page);
      }

      const emptyCopy = activeAnalyticsTab === 'closing'
        ? 'Итоги закрытых эпиков не найдены для текущего фильтра.'
        : 'Аналитические разборы не найдены для текущего фильтра.';

      analyticsList.innerHTML = pagination.items.length
        ? pagination.items.map((record) => {
          const isClosing = readAnalyticsRecordKind(record) === 'closing';
          const queryPreview = String(record.query ?? '').slice(0, 120);
          const relatedNote = formatAnalyticsRelatedTasksCardNote(record.relatedWorkItems);
          const feedsEpics = Array.isArray(record.feeds_epics) ? record.feeds_epics : [];
          const epicNote = isClosing && feedsEpics.length > 0
            ? ' · ' + escapeHtml(feedsEpics.join(', '))
            : '';
          const kindLine = isClosing
            ? 'closing · post-mortem' + epicNote
            : escapeHtml(record.topic) + ' · ' + escapeHtml(record.status);
          const lineageBadge = buildAnalyticsLineageListBadge(record);
          return renderListRow({
            title: record.title,
            lines: [
              kindLine + ' · ' + escapeHtml((record.tags ?? []).filter((tag) => tag !== 'closing-analysis').join(', ') || 'no tags'),
              escapeHtml(queryPreview + (String(record.query ?? '').length > 120 ? '…' : '')),
            ],
            footerLeft: renderAnalyticsRecordKeyChip(record) + relatedNote + lineageBadge,
            footerRight: renderOwnerAvatar(record.author || 'operator', { title: record.author || 'operator' }),
            selected: selectedAnalyticsRecordId === record.id,
            attrs: { 'data-analytics-record-id': record.id },
          });
        }).join('')
        : '<div class="empty">' + emptyCopy + '</div>';
      renderWorkflowPagination(analyticsPagination, pagination, 'analytics');
    }

    function handleAnalyticsRecordClick(event) {
      const button = event.target.closest('.list-row[data-analytics-record-id]');
      if (!button || !analyticsProjection) {
        return;
      }

      const record = (analyticsProjection.records ?? []).find((entry) => entry.id === button.dataset.analyticsRecordId);
      if (!record) {
        return;
      }

      selectedAnalyticsRecordId = record.id;
      renderAnalyticsPanel();
      openAnalyticsRecordDetails(record);
    }

    function formatAnalyticsRelatedTasksCardNote(relatedWorkItems) {
      const related = Array.isArray(relatedWorkItems) ? relatedWorkItems : [];
      if (related.length === 0) {
        return '';
      }

      const doneCount = related.filter((entry) => entry.status === 'done' || entry.status === 'verified').length;
      const tone = doneCount === related.length
        ? 'ok'
        : (doneCount === 0 ? 'default' : 'accent');

      return renderClientUiBadge({
        label: doneCount + '/' + related.length + ' задач',
        tone,
        testId: 'analytics-related-tasks-count',
        title: doneCount + ' из ' + related.length + ' задач завершено',
      });
    }

    function buildAnalyticsLineageListBadge(record) {
      const lineage = record.analyticsLineage;
      if (!lineage) {
        return '';
      }

      const parts = [];
      if (lineage.parent && lineage.parent.key) {
        parts.push('↳ ' + escapeHtml(lineage.parent.key));
      }

      const continuationCount = Array.isArray(lineage.continuations) ? lineage.continuations.length : 0;
      if (continuationCount > 0) {
        const suffix = continuationCount === 1
          ? 'продолжение'
          : (continuationCount < 5 ? 'продолжения' : 'продолжений');
        parts.push(continuationCount + ' ' + suffix);
      }

      if (parts.length === 0) {
        return '';
      }

      return ' · <span class="analytics-lineage-badge" data-testid="analytics-lineage-badge">' + parts.join(' · ') + '</span>';
    }

    function renderAnalyticsLineageSections(record) {
      const lineage = record.analyticsLineage;
      if (!lineage) {
        return '';
      }

      const hasParent = Boolean(lineage.parent);
      const continuations = Array.isArray(lineage.continuations) ? lineage.continuations : [];
      const related = Array.isArray(lineage.related) ? lineage.related : [];
      if (!hasParent && continuations.length === 0 && related.length === 0) {
        return '';
      }

      function renderLineageNavItem(entry) {
        const label = (entry.key ? entry.key + ': ' : '') + (entry.title || entry.id);
        return '<li><button type="button" class="analytics-lineage-nav-btn" data-analytics-record-id="' + escapeHtml(entry.id) + '" data-testid="analytics-lineage-nav">' +
          escapeHtml(label) +
        '</button></li>';
      }

      let html = '<section class="detail-section analytics-lineage-section" data-testid="analytics-lineage-section">';

      if (hasParent) {
        html += '<h3 class="analytics-section-title">Родительский разбор</h3>' +
          '<ul class="analytics-lineage-list">' + renderLineageNavItem(lineage.parent) + '</ul>';
      }

      if (continuations.length > 0) {
        html += '<h3 class="analytics-section-title">Продолжения</h3>' +
          '<ul class="analytics-lineage-list">' + continuations.map(renderLineageNavItem).join('') + '</ul>';
      }

      if (related.length > 0) {
        html += '<h3 class="analytics-section-title">Связанные разборы</h3>' +
          '<ul class="analytics-lineage-list">' + related.map(renderLineageNavItem).join('') + '</ul>';
      }

      html += '</section>';
      return html;
    }

    function openAnalyticsRecordById(recordId) {
      const record = (analyticsProjection?.records ?? []).find((entry) => entry.id === recordId);
      if (!record) {
        return;
      }

      selectedAnalyticsRecordId = record.id;
      renderAnalyticsPanel();
      openAnalyticsRecordDetails(record);
    }

    function renderAnalyticsIntentGraphSections(record) {
      const graph = record.intentGraph;
      if (!graph || !graph.question) {
        return '';
      }

      const optionsHtml = (graph.options ?? []).map((option) =>
        '<div class="analytics-intent-option' + (option.selected ? ' is-selected' : '') + '" data-testid="analytics-intent-option">' +
          '<strong>' + escapeHtml(option.title || option.id) + '</strong>' +
          (option.selected ? ' <span class="pill">выбран</span>' : '') +
        '</div>',
      ).join('');

      const decision = graph.selectedDecision;
      const decisionHtml = decision
        ? '<section class="detail-section analytics-intent-decision" data-testid="analytics-selected-decision">' +
          '<h3 class="analytics-section-title">Выбранное решение</h3>' +
          '<p><strong>' + escapeHtml(decision.title || decision.id) + '</strong></p>' +
          '</section>'
        : '';

      const drilldownItems = [];
      drilldownItems.push('Вопрос: ' + escapeHtml(graph.question.title || graph.question.id));
      (graph.options ?? []).forEach((option) => {
        drilldownItems.push((option.selected ? '✓ ' : '○ ') + 'Вариант: ' + escapeHtml(option.title || option.id));
      });
      if (decision) {
        drilldownItems.push('→ Решение: ' + escapeHtml(decision.title || decision.id));
      }
      const related = Array.isArray(record.relatedWorkItems) ? record.relatedWorkItems : [];
      related.forEach((entry) => {
        drilldownItems.push('→ Задача: ' + escapeHtml(entry.title || entry.id) + ' (' + escapeHtml(entry.status || '—') + ')');
      });

      return '<section class="detail-section" data-testid="analytics-intent-question">' +
          '<h3 class="analytics-section-title">Аналитический вопрос</h3>' +
          '<p>' + escapeHtml(graph.question.title || graph.question.id) + '</p>' +
        '</section>' +
        (optionsHtml
          ? '<section class="detail-section analytics-intent-options" data-testid="analytics-intent-options">' +
            '<h3 class="analytics-section-title">Варианты решений</h3>' + optionsHtml + '</section>'
          : '') +
        decisionHtml +
        '<section class="detail-section intent-graph-drilldown" data-testid="intent-graph-drilldown">' +
          '<h3 class="analytics-section-title">Lineage</h3>' +
          '<div class="pipeline-prose">' +
          drilldownItems.map((line) => '<p class="pipeline-prose-p">' + line + '</p>').join('') +
          '</div></section>';
    }

    function renderAnalyticsRelatedWorkItemsSection(record) {
      const related = Array.isArray(record.relatedWorkItems) ? record.relatedWorkItems : [];
      if (related.length === 0) {
        return '<section class="detail-section analytics-related-tasks" data-testid="analytics-related-tasks">' +
          '<h3 class="analytics-section-title">Задачи из разбора</h3>' +
          '<p class="muted">По этому разбору задачи в бэклоге пока не найдены.</p>' +
          '</section>';
      }

      const rows = related.map((entry) =>
        '<li class="analytics-related-task-row">' +
          '<button type="button" class="analytics-related-task-btn" data-task-id="' + escapeHtml(entry.id) + '" data-testid="analytics-related-task">' +
            escapeHtml(entry.title || entry.id) +
          '</button>' +
          '<span class="analytics-related-task-meta">' + escapeHtml(entry.status || '—') + '</span>' +
        '</li>',
      ).join('');

      return '<section class="detail-section analytics-related-tasks" data-testid="analytics-related-tasks">' +
        '<h3 class="analytics-section-title">Задачи из разбора</h3>' +
        '<ul class="analytics-related-tasks-list">' + rows + '</ul>' +
        '</section>';
    }

    function buildAnalyticsMarkdownForLlm(record) {
      const rawBody = String(record?.body ?? '').trim();
      if (rawBody) {
        return rawBody;
      }

      const lines = [];
      const title = String(record?.title ?? '').trim();
      const query = String(record?.query ?? '').trim();
      const topic = String(record?.topic ?? '').trim();
      const key = String(record?.key ?? record?.id ?? '').trim();

      if (title) {
        lines.push('# ' + title, '');
      }
      if (key) {
        lines.push('**Ключ:** ' + key, '');
      }
      if (query) {
        lines.push('**Запрос:** ' + query, '');
      }
      if (topic) {
        lines.push('**Тема:** ' + topic, '');
      }

      return lines.join('\\n').trim() || '—';
    }

    async function copyTextToClipboard(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    let analyticsCopyMdFeedbackTimer = null;

    async function copyAnalyticsMarkdownForLlm(record, button) {
      const markdown = buildAnalyticsMarkdownForLlm(record);
      await copyTextToClipboard(markdown);

      if (!button) {
        return;
      }

      const previousLabel = button.textContent;
      button.textContent = 'Скопировано';
      button.disabled = true;
      if (analyticsCopyMdFeedbackTimer) {
        clearTimeout(analyticsCopyMdFeedbackTimer);
      }
      analyticsCopyMdFeedbackTimer = setTimeout(function() {
        button.textContent = previousLabel;
        button.disabled = false;
        analyticsCopyMdFeedbackTimer = null;
      }, 1600);
    }

    function openAnalyticsRecordDetails(record) {
      const isClosing = readAnalyticsRecordKind(record) === 'closing';
      detailContext = {
        type: 'analytics',
        recordId: record.id,
        recordKey: record.key || record.id,
        recordKind: isClosing ? 'closing' : 'intake',
        bodyPath: record.bodyPath || '',
      };
      detailTitle.textContent = record.title;
      detailId.textContent = record.key || record.id;
      detailStack.reset();
      detailStack.push({
        type: 'analytics',
        key: record.id,
        title: record.title || record.key || record.id,
        payload: { recordId: record.id, recordKey: record.key || record.id },
      });
      const answerBody = stripAnalyticsBodyPreamble(record.body || '');
      const feedsEpics = Array.isArray(record.feeds_epics) ? record.feeds_epics : [];
      const metadataHtml =
        renderDetailText('Ключ', record.key || '—') +
        renderDetailText('Тип', isClosing ? 'Итог эпика (closing)' : 'Разбор (intake)') +
        renderDetailText('ID', record.id) +
        renderDetailText('Тема', record.topic) +
        renderDetailText('Статус', record.status) +
        renderDetailText('Автор', record.author || 'operator') +
        renderDetailText('Создано', record.createdAt || '—') +
        (isClosing && feedsEpics.length > 0 ? renderDetailList('Эпики', feedsEpics) : '') +
        renderDetailList('Теги', record.tags ?? []) +
        renderDetailList('Связанные файлы', record.relatedFiles ?? [], { linkRepoFiles: true });

      const querySection = isClosing
        ? (String(record.query ?? '').trim() !== ''
          ? '<section class="detail-section analytics-query-section" data-testid="analytics-query-section">' +
            '<h3 class="analytics-section-title">Контекст</h3>' +
            '<p class="analytics-query-text">' + escapeHtml(record.query) + '</p>' +
            '</section>'
          : '')
        : '<section class="detail-section analytics-query-section" data-testid="analytics-query-section">' +
          '<h3 class="analytics-section-title">Запрос</h3>' +
          '<p class="analytics-query-text">' + escapeHtml(record.query || '—') + '</p>' +
          '</section>';

      const bodySectionTitle = isClosing ? 'Итоги эпика' : 'Ответ';
      const copyMdButton = renderClientUiButton({
        label: 'Копировать MD',
        variant: 'secondary',
        size: 'xs',
        testId: 'analytics-copy-md',
        attrs: {
          'data-action': 'copy-analytics-md',
          'aria-label': 'Копировать markdown разбора для LLM',
        },
      });

      detailBody.innerHTML =
        renderDetailBackButton('← К аналитике') +
        '<div class="analytics-qna" data-testid="analytics-qna">' +
          querySection +
          '<section class="detail-section analytics-record-body" data-testid="analytics-record-body">' +
            '<div class="analytics-section-header">' +
              '<h3 class="analytics-section-title">' + bodySectionTitle + '</h3>' +
              copyMdButton +
            '</div>' +
            autolinkRepoFilePathsInHtml(renderMarkdownDocument(answerBody || '—'), record.bodyPath || '') +
          '</section>' +
        '</div>' +
        (isClosing ? '' : renderAnalyticsIntentGraphSections(record)) +
        renderAnalyticsLineageSections(record) +
        renderAnalyticsRelatedWorkItemsSection(record) +
        wrapDetailAccordion('Метаданные', metadataHtml, { testid: 'analytics-record-meta' });
      openDetailDrawer();
      queueMicrotask(function() {
        mountMarkdownMermaidDiagrams(detailBody.querySelector('.analytics-record-body'));
      });
      bindDetailNavBack(() => {
        selectedAnalyticsRecordId = null;
        detailContext = null;
        renderAnalyticsPanel();
        closeTaskDetails();
      });
      detailClose.focus();
    }

    function readMermaidThemeVariables() {
      const styles = getComputedStyle(document.body);
      const pick = function(name, fallback) {
        const value = styles.getPropertyValue(name).trim();
        return value || fallback;
      };
      const panel = pick('--panel', '#ffffff');
      const panel2 = pick('--panel-2', '#f4f5f7');
      const border = pick('--border', '#dfe1e6');
      const text = pick('--text', '#172b4d');
      const muted = pick('--muted', '#5e6c84');
      const bg = pick('--bg', '#ffffff');

      return {
        background: bg,
        mainBkg: panel2,
        primaryColor: panel2,
        primaryTextColor: text,
        primaryBorderColor: border,
        secondaryColor: panel2,
        secondaryTextColor: text,
        secondaryBorderColor: border,
        tertiaryColor: panel2,
        tertiaryTextColor: text,
        tertiaryBorderColor: border,
        lineColor: muted,
        textColor: text,
        nodeBorder: border,
        clusterBkg: panel,
        clusterBorder: border,
        titleColor: text,
        edgeLabelBackground: bg,
      };
    }

    function fixMermaidSvgSizing(root) {
      root.querySelectorAll('.markdown-mermaid-wrap svg').forEach(function(svg) {
        svg.style.removeProperty('max-height');
        svg.style.height = 'auto';
        svg.style.width = '100%';
        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/\s+/u).map(Number);
          if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
            svg.removeAttribute('height');
          }
        }
      });
    }

    function dedupeMermaidClusterLabelText(rootText) {
      const tspans = [...rootText.querySelectorAll('tspan')];
      if (tspans.length <= 1) {
        rootText.setAttribute('text-anchor', 'start');
        return;
      }

      const fullText = (rootText.textContent || '').replace(/\s+/gu, ' ').trim();
      let keeper = tspans.find(function(tspan) {
        return (tspan.textContent || '').replace(/\s+/gu, ' ').trim() === fullText;
      });
      if (!keeper) {
        keeper = tspans.reduce(function(best, tspan) {
          const len = (tspan.textContent || '').trim().length;
          const bestLen = (best.textContent || '').trim().length;
          return len > bestLen ? tspan : best;
        }, tspans[0]);
      }

      const title = (keeper.textContent || fullText).replace(/\s+/gu, ' ').trim();
      while (rootText.firstChild) {
        rootText.removeChild(rootText.firstChild);
      }

      const single = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      single.setAttribute('x', '0');
      single.setAttribute('dy', keeper.getAttribute('dy') || '1em');
      single.textContent = title;
      rootText.appendChild(single);
      rootText.setAttribute('text-anchor', 'start');
    }

    function alignMermaidClusterLabels(root) {
      root.querySelectorAll('.markdown-mermaid-wrap svg g.cluster').forEach(function(cluster) {
        const labelGroup = cluster.querySelector(':scope > g.cluster-label');
        if (!labelGroup) {
          return;
        }

        labelGroup.querySelectorAll('foreignObject').forEach(function(foreignObject) {
          foreignObject.remove();
        });

        const textNodes = [...labelGroup.querySelectorAll(':scope > text')];
        if (textNodes.length > 1) {
          textNodes.slice(1).forEach(function(extraText) {
            extraText.remove();
          });
        }

        const rootText = labelGroup.querySelector('text');
        if (rootText) {
          dedupeMermaidClusterLabelText(rootText);
        }
      });
    }

    async function mountMarkdownMermaidDiagrams(root) {
      if (!root || typeof mermaid === 'undefined') {
        return;
      }

      const blocks = [...root.querySelectorAll('pre.mermaid, div.mermaid')];
      if (blocks.length === 0) {
        return;
      }

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: readMermaidThemeVariables(),
          securityLevel: 'loose',
          fontFamily: 'inherit',
          flowchart: {
            htmlLabels: false,
            curve: 'linear',
            padding: 16,
            subGraphTitleMargin: { top: 24, bottom: 10 },
          },
        });
        await mermaid.run({ nodes: blocks, suppressErrors: true });
        fixMermaidSvgSizing(root);
        alignMermaidClusterLabels(root);
      } catch (error) {
        console.warn('mermaid render failed', error);
      }
    }

    function handlePromptRuleCardClick(event) {
      const button = event.target.closest('.list-row[data-prompt-rule-id]');
      if (!button || !promptsProjection) {
        return;
      }

      const rule = (promptsProjection.rules ?? []).find((entry) => entry.id === button.dataset.promptRuleId);
      if (!rule) {
        return;
      }

      selectedPromptRuleId = rule.id;
      renderPromptsPanel();
      openPromptRuleDetails(rule);
    }

    function openPromptRuleDetails(rule) {
      detailTitle.textContent = rule.name;
      detailId.textContent = rule.id;
      detailBody.innerHTML =
        renderDetailBackButton('← К промптам') +
        renderDetailPathText('Файл', rule.filePath) +
        renderDetailText('Validation', rule.validationStatus) +
        renderDetailText('Trace status', rule.traceStatus) +
        renderDetailText('Базис', rule.basis) +
        renderDetailText('Вектор', rule.vector) +
        renderDetailText('Цель', rule.goal) +
        renderDetailList('Проверки', rule.checks ? rule.checks.split('\\n').filter(Boolean) : []) +
        renderDetailList('Свидетельства', rule.evidence ? rule.evidence.split('\\n').filter(Boolean) : []) +
        renderDetailList('Labels', Object.entries(rule.labels || {}).map(([key, value]) => key + ': ' + value)) +
        (rule.validationErrors?.length
          ? renderDetailList('Validation errors', rule.validationErrors)
          : '') +
        (rule.validationWarnings?.length
          ? renderDetailList('Validation warnings', rule.validationWarnings)
          : '') +
        '<section class="detail-section prompt-rule-editor" data-testid="prompt-rule-editor">' +
          '<h3>Редактирование</h3>' +
          '<p>Bounded save: только <code>rules/agent-behavior/*.bvc</code>.</p>' +
          '<textarea id="prompt-rule-source" data-testid="prompt-rule-source" spellcheck="false" disabled>Загрузка...</textarea>' +
          '<div id="prompt-rule-editor-errors" class="prompt-rule-editor-errors" data-testid="prompt-rule-editor-errors" hidden></div>' +
          '<button type="button" id="prompt-rule-save" data-testid="prompt-rule-save" disabled>Сохранить</button>' +
        '</section>';
      openDetailDrawer();
      bindDetailNavBack(() => {
        selectedPromptRuleId = null;
        renderPromptsPanel();
        closeTaskDetails();
      });
      loadPromptRuleEditor(rule.id);
      detailClose.focus();
    }

    async function loadPromptRuleEditor(ruleId) {
      const textarea = document.querySelector('#prompt-rule-source');
      const saveButton = document.querySelector('#prompt-rule-save');
      const errorsEl = document.querySelector('#prompt-rule-editor-errors');
      if (!textarea || !saveButton) {
        return;
      }

      try {
        const response = await fetch('/api/prompt-rules/source?ruleId=' + encodeURIComponent(ruleId));
        const payload = await response.json();
        if (!response.ok || !payload.sourceText) {
          throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
        }

        textarea.value = payload.sourceText;
        textarea.disabled = false;
        saveButton.disabled = false;
        saveButton.onclick = () => submitPromptRuleSave(payload.filePath, textarea, errorsEl, ruleId);
        if (errorsEl) {
          errorsEl.hidden = true;
          errorsEl.textContent = '';
        }
      } catch (error) {
        textarea.value = '';
        textarea.disabled = true;
        saveButton.disabled = true;
        if (errorsEl) {
          errorsEl.hidden = false;
          errorsEl.textContent = String(error.message || error);
        }
      }
    }

    async function submitPromptRuleSave(filePath, textarea, errorsEl, ruleId) {
      try {
        const response = await fetch('/api/prompt-rules/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ filePath, sourceText: textarea.value }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          const validationText = (payload.validation?.errors ?? []).join('\\n');
          throw new Error((payload.error || 'save failed') + (validationText ? ': ' + validationText : ''));
        }

        promptsPanelLoaded = false;
        await ensureLazyViewData('prompts');
        renderPromptsPanel();
        const updated = (promptsProjection?.rules ?? []).find((entry) => entry.id === ruleId);
        if (updated) {
          openPromptRuleDetails(updated);
        }
        if (errorsEl) {
          errorsEl.hidden = true;
          errorsEl.textContent = '';
        }
      } catch (error) {
        if (errorsEl) {
          errorsEl.hidden = false;
          errorsEl.textContent = String(error.message || error);
        }
      }
    }

    async function reloadOperatorSnapshots() {
      const snapshotResponse = await fetch('/api/snapshot');
      if (!snapshotResponse.ok) {
        throw new Error('запрос snapshot завершился с кодом ' + snapshotResponse.status);
      }
      snapshot = await snapshotResponse.json();

      const dashboardResponse = await fetch('/api/dashboard-snapshot');
      if (!dashboardResponse.ok) {
        throw new Error('запрос dashboard snapshot завершился с кодом ' + dashboardResponse.status);
      }
      dashboardSnapshot = await dashboardResponse.json();

      const shellResponse = await fetch('/api/operator-shell-snapshot');
      if (!shellResponse.ok) {
        throw new Error('запрос operator shell snapshot завершился с кодом ' + shellResponse.status);
      }
      operatorShellSnapshot = await shellResponse.json();
    }

    async function submitPromoteReady(workId) {
      if (!workId) return;

      try {
        const response = await fetch('/api/work-item/promote-ready', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workId }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          const detail = payload.unsatisfiedDependencies?.length
            ? ' (' + payload.unsatisfiedDependencies.join(', ') + ')'
            : '';
          throw new Error((payload.error || payload.message || ('HTTP ' + response.status)) + detail);
        }

        await reloadOperatorSnapshots();
        render();

        const updated = snapshot.items.find((item) => item.id === workId);
        if (updated) {
          openTaskDetails(updated, { parentContext: detailContext?.parent ?? null });
        }
      } catch (error) {
        window.alert('Promote failed: ' + error.message);
      }
    }

    function formatVerificationStatusLabel(status) {
      const key = 'verification.status.' + String(status ?? 'pending');
      const localized = t(key);
      if (localized !== key) {
        return localized;
      }
      return status || t('verification.status.pending');
    }

    function formatVerificationTierLabel(tier) {
      const key = 'verification.tierLabel.' + String(tier ?? '');
      const localized = t(key);
      if (localized !== key) {
        return localized;
      }
      return tier;
    }

    function renderVerificationPanel() {
      if (!dashboardSnapshot?.verification) {
        verificationTierBadges.innerHTML = '';
        verificationMatrixWrap.innerHTML = '<div class="empty">Сводка проверок не загружена</div>';
        verificationEvidenceList.innerHTML = '';
        verificationWorkerRuns.innerHTML = '';
        if (verificationContractList) verificationContractList.innerHTML = '';
        if (verificationContractHealth) verificationContractHealth.innerHTML = '';
        if (verificationContractCount) verificationContractCount.textContent = '0';
        renderCodegenGatePanel();
        renderDaemonAuditPanel();
        renderCodeGapPanel();
        return;
      }

      const verification = dashboardSnapshot.verification;
      const counts = verification.tierCounts;
      verificationTierBadges.innerHTML =
        renderVerificationTierBadge(t('verification.tier.a'), counts.deterministic) +
        renderVerificationTierBadge(t('verification.tier.onebase'), counts.optionalEnv) +
        renderVerificationTierBadge(t('verification.tier.llm'), counts.optionalLlm);

      verificationMatrixWrap.innerHTML =
        '<table class="verification-matrix"><thead><tr><th>' + escapeHtml(t('verification.matrix.check')) + '</th><th>' + escapeHtml(t('verification.matrix.tier')) + '</th><th>' + escapeHtml(t('verification.matrix.command')) + '</th><th>' + escapeHtml(t('verification.matrix.status')) + '</th></tr></thead><tbody>' +
        verification.matrix.map((row) =>
          '<tr><td>' + escapeHtml(row.title) + '</td><td>' + escapeHtml(formatVerificationTierLabel(row.tier)) + '</td><td><code>' + escapeHtml(row.command) + '</code></td><td>' +
          renderVerificationStatus(row.status) + '</td></tr>'
        ).join('') +
        '</tbody></table>' +
        (verification.onebaseGate?.status === 'blocked'
          ? '<p class="empty">Гейт OneBase заблокирован' + (verification.onebaseGate.blockedTaskId ? ': ' + escapeHtml(verification.onebaseGate.blockedTaskId) : '') + '. Установите Go и запустите npm run test:optional:onebase.</p>'
          : '');

      renderVerificationContractPanel();

      const evidenceRows = dashboardSnapshot.recentEvidence || [];
      renderCodegenGatePanel();
      verificationEvidenceList.innerHTML = evidenceRows.length
        ? evidenceRows.map((row) =>
          '<li><h3>' + escapeHtml(row.taskId) + '</h3>' +
          '<p class="list-row-line">' + escapeHtml(row.status) + ' · ' + escapeHtml(preview(row.summary)) + '</p></li>'
        ).join('')
        : '<li class="empty">Нет недавних свидетельств в snapshot</li>';

      const workerRuns = dashboardSnapshot.workerRunSummaries || [];
      verificationWorkerRuns.innerHTML = workerRuns.length
        ? workerRuns.map((row) =>
          '<li><h3>' + escapeHtml(row.taskId || 'неизвестно') + '</h3>' +
          '<p class="list-row-line">' + escapeHtml(row.status || 'неизвестно') + ' · ' +
          escapeHtml(preview(row.summary || row.runId || '')) +
          (row.appliedTransition ? ' · переход: ' + escapeHtml(String(row.appliedTransition)) : '') +
          '</p></li>'
        ).join('')
        : '<li class="empty">Нет записей live-loop воркера в журнале</li>';

      renderDaemonAuditPanel();
      renderCodeGapPanel();
    }

    function renderVerificationContractPanel() {
      if (!verificationContractList || !verificationContractHealth || !verificationContractCount) {
        return;
      }

      const summaries = dashboardSnapshot?.verification?.contractSummaries ?? [];
      const health = dashboardSnapshot?.verification?.contractHealth;

      verificationContractCount.textContent = String(summaries.length);
      verificationContractHealth.innerHTML = health
        ? '<span class="pill">Structured evidence: <strong>' + escapeHtml(String(health.structuredEvidencePct ?? 0)) + '%</strong></span>' +
          '<span class="pill">Contract ready: <strong>' + escapeHtml(String(health.contractReadyPct ?? 0)) + '%</strong></span>' +
          '<span class="pill">Gate tasks: <strong>' + escapeHtml(String(health.gateTaskCount ?? 0)) + '</strong></span>'
        : '';

      verificationContractList.innerHTML = summaries.length
        ? summaries.map((entry) => {
          const tier = entry.contract?.verification?.tier ?? '—';
          const matrixRowId = entry.contract?.verification?.matrixRowId ?? '—';
          const violationLines = (entry.readiness?.violations ?? []).map((violation) =>
            '<li><strong>' + escapeHtml(violation.code) + '</strong>: ' + escapeHtml(violation.message) +
            (violation.fix ? ' · ' + escapeHtml(violation.fix) : '') + '</li>',
          ).join('');
          return '<li data-work-id="' + escapeHtml(entry.workId) + '">' +
            '<h3>' + escapeHtml(entry.title || entry.workId) + '</h3>' +
            '<p class="list-row-line">Контракт · Tier ' + escapeHtml(String(tier)) + ' · ' + escapeHtml(String(matrixRowId)) +
            ' · ' + renderVerificationStatus(entry.readiness?.ok ? 'passed' : 'failed') +
            ' · нарушений: ' + escapeHtml(String(entry.readiness?.violationCount ?? 0)) + '</p>' +
            (violationLines ? '<ul>' + violationLines + '</ul>' : '') +
            '</li>';
        }).join('')
        : '<li class="empty">Нет gate-задач в текущем snapshot</li>';
    }

    function renderCodegenGatePanel() {
      if (!codegenGateList || !codegenGateSummary || !codegenGateCount) {
        return;
      }

      const gate = dashboardSnapshot?.verification?.codegenGate;
      if (!gate) {
        codegenGateCount.textContent = '0';
        codegenGateSummary.innerHTML = '';
        codegenGateList.innerHTML = '<li class="empty">Гейт codegen не загружен</li>';
        return;
      }

      codegenGateCount.textContent = String(gate.codegenFacingCount ?? 0);
      codegenGateSummary.innerHTML =
        renderVerificationStatus(gate.status ?? 'not_run') +
        '<span class="pill">С codegen: <strong>' + escapeHtml(String(gate.codegenFacingCount ?? 0)) + '</strong></span>' +
        '<span class="pill">Пройдено: <strong>' + escapeHtml(String(gate.passedCount ?? 0)) + '</strong></span>' +
        '<span class="pill">Провалено: <strong>' + escapeHtml(String(gate.failedCount ?? 0)) + '</strong></span>';

      const items = gate.items ?? [];
      codegenGateList.innerHTML = items.length
        ? items.map((entry) =>
          '<li data-work-id="' + escapeHtml(entry.workId) + '">' +
          '<h3>' + escapeHtml(entry.title || entry.workId) + '</h3>' +
          '<p class="list-row-line">' + renderVerificationStatus(entry.ok ? 'passed' : 'failed') +
          ' · ' + escapeHtml(formatVerificationStatusLabel(entry.status) || 'неизвестно') + '</p>' +
          (entry.diagnostics?.length
            ? '<ul>' + entry.diagnostics.map((diagnostic) =>
              '<li><strong>' + escapeHtml(diagnostic.code) + '</strong>: ' + escapeHtml(diagnostic.message) + '</li>'
            ).join('') + '</ul>'
            : '') +
          '</li>',
        ).join('')
        : '<li class="empty">Нет WorkItems с codegen в текущем snapshot</li>';
    }

    function renderDaemonAuditPanel() {
      if (!daemonAuditList || !daemonAuditCount) {
        return;
      }

      if (!daemonAuditPanelLoaded) {
        daemonAuditCount.textContent = '0';
        daemonAuditList.innerHTML = activeView === 'verification'
          ? '<li class="empty">Загрузка журнала daemon...</li>'
          : '';
        return;
      }

      const entries = daemonAuditTail?.entries ?? [];
      daemonAuditCount.textContent = String(daemonAuditTail?.totalCount ?? entries.length);

      daemonAuditList.innerHTML = entries.length
        ? entries.map((entry) =>
          '<li data-tick-id="' + escapeHtml(entry.tickId || '') + '">' +
          '<h3>' + escapeHtml(entry.event || 'событие_daemon') + '</h3>' +
          '<p class="list-row-line">' +
          escapeHtml(entry.recordedAt || '') +
          (entry.taskId ? ' · задача: ' + escapeHtml(entry.taskId) : '') +
          (entry.workerStatus ? ' · воркер: ' + escapeHtml(entry.workerStatus) : '') +
          (entry.recoveryClass ? ' · восстановление: ' + escapeHtml(entry.recoveryClass) : '') +
          '</p>' +
          (entry.summary ? '<p class="list-row-line">' + escapeHtml(entry.summary) + '</p>' : '') +
          '</li>',
        ).join('')
        : '<li class="empty">Журнал daemon пуст. Запустите npm run daemon -- --once.</li>';
    }

    function renderCodeGapPanel() {
      if (!codeGapProjection) {
        codeGapSummary.innerHTML = '';
        codeGapList.innerHTML = activeView === 'verification'
          ? '<li class="empty">Загрузка подсказок code-gap...</li>'
          : '';
        codeGapCount.textContent = '0';
        return;
      }

      const suggestions = codeGapProjection.suggestions ?? [];
      const query = getPanelSearchQuery();
      const filtered = suggestions.filter((entry) => {
        if (!query) {
          return true;
        }

        const haystack = [
          entry.suggestedWorkId,
          entry.title,
          entry.gapKind,
          entry.reason,
          ...(entry.targetFiles ?? []),
        ].join(' ').toLowerCase();

        return haystack.includes(query);
      });

      codeGapCount.textContent = String(codeGapProjection.suggestionCount ?? suggestions.length);
      codeGapSummary.innerHTML =
        '<span class="pill">Подсказок: <strong>' + escapeHtml(String(codeGapProjection.suggestionCount ?? 0)) + '</strong></span>' +
        '<span class="pill">Нужен обзор: <strong>' + escapeHtml(String(codeGapProjection.reviewRequired ? 'да' : 'нет')) + '</strong></span>' +
        '<span class="pill">Источник: <strong>' + escapeHtml(codeGapProjection.sourceReportPath ?? 'fixture') + '</strong></span>';

      codeGapList.innerHTML = filtered.length
        ? filtered.map((entry) =>
          '<li data-suggested-id="' + escapeHtml(entry.suggestedWorkId) + '">' +
          '<h3>' + escapeHtml(entry.suggestedWorkId) + '</h3>' +
          '<p class="list-row-line">' + escapeHtml(entry.gapKind) + ' · уверенность ' + escapeHtml(entry.confidence) + '</p>' +
          '<p class="list-row-line">' + escapeHtml(entry.title) + '</p>' +
          (entry.targetFiles?.length ? '<p class="list-row-line">' + escapeHtml(entry.targetFiles.join(', ')) + '</p>' : '') +
          (entry.reason ? '<p class="list-row-line">' + escapeHtml(entry.reason) + '</p>' : '') +
          '<div class="code-gap-actions">' +
          renderClientUiButton({ label: 'Просмотр черновика', variant: 'secondary', attrs: { 'data-action': 'code-gap-preview', 'data-suggested-id': entry.suggestedWorkId } }) +
          renderClientUiButton({ label: 'Добавить в бэклог', variant: 'primary', disabled: !(codeGapIntakeProposal?.ok && codeGapIntakeActiveId === entry.suggestedWorkId), attrs: { 'data-action': 'code-gap-apply', 'data-suggested-id': entry.suggestedWorkId } }) +
          renderClientUiButton({ label: 'Отмена', variant: 'flat', attrs: { 'data-action': 'code-gap-cancel', 'data-suggested-id': entry.suggestedWorkId } }) +
          '</div></li>'
        ).join('')
        : '<li class="empty">Подсказки code-gap не найдены для текущего фильтра.</li>';

      if (codeGapIntakeProposal?.ok && codeGapIntakeActiveId && codeGapIntakePreview) {
        codeGapIntakePreview.hidden = false;
        codeGapIntakePreview.textContent = codeGapIntakeProposal.formattedAtom || '';
      } else if (codeGapIntakePreview) {
        codeGapIntakePreview.hidden = true;
        codeGapIntakePreview.textContent = '';
      }
    }

    function resetCodeGapIntakeDraft() {
      codeGapIntakeProposal = null;
      codeGapIntakeActiveId = null;
      if (codeGapIntakePreview) {
        codeGapIntakePreview.hidden = true;
        codeGapIntakePreview.textContent = '';
      }
      if (codeGapIntakeErrors) {
        codeGapIntakeErrors.hidden = true;
        codeGapIntakeErrors.textContent = '';
      }
      renderCodeGapPanel();
    }

    function findCodeGapSuggestion(suggestedWorkId) {
      return (codeGapProjection?.suggestions ?? []).find((entry) => entry.suggestedWorkId === suggestedWorkId) ?? null;
    }

    function handleCodeGapIntakeClick(event) {
      const button = event.target.closest('button[data-action]');
      if (!button || !codeGapList.contains(button)) {
        return;
      }

      const suggestedWorkId = button.dataset.suggestedId ?? '';
      if (button.dataset.action === 'code-gap-preview') {
        submitCodeGapIntakeProposal(suggestedWorkId);
      } else if (button.dataset.action === 'code-gap-apply') {
        submitCodeGapIntakeApply(suggestedWorkId);
      } else if (button.dataset.action === 'code-gap-cancel') {
        resetCodeGapIntakeDraft();
      }
    }

    async function submitCodeGapIntakeProposal(suggestedWorkId) {
      const suggestion = findCodeGapSuggestion(suggestedWorkId);
      if (!suggestion) {
        return;
      }

      if (codeGapIntakeErrors) {
        codeGapIntakeErrors.hidden = true;
        codeGapIntakeErrors.textContent = '';
      }

      try {
        const response = await fetch('/api/code-gap-intake/proposal', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            suggestion,
            sourceReportPath: codeGapProjection?.sourceReportPath ?? '',
          }),
        });
        const payload = await response.json();
        codeGapIntakeProposal = payload;
        codeGapIntakeActiveId = suggestedWorkId;

        if (!response.ok || !payload.ok) {
          if (codeGapIntakePreview) {
            codeGapIntakePreview.hidden = true;
            codeGapIntakePreview.textContent = '';
          }
          if (codeGapIntakeErrors) {
            codeGapIntakeErrors.hidden = false;
            codeGapIntakeErrors.textContent = (payload.validationErrors ?? [payload.error ?? 'proposal_failed']).join('\\n');
          }
        } else if (codeGapIntakePreview) {
          codeGapIntakePreview.hidden = false;
          codeGapIntakePreview.textContent = payload.formattedAtom || JSON.stringify(payload.codeGapDraft, null, 2);
        }
      } catch (error) {
        if (codeGapIntakeErrors) {
          codeGapIntakeErrors.hidden = false;
          codeGapIntakeErrors.textContent = error instanceof Error ? error.message : String(error);
        }
      } finally {
        renderCodeGapPanel();
      }
    }

    async function submitCodeGapIntakeApply(suggestedWorkId) {
      if (!codeGapIntakeProposal?.ok || codeGapIntakeActiveId !== suggestedWorkId) {
        return;
      }

      try {
        const response = await fetch('/api/code-gap-intake/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ proposal: codeGapIntakeProposal }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          if (codeGapIntakeErrors) {
            codeGapIntakeErrors.hidden = false;
            codeGapIntakeErrors.textContent = (payload.validationErrors ?? [payload.error ?? 'apply_failed']).join('\\n');
          }
          return;
        }

        resetCodeGapIntakeDraft();
        await loadSnapshot();
      } catch (error) {
        if (codeGapIntakeErrors) {
          codeGapIntakeErrors.hidden = false;
          codeGapIntakeErrors.textContent = error instanceof Error ? error.message : String(error);
        }
      }
    }

    function renderVerificationTierBadge(label, counts) {
      return '<span class="verification-tier-badge">' + escapeHtml(label) + ': ' +
        counts.passed + ' пройдено / ' + counts.pending + ' ожидает / ' + counts.blocked + ' заблокировано</span>';
    }

    function renderVerificationStatus(status) {
      const cssClass = 'verification-status is-' + String(status || 'pending').replace(/_/g, '_');
      return '<span class="' + cssClass + '">' + escapeHtml(formatVerificationStatusLabel(status)) + '</span>';
    }

    function renderNavigationCounts(items) {
      const counts = countByStatus(items);
      const backlogTotal = countGroupItems(counts, backlogGroup);
      const doneTotal = countGroupItems(counts, doneArchiveGroup);
      workflowBacklogTabCount.textContent = String(backlogTotal);
      workflowArchiveTabCount.textContent = String(doneTotal);
    }

    function readItemClosedAtMs(item) {
      const raw = item?.closedAt ?? item?.labels?.['work.closed_at'] ?? '';
      const parsed = Date.parse(String(raw));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function sortDoneArchiveItems(items) {
      return [...items].sort((left, right) => {
        const delta = readItemClosedAtMs(right) - readItemClosedAtMs(left);
        if (delta !== 0) {
          return delta;
        }
        return String(right.id).localeCompare(String(left.id), 'en', { sensitivity: 'variant' });
      });
    }

    function resetListPages() {
      backlogPage = 1;
      archivePage = 1;
      promptsPage = 1;
      memoryPage = 1;
      analyticsPage = 1;
      kanbanColumnVisibleCounts = Object.create(null);
      localStorage.setItem(backlogPageStorageKey, '1');
      localStorage.setItem(archivePageStorageKey, '1');
      localStorage.setItem(promptsPageStorageKey, '1');
      localStorage.setItem(memoryPageStorageKey, '1');
      localStorage.setItem(analyticsPageStorageKey, '1');
    }

    function getKanbanColumnVisibleLimit(columnId, total) {
      const requested = kanbanColumnVisibleCounts[columnId] ?? kanbanColumnPageSize;
      return Math.min(Math.max(kanbanColumnPageSize, requested), total);
    }

    function loadMoreKanbanColumn(columnId, total) {
      const current = kanbanColumnVisibleCounts[columnId] ?? kanbanColumnPageSize;
      if (current >= total) {
        return;
      }
      kanbanColumnVisibleCounts[columnId] = Math.min(current + kanbanColumnPageSize, total);
      renderBoard(getFilteredItems());
    }

    function shouldUseKanbanIncrementalPatch() {
      if (boardColumnMode !== 'extended') {
        return false;
      }
      const projection = operatorShellSnapshot?.kanbanBoard;
      if (!projection?.columns) {
        return false;
      }
      return projection.columns.every((column) => (column.workIds?.length ?? 0) <= kanbanColumnPageSize);
    }

    function setupKanbanColumnLazyLoad() {
      if (kanbanColumnObserver) {
        kanbanColumnObserver.disconnect();
        kanbanColumnObserver = null;
      }
      if (!board || activeView !== 'board') {
        return;
      }
      kanbanColumnObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const columnId = entry.target.dataset.kanbanColumnSentinel;
          if (!columnId) {
            continue;
          }
          const column = operatorShellSnapshot?.kanbanBoard?.columns?.find((candidate) => candidate.id === columnId);
          const total = column?.workIds?.length ?? 0;
          if (total > getKanbanColumnVisibleLimit(columnId, total)) {
            loadMoreKanbanColumn(columnId, total);
          }
        }
      }, { root: null, rootMargin: '160px 0px', threshold: 0 });
      board.querySelectorAll('[data-kanban-column-sentinel]').forEach((node) => {
        kanbanColumnObserver.observe(node);
      });
    }

    function paginateItems(items, page, pageSize) {
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const start = (safePage - 1) * pageSize;
      return {
        items: items.slice(start, start + pageSize),
        page: safePage,
        totalPages,
        total,
        from: total ? start + 1 : 0,
        to: Math.min(start + pageSize, total),
      };
    }

    function getPanelPage(kind) {
      if (kind === 'archive') return archivePage;
      if (kind === 'prompts') return promptsPage;
      if (kind === 'memory') return memoryPage;
      if (kind === 'analytics') return analyticsPage;
      return backlogPage;
    }

    function persistPanelPage(kind, page) {
      if (kind === 'archive') {
        archivePage = page;
        localStorage.setItem(archivePageStorageKey, String(page));
        return;
      }
      if (kind === 'prompts') {
        promptsPage = page;
        localStorage.setItem(promptsPageStorageKey, String(page));
        return;
      }
      if (kind === 'memory') {
        memoryPage = page;
        localStorage.setItem(memoryPageStorageKey, String(page));
        return;
      }
      if (kind === 'analytics') {
        analyticsPage = page;
        localStorage.setItem(analyticsPageStorageKey, String(page));
        return;
      }
      backlogPage = page;
      localStorage.setItem(backlogPageStorageKey, String(page));
    }

    function renderWorkflowPagination(container, pagination, kind) {
      if (!container) return;
      if (pagination.total <= workflowPageSize) {
        container.hidden = true;
        container.innerHTML = '';
        return;
      }
      container.hidden = false;
      const prevDisabled = pagination.page <= 1;
      const nextDisabled = pagination.page >= pagination.totalPages;
      container.innerHTML =
        renderClientUiButton({ label: t('pagination.prev'), variant: 'secondary', className: 'workflow-page-btn', disabled: prevDisabled, attrs: { 'data-workflow-page': kind, 'data-page-action': 'prev' } }) +
        '<span class="workflow-page-meta">' + escapeHtml(t('pagination.meta', {
          page: pagination.page,
          totalPages: pagination.totalPages,
          from: pagination.from,
          to: pagination.to,
          total: pagination.total,
        })) + '</span>' +
        renderClientUiButton({ label: t('pagination.next'), variant: 'secondary', className: 'workflow-page-btn', disabled: nextDisabled, attrs: { 'data-workflow-page': kind, 'data-page-action': 'next' } });
    }

    function handleWorkflowPaginationClick(event) {
      const button = event.target.closest('[data-workflow-page][data-page-action]');
      if (!button || button.disabled) return;
      const kind = button.dataset.workflowPage;
      const action = button.dataset.pageAction;
      const currentPage = getPanelPage(kind);
      const nextPage = action === 'next' ? currentPage + 1 : currentPage - 1;
      persistPanelPage(kind, nextPage);
      render();
    }

    function dependenciesSatisfied(items, item) {
      const doneIds = new Set(items.filter((entry) => entry.status === 'done' || entry.status === 'verified').map((entry) => entry.id));
      return (item.dependsOn || []).every((dependencyId) => doneIds.has(dependencyId));
    }

    function isPromotableBacklogItem(items, item) {
      return item.status === 'backlog' && dependenciesSatisfied(items, item);
    }

    function collectReadyColumnEntries(allItems, visibleItems) {
      const readyItems = visibleItems.filter((item) => item.status === 'ready');
      const plannedItems = visibleItems.filter((item) => isPromotableBacklogItem(allItems, item));
      const seen = new Set();
      const entries = [];

      for (const item of [...readyItems, ...plannedItems]) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        entries.push({
          item,
          queueKind: item.status === 'ready' ? 'ready' : 'planned',
        });
      }

      return entries;
    }

    function resolveBoardColumnItems(group, items, allItems, projection) {
      if (projection && (group.id === 'backlog' || group.id === 'done')) {
        const column = projection.columns.find((candidate) => candidate.id === group.id);
        if (column) {
          return column.workIds
            .map((workId) => items.find((item) => item.id === workId) ?? allItems.find((item) => item.id === workId))
            .filter(Boolean);
        }
      }
      const filtered = items.filter((item) => group.statuses.includes(item.status));
      return group.id === 'done' ? sortDoneArchiveItems(filtered) : filtered;
    }

    function renderBoardColumnCards(group, columnItems, allItems, items) {
      const supportsLazyLoad = (group.id === 'backlog' || group.id === 'done')
        && (boardColumnMode === 'extended' || boardColumnMode === 'compact');
      const total = columnItems.length;
      const visibleLimit = supportsLazyLoad ? getKanbanColumnVisibleLimit(group.id, total) : total;
      const visibleItems = columnItems.slice(0, visibleLimit);
      const hasMore = supportsLazyLoad && total > visibleLimit;

      if (group.id === 'ready') {
        const entries = collectReadyColumnEntries(allItems, items);
        if (!entries.length) {
          return '<div class="empty">' + escapeHtml(t('empty.noTaskAtoms')) + '</div>';
        }
        return entries.map((entry) => renderTaskAtomCard(entry.item, '', {
          queueKind: entry.queueKind,
          promoteEligible: entry.queueKind === 'planned',
        })).join('');
      }

      const cardClass = group.id === 'backlog' || group.id === 'done' ? 'kanban-card' : '';
      const cards = visibleItems
        .map((item) => renderTaskAtomCard(item, cardClass))
        .join('');
      const cardsHtml = cards || '<div class="empty">' + escapeHtml(
        group.id === 'backlog' || group.id === 'done' ? t('empty.noTasks') : t('empty.noTaskAtoms'),
      ) + '</div>';

      if (!supportsLazyLoad) {
        return cardsHtml;
      }

      return '<div class="kanban-column-body" data-kanban-column-body="' + escapeHtml(group.id) + '">' +
        cardsHtml +
        (hasMore ? '<div class="kanban-column-sentinel" data-kanban-column-sentinel="' + escapeHtml(group.id) + '" aria-hidden="true"></div>' : '') +
        '</div>' +
        (hasMore
          ? '<div class="kanban-column-more-hint" data-testid="kanban-col-more-' + escapeHtml(group.id) + '">' +
            escapeHtml(t('kanban.column.shown', { shown: visibleLimit, total })) +
            '</div>'
          : '');
    }

    function applyBoardColumnModeClass() {
      if (!board) {
        return;
      }
      board.className = 'board is-' + (boardColumnMode === 'compact' ? 'compact' : 'extended');
    }

    function renderBoard(items) {
      if (!board) {
        return;
      }

      applyBoardColumnModeClass();

      const allItems = snapshot.items;
      const projection = operatorShellSnapshot?.kanbanBoard ?? null;
      const groups = getActiveBoardColumnGroups();
      const operational = items.filter((item) => operationalBoardGroups.some((group) => group.statuses.includes(item.status)));

      if (boardColumnMode === 'extended' && !projection) {
        board.innerHTML = '<div class="empty">' + escapeHtml(t('empty.kanbanNotLoaded')) + '</div>';
        return;
      }

      board.innerHTML = groups.map((group) => {
        const columnItems = group.id === 'ready'
          ? []
          : group.id === 'backlog' || group.id === 'done'
            ? resolveBoardColumnItems(group, items, allItems, projection)
            : operational.filter((item) => group.statuses.includes(item.status));

        const count = group.id === 'ready'
          ? collectReadyColumnEntries(allItems, items).length
          : columnItems.length;
        const countTestId = group.id === 'backlog' || group.id === 'done'
          ? 'kanban-col-count-' + group.id
          : 'board-col-count-' + group.id;

        return '<article class="column" data-kanban-column="' + escapeHtml(group.id) + '" data-board-column="' + escapeHtml(group.id) + '">' +
          '<h2>' + escapeHtml(localizedBoardColumnTitle(group)) + renderClientUiBadge({ label: String(count), tone: 'default', testId: countTestId }) + '</h2>' +
          renderBoardColumnCards(group, columnItems, allItems, items) +
          '</article>';
      }).join('');

      setupKanbanColumnLazyLoad();
    }

    function renderWorkflowEpicGroup(group, allItems) {
      const epic = group.epic;
      const collapsed = collapsedEpicIds.has(epic.id);
      const progress = group.childCount > 0
        ? group.doneChildCount + '/' + group.childCount
        : '0';
      const epicTitleHtml = escapeHtml(epic.title || epic.id) +
        '<span class="workflow-epic-meta">' + escapeHtml(progress) + '</span>';
      const hasChildren = group.childCount > 0;
      const epicRow = renderWorkflowTaskListRow(epic, {
        extraClass: 'workflow-epic-row',
        titleHtml: epicTitleHtml,
        rowTag: hasChildren ? 'div' : 'button',
        leadingHtml: hasChildren ? renderWorkflowExpandToggle(epic.id, collapsed) : '',
      });
      const orphanedDependents = group.childCount === 0
        ? findEpicDependentsWithoutParent(allItems, epic.id)
        : [];
      const hierarchyWarningHtml = orphanedDependents.length > 0
        ? '<div class="workflow-epic-hierarchy-warning" data-testid="workflow-epic-hierarchy-warning-' + escapeHtml(epic.id) + '">' +
          escapeHtml(t('workflow.epicDependentsWithoutParent', { count: orphanedDependents.length })) +
          '</div>'
        : '';
      const childrenHtml = group.children.length
        ? group.children.map((child) => renderWorkflowTaskListRow(child, { extraClass: 'workflow-epic-child-row' })).join('')
        : '<div class="empty workflow-epic-empty">' + escapeHtml(t('empty.noSubtasks')) + '</div>';

      return '<article class="workflow-epic-group" data-testid="workflow-epic-' + escapeHtml(epic.id) + '">' +
        epicRow +
        hierarchyWarningHtml +
        (collapsed ? '' : '<div class="workflow-epic-children">' + childrenHtml + '</div>') +
      '</article>';
    }

    function renderWorkflowTreeNode(node) {
      const item = node.item;
      const collapsed = collapsedWorkflowTreeIds.has(item.id);
      const hasChildren = node.children.length > 0;
      const titleHtml = escapeHtml(item.title || item.id);
      const row = renderWorkflowTaskListRow(item, {
        extraClass: 'workflow-tree-row',
        titleHtml,
        rowTag: hasChildren ? 'div' : 'button',
        leadingHtml: hasChildren
          ? renderWorkflowExpandToggle(item.id, collapsed, {
            attr: 'data-workflow-tree-toggle',
            testIdPrefix: 'workflow-tree-toggle',
          })
          : '',
      });
      const childrenHtml = collapsed
        ? ''
        : node.children.map((child) => renderWorkflowTreeNode(child)).join('');

      return '<div class="workflow-tree-node" style="--tree-depth:' + node.depth + '" data-testid="workflow-tree-node-' + escapeHtml(item.id) + '">' +
        row +
        (collapsed ? '' : (childrenHtml ? '<div class="workflow-epic-children">' + childrenHtml + '</div>' : '')) +
      '</div>';
    }

    function buildWorkflowListUnits(items) {
      if (workflowDisplayMode === 'flat') {
        return [...items]
          .sort((left, right) => String(left.title ?? left.id).localeCompare(String(right.title ?? right.id), 'en', { sensitivity: 'variant' }))
          .map((item) => ({ type: 'orphan', item }));
      }

      if (workflowDisplayMode === 'tree') {
        return buildWorkflowTreeDisplayUnits(buildWorkflowTreeForest(items));
      }

      return buildWorkflowDisplayUnits(items);
    }

    function renderWorkflowGroupedList(items, page, pageKind) {
      const units = buildWorkflowListUnits(items);
      const pagination = paginateItems(units, page, workflowPageSize);
      if (pagination.page !== page) {
        persistPanelPage(pageKind, pagination.page);
      }

      const html = pagination.items.length
        ? pagination.items.map((unit) => {
          if (unit.type === 'epic') {
            return renderWorkflowEpicGroup(unit.group, items);
          }
          if (unit.type === 'tree-root') {
            return renderWorkflowTreeNode(unit.root);
          }
          return renderWorkflowTaskListRow(unit.item);
        }).join('')
        : '';

      return { pagination, html };
    }

    function renderArchive(items) {
      const doneItems = sortDoneArchiveItems(items.filter((item) => doneArchiveGroup.statuses.includes(item.status)));
      const { pagination, html } = renderWorkflowGroupedList(doneItems, archivePage, 'archive');

      archivePanelCount.textContent = String(doneItems.length);
      archiveList.innerHTML = html || '<div class="empty">В архиве сейчас нет завершённых задач</div>';
      renderWorkflowPagination(archivePagination, pagination, 'archive');
    }

    function renderBacklog(items) {
      const backlogItems = items.filter((item) => backlogGroup.statuses.includes(item.status));
      const { pagination, html } = renderWorkflowGroupedList(backlogItems, backlogPage, 'backlog');

      backlogPanelCount.textContent = String(backlogItems.length);
      backlogList.innerHTML = html || '<div class="empty">В backlog сейчас нет атомов задач</div>';
      renderWorkflowPagination(backlogPagination, pagination, 'backlog');
    }

    function encodeGraphCanvasProjectionAttribute(projection) {
      return JSON.stringify(projection)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
    }

    function renderGraphCanvasLitFlowHost(projection, options) {
      options = options || {};
      if (!projection || !Array.isArray(projection.nodes) || projection.nodes.length === 0) {
        return '<div class="empty">Проекция графа пуста</div>';
      }
      const testId = options.testId || 'graph-canvas-lit-flow';
      const fill = options.fill === true;
      const height = options.height || 480;
      const encoded = encodeGraphCanvasProjectionAttribute(projection);
      const sizeAttr = fill
        ? ' data-graph-canvas-fill="true"'
        : ' data-graph-canvas-height="' + height + '"';
      return '<div class="graph-canvas-lit-flow-host" data-testid="' + testId + '"' + sizeAttr + ' data-graph-canvas-projection="' + encoded + '"></div>';
    }

    function initGraphCanvasLitFlowMounts(root) {
      if (typeof window.__WORKGRAPH_MOUNT_GRAPH_CANVAS__ === 'function') {
        window.__WORKGRAPH_MOUNT_GRAPH_CANVAS__(root || document);
      }
    }

    function persistCollapsedEpicIds() {
      localStorage.setItem(collapsedEpicIdsStorageKey, JSON.stringify([...collapsedEpicIds]));
    }

    function buildIntentRoadmapCollapsedQuery() {
      return collapsedEpicIds.size > 0
        ? '?collapsed=' + encodeURIComponent([...collapsedEpicIds].join(','))
        : '';
    }

    async function reloadIntentRoadmapProjections() {
      const collapsedQuery = buildIntentRoadmapCollapsedQuery();
      const [intentResponse, epicResponse] = await Promise.all([
        fetch('/api/intent-roadmap-projection' + collapsedQuery),
        fetch('/api/roadmap/epics' + collapsedQuery),
      ]);
      if (!intentResponse.ok || !epicResponse.ok) {
        throw new Error('не удалось обновить intent roadmap projection');
      }
      intentRoadmapProjection = await intentResponse.json();
      epicRoadmapProjection = await epicResponse.json();
      renderIntentGraphPanel();
    }

    function toggleEpicCollapse(epicId) {
      if (collapsedEpicIds.has(epicId)) {
        collapsedEpicIds.delete(epicId);
      } else {
        collapsedEpicIds.add(epicId);
      }
      persistCollapsedEpicIds();
      render();
    }

    function renderEpicRoadmapPanel(epic) {
      const collapsed = collapsedEpicIds.has(epic.epicId);
      const rollup = epic.rollup ?? {};
      const progress = (epic.childCount ?? 0) > 0
        ? (epic.doneChildCount ?? 0) + '/' + (epic.childCount ?? 0) + ' closed'
        : '0 children';
      const toggleLabel = collapsed ? 'Развернуть' : 'Свернуть';

      return '<article class="graph-workspace-panel intent-roadmap-panel intent-roadmap-epic-panel" data-testid="intent-roadmap-epic-' + escapeHtml(epic.epicId) + '">' +
        '<div class="intent-roadmap-epic-header">' +
          '<h3>' + escapeHtml(epic.title || epic.epicId) + '</h3>' +
          '<div class="intent-roadmap-epic-meta">' +
            '<span class="count" data-testid="epic-rollup-' + escapeHtml(epic.epicId) + '">' + escapeHtml(progress) + '</span>' +
            '<span>' + escapeHtml(epic.status || '—') + '</span>' +
            ((epic.childCount ?? 0) > 0
              ? '<button type="button" class="intent-roadmap-epic-toggle" data-epic-toggle="' + escapeHtml(epic.epicId) + '">' + toggleLabel + '</button>'
              : '') +
          '</div>' +
        '</div>' +
        '<div class="graph-workspace-canvas intent-roadmap-canvas-wrap">' +
          renderIntentRoadmapCanvas(epic.canvas) +
        '</div>' +
      '</article>';
    }

    function renderIntentRoadmapCanvas(canvas) {
      if (!canvas || !Array.isArray(canvas.nodes) || canvas.nodes.length === 0) {
        return '<div class="empty">Проекция графа пуста</div>';
      }
      const projection = buildGraphCanvasProjectionFromIntentCanvas(canvas, { viewId: 'intent-roadmap' });
      return renderGraphCanvasLitFlowHost(projection, {
        testId: 'intent-roadmap-canvas',
        fill: true,
      });
    }

    function renderIntentRoadmapNode(node, depth) {
      const indent = depth > 0 ? ' intent-roadmap-node' : '';
      const progress = node.childCount > 0 ? ' <span class="count">' + node.doneChildCount + '/' + node.childCount + '</span>' : '';
      return '<div class="' + indent.trim() + '">' +
        '<button type="button" class="task-atom list-row" data-task-id="' + escapeHtml(node.workId) + '">' +
          '<h3>' + escapeHtml(node.title || node.workId) + progress + '</h3>' +
          '<p class="list-row-line">' + escapeHtml(node.status || '—') + '</p>' +
        '</button>' +
        (node.children ?? []).map((child) => renderIntentRoadmapNode(child, depth + 1)).join('') +
      '</div>';
    }

    function renderIntentGraphPanel() {
      if (!intentRoadmapBody) {
        return;
      }

      if (activeView !== 'intent-graph') {
        intentRoadmapBody.innerHTML = '';
        return;
      }

      const epics = epicRoadmapProjection?.epics ?? [];
      const branches = intentRoadmapProjection?.branches ?? [];
      if (epics.length === 0 && branches.length === 0) {
        intentRoadmapBody.innerHTML = '<div class="empty" style="padding:24px">Intent graph projection пуст</div>';
        return;
      }

      const epicHtml = epics.length > 0
        ? '<section class="intent-roadmap-epics">' +
            '<p class="intent-roadmap-section-heading">Эпики</p>' +
            epics.map((epic) => renderEpicRoadmapPanel(epic)).join('') +
          '</section>'
        : '';

      const branchHtml = branches.map((branch) =>
        '<article class="graph-workspace-panel intent-roadmap-panel intent-roadmap-branch">' +
          '<div class="graph-workspace-canvas intent-roadmap-canvas-wrap">' +
            renderIntentRoadmapCanvas(branch.canvas) +
          '</div>' +
        '</article>',
      ).join('');

      intentRoadmapBody.innerHTML = epicHtml + branchHtml;
      initGraphCanvasLitFlowMounts(intentRoadmapBody);

      intentRoadmapBody.querySelectorAll('[data-epic-toggle]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const epicId = button.getAttribute('data-epic-toggle');
          if (epicId) {
            toggleEpicCollapse(epicId);
          }
        });
      });
    }

    function handleWorkGraphGraphNodeClick(event) {
      const detail = event.detail || {};

      if (detail.taskId && snapshot) {
        const item = (snapshot.items ?? []).find((candidate) => candidate.id === detail.taskId);
        if (item) {
          openTaskDetails(item);
        }
        return;
      }

      if (detail.intentNodeId) {
        const nodeId = detail.intentNodeId;
        const branch = (intentRoadmapProjection?.branches ?? []).find((candidate) =>
          candidate.question?.id === nodeId
          || candidate.selectedOption?.id === nodeId
          || (candidate.allOptions ?? []).some((option) => option.id === nodeId)
          || candidate.decisionId === nodeId
          || candidate.decision?.id === nodeId
          || String(nodeId).startsWith('analysis:'),
        );
        if (!branch) return;

        let summary = 'Узел intent graph: ' + nodeId;
        if (branch.question?.id === nodeId) {
          summary = 'Вопрос: ' + (branch.question.title ?? nodeId);
        } else if (branch.selectedOption?.id === nodeId) {
          summary = 'Выбранный вариант: ' + (branch.selectedOption.title ?? nodeId);
        } else if ((branch.allOptions ?? []).some((option) => option.id === nodeId)) {
          const option = branch.allOptions.find((entry) => entry.id === nodeId);
          summary = 'Отклонённый вариант: ' + (option?.title ?? nodeId);
        } else if (branch.decisionId === nodeId || branch.decision?.id === nodeId) {
          summary = 'Решение: ' + (branch.decisionTitle ?? nodeId);
        } else if (String(nodeId).startsWith('analysis:')) {
          summary = 'Аналитический разбор ветки';
        }

        openDetailDrawer();
        detailTitle.textContent = 'Intent graph';
        detailId.textContent = nodeId;
        detailBody.innerHTML = '<section class="detail-section"><h3>Узел ветки</h3><p>' + escapeHtml(summary) + '</p>' +
          '<p class="muted">Полный drilldown с evidence — вкладка «Аналитика».</p></section>';
        detailDrawer.classList.add('is-open');
        detailDrawer.setAttribute('aria-hidden', 'false');
        detailOverlay.hidden = false;
        detailOverlay.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('detail-drawer-open');
        return;
      }

      if (detail.blockId && architectureSnapshot) {
        focusedBlockId = detail.blockId;
        renderArchitecture();
        const block = architectureSnapshot.blocks.find((candidate) => candidate.id === focusedBlockId);
        if (block) {
          openBlockDetails(block);
        }
        return;
      }

      if (detail.schematicId && schematicModel) {
        const node = schematicModel.nodes.find((candidate) => candidate.id === detail.schematicId);
        if (!node) return;

        if (node.action && node.action.startsWith('view:')) {
          const targetView = node.action.slice('view:'.length);
          if (['board', 'workflow'].includes(targetView)) {
            if (targetView === 'workflow') {
              activeWorkflowTab = 'backlog';
              localStorage.setItem(workflowTabStorageKey, activeWorkflowTab);
              applyWorkflowTab(activeWorkflowTab);
            }
            activeView = targetView === 'backlog' ? 'workflow' : targetView;
            localStorage.setItem(viewStorageKey, activeView);
            applyView(activeView);
            render();
          }
          return;
        }

        openSchematicNodeDetails(node);
      }
    }

    function resolveSchematicModel() {
      return graphCanvasViewMode === 'pipeline' ? schematicModelPipeline : schematicModelFull;
    }

    function syncGraphCanvasModeUi() {
      schematicModel = resolveSchematicModel();
      document.querySelectorAll('.graph-canvas-mode-toggle button[data-graph-canvas-mode]').forEach((button) => {
        const isActive = button.dataset.graphCanvasMode === graphCanvasViewMode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function setGraphCanvasViewMode(nextMode) {
      graphCanvasViewMode = nextMode === 'pipeline' ? 'pipeline' : 'full';
      localStorage.setItem(graphCanvasModeStorageKey, graphCanvasViewMode);
      syncGraphCanvasModeUi();
      renderSchematic();
    }

    function renderArchitectureBlockTasksBadge(summary) {
      const label = formatArchitectureBlockTasksCountLabel(summary);
      if (!label) {
        return '';
      }

      return renderClientUiBadge({
        label,
        tone: resolveArchitectureBlockTasksBadgeTone(summary),
        testId: 'architecture-block-tasks-count',
        title: summary.doneCount + ' из ' + summary.taskCount + ' задач завершено',
      });
    }

    function renderArchitectureBlockListRow(block) {
      const summary = summarizeArchitectureBlockForList(block);
      const lines = [
        summary.summary ? escapeHtml(summary.summary) : '',
        summary.groupLabel ? escapeHtml(summary.groupLabel) : '',
      ].filter(Boolean);
      return renderListRow({
        title: summary.title,
        lines,
        footerLeft: renderWorkItemIssueKeyChip(
          { key: block.id, itemKind: 'story', id: block.id },
          { type: 'story' },
        ) + renderArchitectureBlockTasksBadge(summary),
        extraClass: 'architecture-block-row',
        selected: focusedBlockId === block.id,
        attrs: {
          'data-architecture-block-id': block.id,
          'data-testid': 'architecture-block-' + block.id,
        },
      });
    }

    function renderArchitectureBlocksListHtml(blocks) {
      return blocks.map((block) => renderArchitectureBlockListRow(block)).join('');
    }

    function renderArchitectureBlocksList() {
      if (!architectureBlocksList) {
        return;
      }
      if (!architectureSnapshot) {
        architectureBlocksList.innerHTML = architectureLoadError
          ? '<div class="error">' + escapeHtml(architectureLoadError) + '</div>'
          : architectureLoaded
          ? '<div class="empty">Снимок архитектуры пуст</div>'
          : '<div class="empty">Загрузка блоков архитектуры…</div>';
        if (architecturePanelCount) architecturePanelCount.textContent = '0';
        return;
      }

      const blocks = architectureSnapshot.blocks ?? [];
      const unclassifiedCount = architectureSnapshot.counts?.unclassified ?? architectureSnapshot.unclassified?.taskIds?.length ?? 0;
      if (architecturePanelCount) {
        architecturePanelCount.textContent = String(blocks.length);
      }
      const unclassifiedNote = unclassifiedCount > 0
        ? '<p class="architecture-unclassified-note" data-testid="architecture-unclassified-note">Вне L1: ' + unclassifiedCount + ' задач</p>'
        : '';
      architectureBlocksList.innerHTML = (blocks.length
        ? unclassifiedNote + renderArchitectureBlocksListHtml(blocks)
        : unclassifiedNote + '<div class="empty">Нет блоков архитектуры</div>');
    }

    function architectureBlockBackLabel() {
      return '← К списку блоков';
    }

    function renderArchitecturePanels() {
      renderArchitectureBlocksList();
    }

    function renderArchitecture() {
      renderArchitecturePanels();
    }

    function ensureArchitectureSnapshotLoaded() {
      if (architectureLoaded && architectureSnapshot) {
        return Promise.resolve(architectureSnapshot);
      }
      if (architectureLoaded && architectureLoadError) {
        return Promise.reject(new Error(architectureLoadError));
      }
      return fetch('/api/architecture-snapshot').then((response) => {
        if (!response.ok) {
          return response.json().catch(() => ({})).then((payload) => {
            const detail = payload?.message || payload?.error || ('HTTP ' + response.status);
            throw new Error(detail);
          });
        }
        return response.json();
      }).then((data) => {
        if (data?.error) {
          throw new Error(data.message || data.error);
        }
        architectureSnapshot = data;
        architectureLoaded = true;
        architectureLoadError = null;
        renderArchitecturePanels();
        return data;
      }).catch((error) => {
        architectureLoadError = error?.message || String(error);
        architectureLoaded = true;
        architectureSnapshot = null;
        renderArchitecturePanels();
        throw error;
      });
    }

    function handleArchitectureBlocksListClick(event) {
      const row = event.target.closest('[data-architecture-block-id]');
      if (!row) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const blockId = row.getAttribute('data-architecture-block-id');
      const openBlock = () => {
        const block = architectureSnapshot?.blocks?.find((candidate) => candidate.id === blockId);
        if (!block) {
          return;
        }
        focusedBlockId = block.id;
        openBlockDetails(block);
      };
      if (architectureSnapshot) {
        openBlock();
        return;
      }
      ensureArchitectureSnapshotLoaded().then(openBlock).catch(() => undefined);
    }

    function renderSchematic() {
      schematicModel = resolveSchematicModel();
      if (!schematicModel || !Array.isArray(schematicModel.nodes)) {
        schematicCanvas.innerHTML = '<div class="empty">Schematic model не загружен</div>';
        schematicPanelCount.textContent = '0';
        return;
      }

      schematicPanelCount.textContent = String(schematicModel.nodes.length + ' / ' + schematicModel.edges.length);
      const projection = buildGraphCanvasProjectionFromSchematicModel(schematicModel, { viewId: 'schematic' });
      schematicCanvas.innerHTML = renderGraphCanvasLitFlowHost(projection, {
        testId: 'schematic-canvas',
        fill: true,
      });
      initGraphCanvasLitFlowMounts(schematicCanvas);
    }

    function openSchematicNodeDetails(node) {
      detailTitle.textContent = node.title;
      detailId.textContent = node.id;
      detailBody.innerHTML =
        renderDetailBackButton('← К схеме') +
        renderDetailText('Слой', node.layer) +
        renderDetailText('Описание', node.summary) +
        renderDetailList('Связанные артефакты', node.protocolPath ? [node.protocolPath] : [], { linkRepoFiles: true }) +
        '<section class="detail-section"><h3>Ограничения MVP</h3><p>Readonly derived schematic без ручного graph editor. Зависимости задач доступны в detail drawer и через MCP tools для агента.</p></section>';
      openDetailDrawer();
      bindDetailNavBack(closeTaskDetails);
      detailClose.focus();
    }

    function openBlockDetails(block, { resetNav = true } = {}) {
      if (resetNav) detailContext = null;
      detailContext = { type: 'block', blockId: block.id };
      detailTitle.textContent = block.title ?? block.id ?? '';
      detailId.textContent = block.id;
      detailBody.innerHTML =
        renderDetailBackButton(architectureBlockBackLabel()) +
        buildBlockDetailSections(block);
      openDetailDrawer();
      bindDetailNavBack(() => {
        closeL2NodeDetails();
        closeTaskDetails();
        focusedBlockId = null;
        renderArchitecture();
      });
    }

    function formatArchitectureContainerKind(kind) {
      const labels = {
        protocol: 'протокол',
        schema: 'схема',
        runtime: 'рантайм',
        storage: 'хранилище',
        ui: 'интерфейс',
        domain: 'домен',
        research: 'исследование',
      };
      return labels[kind] || kind;
    }

    function formatL2NodeKindLabel(kind) {
      if (kind === 'container') return 'Контейнер';
      if (kind === 'file') return 'Файл';
      return kind;
    }

    function formatArchitectureEdgeTypeLabel(type) {
      const labels = {
        defines: 'определяет',
        implements: 'реализует',
        uses: 'использует',
        relates_file: 'связан с файлом',
        feeds: 'питает',
        maps_to: 'отображает в',
      };
      return labels[type] || type;
    }

    function renderBvcDescription(source, { testid = 'architecture-bvc-description' } = {}) {
      if (!source) return '';
      /** @type {Array<[string, string]>} */
      const fields = [
        ['Базис', source.basis],
        ['Вектор', source.vector],
        ['Цель', source.goal],
      ].filter((entry) => String(entry[1] ?? '').trim() !== '');
      if (fields.length === 0) {
        return '';
      }
      return '<div data-testid="' + escapeHtml(testid) + '">' +
        fields.map(([title, value]) => renderDetailText(title, value)).join('') +
      '</div>';
    }

    function renderBlockBvcDescription(block) {
      return renderBvcDescription(block, { testid: 'architecture-bvc-description' });
    }

    function renderL2NodeBvcDescription(source) {
      return renderBvcDescription(source, { testid: 'l2-bvc-description' });
    }

    function findL2ParentContainer(nodeId, l2Graph) {
      const edges = l2Graph?.layoutEdges || l2Graph?.edges || [];
      const nodes = l2Graph?.layoutNodes || l2Graph?.nodes || [];
      const nodeById = new Map(nodes.map((node) => [node.id, node]));
      const incoming = edges.filter((edge) => edge.to === nodeId && String(edge.from).startsWith('container:'));
      const primary = incoming.find((edge) => edge.type !== 'relates_file') || incoming[0];
      return primary ? nodeById.get(primary.from) : null;
    }

    function resolveL2NodeDescriptionSource(node, l2Graph) {
      const hasBvc = [node.basis, node.vector, node.goal].some((value) => String(value ?? '').trim() !== '');
      if (hasBvc) {
        return node;
      }
      const parent = findL2ParentContainer(node.id, l2Graph);
      if (node.kind === 'file') {
        const basis = parent?.basis
          ? ('Файл контейнера «' + (parent.title || parent.id) + '». ' + parent.basis).trim()
          : (parent ? 'Файл контейнера «' + (parent.title || parent.id) + '».' : '');
        return {
          basis,
          vector: node.path || parent?.vector || '',
          goal: parent?.goal || '',
          analysis: parent?.analysis || '',
          decision: parent?.decision || '',
          labels: parent?.labels || {},
        };
      }
      return node;
    }

    function buildBlockDetailSections(block) {
      const blockTasks = (block.taskIds || [])
        .map((taskId) => snapshot?.items?.find((item) => item.id === taskId))
        .filter(Boolean);
      const containerLines = (block.containers || []).map((container) => container.title + ' (' + formatArchitectureContainerKind(container.kind) + ')');
      const tasksHtml = blockTasks.length
        ? '<div class="backlog-list">' + blockTasks.map((item) => renderTaskAtom(item, 'list-row')).join('') + '</div>'
        : '<div class="empty">Нет задач в этом блоке</div>';
      const canonSource = architectureSnapshot?.l1Canon?.sourcePath || 'architecture/main.bvc';
      const summarySection = block.summary && block.summary !== firstLinePreview(block.vector)
        ? renderDetailText('Сводка', block.summary)
        : '';
      const groupLabel = typeof getArchitectureBlockGroupLabel === 'function'
        ? getArchitectureBlockGroupLabel(block)
        : '';
      const groupSection = groupLabel ? renderDetailText('Раздел', groupLabel) : '';
      return groupSection +
        renderBlockBvcDescription(block) +
        renderPipelineReadOnly(block, { testid: 'architecture-pipeline-panel' }) +
        renderBlockL2Graph(block.l2Graph) +
        summarySection +
        renderOptionalDetailAccordion('Корни intent', block.intentRoots, 'list', { linkRepoFiles: true }) +
        renderOptionalDetailAccordion('Контейнеры L2', containerLines, 'list') +
        renderOptionalDetailAccordion('Пути артефактов', block.artifactPaths, 'list', { linkRepoFiles: true }) +
        '<section class="detail-section detail-source-link"><p class="muted">Источник: ' +
        (isRepoFilePreviewPath(canonSource) ? renderRepoFileLink(canonSource) : '<code>' + escapeHtml(canonSource) + '</code>') +
        '</p></section>' +
        wrapDetailAccordion('Задачи блока (' + blockTasks.length + ')', tasksHtml, {
          testid: 'block-tasks-accordion',
          required: true,
          defaultOpen: blockTasks.length > 0 && blockTasks.length <= 5,
        });
    }

    function firstLinePreview(text) {
      if (!text) return '';
      const line = String(text).split('\\n').map((entry) => entry.trim()).find(Boolean);
      return line || '';
    }

    function renderBlockL2Graph(l2Graph) {
      if (!l2Graph || !Array.isArray(l2Graph.layoutNodes) || l2Graph.layoutNodes.length === 0) {
        return '<section class="detail-section"><h3>Схема L2</h3><div class="empty">Нет L2 nodes для этого блока</div></section>';
      }

      const width = l2Graph.width || 520;
      const height = l2Graph.height || 220;
      const cappedNote = l2Graph.capped
        ? '<p class="empty">Показано ' + l2Graph.counts.nodes + ' из ' + (l2Graph.counts.nodes + l2Graph.hiddenCount) + ' узлов (скрыто ' + l2Graph.hiddenCount + ')</p>'
        : '';
      const svg = renderBlockL2GraphSvg(l2Graph, width, height);
      const nodes = l2Graph.layoutNodes.map((node) => {
        const label = node.kind === 'file' ? (node.path || node.title) : node.title;
        const subtitle = node.kind === 'file' ? '' : (node.subtitle || '');
        const blockId = l2Graph.blockId || '';
        return '<button type="button" class="block-l2-node ' + escapeHtml(node.kind) + '" data-l2-node-id="' + escapeHtml(node.id) + '" data-l2-block-id="' + escapeHtml(blockId) + '" style="left:' + node.x + 'px;top:' + node.y + 'px;width:' + node.width + 'px;min-height:' + node.height + 'px" title="' + escapeHtml(node.path || label) + '">' +
          '<div class="kind">' + escapeHtml(formatL2NodeKindLabel(node.kind)) + '</div>' +
          '<strong>' + escapeHtml(label) + '</strong>' +
          (subtitle ? '<span>' + escapeHtml(subtitle) + '</span>' : '') +
        '</button>';
      }).join('');

      return '<section class="detail-section"><h3>Схема L2</h3>' + cappedNote +
        '<div class="block-l2-wrap"><div class="block-l2-canvas" style="width:' + width + 'px;height:' + height + 'px">' +
          svg + nodes +
        '</div></div></section>';
    }

    function renderBlockL2GraphSvg(l2Graph, width, height) {
      const paths = (l2Graph.layoutEdges || []).map((edge) => {
        const from = edge.fromNode;
        const to = edge.toNode;
        const inSpread = to.height / (edge.inLaneCount + 1);
        const laneOffset = (edge.inLane - (edge.inLaneCount - 1) / 2) * 12;
        const startX = from.x + from.width;
        const startY = from.y + from.height / 2 + laneOffset;
        const endX = to.x;
        const endY = to.y + inSpread * (edge.inLane + 1);
        const horizontalGap = Math.max(48, endX - startX);
        const midX = startX + horizontalGap * 0.55;
        const d = 'M ' + startX + ' ' + startY + ' C ' + midX + ' ' + startY + ', ' + midX + ' ' + endY + ', ' + endX + ' ' + endY;
        const labelX = (startX + endX) / 2;
        const labelY = (startY + endY) / 2 - 6;
        return '<path class="block-l2-edge" d="' + d + '" marker-end="url(#block-l2-arrow)" />' +
          '<text class="block-l2-edge-label" x="' + labelX + '" y="' + labelY + '">' + escapeHtml(formatArchitectureEdgeTypeLabel(edge.type)) + '</text>';
      }).join('');

      return '<svg class="block-l2-edges" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true">' +
        '<defs><marker id="block-l2-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path></marker></defs>' +
        paths +
        '</svg>';
    }

    function renderTaskAtomCard(item, extraClass = '', options = {}) {
      const inner = renderTaskAtom(item, extraClass, options);
      const actions = [];
      if (options.promoteEligible) {
        actions.push(renderClientUiButton({
          label: 'Сделать доступной агенту',
          variant: 'soft',
          size: 'sm',
          className: 'task-promote-button',
          testId: 'promote-ready-' + item.id,
          attrs: { 'data-promote-task-id': item.id },
        }));
      }
      if (!actions.length) {
        return inner;
      }

      return '<div class="task-atom-wrap">' +
        inner +
        actions.join('') +
        '</div>';
    }

    function renderTaskAtom(item, extraClass = '', options = {}) {
      const queueKind = options.queueKind ?? null;
      const surface = extraClass.includes('kanban-card') ? 'board' : 'default';
      const isKanbanCard = surface === 'board';
      const targets = !isKanbanCard && highlightTaskId ? crossHighlightTargets(highlightTaskId) : { peerIds: [] };
      const highlightClass = !isKanbanCard && (item.id === highlightTaskId || targets.peerIds.includes(item.id))
        ? ' is-highlighted'
        : '';
      const newClass = options.isNew ? ' is-new' : '';
      return '<button class="task-atom' + highlightClass + newClass + (extraClass ? ' ' + extraClass : '') + '" type="button" data-task-id="' + escapeHtml(item.id) + '" data-work-id="' + escapeHtml(item.id) + '">' +
        '<h3>' + escapeHtml(item.title || item.id) + '</h3>' +
        renderSemanticCore(item) +
        renderIssueFooter(item, { queueKind, surface }) +
      '</button>';
    }

    function toggleWorkflowTreeCollapse(itemId) {
      if (collapsedWorkflowTreeIds.has(itemId)) {
        collapsedWorkflowTreeIds.delete(itemId);
      } else {
        collapsedWorkflowTreeIds.add(itemId);
      }
      localStorage.setItem(collapsedWorkflowTreeIdsStorageKey, JSON.stringify([...collapsedWorkflowTreeIds]));
      render();
    }

    function handleBoardClick(event) {
      const repoFileLink = event.target.closest('.repo-file-link[data-repo-file-path]');
      if (repoFileLink) {
        event.preventDefault();
        event.stopPropagation();
        const fromDrawer = Boolean(repoFileLink.closest('#detail-body, #detail-sub-body'));
        if (fromDrawer && detailDrawer.classList.contains('is-open')) {
          openRepoFileStackPreview(repoFileLink.dataset.repoFilePath);
        }
        return;
      }

      const copyAnalyticsBtn = event.target.closest('[data-action="copy-analytics-md"]');
      if (copyAnalyticsBtn) {
        event.preventDefault();
        event.stopPropagation();
        const recordId = detailContext?.type === 'analytics'
          ? detailContext.recordId
          : selectedAnalyticsRecordId;
        const record = (analyticsProjection?.records ?? []).find((entry) => entry.id === recordId);
        if (record) {
          copyAnalyticsMarkdownForLlm(record, copyAnalyticsBtn).catch(() => undefined);
        }
        return;
      }

      const lineageNavBtn = event.target.closest('.analytics-lineage-nav-btn[data-analytics-record-id]');
      if (lineageNavBtn) {
        event.preventDefault();
        event.stopPropagation();
        const fromDrawer = Boolean(lineageNavBtn.closest('#detail-body, #detail-sub-body'));
        if (fromDrawer && detailDrawer.classList.contains('is-open')) {
          const record = (analyticsProjection?.records ?? []).find((entry) => entry.id === lineageNavBtn.dataset.analyticsRecordId);
          if (record) {
            openAnalyticsLineageStackDrawer(record);
            return;
          }
        }
        openAnalyticsRecordById(lineageNavBtn.dataset.analyticsRecordId);
        return;
      }

      const epicToggle = event.target.closest('[data-workflow-epic-toggle]');
      if (epicToggle) {
        event.preventDefault();
        event.stopPropagation();
        const epicId = epicToggle.getAttribute('data-workflow-epic-toggle');
        if (epicId) {
          toggleEpicCollapse(epicId);
        }
        return;
      }

      const treeToggle = event.target.closest('[data-workflow-tree-toggle]');
      if (treeToggle) {
        event.preventDefault();
        event.stopPropagation();
        const itemId = treeToggle.getAttribute('data-workflow-tree-toggle');
        if (itemId) {
          toggleWorkflowTreeCollapse(itemId);
        }
        return;
      }

      const linkageButton = event.target.closest('[data-linkage-ref]');
      if (linkageButton) {
        event.preventDefault();
        event.stopPropagation();
        handleLinkageRefClick(linkageButton);
        return;
      }

      const promoteButton = event.target.closest('.task-promote-button[data-promote-task-id], .detail-promote-button[data-promote-task-id]');
      if (promoteButton) {
        event.preventDefault();
        event.stopPropagation();
        submitPromoteReady(promoteButton.dataset.promoteTaskId);
        return;
      }

      handleTaskCardClick(event);
      handleBlockL2NodeClick(event);
    }

    function handleBlockL2NodeClick(event) {
      const card = event.target.closest('[data-l2-node-id]');
      if (!card) {
        return false;
      }
      const nodeId = card.dataset.l2NodeId;
      const blockId = card.dataset.l2BlockId;
      if (!nodeId || !blockId) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation();

      const fromBlockDrawer = Boolean(card.closest('#detail-body'));
      const open = () => {
        const block = architectureSnapshot?.blocks?.find((candidate) => candidate.id === blockId);
        if (block) {
          openL2NodeDetails(block, nodeId, { fromBlockDrawer });
        }
      };

      if (architectureSnapshot) {
        open();
      } else {
        ensureArchitectureSnapshotLoaded().then(open).catch(() => undefined);
      }
      return true;
    }

    function handleLinkageRefClick(button) {
      const kind = button.dataset.linkageKind;
      const ref = button.dataset.linkageRef ?? '';
      if (!ref) return;

      if (kind === 'work' && snapshot) {
        const related = snapshot.items.find((item) => item.id === ref);
        if (related) {
          openTaskDetails(related, {
            parentContext: detailContext?.type === 'task'
              ? { type: 'task', taskId: detailContext.taskId }
              : null,
          });
          render();
        }
        return;
      }

      search.value = ref;
      activeView = 'workflow';
      localStorage.setItem(viewStorageKey, activeView);
      applyView(activeView);
      resetListPages();
      search.dispatchEvent(new Event('input', { bubbles: true }));
      closeTaskDetails();
    }

    function handleTaskCardClick(event) {
      const card = event.target.closest('.task-atom[data-task-id], .analytics-related-task-btn[data-task-id]');
      if (!card || !snapshot) return;
      const item = snapshot.items.find((candidate) => candidate.id === card.dataset.taskId);
      if (!item) return;
      applyCrossHighlight(item.id);

      const fromAnalyticsRelated = card.classList.contains('analytics-related-task-btn')
        && detailDrawer.classList.contains('is-open')
        && Boolean(card.closest('#detail-body, #detail-sub-body'));
      if (fromAnalyticsRelated) {
        let recordId = selectedAnalyticsRecordId || detailContext?.recordId;
        if (card.closest('#detail-sub-body')) {
          const top = detailStack.peek();
          if (top?.type === 'analytics') {
            recordId = top.payload?.recordId ?? top.key ?? recordId;
          }
        }
        const record = (analyticsProjection?.records ?? []).find((entry) => entry.id === recordId);
        if (record) {
          openAnalyticsRelatedTaskSubDrawer(item, record);
          return;
        }
      }

      const fromHierarchy = Boolean(card.closest('[data-testid="hierarchy-parent"], [data-testid="hierarchy-children"]'));
      const fromDrawerBody = Boolean(card.closest('#detail-body'));
      const fromSubDrawerBody = Boolean(card.closest('#detail-sub-body'));
      const fromDrawer = detailDrawer.classList.contains('is-open') && fromDrawerBody;
      const fromSubDrawer = detailSubDrawer?.classList.contains('is-open') && fromSubDrawerBody;

      if (fromHierarchy && (fromDrawer || fromSubDrawer)) {
        event.preventDefault();
        event.stopPropagation();
        openTaskHierarchyStackDrawer(item);
        return;
      }

      const analyticsParent = card.classList.contains('analytics-related-task-btn') && selectedAnalyticsRecordId
        ? { type: 'analytics', recordId: selectedAnalyticsRecordId }
        : detailContext;
      if (fromDrawer) openTaskDetails(item, { parentContext: analyticsParent });
      else openTaskDetails(item);
      render();
    }

    function findClaimableReadyTask(items) {
      const doneIds = new Set(items.filter((item) => item.status === 'done' || item.status === 'verified').map((item) => item.id));
      const readyIds = Array.isArray(snapshot?.readyQueue) ? snapshot.readyQueue : [];
      const readyItems = readyIds
        .map((id) => items.find((item) => item.id === id))
        .filter(Boolean);
      const candidates = readyItems.length ? readyItems : items.filter((item) => item.status === 'ready');

      return candidates.find((item) => (item.dependsOn || []).every((dependencyId) => doneIds.has(dependencyId))) ?? null;
    }

    function openDetailDrawer() {
      detailOverlay.hidden = false;
      detailOverlay.classList.add('is-open');
      detailOverlay.setAttribute('aria-hidden', 'false');
      detailDrawer.classList.add('is-open');
      detailDrawer.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('detail-drawer-open');
      document.body.classList.add('detail-drawer-open');
    }

    function renderDetailBackButton(label) {
      return '<div class="detail-back-row"><button class="detail-back-button" type="button" id="detail-nav-back">' + escapeHtml(label) + '</button></div>';
    }

    function renderDetailSubBackButton(label) {
      return '<div class="detail-back-row"><button class="detail-back-button" type="button" id="detail-sub-nav-back">' + escapeHtml(label) + '</button></div>';
    }

    function bindDetailNavBack(handler) {
      const button = document.querySelector('#detail-nav-back');
      if (button && handler) button.addEventListener('click', handler, { once: true });
    }

    function bindDetailSubNavBack(handler) {
      const button = document.querySelector('#detail-sub-nav-back');
      if (button && handler) button.addEventListener('click', handler, { once: true });
    }

    function renderDetailStackBreadcrumb() {
      const frames = detailStack.getFrames();
      if (frames.length <= 1) {
        return '';
      }
      const crumbs = frames.map((frame, index) => {
        const label = frame.title || frame.key || frame.type;
        const isCurrent = index === frames.length - 1;
        return '<span class="detail-stack-crumb' + (isCurrent ? ' is-current' : '') + '">' + escapeHtml(label) + '</span>';
      });
      return '<nav class="detail-stack-breadcrumb" data-testid="detail-stack-breadcrumb" aria-label="Navigation trail">' +
        crumbs.join('<span class="detail-stack-crumb-sep">›</span>') + '</nav>';
    }

    function syncDetailSubHeaderFromStack() {
      const top = detailStack.peek();
      if (!top || !detailSubTitle || !detailSubId) {
        return;
      }
      detailSubTitle.textContent = top.title || top.key || top.type;
      if (top.type === 'task') {
        detailSubId.textContent = top.payload?.workId || top.key || '';
      } else if (top.type === 'analytics') {
        detailSubId.textContent = top.payload?.recordKey || top.payload?.recordId || top.key || '';
      } else if (top.type === 'architecture-l2') {
        detailSubId.textContent = top.payload?.nodePath || top.payload?.nodeId || top.key || '';
      } else if (top.type === 'repo-file') {
        detailSubId.textContent = top.payload?.repoPath || top.key || '';
      } else {
        detailSubId.textContent = top.key || '';
      }
      const headerWrap = detailSubTitle.closest('.detail-header > div');
      if (!headerWrap) {
        return;
      }
      const existing = headerWrap.querySelector('[data-testid="detail-stack-breadcrumb"]');
      const breadcrumbHtml = renderDetailStackBreadcrumb();
      if (breadcrumbHtml) {
        if (existing) {
          existing.outerHTML = breadcrumbHtml;
        } else {
          detailSubId.insertAdjacentHTML('afterend', breadcrumbHtml);
        }
      } else if (existing) {
        existing.remove();
      }
    }

    function closeDetailStackFully() {
      detailStack.reset();
      closeL2NodeDetails();
    }

    function popDetailStackNavigation() {
      if (!detailSubDrawer?.classList.contains('is-open')) {
        return false;
      }
      if (detailStack.depth() > 1) {
        detailStack.pop();
        renderTopDetailStackFrame().catch(() => undefined);
        return true;
      }
      closeDetailStackFully();
      detailClose?.focus();
      return true;
    }

    function resolveStackParentContext(parentFrame) {
      if (!parentFrame) {
        return null;
      }
      if (parentFrame.type === 'task') {
        return {
          type: 'task',
          taskId: parentFrame.payload?.workId ?? parentFrame.key,
          title: parentFrame.title || parentFrame.key,
        };
      }
      if (parentFrame.type === 'analytics') {
        return {
          type: 'analytics',
          recordId: parentFrame.payload?.recordId ?? parentFrame.key,
        };
      }
      if (parentFrame.type === 'architecture-block') {
        return {
          type: 'block',
          blockId: parentFrame.payload?.blockId ?? parentFrame.key,
        };
      }
      return null;
    }

    async function renderDetailStackFrame(frame, parentFrame) {
      if (frame.type === 'task') {
        const item = snapshot?.items?.find((candidate) => candidate.id === (frame.payload?.workId || frame.key));
        if (!item || !detailSubBody) {
          return;
        }
        detailSubBody.setAttribute(
          'data-testid',
          parentFrame?.type === 'analytics' ? 'analytics-related-task-sub-drawer' : 'task-hierarchy-sub-drawer',
        );
        detailSubBody.dataset.remoteStatus = item.status ?? '';
        await renderTaskDetailContent(item, {
          parentContext: resolveStackParentContext(parentFrame),
          mode: 'view',
          targetBody: detailSubBody,
          subDrawer: true,
        });
        bindDetailSubNavBack(() => popDetailStackNavigation());
        return;
      }
      if (frame.type === 'analytics') {
        const record = (analyticsProjection?.records ?? []).find((entry) => entry.id === (frame.payload?.recordId || frame.key));
        if (!record || !detailSubBody) {
          return;
        }
        detailSubBody.setAttribute('data-testid', 'analytics-lineage-sub-drawer');
        renderAnalyticsRecordStackBody(record, parentFrame);
        bindDetailSubNavBack(() => popDetailStackNavigation());
        return;
      }
      if (frame.type === 'architecture-l2') {
        const block = architectureSnapshot?.blocks?.find((candidate) => candidate.id === frame.payload?.blockId);
        if (!block || !detailSubBody) {
          return;
        }
        const l2Graph = block.l2Graph;
        const nodes = l2Graph?.layoutNodes || l2Graph?.nodes || [];
        const node = nodes.find((candidate) => candidate.id === frame.payload?.nodeId);
        if (!node) {
          return;
        }
        detailSubBody.setAttribute('data-testid', 'architecture-l2-sub-drawer');
        const backLabel = parentFrame?.type === 'architecture-block'
          ? '← ' + (parentFrame.title || parentFrame.key)
          : '← ' + (block.title || block.id);
        detailSubBody.innerHTML = renderDetailSubBackButton(backLabel) + buildL2NodeDetailSections(node, l2Graph, block);
        bindDetailSubNavBack(() => popDetailStackNavigation());
        return;
      }
      if (frame.type === 'repo-file') {
        const repoPath = frame.payload?.repoPath || frame.key;
        if (!repoPath || !detailSubBody) {
          return;
        }
        detailSubBody.setAttribute('data-testid', 'repo-file-preview-sub-drawer');
        const backLabel = parentFrame
          ? '← ' + (parentFrame.title || parentFrame.key)
          : '← Назад';
        detailSubBody.innerHTML = renderDetailSubBackButton(backLabel) +
          '<section class="detail-section repo-file-preview-panel" data-testid="repo-file-preview-panel">' +
          '<p class="muted">Загрузка предпросмотра…</p></section>';
        bindDetailSubNavBack(() => popDetailStackNavigation());

        try {
          const response = await fetch('/api/repo-file/preview?path=' + encodeURIComponent(repoPath));
          const preview = await response.json();
          detailSubBody.innerHTML = renderDetailSubBackButton(backLabel) + renderRepoFilePreviewPanel(preview);
          bindDetailSubNavBack(() => popDetailStackNavigation());
          const markdownRoot = detailSubBody.querySelector('.repo-file-markdown');
          if (markdownRoot) {
            queueMicrotask(function() {
              mountMarkdownMermaidDiagrams(markdownRoot);
            });
          }
        } catch (error) {
          detailSubBody.innerHTML = renderDetailSubBackButton(backLabel) +
            '<section class="detail-section repo-file-preview-panel" data-testid="repo-file-preview-panel">' +
            '<p class="error">' + escapeHtml(error instanceof Error ? error.message : String(error)) + '</p></section>';
          bindDetailSubNavBack(() => popDetailStackNavigation());
        }
      }
    }

    async function renderTopDetailStackFrame() {
      const top = detailStack.peek();
      const below = detailStack.peekBelow();
      if (!top || detailStack.depth() <= 1) {
        closeDetailStackFully();
        return;
      }
      await renderDetailStackFrame(top, below);
      syncDetailSubHeaderFromStack();
      openL2SubDrawer();
    }

    function renderAnalyticsRecordStackBody(record, parentFrame) {
      const parentContext = resolveStackParentContext(parentFrame);
      const backLabel = parentContext?.type === 'analytics'
        ? '← ' + ((analyticsProjection?.records ?? []).find((entry) => entry.id === parentContext.recordId)?.key || 'Аналитика')
        : '← ' + (record.key || record.title || 'Аналитика');
      detailSubBody.innerHTML = renderDetailSubBackButton(backLabel) + buildAnalyticsRecordDetailInnerHtml(record);
      queueMicrotask(function() {
        mountMarkdownMermaidDiagrams(detailSubBody.querySelector('.analytics-record-body'));
      });
    }

    function buildAnalyticsRecordDetailInnerHtml(record) {
      const isClosing = readAnalyticsRecordKind(record) === 'closing';
      const answerBody = stripAnalyticsBodyPreamble(record.body || '');
      const querySection = isClosing
        ? (String(record.query ?? '').trim() !== ''
          ? '<section class="detail-section analytics-query-section" data-testid="analytics-query-section">' +
            '<h3 class="analytics-section-title">Контекст</h3>' +
            '<p class="analytics-query-text">' + escapeHtml(record.query) + '</p>' +
            '</section>'
          : '')
        : '<section class="detail-section analytics-query-section" data-testid="analytics-query-section">' +
          '<h3 class="analytics-section-title">Запрос</h3>' +
          '<p class="analytics-query-text">' + escapeHtml(record.query || '—') + '</p>' +
          '</section>';
      const bodySectionTitle = isClosing ? 'Итоги эпика' : 'Ответ';
      return '<div class="analytics-qna" data-testid="analytics-qna">' +
        querySection +
        '<section class="detail-section analytics-record-body" data-testid="analytics-record-body">' +
          '<h3 class="analytics-section-title">' + bodySectionTitle + '</h3>' +
          autolinkRepoFilePathsInHtml(renderMarkdownDocument(answerBody || '—'), record.bodyPath || '') +
        '</section>' +
      '</div>' +
      (isClosing ? '' : renderAnalyticsIntentGraphSections(record)) +
      renderAnalyticsLineageSections(record) +
      renderAnalyticsRelatedWorkItemsSection(record);
    }

    function openAnalyticsLineageStackDrawer(record) {
      if (!record?.id) {
        return;
      }
      const currentRecordId = detailContext?.recordId || selectedAnalyticsRecordId;
      const currentRecord = currentRecordId
        ? (analyticsProjection?.records ?? []).find((entry) => entry.id === currentRecordId)
        : null;

      if (currentRecord && detailStack.depth() === 0) {
        detailStack.push({
          type: 'analytics',
          key: currentRecord.id,
          title: currentRecord.title || currentRecord.key || currentRecord.id,
          payload: { recordId: currentRecord.id, recordKey: currentRecord.key || currentRecord.id },
        });
      }

      detailStack.push({
        type: 'analytics',
        key: record.id,
        title: record.title || record.key || record.id,
        payload: { recordId: record.id, recordKey: record.key || record.id },
      });

      selectedAnalyticsRecordId = record.id;
      renderAnalyticsPanel();
      renderTopDetailStackFrame().catch(() => undefined);
      detailSubClose?.focus();
    }

    function resolveL2NodeLabel(nodeRef, l2Graph) {
      const id = typeof nodeRef === 'string' ? nodeRef : nodeRef?.id;
      const nodes = l2Graph.layoutNodes || l2Graph.nodes || [];
      const node = nodes.find((candidate) => candidate.id === id);
      if (!node) return id;
      return node.kind === 'file' ? (node.path || node.title) : node.title;
    }

    function findL2NodeEdges(l2Graph, nodeId) {
      const edges = l2Graph.layoutEdges || l2Graph.edges || [];
      const normalized = edges.map((edge) => ({
        from: edge.from ?? edge.fromNode?.id,
        to: edge.to ?? edge.toNode?.id,
        type: edge.type,
      }));
      return {
        incoming: normalized.filter((edge) => edge.to === nodeId),
        outgoing: normalized.filter((edge) => edge.from === nodeId),
      };
    }

    function collectBlockTasksForL2Node(block, node) {
      const paths = node.kind === 'file'
        ? [node.path].filter(Boolean)
        : [...(node.paths ?? [])];
      if (paths.length === 0) {
        return [];
      }
      return (block.taskIds || [])
        .map((taskId) => snapshot?.items?.find((item) => item.id === taskId))
        .filter(Boolean)
        .filter((item) => (item.targetFiles || []).some((file) =>
          paths.some((path) => file === path || file.startsWith(path + '/') || path.startsWith(file + '/'))));
    }

    function renderL2NodeEdgesAccordion(title, edges, l2Graph, direction) {
      if (!edges.length) return '';
      const rows = edges.map((edge) => {
        const peerId = direction === 'out' ? edge.to : edge.from;
        const peerLabel = resolveL2NodeLabel(peerId, l2Graph);
        return peerLabel + ' — ' + formatArchitectureEdgeTypeLabel(edge.type);
      });
      return wrapDetailAccordion(title,
        '<ul>' + rows.map((row) => '<li>' + escapeHtml(row) + '</li>').join('') + '</ul>',
        { testid: 'l2-node-edges-' + direction });
    }

    function buildL2NodeDetailSections(node, l2Graph, block) {
      const descriptionSource = resolveL2NodeDescriptionSource(node, l2Graph);
      const { incoming, outgoing } = findL2NodeEdges(l2Graph, node.id);
      const relatedTasks = collectBlockTasksForL2Node(block, node);
      let html = renderL2NodeBvcDescription(descriptionSource);
      html += renderPipelineReadOnly(descriptionSource, { testid: 'l2-pipeline-panel' });
      html += renderDetailText('Тип', formatL2NodeKindLabel(node.kind));
      if (node.kind === 'container') {
        html += renderDetailText('Роль', formatArchitectureContainerKind(node.subtitle || ''));
      }
      if (node.path) {
        html += renderDetailPathText('Путь', node.path);
      }
      if (node.kind === 'container' && Array.isArray(node.paths) && node.paths.length > 0) {
        html += wrapDetailAccordion('Пути (' + node.paths.length + ')',
          '<ul>' + renderRepoFilePathListItems(node.paths) + '</ul>',
          { testid: 'l2-node-paths-accordion' });
      }
      html += renderL2NodeEdgesAccordion('Исходящие связи (' + outgoing.length + ')', outgoing, l2Graph, 'out');
      html += renderL2NodeEdgesAccordion('Входящие связи (' + incoming.length + ')', incoming, l2Graph, 'in');
      if (relatedTasks.length > 0) {
        html += wrapDetailAccordion('Связанные задачи (' + relatedTasks.length + ')',
          '<div class="backlog-list">' + relatedTasks.map((item) => renderTaskAtom(item, 'list-row')).join('') + '</div>',
          { testid: 'l2-node-tasks-accordion' });
      }
      return html;
    }

    function openL2SubDrawer() {
      if (!detailSubOverlay || !detailSubDrawer) return;
      detailSubOverlay.hidden = false;
      detailSubOverlay.classList.add('is-open');
      detailSubOverlay.setAttribute('aria-hidden', 'false');
      detailSubDrawer.classList.add('is-open');
      detailSubDrawer.setAttribute('aria-hidden', 'false');
    }

    function closeL2NodeDetails() {
      if (!detailSubOverlay || !detailSubDrawer) return;
      detailSubDrawer.classList.remove('is-open');
      detailSubOverlay.classList.remove('is-open');
      detailSubDrawer.setAttribute('aria-hidden', 'true');
      detailSubOverlay.setAttribute('aria-hidden', 'true');
      detailSubOverlay.hidden = true;
      if (detailSubBody) detailSubBody.innerHTML = '';
    }

    function openL2NodeDetails(block, nodeId, { fromBlockDrawer = false } = {}) {
      const l2Graph = block.l2Graph;
      const nodes = l2Graph?.layoutNodes || l2Graph?.nodes || [];
      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (!node || !detailSubBody || !detailSubTitle || !detailSubId) return;

      if (fromBlockDrawer && detailContext?.type === 'block' && detailStack.depth() === 0) {
        detailStack.push({
          type: 'architecture-block',
          key: block.id,
          title: block.title || block.id,
          payload: { blockId: block.id },
        });
      }

      detailStack.push({
        type: 'architecture-l2',
        key: block.id + ':' + nodeId,
        title: node.kind === 'file' ? (node.title || node.path || node.id) : (node.title || node.id),
        payload: {
          blockId: block.id,
          nodeId: node.id,
          nodePath: node.path || node.id,
        },
      });

      renderTopDetailStackFrame().catch(() => undefined);
      detailSubClose?.focus();
    }

    function openTaskHierarchyStackDrawer(item) {
      if (!item?.id) {
        return;
      }

      const currentWorkId = detailContext?.taskId ?? detailInspectorState?.workId;
      const currentItem = currentWorkId
        ? snapshot?.items?.find((candidate) => candidate.id === currentWorkId)
        : null;

      if (currentItem && detailStack.depth() === 0) {
        detailStack.push({
          type: 'task',
          key: currentItem.id,
          title: currentItem.title || currentItem.id,
          payload: { workId: currentItem.id },
        });
      }

      detailStack.push({
        type: 'task',
        key: item.id,
        title: item.title || item.id,
        payload: { workId: item.id },
      });

      renderTopDetailStackFrame().catch(() => undefined);
      detailSubClose?.focus();
    }

    function openTaskStackSubDrawer(item, previousFrame) {
      if (!item || !detailSubBody || !detailSubTitle || !detailSubId) {
        return;
      }

      detailSubTitle.textContent = item.title || item.id;
      detailSubId.textContent = item.id;
      detailSubBody.setAttribute('data-testid', 'task-hierarchy-sub-drawer');
      detailSubBody.dataset.remoteStatus = item.status ?? '';

      const parentContext = previousFrame?.type === 'task'
        ? {
          type: 'task',
          taskId: previousFrame.payload?.workId ?? previousFrame.key,
          title: previousFrame.title || previousFrame.key,
        }
        : null;

      renderTaskDetailContent(item, {
        parentContext,
        mode: 'view',
        targetBody: detailSubBody,
        subDrawer: true,
      }).catch((error) => {
        detailSubBody.innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>';
      });

      openL2SubDrawer();
      detailSubClose?.focus();
    }

    function openAnalyticsRelatedTaskSubDrawer(item, record) {
      if (!item || !record) {
        return;
      }

      const top = detailStack.peek();
      if (!top || top.type !== 'analytics' || top.payload?.recordId !== record.id) {
        if (detailStack.depth() > 0) {
          detailStack.reset();
        }
        detailStack.push({
          type: 'analytics',
          key: record.id,
          title: record.title || record.key || record.id,
          payload: { recordId: record.id, recordKey: record.key || record.id },
        });
      }

      detailStack.push({
        type: 'task',
        key: item.id,
        title: item.title || item.id,
        payload: { workId: item.id },
      });

      renderTopDetailStackFrame().catch(() => undefined);
      detailSubClose?.focus();
    }

    function wrapDetailAccordion(title, innerHtml, options = {}) {
      const body = String(innerHtml ?? '').trim();
      if (!body && options.required !== true) return '';
      const testId = options.testid ? ' data-testid="' + escapeHtml(options.testid) + '"' : '';
      const workId = options.dataWorkId ? ' data-work-id="' + escapeHtml(options.dataWorkId) + '"' : '';
      const extraClass = options.className ? ' ' + options.className : '';
      const openAttr = options.defaultOpen ? ' open' : '';
      return '<details class="detail-accordion' + extraClass + '"' + testId + workId + openAttr + '>' +
        '<summary class="detail-accordion-summary">' + escapeHtml(title) + '</summary>' +
        '<div class="detail-accordion-body">' + body + '</div></details>';
    }

    function renderOptionalDetailAccordion(title, value, kind, options = {}) {
      if (kind === 'list') {
        if (!Array.isArray(value) || value.length === 0) return '';
        const linkRepoFiles = options.linkRepoFiles === true;
        return wrapDetailAccordion(title,
          '<ul>' + (linkRepoFiles ? renderRepoFilePathListItems(value) : value.map((entry) => '<li>' + escapeHtml(entry) + '</li>').join('')) + '</ul>');
      }
      if (!value) return '';
      return wrapDetailAccordion(title, '<p>' + escapeHtml(value) + '</p>');
    }

    function renderParentChildHierarchy(item) {
      const parentId = String(item.parentId ?? item.labels?.['work.parent_id'] ?? '').trim();
      const childIds = Array.isArray(item.childIds) ? item.childIds : [];
      if (parentId === '' && childIds.length === 0) {
        return '';
      }

      const parts = [];
      if (parentId !== '') {
        const parent = snapshot?.items?.find((candidate) => candidate.id === parentId);
        parts.push('<div class="detail-section hierarchy-parent" data-testid="hierarchy-parent">' +
          '<h3>' + escapeHtml(t('drawer.section.parent')) + '</h3>' +
          '<div class="hierarchy-panel">' +
          '<button type="button" class="task-atom list-row" data-task-id="' + escapeHtml(parentId) + '">' +
          '<h3>' + escapeHtml(parent?.title ?? parentId) + '</h3>' +
          (parent ? '<p class="list-row-line">' + escapeHtml(parent.status) + '</p>' : '') +
          '</button></div></div>');
      }

      if (childIds.length > 0) {
        const doneCount = childIds.filter((childId) => {
          const child = snapshot?.items?.find((candidate) => candidate.id === childId);
          return child && (child.status === 'done' || child.status === 'verified');
        }).length;
        const closeBlocked = doneCount < childIds.length;
        const childButtons = childIds.map((childId) => {
          const child = snapshot?.items?.find((candidate) => candidate.id === childId);
          return '<button type="button" class="task-atom list-row" data-task-id="' + escapeHtml(childId) + '">' +
            '<h3>' + escapeHtml(child?.title ?? childId) + '</h3>' +
            (child ? '<p class="list-row-line">' + escapeHtml(child.status) + '</p>' : '') +
            '</button>';
        }).join('');

        parts.push('<div class="detail-section hierarchy-children" data-testid="hierarchy-children">' +
          '<h3>' + escapeHtml(t('drawer.section.children')) + ' <span class="count">' + doneCount + '/' + childIds.length + '</span></h3>' +
          (closeBlocked
            ? '<p class="hierarchy-close-gate">' + escapeHtml(t('drawer.section.closeBlocked')) + '</p>'
            : '') +
          '<div class="hierarchy-panel">' + childButtons + '</div></div>');
      }

      return parts.join('');
    }

    function buildTaskDetailSections(item) {
      return '<div class="meta">' + renderTags(item).join('') + '</div>' +
        renderParentChildHierarchy(item) +
        renderDetailText(t('drawer.section.basis'), item.basis) +
        renderDetailText(t('drawer.section.vector'), item.vector) +
        renderDetailText(t('drawer.section.goal'), item.goal) +
        renderPipelineReadOnly(item) +
        renderOptionalDetailAccordion(t('drawer.section.dependencies'), item.dependsOn, 'list') +
        renderOptionalDetailAccordion(t('drawer.section.checks'), item.checks, 'list') +
        renderOptionalDetailAccordion(t('drawer.section.evidence'), item.evidence, 'list') +
        renderOptionalDetailAccordion(t('drawer.section.nextAction'), item.nextAction, 'text') +
        renderOptionalDetailAccordion(t('drawer.section.blocker'), item.blocker, 'text') +
        renderOptionalDetailAccordion(t('drawer.section.targetFiles'), item.targetFiles, 'list', { linkRepoFiles: true }) +
        wrapDetailAccordion(t('drawer.section.memory'),
          '<button type="button" class="detail-link-btn" data-action="open-memory-for-task" data-work-id="' + escapeHtml(item.id) + '" data-testid="open-memory-for-task">' + escapeHtml(t('drawer.section.memoryLink')) + '</button>',
          { required: true });
    }

    function renderPipelineReadOnly(source, options = {}) {
      if (!source) return '';
      const labels = source.labels ?? {};
      const verdict = String(labels['work.decision.verdict'] ?? labels['architecture.decision.verdict'] ?? '').trim();
      const analysis = String(source.analysis ?? '').trim();
      const decision = String(source.decision ?? '').trim();

      const parts = [];
      if (verdict) {
        const verdictClass = ' verdict-' + escapeHtml(verdict);
        parts.push('<div class="pipeline-readonly-meta">' +
          '<span class="pill' + verdictClass + '">Вердикт: <strong>' + escapeHtml(formatVerdictRu(verdict)) + '</strong></span>' +
          '</div>');
      }
      if (analysis) {
        parts.push(renderPipelineProse(analysis));
      }
      if (decision) {
        if (analysis) {
          parts.push('<div class="pipeline-prose-divider"></div>');
        }
        parts.push(renderPipelineProse(decision));
      }

      return wrapDetailAccordion(t('drawer.section.analysisDecision'), parts.join(''), {
        testid: options.testid ?? 'work-pipeline-panel',
        dataWorkId: options.dataWorkId ?? source.id,
        className: 'pipeline-readonly',
        required: true,
        defaultOpen: analysis !== '',
      });
    }

    function renderUiReferencesPanel(payload) {
      if (!payload || (payload.uiFacing !== true && (!payload.items || payload.items.length === 0))) {
        return '';
      }

      const cards = (payload.items ?? []).map((entry) =>
        '<figure class="ui-refs-card" data-testid="ui-ref-card">' +
        '<a href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener">' +
        '<img src="' + escapeHtml(entry.url) + '" alt="' + escapeHtml(entry.caption || entry.originalName || entry.file) + '" loading="lazy" />' +
        '</a>' +
        '<figcaption class="ui-refs-caption">' + escapeHtml(entry.caption || entry.originalName || entry.file) + '</figcaption>' +
        '</figure>',
      ).join('');

      return '<section class="detail-section ui-refs-panel" data-testid="ui-refs-panel" data-work-id="' + escapeHtml(payload.workId) + '">' +
        '<h3>UI-референсы</h3>' +
        '<p class="muted">Скриншоты макетов и референсы интерфейса для этой задачи (хранятся в work/ui-references).</p>' +
        (cards ? '<div class="ui-refs-grid">' + cards + '</div>' : '<p class="muted">Референсы ещё не прикреплены.</p>') +
        '<div class="ui-refs-actions">' +
        '<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-testid="ui-ref-file-input" />' +
        '<button type="button" data-action="ui-ref-pick" data-testid="ui-ref-pick">Прикрепить скрин</button>' +
        '</div>' +
        '</section>';
    }

    async function fetchUiReferencesSection(workId) {
      const response = await fetch('/api/work-item/ui-refs?workId=' + encodeURIComponent(workId));
      const payload = await response.json();
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
      }
      return renderUiReferencesPanel(payload);
    }

    function bindUiReferenceActions(item, options = {}) {
      const root = options.root ?? detailBody;
      const panel = root.querySelector('[data-testid="ui-refs-panel"]');
      if (!panel) return;

      const fileInput = panel.querySelector('[data-testid="ui-ref-file-input"]');
      const pickButton = panel.querySelector('[data-action="ui-ref-pick"]');
      if (!fileInput || !pickButton) return;

      pickButton.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        pickButton.disabled = true;
        try {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let index = 0; index < bytes.length; index += 1) {
            binary += String.fromCharCode(bytes[index]);
          }
          const contentBase64 = btoa(binary);
          const uploadResponse = await fetch('/api/work-item/ui-refs/upload', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              workId: item.id,
              filename: file.name,
              contentBase64,
              caption: file.name,
            }),
          });
          const uploadPayload = await uploadResponse.json();
          if (!uploadResponse.ok || uploadPayload.ok === false) {
            throw new Error(uploadPayload.message || uploadPayload.error || ('HTTP ' + uploadResponse.status));
          }
          await reloadOperatorSnapshots();
          await renderTaskDetailContent(item, { parentContext: detailContext?.parent ?? null, mode: detailInspectorState.mode ?? 'view' });
        } catch (error) {
          window.alert(error.message || String(error));
        } finally {
          pickButton.disabled = false;
          fileInput.value = '';
        }
      });
    }

    function openMemoryPanelForTask(workId) {
      const normalizedWorkId = String(workId ?? '').trim();
      if (normalizedWorkId === '') {
        return;
      }

      activeView = 'memory';
      localStorage.setItem(viewStorageKey, activeView);
      search.value = 'work:' + normalizedWorkId;
      applyView(activeView);
      ensureLazyViewData('memory').then(() => {
        render();
      }).catch((error) => {
        console.error(error);
        render();
      });
    }

    async function fetchEvidenceTimelineSection(workId) {
      const response = await fetch('/api/evidence-timeline?workId=' + encodeURIComponent(workId));
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
      }

      const events = payload.events ?? [];
      const rows = events.length
        ? events.map((event) =>
          '<li class="evidence-timeline-item" data-testid="evidence-timeline-item">' +
          '<span class="evidence-timeline-kind">' + escapeHtml(event.kind) + ' · ' + escapeHtml(event.title || '') + '</span>' +
          (event.time ? '<time datetime="' + escapeHtml(event.time) + '">' + escapeHtml(event.time) + '</time>' : '<time>legacy order #' + escapeHtml(String(event.sequence ?? '')) + '</time>') +
          '<p class="evidence-timeline-summary">' + escapeHtml(event.summary || '') + '</p>' +
          '</li>',
        ).join('')
        : '<li class="evidence-timeline-item"><p class="evidence-timeline-summary">События evidence/transitions не найдены.</p></li>';

      return '<section class="detail-section evidence-timeline-panel" data-testid="evidence-timeline-panel">' +
        '<h3>Evidence timeline</h3>' +
        '<ol class="evidence-timeline-list">' + rows + '</ol>' +
        '</section>';
    }

    function openTaskDetails(itemOrId, { parentContext = null, mode = 'view' } = {}) {
      let item = itemOrId;
      if (typeof itemOrId === 'string') {
        const lookupId = itemOrId.trim();
        if (!lookupId) return;
        const found = (snapshot?.items ?? []).find((candidate) => candidate.id === lookupId);
        if (!found) {
          // Snapshot not loaded yet — defer lookup so the drawer never opens with empty fields.
          ensureWorkSnapshotLoaded().then((loaded) => {
            const resolved = (loaded?.items ?? []).find((candidate) => candidate.id === lookupId);
            if (resolved) openTaskDetails(resolved, { parentContext, mode });
          }).catch(() => undefined);
          return;
        }
        item = found;
      }
      if (!item || typeof item !== 'object' || !item.id) {
        return;
      }
      detailContext = { type: 'task', taskId: item.id, parent: parentContext };
      detailTitle.textContent = item.title || item.id;
      detailId.textContent = item.id;
      detailInspectorState = { workId: item.id, draft: null, mode };
      detailBody.dataset.remoteStatus = item.status ?? '';
      detailStack.reset();
      detailStack.push({
        type: 'task',
        key: item.id,
        title: item.title || item.id,
        payload: { workId: item.id },
      });
      renderTaskDetailContent(item, { parentContext, mode }).catch((error) => {
        detailBody.innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>';
      });
      openDetailDrawer();
      detailClose.focus();
    }

    async function renderTaskDetailContent(item, { parentContext = null, mode = 'view', targetBody = null, subDrawer = false } = {}) {
      const body = targetBody ?? detailBody;
      const renderBackButton = subDrawer ? renderDetailSubBackButton : renderDetailBackButton;
      const bindBack = subDrawer ? bindDetailSubNavBack : bindDetailNavBack;
      const effectiveMode = subDrawer ? 'view' : mode;

      let backRow = '';
      let backHandler = null;
      if (parentContext?.type === 'block') {
        const block = architectureSnapshot?.blocks?.find((candidate) => candidate.id === parentContext.blockId);
        backRow = renderBackButton('← ' + (block?.title || block?.id || 'Блок'));
        backHandler = () => {
          if (subDrawer) {
            popDetailStackNavigation();
            if (block) openBlockDetails(block, { resetNav: false });
            return;
          }
          if (block) openBlockDetails(block, { resetNav: false });
        };
      } else if (parentContext?.type === 'analytics') {
        const record = (analyticsProjection?.records ?? []).find((candidate) => candidate.id === parentContext.recordId);
        backRow = renderBackButton('← ' + (record?.key || record?.title || 'Аналитика'));
        backHandler = () => {
          if (subDrawer) {
            popDetailStackNavigation();
            return;
          }
          if (record) openAnalyticsRecordDetails(record);
        };
      } else if (parentContext?.type === 'task') {
        backRow = renderBackButton('← ' + (parentContext.title || parentContext.taskId || t('drawer.back.task')));
        backHandler = () => {
          if (subDrawer) {
            popDetailStackNavigation();
            return;
          }
          detailClose?.focus();
        };
      }

      if (effectiveMode === 'edit') {
        const response = await fetch('/api/atom-inspector/draft?workId=' + encodeURIComponent(item.id));
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
        }
        detailInspectorState.draft = payload.draft;
        body.innerHTML = backRow +
          renderDetailToolbar('edit') +
          renderAtomInspectorForm(payload) +
          '<pre id="atom-inspector-preview" class="atom-inspector-preview" data-testid="atom-inspector-preview"></pre>' +
          '<pre id="atom-inspector-errors" class="atom-inspector-errors" data-testid="atom-inspector-errors" hidden></pre>';
      } else {
        const linkageFallback = (error) =>
          '<section class="detail-section linkage-drilldown-panel" data-testid="linkage-drilldown-panel">' +
          '<h3>Trace связи</h3><p class="error">' + escapeHtml(error.message) + '</p></section>';
        const pvrgFallback = (error) =>
          '<section class="detail-section pvrg-scope-panel" data-testid="pvrg-task-scope-panel">' +
          '<h3>PVRG область</h3><p class="error">' + escapeHtml(error.message) + '</p></section>';

        const [linkageSection, pvrgSection, timelineSection, uiRefsSection] = await Promise.all([
          fetchLinkageDrilldownSection(item.id).catch((error) => linkageFallback(error)),
          fetchPvrgTaskScopeSection(item.id).catch((error) => pvrgFallback(error)),
          fetchEvidenceTimelineSection(item.id).catch((error) =>
            '<section class="detail-section evidence-timeline-panel" data-testid="evidence-timeline-panel">' +
            '<h3>Evidence timeline</h3><p class="error">' + escapeHtml(error.message) + '</p></section>',
          ),
          fetchUiReferencesSection(item.id).catch((error) =>
            '<section class="detail-section ui-refs-panel" data-testid="ui-refs-panel">' +
            '<h3>UI-референсы</h3><p class="error">' + escapeHtml(error.message) + '</p></section>',
          ),
        ]);

        body.innerHTML = backRow +
          (subDrawer ? '' : renderDetailToolbar('view')) +
          buildTaskDetailSections(item) +
          wrapDetailAccordion('UI-референсы', uiRefsSection, { testid: 'ui-refs-accordion' }) +
          wrapDetailAccordion('Evidence timeline', timelineSection, { testid: 'evidence-timeline-accordion' }) +
          wrapDetailAccordion('Trace связи', linkageSection, { testid: 'linkage-drilldown-accordion' }) +
          wrapDetailAccordion('PVRG область', pvrgSection, { testid: 'pvrg-task-scope-accordion' }) +
          (subDrawer ? '' : renderDetailPromoteRow(item));
      }

      if (backHandler) bindBack(backHandler);
      if (!subDrawer) {
        bindDetailToolbar(item);
        bindUiReferenceActions(item);
      } else {
        bindUiReferenceActions(item, { root: body });
      }
      body.querySelectorAll('[data-action="open-memory-for-task"]').forEach((button) => {
        button.addEventListener('click', () => {
          openMemoryPanelForTask(button.dataset.workId);
        });
      });
    }

    function renderDetailToolbar(mode) {
      return '<div class="detail-toolbar" data-testid="detail-toolbar">' +
        renderClientUiButton({
          label: 'Просмотр',
          variant: mode === 'view' ? 'primary' : 'secondary',
          size: 'sm',
          testId: 'detail-mode-view',
          attrs: { 'data-detail-mode': 'view' },
        }) +
        renderClientUiButton({
          label: 'Редактор',
          variant: mode === 'edit' ? 'primary' : 'secondary',
          size: 'sm',
          testId: 'detail-mode-edit',
          attrs: { 'data-detail-mode': 'edit' },
        }) +
        '</div>';
    }

    function bindDetailToolbar(item) {
      detailBody.querySelectorAll('[data-detail-mode]').forEach((button) => {
        button.addEventListener('click', () => {
          const mode = button.dataset.detailMode === 'edit' ? 'edit' : 'view';
          detailInspectorState.mode = mode;
          renderTaskDetailContent(item, { parentContext: detailContext?.parent ?? null, mode }).catch((error) => {
            detailBody.innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>';
          });
        }, { once: true });
      });

      const proposeButton = detailBody.querySelector('[data-action="proposal"]');
      const applyButton = detailBody.querySelector('[data-action="apply"]');
      if (proposeButton) {
        proposeButton.addEventListener('click', () => submitAtomInspectorProposal(item.id));
      }
      if (applyButton) {
        applyButton.addEventListener('click', () => submitAtomInspectorApply(item.id));
      }
    }

    function renderAtomInspectorForm(payload) {
      const draft = payload.draft ?? {};
      const labels = draft.labels ?? {};
      const lang = resolveAtomInspectorLang(draft);
      const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
      const warningHtml = warnings.length > 0
        ? '<div class="atom-inspector-warnings" data-testid="atom-inspector-warnings">' +
          warnings.map((entry) => '<div>' + escapeHtml(typeof entry === 'string' ? entry : (entry.message || String(entry))) + '</div>').join('') +
          '</div>'
        : '';
      const statusOptions = workItemStatusOptions.map((status) =>
        '<option value="' + escapeHtml(status) + '"' + (labels['work.status'] === status ? ' selected' : '') + '>' + escapeHtml(status) + '</option>'
      ).join('');

      return '<form id="atom-inspector-form" class="atom-inspector-form" data-testid="atom-inspector-form">' +
        warningHtml +
        '<div class="atom-inspector-field"><label>Atom name<span class="atom-inspector-lang-badge" data-testid="atom-inspector-lang-badge">' + escapeHtml(lang) + '</span></label><input name="name" value="' + escapeHtml(draft.name ?? '') + '" readonly></div>' +
        '<div class="atom-inspector-field"><label>' + escapeHtml(atomSectionTitle(lang, 'basis')) + '</label><textarea name="basis">' + escapeHtml((draft.basis ?? []).join('\\n')) + '</textarea></div>' +
        '<div class="atom-inspector-field"><label>' + escapeHtml(atomSectionTitle(lang, 'vector')) + '</label><textarea name="vector">' + escapeHtml((draft.vector ?? []).join('\\n')) + '</textarea></div>' +
        '<div class="atom-inspector-field"><label>' + escapeHtml(atomSectionTitle(lang, 'goal')) + '</label><textarea name="goal">' + escapeHtml((draft.goal ?? []).join('\\n')) + '</textarea></div>' +
        '<div class="atom-inspector-field"><label>work.status</label><select name="work.status">' + statusOptions + '</select></div>' +
        '<div class="atom-inspector-field"><label>work.owner_role</label><input name="work.owner_role" value="' + escapeHtml(labels['work.owner_role'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>work.department</label><input name="work.department" value="' + escapeHtml(labels['work.department'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>work.priority</label><input name="work.priority" value="' + escapeHtml(labels['work.priority'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>work.risk</label><input name="work.risk" value="' + escapeHtml(labels['work.risk'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>work.next_action</label><input name="work.next_action" value="' + escapeHtml(labels['work.next_action'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>work.blocker</label><input name="work.blocker" value="' + escapeHtml(labels['work.blocker'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>work.depends_on</label><input name="work.depends_on" value="' + escapeHtml(labels['work.depends_on'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>work.target_files</label><input name="work.target_files" value="' + escapeHtml(labels['work.target_files'] ?? '') + '"></div>' +
        '<div class="atom-inspector-field"><label>' + escapeHtml(atomSectionTitle(lang, 'checks')) + '</label><textarea name="checks">' + escapeHtml((draft.checks ?? []).join('\\n')) + '</textarea></div>' +
        '<div class="atom-inspector-field"><label>' + escapeHtml(atomSectionTitle(lang, 'evidence')) + '</label><textarea name="evidence">' + escapeHtml((draft.evidence ?? []).join('\\n')) + '</textarea></div>' +
        '<div class="atom-inspector-actions">' +
          '<button type="button" data-action="proposal" data-testid="atom-inspector-propose">Preview proposal</button>' +
          '<button type="button" data-action="apply" data-testid="atom-inspector-apply">Apply to backlog</button>' +
        '</div>' +
        '</form>';
    }

    function collectAtomInspectorDraftFromForm(workId) {
      const form = document.querySelector('#atom-inspector-form');
      if (!form || !detailInspectorState.draft) {
        throw new Error('atom inspector form is not loaded');
      }

      const labels = { ...(detailInspectorState.draft.labels ?? {}) };
      for (const element of form.querySelectorAll('[name^="work."]')) {
        labels[element.name] = element.value.trim();
      }
      labels['work.id'] = workId;
      labels['atom.profile'] = 'work_item';

      const draft = {
        profile: 'work_item',
        name: detailInspectorState.draft.name,
        basis: splitInspectorLines(form.elements.basis.value),
        vector: splitInspectorLines(form.elements.vector.value),
        goal: splitInspectorLines(form.elements.goal.value),
        labels,
      };

      const checks = splitInspectorLines(form.elements.checks.value);
      const evidence = splitInspectorLines(form.elements.evidence.value);
      if (checks.length > 0) draft.checks = checks;
      if (evidence.length > 0) draft.evidence = evidence;

      return draft;
    }

    function splitInspectorLines(value) {
      return String(value ?? '')
        .split(/\\r?\\n/u)
        .map((line) => line.replace(/^-\\s*/u, '').trim())
        .filter(Boolean);
    }

    async function submitAtomInspectorProposal(workId) {
      const preview = document.querySelector('#atom-inspector-preview');
      const errors = document.querySelector('#atom-inspector-errors');
      if (!preview || !errors) return;

      try {
        const draft = collectAtomInspectorDraftFromForm(workId);
        const response = await fetch('/api/atom-inspector/proposal', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workId, draft }),
        });
        const payload = await response.json();

        if (!payload.ok) {
          errors.hidden = false;
          errors.textContent = (payload.validationErrors ?? []).join('\\n') || payload.error || 'validation failed';
          preview.textContent = '';
          return;
        }

        errors.hidden = true;
        errors.textContent = '';
        preview.textContent = JSON.stringify(payload, null, 2);
        detailInspectorState.draft = payload.draft;
      } catch (error) {
        errors.hidden = false;
        errors.textContent = error.message;
      }
    }

    async function submitAtomInspectorApply(workId) {
      const errors = document.querySelector('#atom-inspector-errors');
      try {
        const draft = collectAtomInspectorDraftFromForm(workId);
        const response = await fetch('/api/atom-inspector/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workId, draft }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          const proposalErrors = payload.proposal?.validationErrors ?? [];
          throw new Error(proposalErrors.join('; ') || payload.error || 'apply failed');
        }

        await reloadOperatorSnapshots();
        render();
        const updated = snapshot.items.find((item) => item.id === workId);
        if (updated) {
          openTaskDetails(updated, { parentContext: detailContext?.parent ?? null, mode: 'view' });
        }
      } catch (error) {
        if (errors) {
          errors.hidden = false;
          errors.textContent = error.message;
        }
      }
    }

    function closeTaskDetails() {
      closeDetailStackFully();
      detailDrawer.classList.remove('is-open');
      detailOverlay.classList.remove('is-open');
      detailDrawer.setAttribute('aria-hidden', 'true');
      detailOverlay.setAttribute('aria-hidden', 'true');
      detailOverlay.hidden = true;
      document.documentElement.classList.remove('detail-drawer-open');
      document.body.classList.remove('detail-drawer-open');
      detailContext = null;
      if (highlightTaskId !== null) {
        highlightTaskId = null;
        render();
      }
    }

    function renderDetailText(title, value) {
      if (!value) return '';
      return '<section class="detail-section"><h3>' + escapeHtml(title) + '</h3><p>' + renderInlineCode(value) + '</p></section>';
    }

    const REPO_FILE_PREVIEW_EXT_RE = /\\.(?:bvc|mjs|js|cjs|ts|tsx|md|yaml|yml|json|step)$/i;
    const REPO_FILE_PATH_INLINE_RE = /\\b([a-zA-Z0-9_.-]+(?:\\/[a-zA-Z0-9_.-]+)*\\.(?:bvc|mjs|js|cjs|ts|tsx|md|yaml|yml|json|step))\\b/gi;

    function basenameFromRepoPath(repoPath) {
      const normalized = String(repoPath ?? '').replace(/\\\\/g, '/');
      const parts = normalized.split('/');
      return parts[parts.length - 1] || normalized;
    }

    function isRepoFilePreviewPath(value) {
      const text = String(value ?? '').trim();
      if (!text || text.includes(' ') || /^https?:\\/\\//i.test(text)) {
        return false;
      }
      if (text.startsWith('/') || /^[a-zA-Z]:/.test(text)) {
        return false;
      }
      if (text.split('/').includes('..')) {
        return false;
      }
      return REPO_FILE_PREVIEW_EXT_RE.test(text);
    }

    function renderRepoFileLink(repoPath) {
      const path = String(repoPath ?? '').trim();
      return '<button type="button" class="repo-file-link" data-repo-file-path="' + escapeHtml(path) + '" data-testid="repo-file-link">' +
        escapeHtml(path) + '</button>';
    }

    function renderRepoFilePathListItems(paths) {
      return (paths ?? []).map((entry) => {
        if (isRepoFilePreviewPath(entry)) {
          return '<li>' + renderRepoFileLink(entry) + '</li>';
        }
        return '<li>' + escapeHtml(entry) + '</li>';
      }).join('');
    }

    function renderDetailPathText(title, value) {
      if (!value) {
        return '';
      }
      const path = String(value).trim();
      const body = isRepoFilePreviewPath(path)
        ? renderRepoFileLink(path)
        : renderInlineCode(path);
      return '<section class="detail-section"><h3>' + escapeHtml(title) + '</h3><p>' + body + '</p></section>';
    }

    function formatRepoFileByteLength(bytes) {
      const value = Number(bytes) || 0;
      if (value < 1024) {
        return value + ' B';
      }
      if (value < 1024 * 1024) {
        return (value / 1024).toFixed(1) + ' KB';
      }
      return (value / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function resolveRepoFilePathForPreview(repoPath, basePath) {
      const path = String(repoPath ?? '').trim().replace(/\\\\/g, '/');
      const base = String(basePath ?? '').trim().replace(/\\\\/g, '/');
      if (!path || path.split('/').includes('..')) {
        return path;
      }
      if (path.includes('/') || !base) {
        return path;
      }
      const slash = base.lastIndexOf('/');
      const dir = slash >= 0 ? base.slice(0, slash) : '';
      return dir ? dir + '/' + path : path;
    }

    function findAnalyticsRecordById(recordId) {
      return (analyticsProjection?.records ?? []).find((entry) => entry.id === recordId) ?? null;
    }

    function getRepoFilePreviewBasePath() {
      const top = detailStack.peek();
      if (top?.type === 'repo-file' && top.payload?.repoPath) {
        return top.payload.repoPath;
      }
      if (top?.type === 'analytics' && top.payload?.recordId) {
        return findAnalyticsRecordById(top.payload.recordId)?.bodyPath || detailContext?.bodyPath || '';
      }
      const below = detailStack.peekBelow();
      if (below?.type === 'analytics' && below.payload?.recordId) {
        return findAnalyticsRecordById(below.payload.recordId)?.bodyPath || detailContext?.bodyPath || '';
      }
      if (detailContext?.type === 'analytics') {
        return detailContext.bodyPath || findAnalyticsRecordById(detailContext.recordId)?.bodyPath || '';
      }
      return '';
    }

    function autolinkRepoFilePathsInHtml(html, basePath) {
      if (!html) {
        return '';
      }
      const base = String(basePath ?? getRepoFilePreviewBasePath() ?? '').trim();
      return html.split(/(<(?:pre|code)\\b[^>]*>[\\s\\S]*?<\\/(?:pre|code)>)/gi).map((segment, index) => {
        if (index % 2 === 1) {
          return segment;
        }
        return segment.replace(REPO_FILE_PATH_INLINE_RE, (match) => {
          if (!isRepoFilePreviewPath(match)) {
            return match;
          }
          return renderRepoFileLink(resolveRepoFilePathForPreview(match, base));
        });
      }).join('');
    }

    function renderRepoFilePreviewPanel(preview) {
      if (!preview?.ok) {
        return '<section class="detail-section repo-file-preview-panel" data-testid="repo-file-preview-panel">' +
          '<p class="error">' + escapeHtml(preview?.error || 'Файл не найден в workspace') + '</p></section>';
      }

      const language = preview.language || 'plaintext';
      const meta = '<div class="repo-file-meta">' +
        '<code class="repo-file-path">' + escapeHtml(preview.path || '') + '</code>' +
        '<span class="muted">' + escapeHtml(formatRepoFileByteLength(preview.byteLength)) +
        ' · ' + escapeHtml(language) + ' · read-only</span>' +
        (preview.truncated ? '<span class="repo-file-truncated">Файл обрезан до лимита preview</span>' : '') +
        '</div>';

      let body;
      if (language === 'bvc') {
        body = '<pre class="repo-file-preview code-hl language-bvc" data-language="bvc" data-testid="repo-file-preview-bvc">' +
          highlightBvcBlock(preview.content || '') + '</pre>';
      } else if (language === 'markdown') {
        body = '<div class="repo-file-markdown">' +
          autolinkRepoFilePathsInHtml(renderMarkdownDocument(preview.content || ''), preview.path || '') +
          '</div>';
      } else {
        body = '<pre class="repo-file-preview code-hl" data-language="' + escapeHtml(language) + '">' +
          highlightCodeBlock(preview.content || '', language) + '</pre>';
      }

      return '<section class="detail-section repo-file-preview-panel" data-testid="repo-file-preview-panel">' +
        meta + body + '</section>';
    }

    function seedDetailStackFromOpenDrawerIfNeeded() {
      if (detailStack.depth() > 0) {
        return;
      }

      if (detailContext?.type === 'task') {
        const item = snapshot?.items?.find((candidate) => candidate.id === detailContext.taskId);
        if (item) {
          detailStack.push({
            type: 'task',
            key: item.id,
            title: item.title || item.id,
            payload: { workId: item.id },
          });
          return;
        }
      }

      if (detailContext?.type === 'analytics') {
        const record = (analyticsProjection?.records ?? []).find((entry) => entry.id === detailContext.recordId);
        if (record) {
          detailStack.push({
            type: 'analytics',
            key: record.id,
            title: record.title || record.key || record.id,
            payload: { recordId: record.id, recordKey: record.key || record.id },
          });
          return;
        }
      }

      if (detailContext?.type === 'block') {
        const block = architectureSnapshot?.blocks?.find((candidate) => candidate.id === detailContext.blockId);
        if (block) {
          detailStack.push({
            type: 'architecture-block',
            key: block.id,
            title: block.title || block.id,
            payload: { blockId: block.id },
          });
          return;
        }
      }

      if (detailDrawer.classList.contains('is-open')) {
        const shellTitle = String(detailTitle?.textContent ?? '').trim() || 'Drawer';
        const shellKey = String(detailId?.textContent ?? '').trim() || shellTitle;
        detailStack.push({
          type: 'repo-file-shell',
          key: 'shell:' + shellKey,
          title: shellTitle,
          payload: { shellKey },
        });
      }
    }

    function openRepoFileStackPreview(repoPath) {
      const rawPath = String(repoPath ?? '').trim();
      if (!rawPath || !detailDrawer.classList.contains('is-open')) {
        return;
      }
      const path = resolveRepoFilePathForPreview(rawPath, getRepoFilePreviewBasePath());
      seedDetailStackFromOpenDrawerIfNeeded();
      detailStack.push({
        type: 'repo-file',
        key: path,
        title: basenameFromRepoPath(path),
        payload: { repoPath: path },
      });
      renderTopDetailStackFrame().catch(() => undefined);
      detailSubClose?.focus();
    }

    function renderDetailList(title, values, options = {}) {
      if (!Array.isArray(values) || values.length === 0) return '';
      const linkRepoFiles = options.linkRepoFiles === true;
      return '<section class="detail-section"><h3>' + escapeHtml(title) + '</h3><ul>' +
        (linkRepoFiles
          ? renderRepoFilePathListItems(values)
          : values.map((value) => '<li>' + escapeHtml(value) + '</li>').join('')) +
        '</ul></section>';
    }

    function renderPvrgTaskScopeSection(slice) {
      if (!slice || slice.schema !== 'pvrg.task-scope.slice.v1') {
        return '<section class="detail-section pvrg-scope-panel" data-testid="pvrg-task-scope-panel">' +
          '<h3>PVRG область</h3><p class="empty">Нет данных subgraph</p></section>';
      }

      const nodeRows = (slice.nodes ?? []).map((node) => {
        if (node.kind === 'work') {
          return '<li><span class="pvrg-node-kind">work</span> <strong>' + escapeHtml(node.id) + '</strong>' +
            (node.title ? ' — ' + escapeHtml(node.title) : '') +
            (node.status ? ' <span class="muted">(' + escapeHtml(node.status) + ')</span>' : '') +
            '</li>';
        }

        return '<li><span class="pvrg-node-kind">file</span> ' +
          (isRepoFilePreviewPath(node.path || node.id) ? renderRepoFileLink(node.path || node.id) : '<code>' + escapeHtml(node.path || node.id) + '</code>') +
          '</li>';
      }).join('');

      const edgeRows = (slice.edges ?? []).slice(0, 48).map((edge) =>
        '<li>' + escapeHtml(edge.from.kind + ':' + edge.from.id) +
        ' <span class="pvrg-edge-rel">' + escapeHtml(edge.relation) + '</span> → ' +
        escapeHtml(edge.to.kind + ':' + edge.to.id) + '</li>',
      ).join('');

      const truncatedNote = slice.truncated
        ? '<p class="muted">Subgraph обрезан лимитом (' + slice.nodeCount + ' узлов).</p>'
        : '';

      return '<section class="detail-section pvrg-scope-panel" data-testid="pvrg-task-scope-panel">' +
        '<h3>PVRG область</h3>' +
        '<p class="muted">' + slice.nodeCount + ' узлов, ' + slice.edgeCount + ' рёбер</p>' +
        truncatedNote +
        '<h4>Узлы</h4><ul class="pvrg-node-list">' + (nodeRows || '<li class="empty">—</li>') + '</ul>' +
        '<h4>Связи</h4><ul class="pvrg-edge-list">' + (edgeRows || '<li class="empty">—</li>') + '</ul>' +
        '</section>';
    }

    async function fetchPvrgTaskScopeSection(workId) {
      const response = await fetch('/api/pvrg-task-scope?workId=' + encodeURIComponent(workId));
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
      }

      return renderPvrgTaskScopeSection(payload);
    }

    function renderLinkageDrilldownSection(payload) {
      if (!payload || payload.schema !== 'workgraph.work-item-linkage-drilldown.v1') {
        return '<section class="detail-section linkage-drilldown-panel" data-testid="linkage-drilldown-panel">' +
          '<h3>Trace связи</h3><p class="empty">Нет linkage refs</p></section>';
      }

      const refs = payload.refs ?? [];
      if (refs.length === 0) {
        return '<section class="detail-section linkage-drilldown-panel" data-testid="linkage-drilldown-panel">' +
          '<h3>Trace связи</h3><p class="empty">Нет linkage refs для этой задачи</p></section>';
      }

      const refRows = refs.map((entry) =>
        '<li><span class="linkage-ref-kind">' + escapeHtml(entry.kind) + '</span>' +
        '<button type="button" class="linkage-ref-button" data-linkage-kind="' + escapeHtml(entry.kind) + '" data-linkage-ref="' + escapeHtml(entry.ref) + '" data-testid="linkage-ref">' +
        escapeHtml(entry.label) + '</button>' +
        (entry.source ? '<span class="muted">' + escapeHtml(entry.source) + '</span>' : '') +
        '</li>',
      ).join('');

      const truncatedNote = payload.truncated
        ? '<p class="muted">Показано ' + payload.refCount + ' refs из ' + payload.linkCount + ' links.</p>'
        : '';

      return '<section class="detail-section linkage-drilldown-panel" data-testid="linkage-drilldown-panel">' +
        '<h3>Trace связи</h3>' +
        '<p class="muted">' + payload.refCount + ' refs, trace.status=' + escapeHtml(payload.envelope?.traceStatus ?? 'pending') + '</p>' +
        truncatedNote +
        '<ul class="linkage-ref-list">' + refRows + '</ul>' +
        '</section>';
    }

    async function fetchLinkageDrilldownSection(workId) {
      const response = await fetch('/api/work-item-linkage?workId=' + encodeURIComponent(workId));
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
      }

      return renderLinkageDrilldownSection(payload);
    }

    function renderSemanticCore(item) {
      if (!item.goal) return '';

      return '<section class="semantic-core" aria-label="Цель задачи">' +
        '<div class="semantic-line">' + escapeHtml(preview(item.goal)) + '</div>' +
      '</section>';
    }

    function renderTags(item) {
      return [
        tag('статус', item.status, 'status'),
        tag('роль', item.ownerRole, 'role'),
        tag('отдел', item.department, 'department'),
        tag('приоритет', item.priority, 'priority'),
        tag('риск', item.risk, 'risk'),
        tag('трасса', item.traceStatus, 'trace'),
      ].filter(Boolean);
    }

    function renderDetailPromoteRow(item) {
      const actions = [];
      if (snapshot && isPromotableBacklogItem(snapshot.items, item)) {
        actions.push(renderClientUiButton({
          label: 'Сделать доступной агенту',
          variant: 'soft',
          size: 'sm',
          className: 'detail-promote-button',
          testId: 'detail-promote-ready',
          attrs: { 'data-promote-task-id': item.id },
        }));
      }
      if (!actions.length) {
        return '';
      }

      return '<div class="detail-promote-row">' +
        actions.join('') +
        '</div>';
    }

    function renderIssueFooter(item, { queueKind = null, surface = 'default' } = {}) {
      const secondaryBadge = surface === 'board'
        ? renderWorkItemClassifierBadge(item)
        : ((item.status || queueKind) ? renderStatusBadge(item.status, queueKind) : '');
      const leftTags = renderWorkItemIssueKeyChip(item) + secondaryBadge;
      const owner = item.ownerRole || item.department || 'WG';
      return '<div class="issue-footer">' +
        '<div class="issue-footer-left">' + leftTags + '</div>' +
        '<div class="issue-footer-right">' + renderOwnerAvatar(owner, { title: owner }) + '</div>' +
        '</div>';
    }

    function renderStatusBadge(status, queueKind = null) {
      if (queueKind === 'planned') {
        return renderClientUiBadge({
          label: t('status.planned'),
          tone: 'accent',
          title: 'backlog, зависимости выполнены',
          testId: 'status-planned',
        });
      }
      if (!status) return '';
      const normalized = normalizeCssToken(status);
      return renderClientUiBadge({
        label: statusLabel(status),
        tone: statusToBadgeTone(status, queueKind),
        title: String(status),
        testId: 'status-' + normalized,
      });
    }

    function compactTag(value, classPrefix) {
      if (!value) return '';
      const normalized = normalizeCssToken(value);
      return '<span class="tag tag-compact ' + classPrefix + '-' + normalized + '">' + escapeHtml(value) + '</span>';
    }

    function tag(label, value, classPrefix) {
      if (!value) return '';
      const normalized = normalizeCssToken(value);
      return '<span class="tag ' + classPrefix + '-' + normalized + '">' + escapeHtml(label + ': ' + value) + '</span>';
    }

    function normalizeCssToken(value) {
      return String(value).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    }

    function renderList(title, values) {
      if (!Array.isArray(values) || values.length === 0) return '';
      return '<details><summary>' + escapeHtml(title) + ' (' + values.length + ')</summary><ul>' +
        values.map((value) => '<li>' + escapeHtml(value) + '</li>').join('') +
        '</ul></details>';
    }

    function matchesQuery(item, query) {
      if (!query) return true;
      const haystack = [
        item.id,
        item.title,
        item.status,
        item.ownerRole,
        item.department,
        item.priority,
        item.risk,
        item.traceStatus,
        item.nextAction,
        item.blocker,
        ...(item.dependsOn || []),
        ...(item.evidence || []),
        ...(item.checks || []),
        ...(item.targetFiles || []),
        item.basis,
        item.vector,
        item.goal,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    }

    function preview(value) {
      const normalized = String(value).replace(/\s+/g, ' ').trim();
      return normalized.length > 110 ? normalized.slice(0, 107) + '...' : normalized;
    }

    function countByStatus(items) {
      return items.reduce((counts, item) => {
        counts[item.status] = (counts[item.status] || 0) + 1;
        return counts;
      }, {});
    }

    function countGroupItems(counts, group) {
      return group.statuses.reduce((sum, status) => sum + (counts[status] || 0), 0);
    }
  </script>
</body>
</html>`;
}

export function createBacklogUiServer(options = {}) {
  const hostState = createWorkGraphHostState(options);
  const backlogPath = options.backlogPath;
  const journalPath = options.journalPath ?? 'work/worker-runs.jsonl';
  const auditPath = options.auditPath ?? 'work/daemon-audit.jsonl';
  const pathOptions = { backlogPath, journalPath, auditPath };
  const uiEventsHub = createBacklogUiEventsHub();
  let hostReady = ensureHostStateInitialized(hostState, {
    hostLabel: options.hostLabel ?? 'Work Graph',
  });

  return createHttpServer(async (request, response) => {
    await hostReady;
    const url = new URL(request.url ?? '/', 'http://localhost');
    const method = request.method ?? 'GET';
    const requestCtx = resolveWorkGraphRequestContext(hostState, url, pathOptions);
    const cwd = requestCtx.repoRoot;
    const serverOptions = { cwd, backlogPath, journalPath, auditPath };

    if (url.pathname === '/api/prompt-rules-projection' && method === 'GET') {
      try {
        const ruleId = url.searchParams.get('ruleId') ?? url.searchParams.get('id') ?? undefined;
        const projection = await buildPromptRulesProjection({ cwd, ruleId });
        sendJson(response, 200, projection);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_prompt_rules_projection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/prompt-rules/source' && method === 'GET') {
      try {
        const ruleId = url.searchParams.get('ruleId') ?? url.searchParams.get('id') ?? '';
        const payload = await executePromptRuleSourceRead({ cwd, ruleId });
        sendJson(response, 200, payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.includes('not found') ? 404 : 500;
        sendJson(response, status, {
          error: status === 404 ? 'prompt_rule_not_found' : 'prompt_rule_source_failed',
          message,
        });
      }
      return;
    }

    if (url.pathname === '/api/prompt-rules/save' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const saveResult = await executePromptRuleSourceSave({ cwd, body: rawBody });
        sendJson(response, saveResult.ok ? 200 : 422, saveResult);
      } catch (error) {
        sendJson(response, 400, {
          error: 'prompt_rule_save_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/kanban-board-projection' && method === 'GET') {
      try {
        const items = await readWorkItemsFromRepo({ cwd, backlogPath });
        sendJson(response, 200, buildKanbanBoardProjection(items, { includeItems: true }));
      } catch (error) {
        sendJson(response, 500, {
          error: 'kanban_board_projection_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/code-gap-projection' && method === 'GET') {
      try {
        const projection = await buildCodeGapOperatorProjection({ cwd });
        sendJson(response, 200, projection);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_code_gap_projection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/code-gap-intake/proposal' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const proposal = await executeCodeGapDraftProposal({ ...serverOptions, body: rawBody });
        sendJson(response, proposal.ok ? 200 : 422, proposal);
      } catch (error) {
        sendJson(response, 400, {
          error: 'code_gap_intake_proposal_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/code-gap-intake/apply' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const applyResult = await executeCodeGapDraftApply({ ...serverOptions, body: rawBody });
        sendJson(response, applyResult.ok ? 200 : 422, applyResult);
      } catch (error) {
        sendJson(response, 400, {
          error: 'code_gap_intake_apply_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/semantic-search' && method === 'GET') {
      try {
        const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? '';
        const limitRaw = url.searchParams.get('limit');
        const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
        const mode = url.searchParams.get('mode')?.trim() || undefined;
        const snapshot = await readBacklogSnapshot({ cwd, backlogPath });
        const result = await executeSemanticSearchFromRepo({
          cwd,
          query,
          items: snapshot.items,
          limit: Number.isInteger(limit) && limit > 0 ? limit : undefined,
          ...(mode ? { mode } : {}),
        });
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 500, {
          error: 'semantic_search_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/epic-scope' && method === 'GET') {
      try {
        const epicId = url.searchParams.get('epicId') ?? url.searchParams.get('workId') ?? '';
        if (!epicId) {
          sendJson(response, 400, {
            error: 'epic_id_required',
            message: 'epicId query parameter is required',
          });
          return;
        }

        const items = await readWorkItemsFromRepo({ cwd, backlogPath });
        const slice = buildEpicWorkScopeSlice(items, epicId);
        sendJson(response, 200, slice);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.startsWith('unknown epic id:') || message.startsWith('work item is not an epic:')
          ? 404
          : 500;
        sendJson(response, status, {
          error: status === 404 ? 'unknown_epic_id' : 'epic_scope_failed',
          message,
        });
      }
      return;
    }

    if (url.pathname === '/api/pvrg-task-scope' && method === 'GET') {
      try {
        const workId = url.searchParams.get('workId') ?? url.searchParams.get('taskId') ?? '';
        if (!workId) {
          sendJson(response, 400, {
            error: 'work_id_required',
            message: 'workId query parameter is required',
          });
          return;
        }

        const maxNodesRaw = url.searchParams.get('maxNodes');
        const maxDepthRaw = url.searchParams.get('maxDepth');
        const scopeOptions = {};
        if (maxNodesRaw) {
          const maxNodes = Number.parseInt(maxNodesRaw, 10);
          if (Number.isInteger(maxNodes) && maxNodes > 0) {
            scopeOptions.maxNodes = maxNodes;
          }
        }
        if (maxDepthRaw) {
          const maxDepth = Number.parseInt(maxDepthRaw, 10);
          if (Number.isInteger(maxDepth) && maxDepth >= 0) {
            scopeOptions.maxDepth = maxDepth;
          }
        }

        const items = await readWorkItemsFromRepo({ cwd, backlogPath });
        const slice = buildPvrgTaskScopeSlice(items, workId, scopeOptions);
        sendJson(response, 200, slice);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.startsWith('unknown task id:') ? 404 : 500;
        sendJson(response, status, {
          error: status === 404 ? 'unknown_work_id' : 'pvrg_task_scope_failed',
          message,
        });
      }
      return;
    }

    if (url.pathname === '/api/work-item-linkage' && method === 'GET') {
      try {
        const workId = url.searchParams.get('workId') ?? url.searchParams.get('taskId') ?? '';
        if (!workId) {
          sendJson(response, 400, {
            error: 'work_id_required',
            message: 'workId query parameter is required',
          });
          return;
        }

        const items = await readWorkItemsFromRepo({ cwd, backlogPath });
        const drilldown = buildWorkItemLinkageDrilldown(workId, items);
        sendJson(response, 200, drilldown);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.startsWith('unknown task id:') ? 404 : 500;
        sendJson(response, status, {
          error: status === 404 ? 'unknown_work_id' : 'work_item_linkage_failed',
          message,
        });
      }
      return;
    }

    if (url.pathname === '/api/daemon-audit-tail' && method === 'GET') {
      try {
        const limitRaw = url.searchParams.get('limit');
        const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
        const tail = await readDaemonAuditTailResponse({
          cwd,
          auditPath,
          ...(Number.isInteger(limit) && limit > 0 ? { limit } : {}),
        });
        sendJson(response, 200, tail);
      } catch (error) {
        sendJson(response, 500, {
          error: 'daemon_audit_tail_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/memory-projection' && method === 'GET') {
      try {
        const projection = await buildMemoryPanelProjection({ cwd, backlogPath });
        sendJson(response, 200, projection);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_memory_projection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/memory-records' && method === 'GET') {
      try {
        const workId = url.searchParams.get('workId') ?? url.searchParams.get('work_id') ?? undefined;
        const limitParam = url.searchParams.get('limit');
        const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
        const payload = await buildMemoryRecordsApiResponse({
          cwd,
          backlogPath,
          ...(workId ? { workId } : {}),
          ...(Number.isInteger(limit) && limit > 0 ? { limit } : {}),
        });
        sendJson(response, 200, payload);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_memory_records',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/analytics-projection' && method === 'GET') {
      try {
        const projection = await buildAnalyticsPanelProjection({ cwd, backlogPath });
        sendJson(response, 200, projection);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_analytics_projection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/analytics-records' && method === 'GET') {
      try {
        const topic = url.searchParams.get('topic') ?? undefined;
        const limitParam = url.searchParams.get('limit');
        const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
        const payload = await buildAnalyticsRecordsApiResponse({
          cwd,
          ...(topic ? { topic } : {}),
          ...(Number.isInteger(limit) && limit > 0 ? { limit } : {}),
        });
        sendJson(response, 200, payload);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_analytics_records',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/evidence-timeline' && method === 'GET') {
      try {
        const workId = url.searchParams.get('workId') ?? url.searchParams.get('taskId') ?? '';
        const timeline = await readEvidenceTimelineResponse({
          cwd,
          backlogPath,
          workId,
          journalPath: serverOptions.journalPath,
        });
        sendJson(response, 200, timeline);
      } catch (error) {
        sendJson(response, 400, {
          error: 'failed_to_build_evidence_timeline',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/worker-provider-catalog' && method === 'GET') {
      sendJson(response, 200, readWorkerProviderCatalogResponse());
      return;
    }

    if (url.pathname === '/api/agent-run/journal' && method === 'GET') {
      try {
        const journal = await readAgentRunJournalResponse(serverOptions);
        sendJson(response, 200, journal);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_agent_run_journal',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/work-item/promote-ready' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const result = await executePromoteReady({ ...serverOptions, body: rawBody });
        sendJson(response, result.ok ? 200 : 409, result);
      } catch (error) {
        sendJson(response, 400, {
          error: 'promote_ready_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/atom-inspector/draft' && method === 'GET') {
      try {
        const workId = url.searchParams.get('workId') ?? url.searchParams.get('taskId') ?? '';
        const draftResponse = await readAtomInspectorDraftResponse({
          ...serverOptions,
          workId,
        });
        sendJson(response, 200, draftResponse);
      } catch (error) {
        sendJson(response, 400, {
          error: 'atom_inspector_draft_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/atom-inspector/proposal' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const proposal = await executeAtomInspectorProposal({ ...serverOptions, body: rawBody });
        sendJson(response, proposal.ok ? 200 : 422, proposal);
      } catch (error) {
        sendJson(response, 400, {
          error: 'atom_inspector_proposal_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/atom-inspector/apply' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const applyResult = await executeAtomInspectorApply({ ...serverOptions, body: rawBody });
        sendJson(response, applyResult.ok ? 200 : 422, applyResult);
      } catch (error) {
        sendJson(response, 400, {
          error: 'atom_inspector_apply_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/intent-composer/proposal' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const proposal = await executeIntentComposerProposal({ ...serverOptions, body: rawBody });
        sendJson(response, proposal.ok ? 200 : 422, proposal);
      } catch (error) {
        sendJson(response, 400, {
          error: 'intent_composer_proposal_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/intent-composer/apply' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const applyResult = await executeIntentComposerApply({ ...serverOptions, body: rawBody });
        sendJson(response, applyResult.ok ? 200 : 422, applyResult);
      } catch (error) {
        sendJson(response, 400, {
          error: 'intent_composer_apply_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/work-pipeline/view' && method === 'GET') {
      try {
        const workId = url.searchParams.get('workId') ?? '';
        const items = await readWorkItemsFromRepo(serverOptions);
        const item = items.find((entry) => entry.id === workId);
        if (!item) {
          sendJson(response, 404, { ok: false, error: 'work_item_not_found', workId });
          return;
        }
        sendJson(response, 200, buildWorkItemPipelineView(item));
      } catch (error) {
        sendJson(response, 400, {
          error: 'work_pipeline_view_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/work-item/ui-refs/upload' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const result = await attachUiReference({ ...serverOptions, ...body, workId: body.workId });
        sendJson(response, result.ok ? 200 : 422, result);
      } catch (error) {
        sendJson(response, 400, {
          error: 'ui_ref_upload_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/agent-run' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const result = await executeAgentRun({ ...serverOptions, body: rawBody });
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 400, {
          error: 'agent_run_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/workspaces' && method === 'GET') {
      try {
        sendJson(response, 200, await buildWorkspacesApiResponse(hostState));
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_list_workspaces',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/workspace/switch' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const projectId = String(body.projectId ?? body.id ?? '').trim();
        if (projectId === '') {
          sendJson(response, 400, {
            error: 'project_id_required',
            message: 'projectId is required',
          });
          return;
        }
        sendJson(response, 200, await switchHostWorkspace(hostState, projectId));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.startsWith('unknown projectId:') ? 404 : 500;
        sendJson(response, status, {
          error: status === 404 ? 'workspace_not_found' : 'workspace_switch_failed',
          message,
        });
      }
      return;
    }

    if (url.pathname === '/api/workspace/register' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const root = String(body.root ?? body.path ?? '').trim();
        if (root === '') {
          sendJson(response, 400, {
            error: 'root_required',
            message: 'root is required',
          });
          return;
        }
        sendJson(response, 200, await registerHostWorkspace(hostState, body));
      } catch (error) {
        sendJson(response, 500, {
          error: 'workspace_register_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/ui-locale' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const locale = resolveUiLocale({ queryLocale: body.locale });
        sendJson(response, 200, { ok: true, locale }, {
          'Set-Cookie': `${UI_LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`,
        });
      } catch (error) {
        sendJson(response, 422, {
          error: 'failed_to_set_ui_locale',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (method !== 'GET') {
      sendText(response, 405, 'Method Not Allowed');
      return;
    }

    if (url.pathname === '/api/work-item/ui-refs') {
      try {
        const workId = url.searchParams.get('workId') ?? '';
        const result = await listUiReferences({ ...serverOptions, workId });
        sendJson(response, result.ok ? 200 : 422, result);
      } catch (error) {
        sendJson(response, 400, {
          error: 'ui_refs_list_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/work-item/ui-refs/file') {
      try {
        const workId = url.searchParams.get('workId') ?? '';
        const file = url.searchParams.get('file') ?? '';
        const filePath = resolveUiReferenceFilePath(cwd, workId, file);
        const buffer = await readFile(filePath);
        sendBinary(response, 200, buffer, mimeTypeForUiReferenceFileName(file));
      } catch (error) {
        sendJson(response, 404, {
          error: 'ui_ref_file_not_found',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/backlog-revision' && method === 'GET') {
      try {
        const items = await readWorkItemsFromRepo({ cwd, backlogPath });
        sendJson(response, 200, computeBacklogRevision(items));
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_compute_backlog_revision',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/ui-events/stream' && method === 'GET') {
      try {
        await uiEventsHub.ensureStarted({ cwd, backlogPath });
        uiEventsHub.handleSse(request, response);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_open_ui_events_stream',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/app-version' && method === 'GET') {
      try {
        const checkUpdate = url.searchParams.get('checkUpdate') === '1'
          || url.searchParams.get('checkUpdate') === 'true';
        const bypassCache = url.searchParams.get('fresh') === '1'
          || url.searchParams.get('fresh') === 'true';
        const payload = await buildAppVersionResponse({
          cwd,
          installRoot: WG_INSTALL_ROOT,
          checkUpdate,
          bypassCache,
        });
        sendJson(response, 200, payload);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_app_version',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/app-version/install' && method === 'POST') {
      try {
        const payload = await buildAppVersionInstallResponse({
          cwd,
          installRoot: WG_INSTALL_ROOT,
        });
        sendJson(response, 200, payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message === 'update_not_available' || message === 'project_update_requires_npm_install'
          ? 409
          : 500;
        sendJson(response, status, {
          error: 'failed_to_install_app_version',
          code: message,
          message,
        });
      }
      return;
    }

    if (url.pathname === '/api/git-snapshot-settings' && method === 'GET') {
      try {
        const settings = await loadGitSnapshotPolicy({ cwd, env: process.env });
        sendJson(response, 200, {
          schema: 'workgraph.git-snapshot.settings.v1',
          settings,
        });
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_git_snapshot_settings',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/git-snapshot-settings' && method === 'PUT') {
      try {
        const body = await readJsonBody(request);
        const saved = await writeGitSnapshotSettingsFile(cwd, body ?? {});
        sendJson(response, 200, {
          schema: 'workgraph.git-snapshot.settings.v1',
          settings: saved.settings,
          path: saved.path,
        });
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_write_git_snapshot_settings',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/snapshot') {
      try {
        const snapshot = await readBacklogSnapshot({ cwd, backlogPath });
        sendJson(response, 200, snapshot);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_backlog_snapshot',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/dashboard-snapshot') {
      try {
        const dashboardSnapshot = await readDashboardSnapshot({ cwd, backlogPath });
        sendJson(response, 200, dashboardSnapshot);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_dashboard_snapshot',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/runner-queue-projection') {
      try {
        const projection = await readRunnerQueueProjectionFromRepo({ cwd, backlogPath });
        sendJson(response, 200, projection);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_runner_queue_projection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/operator-shell-snapshot') {
      try {
        const operatorShellSnapshot = await readOperatorShellSnapshot({
          cwd,
          backlogPath,
          cycleId: url.searchParams.get('cycleId') || undefined,
        });
        sendJson(response, 200, operatorShellSnapshot);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_operator_shell_snapshot',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/home-snapshot' && method === 'GET') {
      try {
        const homeSnapshot = await handleHomeSnapshotRequest({
          cwd,
          backlogPath,
          ownerRole: url.searchParams.get('ownerRole') || undefined,
          cycleId: url.searchParams.get('cycleId') || undefined,
        });
        sendJson(response, 200, homeSnapshot);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_home_snapshot',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/inbox-events' && method === 'GET') {
      try {
        const inbox = await handleInboxEventsRequest({
          cwd,
          backlogPath,
          limit: Number(url.searchParams.get('limit')) || 50,
        });
        sendJson(response, 200, inbox);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_inbox_events',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/inbox-events/read' && method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const result = await handleInboxEventsReadRequest(rawBody, { cwd, backlogPath });
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_mark_inbox_read',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/intent-roadmap-projection' && method === 'GET') {
      try {
        const workItems = await readWorkItemsFromRepo({ cwd, backlogPath });
        const intentNodes = await readIntentNodesFromRepo({ cwd });
        const collapsed = url.searchParams.get('collapsed') ?? '';
        const projection = buildIntentRoadmapProjection(intentNodes, workItems, { cwd, collapsed });
        sendJson(response, 200, projection);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_intent_roadmap_projection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/roadmap/epics' && method === 'GET') {
      try {
        const workItems = await readWorkItemsFromRepo({ cwd, backlogPath });
        const collapsed = url.searchParams.get('collapsed') ?? '';
        const active = url.searchParams.get('active') === '1' || url.searchParams.get('active') === 'true';
        const withChildren = url.searchParams.get('withChildren') === '1' || url.searchParams.get('withChildren') === 'true';
        const projection = buildEpicRoadmapProjection(workItems, {
          cwd,
          collapsed,
          active,
          withChildren,
        });
        sendJson(response, 200, projection);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_epic_roadmap_projection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/repo-file/preview' && method === 'GET') {
      try {
        const result = await readRepoFilePreviewFromRequest(url, { repoRoot: cwd, cwd });
        sendJson(response, result.status, result.body);
      } catch (error) {
        sendJson(response, 500, {
          schema: 'workgraph.repo-file-preview.v1',
          ok: false,
          error: 'repo_file_preview_failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/intent-plane/graph' && method === 'GET') {
      try {
        const start = url.searchParams.get('start') ?? url.searchParams.get('workId') ?? '';
        if (!String(start).trim()) {
          sendJson(response, 400, { error: 'start_required', message: 'query param start is required' });
          return;
        }
        const items = await readWorkItemsFromRepo({ cwd, backlogPath });
        const payload = buildIntentPlaneGraphResponse(items, {
          start,
          direction: url.searchParams.get('direction') ?? 'downstream',
          depth: Number(url.searchParams.get('depth') ?? 1),
          drift: url.searchParams.get('drift') === '1',
        });
        sendJson(response, 200, payload);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_intent_plane_graph',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/semantic-drift/batch' && method === 'GET') {
      try {
        const items = await readWorkItemsFromRepo({ cwd, backlogPath });
        const payload = buildSemanticDriftBatch(items, {
          department: url.searchParams.get('department') ?? url.searchParams.get('domain') ?? '',
          parentId: url.searchParams.get('parentId') ?? url.searchParams.get('epicId') ?? '',
          limit: Number(url.searchParams.get('limit') ?? 200),
        });
        sendJson(response, 200, payload);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_build_semantic_drift_batch',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/api/architecture-snapshot') {
      try {
        const focusBlockId = url.searchParams.get('focusBlockId') || null;
        const architectureSnapshot = await readArchitectureSnapshot({ cwd, backlogPath, focusBlockId });
        sendJson(response, 200, architectureSnapshot);
      } catch (error) {
        sendJson(response, 500, {
          error: 'failed_to_read_architecture_snapshot',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (url.pathname === '/vendor/mermaid.min.js' && method === 'GET') {
      try {
        const source = readFileSync(MERMAID_VENDOR_PATH);
        response.writeHead(200, {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        });
        response.end(source);
      } catch (error) {
        sendText(response, 500, 'failed_to_load_mermaid_vendor');
      }
      return;
    }

    if (tryServePublicFontsAsset(url, response)) {
      return;
    }

    if (tryServePublicIconsAsset(url, response)) {
      return;
    }
    if (tryServePublicAvatarsAsset(url, response)) {
      return;
    }
    if (tryServePublicImagesAsset(url, response)) {
      return;
    }

    if (url.pathname === '/assets/favicon.svg' && method === 'GET') {
      serveFaviconSvg(response);
      return;
    }

    if (url.pathname === '/favicon.ico' && method === 'GET') {
      serveFaviconSvg(response);
      return;
    }

    if (url.pathname === '/assets/workgraph-logo.svg' && method === 'GET') {
      try {
        const source = readFileSync(WORKGRAPH_LOGO_SVG_PATH);
        response.writeHead(200, {
          'content-type': 'image/svg+xml; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        });
        response.end(source);
      } catch (error) {
        sendText(response, 500, 'failed_to_load_workgraph_logo');
      }
      return;
    }

    if (url.pathname === '/assets/workgraph-emblem.svg' && method === 'GET') {
      try {
        const source = readFileSync(WORKGRAPH_EMBLEM_SVG_PATH);
        response.writeHead(200, {
          'content-type': 'image/svg+xml; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        });
        response.end(source);
      } catch (error) {
        sendText(response, 500, 'failed_to_load_workgraph_emblem');
      }
      return;
    }

    if (url.pathname === '/assets/graph-canvas-lit-flow.js' && method === 'GET') {
      try {
        const source = readFileSync(GRAPH_CANVAS_LIT_FLOW_JS_PATH);
        response.writeHead(200, {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        });
        response.end(source);
      } catch (error) {
        sendText(response, 500, 'failed_to_load_graph_canvas_lit_flow_js');
      }
      return;
    }

    if (url.pathname === '/assets/graph-canvas-lit-flow.css' && method === 'GET') {
      try {
        const source = readFileSync(GRAPH_CANVAS_LIT_FLOW_CSS_PATH);
        response.writeHead(200, {
          'content-type': 'text/css; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        });
        response.end(source);
      } catch (error) {
        sendText(response, 500, 'failed_to_load_graph_canvas_lit_flow_css');
      }
      return;
    }

    if (url.pathname === '/assets/design-tokens-gripe-dark-default.css' && method === 'GET') {
      try {
        const source = readFileSync(DESIGN_TOKENS_GRIPE_CSS_PATH);
        response.writeHead(200, {
          'content-type': 'text/css; charset=utf-8',
          'cache-control': 'public, max-age=300',
        });
        response.end(source);
      } catch (error) {
        sendText(response, 500, 'failed_to_load_design_tokens_css');
      }
      return;
    }

    if (url.pathname === '/assets/design-tokens-workgraph-dark.css' && method === 'GET') {
      try {
        const source = readFileSync(DESIGN_TOKENS_WG_CSS_PATH);
        response.writeHead(200, {
          'content-type': 'text/css; charset=utf-8',
          'cache-control': 'public, max-age=300',
        });
        response.end(source);
      } catch (error) {
        sendText(response, 500, 'failed_to_load_design_tokens_css');
      }
      return;
    }

    if (url.pathname === '/dev/ui-kit' && method === 'GET') {
      sendHtml(response, 200, renderUiKitPageHtml());
      return;
    }

    if (url.pathname === '/' || url.pathname === '/app' || url.pathname === '/app/' || url.pathname === '/app/index.html') {
      const locale = resolveUiLocale({
        cookieHeader: request.headers.cookie,
        acceptLanguage: request.headers['accept-language'],
        queryLocale: url.searchParams.get('locale'),
      });
      sendHtml(response, 200, renderBacklogHtml({ locale }));
      return;
    }

    sendText(response, 404, 'Not Found');
  });
}

export async function startBacklogUiServer(options = {}) {
  const host = options.host ?? process.env.WORKGRAPH_BACKLOG_UI_HOST ?? DEFAULT_HOST;
  const port = Number(options.port ?? process.env.WORKGRAPH_BACKLOG_UI_PORT ?? DEFAULT_PORT);
  const server = createBacklogUiServer(options);

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, host, () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  return { server, host, port };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim();
        resolve(text === '' ? {} : JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(html);
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(text);
}

function sendAsset(response, statusCode, text, contentType) {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'public, max-age=3600',
  });
  response.end(text);
}

function sendBinary(response, statusCode, buffer, contentType) {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'public, max-age=3600',
    'content-length': buffer.length,
  });
  response.end(buffer);
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return '';
  }

  return Buffer.concat(chunks).toString('utf8');
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { host, port } = await startBacklogUiServer();
  console.log(`Work Graph backlog UI: http://${host}:${port}/`);
}
