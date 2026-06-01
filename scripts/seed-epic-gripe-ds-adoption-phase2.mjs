#!/usr/bin/env node
/**
 * Seed WorkItems: AN-32 — Gripe DS phase 2 (post epic-marketplace-shared-design-system).
 * DS source: Gripe Marketplace (04 Marketplace), NOT OneBase.
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/gripe-ds-adoption-phase2-post-an21.md';
const PLAN = 'docs/plan-gripe-ds-adoption-phase2.md';
const EPIC_ID = 'epic-gripe-ds-adoption-phase2';
const PARENT_EPIC = 'epic-marketplace-shared-design-system';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Gripe DS phase 2: WG UI migration + molecules + OneBase OData catalog',
    department: 'product-integration',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [PARENT_EPIC],
    basis: [
      'AN-32: после AN-21/AN-30 out-of-scope — inline backlog UI, molecules, full OData import.',
      'Дизайн-система — Gripe Marketplace (Blade x-ui, brand-tokens); OneBase — 1С runtime bridge, не DS.',
      'Stub OneBaseCatalogTreeImporter (AN-21) — dry-run only; нужен production upsert.',
    ],
    vector: [
      'Track A: renderUiButton migration в workGraphBacklogUiServer.mjs (2 волны).',
      'Track B: atomic-spec molecules (rating, tabs) + organism modal parity с Gripe.',
      'Track C: OneBase REST/OData → category_nodes + facets → listing_form_schema.',
    ],
    goal: [
      'Production WG UI использует Gripe DS atoms/molecules; catalog import без dry-run stub.',
    ],
    checks: [
      'grep metric ≥80% action buttons через renderUiButton',
      'molecules rating/tabs + organism modal в ui-kit',
      'catalog:import-onebase с dry-run и live на fixture',
      'AN-32 closing опубликован',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'src/workGraphBacklogUiServer.mjs',
      'packages/atomic-spec/',
      'src/ui/molecules/',
      'src/ui/organisms/',
      '../../04 Marketplace/app/Catalog/OneBaseCatalogTreeImporter.php',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'wg-backlog-ui-button-migration-wave-1',
    title: 'WG backlog UI: renderUiButton wave 1 (shell / nav / agent dock)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-21 §4.1: workGraphBacklogUiServer ≈9000 строк inline HTML.',
      'renderUiButton уже в src/ui/atoms/button.mjs и ui-kit; production shell — still raw <button>.',
    ],
    vector: [
      'Заменить static shell buttons: nav-tab, theme-toggle, detail-close, agent-run-dock.',
      'Подключить UI_BUTTON_CSS в backlog page head (если ещё не inline).',
      'Smoke: workGraphBacklogUiServer.test.mjs nav + theme.',
    ],
    goal: ['Видимый shell backlog UI на Gripe DS button variants без регрессий навигации.'],
    checks: [
      'nav-tab / theme-toggle / agent dock через renderUiButton или wg-btn classes',
      'tests/workGraphBacklogUiServer.test.mjs green',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/atoms/button.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'wg-backlog-ui-button-migration-wave-2',
    title: 'WG backlog UI: renderUiButton wave 2 (panels / workflow / composer)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'wg-backlog-ui-button-migration-wave-1'],
    basis: [
      'Client-side render paths: analytics subtabs, workflow pagination, intent composer, code-gap actions.',
      'После wave 1 — tabs molecule может заменить board-tab pattern.',
    ],
    vector: [
      'Мигрировать dynamic button HTML в renderUiButton helper wrapper.',
      'Подготовить hooks для tabs molecule (workflow-subtab, analytics-tab).',
      'Grep gate doc в closing: count raw action buttons.',
    ],
    goal: ['Панели workflow/analytics/composer на shared button atom.'],
    checks: [
      'intent-composer + workflow-page-btn + code-gap buttons через atoms',
      'no visual regression on board/workflow views in e2e smoke',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/ui/atoms/button.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'atomic-spec-molecules-rating-tabs',
    title: 'atomic-spec: BVC molecules rating + tabs (Gripe reference)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'Gripe: x-ui.molecules.rating, x-ui.molecules.tabs.group/trigger.',
      'AN-MP-2 dual-location: spec in WG, Blade stays in Marketplace.',
    ],
    vector: [
      'packages/atomic-spec/molecules/rating.bvc — value, size, color, interactive.',
      'packages/atomic-spec/molecules/tabs-group.bvc + tabs-trigger.bvc.',
      'ui.marketplace.blade pointers to Gripe paths.',
    ],
    goal: ['Headless contract для molecules без копирования Blade в WG.'],
    checks: [
      '≥3 molecule BVC files',
      'docs/ui/components.md generator picks up molecules/',
    ],
    targetFiles: [
      'packages/atomic-spec/molecules/rating.bvc',
      'packages/atomic-spec/molecules/tabs-group.bvc',
      '../../04 Marketplace/resources/views/components/ui/molecules/rating.blade.php',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'wg-ui-molecules-rating-tabs-renderers',
    title: 'WG src/ui/molecules: rating + tabs renderers + ui-kit',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'atomic-spec-molecules-rating-tabs', 'workgraph-extract-ui-atoms-layer'],
    basis: [
      'Atoms layer exists; molecules needed for nav/workflow tab parity.',
    ],
    vector: [
      'src/ui/molecules/rating.mjs, tabs.mjs + CSS tokens (--ui-rating-*).',
      'uiKitPage: секции Rating и Tabs.',
      'tests/uiMolecules.test.mjs.',
    ],
    goal: ['Molecules demoable на /dev/ui-kit; готовы для wave-2 tab migration.'],
    checks: [
      'GET /dev/ui-kit содержит rating и tabs',
      'tests/uiMolecules.test.mjs green',
    ],
    targetFiles: [
      'src/ui/molecules/rating.mjs',
      'src/ui/molecules/tabs.mjs',
      'src/ui/pages/uiKitPage.mjs',
      'tests/uiMolecules.test.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'atomic-spec-organism-modal-gripe-parity',
    title: 'atomic-spec: organism modal BVC (Gripe parity, fix atom mismatch)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'atomic-spec-five-base-atoms'],
    basis: [
      'AN-21 modal.bvc marked ui.layer=atom but Gripe modal is organism.',
      'Props: title, maxWidth, closeOnOverlay, contentPadding, z-index roles.',
    ],
    vector: [
      'packages/atomic-spec/organisms/modal.bvc — migrate from atoms/modal.bvc.',
      'Deprecate atom modal spec or alias with trace note.',
    ],
    goal: ['Spec layer matches Gripe x-ui.organisms.modal.'],
    checks: [
      'organisms/modal.bvc exists with marketplace.blade pointer',
      'docs-generator lists organism modal',
    ],
    targetFiles: [
      'packages/atomic-spec/organisms/modal.bvc',
      'packages/atomic-spec/atoms/modal.bvc',
      '../../04 Marketplace/resources/views/components/ui/organisms/modal.blade.php',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'wg-ui-organism-modal-parity',
    title: 'WG src/ui/organisms/modal.mjs — Gripe organism shell (vanilla)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'atomic-spec-organism-modal-gripe-parity'],
    basis: [
      'src/ui/atoms/modal.mjs — minimal shell; Gripe uses Alpine teleport + body scroll lock.',
      'WG: vanilla confirm/dialog without Alpine dependency in backlog server.',
    ],
    vector: [
      'Move to src/ui/organisms/modal.mjs; re-export from atoms for compat.',
      'Props parity: title, showCloseButton, backdrop, data-testid.',
      'ui-kit modal demo + test.',
    ],
    goal: ['Organism modal usable for future confirm flows in WG UI.'],
    checks: [
      'renderUiModal from organisms/modal.mjs on ui-kit',
      'atoms/modal re-exports or deprecated with comment',
    ],
    targetFiles: [
      'src/ui/organisms/modal.mjs',
      'src/ui/atoms/modal.mjs',
      'src/ui/pages/uiKitPage.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'docs-generator-molecules-organisms',
    title: 'docs-generator v2: molecules + organisms in components.md',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'atomic-spec-molecules-rating-tabs', 'atomic-spec-organism-modal-gripe-parity'],
    basis: [
      'generateComponentCatalog.mjs scans atoms/ only.',
    ],
    vector: [
      'Scan packages/atomic-spec/{molecules,organisms}/.',
      'Group sections in docs/ui/components.md by layer.',
      'npm run docs:components in CI optional step.',
    ],
    goal: ['Unified catalog mirrors Gripe docs/ui/components.md structure.'],
    checks: [
      'docs/ui/components.md lists molecules and organisms',
      'tests or snapshot for generator output',
    ],
    targetFiles: [
      'packages/docs-generator/generateComponentCatalog.mjs',
      'docs/ui/components.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'onebase-odata-catalog-api-client',
    title: 'Gripe: OneBaseCatalogApiClient (REST/OData fetch + fixtures)',
    department: 'domain-onebase',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-21 §3.3A: OneBase Номенклатура → category_nodes via REST/OData.',
      'Stub importer accepts array payload only; no HTTP.',
      'Fixtures: tests/fixtures/onebase/real-trade/ in ioHasC repo.',
    ],
    vector: [
      '04 Marketplace: OneBaseCatalogApiClient — describe JSON, catalog tree.',
      'Config: ONEBASE_BASE_URL, timeout, auth optional.',
      'PHPUnit with mocked HTTP + real-trade fixture file.',
    ],
    goal: ['Fetch layer отделён от import/sync logic.'],
    checks: [
      'OneBaseCatalogApiClientTest green',
      'documented env vars in Marketplace .env.example',
    ],
    targetFiles: [
      '../../04 Marketplace/app/Catalog/OneBaseCatalogApiClient.php',
      '../../04 Marketplace/tests/Unit/OneBaseCatalogApiClientTest.php',
      'work/analytics/onebase-integration-vertical-stack.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'onebase-odata-catalog-import-production',
    title: 'Gripe: OneBase catalog import production (CatalogStructureSynchronizer)',
    department: 'domain-onebase',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'onebase-odata-catalog-api-client'],
    basis: [
      'OneBaseCatalogTreeImporter stub — dry-run log only (AN-21 evidence).',
      'Pattern: AvitoCatalogTreeImporter → CatalogStructureSynchronizer.',
    ],
    vector: [
      'Extend importer: tree normalization, parent/child slug, dryRun=false upsert.',
      'Artisan catalog:import-onebase {--dry-run} {--project=}.',
      'Audit log table or marketplace_audit_logs entry.',
    ],
    goal: ['One-way read-only catalog bridge без dual sync.'],
    checks: [
      'OneBaseCatalogTreeImporterTest covers live upsert path (sqlite)',
      'dry-run default true in command',
    ],
    targetFiles: [
      '../../04 Marketplace/app/Catalog/OneBaseCatalogTreeImporter.php',
      '../../04 Marketplace/app/Console/Commands/ImportOneBaseCatalogCommand.php',
      '../../04 Marketplace/tests/Unit/OneBaseCatalogTreeImporterTest.php',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'onebase-catalog-facets-listing-form-bridge',
    title: 'Gripe: OneBase attributes → listing_form_schema (facets bridge)',
    department: 'domain-onebase',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'onebase-odata-catalog-import-production'],
    basis: [
      'AN-21: CatalogFacetsToListingFormConverter already in Marketplace.',
      'OneBase field metadata → facet schema for listing forms.',
    ],
    vector: [
      'Map OneBase catalog field defs → CatalogFacetsToListingFormConverter input.',
      'Unit test on sample Номенклатура attributes.',
      'Document in onebase-integration-vertical-stack cross-ref.',
    ],
    goal: ['Imported categories get listing_form_schema where OneBase defines attributes.'],
    checks: [
      'PHPUnit facet mapping test',
      'AN-17 cross-ref updated',
    ],
    targetFiles: [
      '../../04 Marketplace/app/Catalog/CatalogFacetsToListingFormConverter.php',
      '../../04 Marketplace/app/Catalog/OneBaseCatalogTreeImporter.php',
      'work/analytics/onebase-integration-vertical-stack.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
  },
  {
    workId: 'write-an32-closing-gripe-ds-adoption-phase2',
    title: 'AN-32 closing analysis: epic-gripe-ds-adoption-phase2',
    department: 'product-integration',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'wg-backlog-ui-button-migration-wave-2',
      'wg-ui-molecules-rating-tabs-renderers',
      'wg-ui-organism-modal-parity',
      'docs-generator-molecules-organisms',
      'onebase-odata-catalog-import-production',
      'onebase-catalog-facets-listing-form-bridge',
    ],
    basis: [
      'Closing loop AN-22: metrics grep button migration, ui-kit, import command.',
    ],
    vector: [
      'work/analytics/closing-epic-gripe-ds-adoption-phase2.md + journal AN-32 closing key.',
      'Explicit note: Gripe DS ≠ OneBase.',
    ],
    goal: ['Эпик закрыт с метриками phase 2.'],
    checks: [
      'analytics-records.jsonl содержит AN-32 closing',
      'epic-gripe-ds-adoption-phase2 closed с evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-gripe-ds-adoption-phase2.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-32',
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
    schema: 'workgraph.seed-epic-gripe-ds-adoption-phase2.v1',
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
