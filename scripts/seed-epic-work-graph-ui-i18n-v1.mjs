#!/usr/bin/env node
/**
 * Seed: AN-55 — Work Graph UI i18n (EN + RU chrome, separate from BVC dialect).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/work-graph-ui-i18n-best-practices.md';
const PLAN = 'docs/plan-work-graph-ui-i18n-v1.md';
const EPIC_ID = 'epic-work-graph-ui-i18n-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Work Graph UI i18n v1: EN + RU chrome via ICU catalogs (AN-55)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [],
    basis: [
      'UI chrome ~300+ RU hardcoded strings in workGraphBacklogUiServer.mjs + src/ui/*; <html lang="ru">.',
      'BVC multilingual (AN-19) covers file dialect only — not operator UI.',
      'AN-7: non-RU users blocked; npm/open publication needs EN chrome path.',
    ],
    vector: [
      'P0: ADR locale policy + ICU catalog + resolveUiLocale + t() helper.',
      'P1: shell nav/kanban i18n + locale switcher; B11 atom inspector via bvcDialectRegistry.',
      'P2: detail drawer + verification chrome; pseudolocalization CI.',
    ],
    goal: [
      'Operator UI follows wg_locale / Accept-Language (en|ru); work item prose stays author language.',
    ],
    checks: [
      'ADR work-graph-ui-i18n-v1 принят',
      'Nav renders EN when locale=en',
      'en/ru catalog key parity tests green',
      'AN-55 closing doc опубликован',
    ],
    analysis: [
      'Источник: AN-55 analysis — ICU MessageFormat + strangler extraction; no react-i18next.',
      'UI locale ≠ BVC file dialect; atom section titles reuse bvcDialectRegistry (AN-20 B11).',
    ],
    decision: [
      'Вердикт: полезно',
      'Исполнять по docs/plan-work-graph-ui-i18n-v1.md.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-work-graph-ui-i18n-v1.md',
      'locales/en/ui.json',
      'locales/ru/ui.json',
      'src/ui/i18n/resolveUiLocale.mjs',
      'src/ui/i18n/createUiTranslator.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/backlogShellButtons.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'decide-work-graph-ui-i18n-adr',
    title: 'ADR: Work Graph UI i18n — locale policy and BVC boundary',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-55 §5: default locale policy (Accept-Language + fallback en + cookie wg_locale).',
      'Separate UI catalog from packages/bvc-dialects; no auto-translate work item prose.',
    ],
    vector: [
      'docs/adr-work-graph-ui-i18n-v1.md — locale chain, catalog format, anti-goals.',
      'Link from plan-work-graph-ui-i18n-v1.md and AN-55 analysis.',
    ],
    goal: ['Team does not mix UI strings into bvc-dialects JSON.'],
    checks: ['ADR published', 'Linked from plan and AN-55'],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-work-graph-ui-i18n-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'implement-ui-locale-resolution',
    title: 'Implement UI locale resolution (cookie + Accept-Language)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-work-graph-ui-i18n-adr'],
    basis: ['SSR-first UI needs locale before first paint — no client fetch FOUC.'],
    vector: [
      'src/ui/i18n/resolveUiLocale.mjs — wg_locale cookie → Accept-Language → fallback en.',
      '@formatjs/intl-localematcher for negotiate.',
      'Set html lang on render; tests/resolveUiLocale.test.mjs.',
    ],
    goal: ['Every backlog UI request resolves stable locale en|ru.'],
    checks: ['Cookie overrides Accept-Language', 'Unknown locale falls back to en'],
    targetFiles: [
      'src/ui/i18n/resolveUiLocale.mjs',
      'tests/resolveUiLocale.test.mjs',
      'src/workGraphBacklogUiServer.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'implement-ui-message-catalog-v1',
    title: 'Implement ICU UI message catalog + t() helper',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-work-graph-ui-i18n-adr'],
    basis: ['No i18n npm deps today; need ICU plural without manual count branches.'],
    vector: [
      'locales/en/ui.json + locales/ru/ui.json — stable keys nav.*, drawer.*, error.*.',
      'src/ui/i18n/createUiTranslator.mjs — @formatjs/intl-messageformat.',
      'embedUiI18nScript.mjs — window.__WG_I18N__ for client handlers.',
      'tests/uiCatalog.test.mjs — en/ru key parity.',
    ],
    goal: ['t(key, params) works server-side and in embedded client script.'],
    checks: ['Key parity test green', 'ICU plural smoke for task count'],
    targetFiles: [
      'locales/en/ui.json',
      'locales/ru/ui.json',
      'src/ui/i18n/createUiTranslator.mjs',
      'src/ui/i18n/embedUiI18nScript.mjs',
      'tests/uiCatalog.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'extract-backlog-shell-i18n',
    title: 'Extract backlog shell strings to UI catalog (nav, theme, close)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-ui-locale-resolution', 'implement-ui-message-catalog-v1'],
    basis: ['backlogShellButtons.mjs + sidebar nav — ~30 P0 chrome keys.'],
    vector: [
      'Wire t() into renderBacklogHtml / backlogShellButtons.',
      'Locale switcher stub in header (sets wg_locale cookie).',
      'Snapshot: locale=en → Tasks not Задачи.',
    ],
    goal: ['Sidebar and shell buttons follow operator locale.'],
    checks: ['EN nav labels in en locale', 'RU preserved in ru locale'],
    targetFiles: [
      'src/ui/backlogShellButtons.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'locales/en/ui.json',
      'locales/ru/ui.json',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'extract-kanban-workflow-i18n',
    title: 'Extract kanban and workflow list labels to UI catalog',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['extract-backlog-shell-i18n'],
    basis: ['Kanban columns, filters, empty states — hardcoded RU in monolith.'],
    vector: [
      'Column headers, filter chips, empty-state copy → ui.json.',
      'workItemStatusTone STATUS_LABELS — locale-aware or catalog keys.',
      'Intl.DateTimeFormat for dates where shown.',
    ],
    goal: ['Board and workflow views readable in EN and RU.'],
    checks: ['Kanban column EN labels', 'Status tone labels follow locale'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/workItemStatusTone.mjs',
      'locales/en/ui.json',
      'locales/ru/ui.json',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'wire-bvc-dialect-atom-inspector-b11',
    title: 'Atom inspector: dialect-aware section titles (AN-20 B11)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-ui-message-catalog-v1'],
    basis: [
      'AN-20 B11: show atom lang badge; section titles from bvcDialectRegistry — not ui.json.',
      'Warn on mixed EN/RU keys in same atom.',
    ],
    vector: [
      'Inspector reads atom Labels.lang / detect; map section keys via bvcDialectRegistry.',
      'UI chrome for inspector frame still uses t(); section titles use registry.',
      'Suggest canonical EN keys in editor hints (scope per B11).',
    ],
    goal: ['Inspector respects BVC dialect without duplicating dialect JSON in UI catalog.'],
    checks: ['RU atom shows Базис not Basis when lang=ru', 'Mixed-key warning visible'],
    targetFiles: [
      'src/bvcDialectRegistry.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'work/analytics/ux-current-state-and-vector.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'extract-detail-drawer-i18n',
    title: 'Extract detail drawer + verification + analytics chrome i18n',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'low',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['extract-kanban-workflow-i18n'],
    basis: ['Largest string surface: drawer sections, verification panel, analytics L1/L2.'],
    vector: [
      'Batch extract dynamic client strings via data-i18n-key or t() in handlers.',
      'Error messages: stable EN codes + localized operator text.',
      'Do not translate analytics body / work item basis prose.',
    ],
    goal: ['Deep drill-down UI chrome localized; content stays author language.'],
    checks: ['Task drawer section headers EN+RU', 'Verification tab labels localized'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'locales/en/ui.json',
      'locales/ru/ui.json',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'add-ui-i18n-pseudolocalization-ci',
    title: 'Add pseudolocalization locale + CI key-parity guard',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['extract-backlog-shell-i18n'],
    basis: ['Pseudolocale catches truncated labels and missing keys before ship.'],
    vector: [
      'Optional locale=ps lengthens strings ([!! ~~text~~ !!]).',
      'CI: uiCatalog key parity + smoke renderBacklogHtml({ locale: ps }).',
      'Document in ADR or plan troubleshooting section.',
    ],
    goal: ['Layout overflow from longer strings caught in deterministic tests.'],
    checks: ['ps locale renders without throw', 'CI fails on missing ru key'],
    targetFiles: [
      'tests/uiCatalog.test.mjs',
      'locales/ps/ui.json',
      'docs/plan-work-graph-ui-i18n-v1.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-55',
  },
  {
    workId: 'write-closing-epic-work-graph-ui-i18n-v1',
    title: 'Closing: epic-work-graph-ui-i18n-v1 (AN-55)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'extract-backlog-shell-i18n',
      'extract-kanban-workflow-i18n',
      'wire-bvc-dialect-atom-inspector-b11',
    ],
    basis: ['Closing with ADR, locale smoke, catalog coverage note.'],
    vector: [
      'work/analytics/closing-epic-work-graph-ui-i18n-v1.md',
      'journal closing record if applicable.',
    ],
    goal: ['AN-55 implementation epic closed with verifiable artifacts.'],
    checks: ['Closing doc published', 'P0–P1 tasks done or explicitly deferred in closing'],
    targetFiles: [
      'work/analytics/closing-epic-work-graph-ui-i18n-v1.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
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
    schema: 'workgraph.seed-epic-work-graph-ui-i18n-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-55',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
