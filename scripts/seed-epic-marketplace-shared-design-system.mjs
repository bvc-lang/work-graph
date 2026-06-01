#!/usr/bin/env node
/**
 * Seed WorkItems: AN-21 — Marketplace + shared design system + WG PM layer.
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/marketplace-integration-and-shared-design-system.md';
const PLAN = 'docs/plan-marketplace-shared-design-system.md';
const EPIC_ID = 'epic-marketplace-shared-design-system';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Marketplace + Work Graph: общая DS и PM-слой (AN-21)',
    department: 'product-integration',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-decision-pipeline-canonization', 'ux-mission-control-p0'],
    basis: [
      'AN-21: Marketplace — зрелый Laravel monorepo с ~98 Blade-компонентами и двухслойными токенами.',
      'Work Graph силён в BVC/backlog/verification; Marketplace — в atomic design и runtime theming.',
      'OneBase — bridge каталога/заказов, не замена Laravel backend.',
    ],
    vector: [
      'Извлечь @iohasc/design-tokens + @iohasc/atomic-spec из Marketplace (контракт, не общий Blade↔Web код).',
      'Work Graph: dual-layer tokens, atomify UI, /dev/ui-kit.',
      'intent/domains/marketplace/ — PM-слой backlog + AN-records.',
      'P2: OneBase catalog import, PVRG bladeAdapter, shared theme resolver.',
    ],
    goal: [
      'Один канон DS для двух продуктов; Marketplace backlog управляется из Work Graph без dual backlog.',
    ],
    checks: [
      'design-tokens JSON — единый source of truth палитры',
      '≥5 BVC atomic-spec atoms; WG src/ui/atoms/',
      'intent/domains/marketplace/ с work items',
      'AN-30 closing analysis опубликован',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'packages/design-tokens/',
      'packages/atomic-spec/',
      'intent/domains/marketplace/',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'extract-iohasc-design-tokens-package',
    title: 'Пакет @iohasc/design-tokens (JSON Schema + builders)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-21 Phase 0: два `brand-tokens.css` — дублирование палитры.',
      'Marketplace `resources/css/brand-tokens.css` — reference для base.json.',
    ],
    vector: [
      'packages/design-tokens: tokens/base.json, themes/*.json, schema/*.schema.json.',
      'build/tokens-to-css.mjs, tokens-to-tailwind.mjs, tokens-to-filament.mjs.',
      'npm workspace в Work Graph monorepo.',
    ],
    goal: ['Один JSON → CSS/Tailwind/Filament для обоих проектов без визуальных регрессий.'],
    checks: [
      'schema design-tokens.v1 валидирует base.json',
      'builder генерит CSS идентичный текущему Marketplace brand-tokens',
      'unit test на tokens-to-css',
    ],
    targetFiles: [
      'packages/design-tokens/tokens/base.json',
      'packages/design-tokens/build/tokens-to-css.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'marketplace-adopt-generated-brand-tokens',
    title: 'Marketplace: переход на сгенерированный brand-tokens.css',
    department: 'domain-marketplace',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'extract-iohasc-design-tokens-package'],
    basis: [
      'AN-21 §Phase 0 п.4–5: Marketplace остаётся reference implementation.',
      'Filament `filament-brand.css` должен получать те же токены.',
    ],
    vector: [
      'Composer/path-repo или file: на @iohasc/design-tokens из WG.',
      'Заменить ручной brand-tokens.css на build step в Marketplace CI.',
      'Visual smoke: /dev/ui-kit без diff.',
    ],
    goal: ['Marketplace потребляет shared tokens; визуально без изменений.'],
    checks: [
      'Marketplace brand-tokens.css генерируется, не редактируется вручную',
      '/dev/ui-kit smoke green',
    ],
    targetFiles: [
      '../../04 Marketplace/resources/css/brand-tokens.css',
      '../../04 Marketplace/docs/ui/tokens.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'workgraph-dual-layer-semantic-tokens',
    title: 'Work Graph: двухслойные токены --brand-* + --ui-*',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'extract-iohasc-design-tokens-package'],
    basis: [
      'AN-21 §4.2: WG имеет только `--cursor-*` без semantic слоя.',
      'Имена ролей как в Marketplace → общий контракт DS.',
    ],
    vector: [
      'Подключить workgraph-dark.json theme из design-tokens.',
      'src/style.css: --brand-* + --ui-*; сохранить тёмную тему Cursor.',
      'Tailwind preset bridge (если применимо).',
    ],
    goal: ['WG UI использует те же semantic roles, что Marketplace.'],
    checks: [
      'style.css содержит --ui-accent-rgb и --ui-surface-*',
      'UI backlog server рендерит без регрессий',
    ],
    targetFiles: ['src/style.css', 'src/workGraphBacklogUiServer.mjs', ANALYTICS],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'cursor-rules-shared-ds-discipline',
    title: 'Cursor rules: shared DS discipline (WG + Marketplace)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-21 §4.3 / P0 п.4: Marketplace имеет 4 alwaysApply rules; WG — 0 для UI.',
      'marketplace-blade-components.mdc — образец governance.',
    ],
    vector: [
      '.cursor/rules/iohasc-ui-components.mdc — alwaysApply для WG.',
      'Marketplace: marketplace-uses-shared-tokens.mdc.',
      'Ссылка на docs/ui/components.md перед версткой.',
    ],
    goal: ['Агент и разработчик не дублируют inline-вёрстку вне каталога.'],
    checks: [
      'iohasc-ui-components.mdc exists with alwaysApply',
      'npm run audit:agent-behavior-rules или lint rules green',
    ],
    targetFiles: [
      '.cursor/rules/iohasc-ui-components.mdc',
      '../../04 Marketplace/.cursor/rules/marketplace-uses-shared-tokens.mdc',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'marketplace-an-records-bootstrap',
    title: 'Marketplace AN-records: Hub&Spoke + Atomic Design (AN-MP-1/2)',
    department: 'domain-marketplace',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-21 §5.1 P0: крупные дизайн-решения Marketplace не зафиксированы в AN.',
      'Нужен onboarding контрибьютора и LLM-контекст.',
    ],
    vector: [
      'work/analytics/marketplace-hub-spoke-architecture.md (AN-MP-1).',
      'work/analytics/marketplace-atomic-design-dual-location.md (AN-MP-2).',
      'Записи в analytics-records.jsonl.',
    ],
    goal: ['≥2 AN-MP records published с feeds_epics ссылкой на эпик.'],
    checks: [
      'analytics-records.jsonl содержит AN-MP-1 и AN-MP-2 keys',
      'relatedFiles указывают Marketplace docs',
    ],
    targetFiles: [
      'work/analytics/marketplace-hub-spoke-architecture.md',
      'work/analytics/marketplace-atomic-design-dual-location.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'atomic-spec-five-base-atoms',
    title: 'atomic-spec: BVC для 5 base atoms',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'extract-iohasc-design-tokens-package'],
    basis: [
      'AN-21 Phase 1: начать с button, badge, text-input, icon, modal.',
      'Marketplace Blade — reference; spec — машинный канон для LLM.',
    ],
    vector: [
      'packages/atomic-spec/atoms/*.bvc — props, variants, sizes, a11y.',
      'JSON props schema рядом с BVC.',
      'Зеркало существующих Marketplace blade props.',
    ],
    goal: ['Одна спека → две реализации (Blade + vanilla WG).'],
    checks: [
      '5 atom .bvc files pass StepAtomDraft validation',
      'props parity checklist vs Marketplace button.blade.php',
    ],
    targetFiles: [
      'packages/atomic-spec/atoms/button.bvc',
      'packages/atomic-spec/atoms/badge.bvc',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'workgraph-extract-ui-atoms-layer',
    title: 'Work Graph: вынести UI atoms из monolith server',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'atomic-spec-five-base-atoms', 'workgraph-dual-layer-semantic-tokens'],
    basis: [
      'AN-21 §4.1: workGraphBacklogUiServer.mjs ~9000 LOC inline HTML/CSS/JS.',
      'Цель: src/ui/atoms/*.mjs по atomic-spec.',
    ],
    vector: [
      'src/ui/atoms/{button,badge,input,icon}.mjs — render helpers.',
      'Постепенная замена inline в server на import render.',
      'Без big-bang rewrite — один atom за PR.',
    ],
    goal: ['Inline LOC снижен; button/badge/input переиспользуются.'],
    checks: [
      'src/ui/atoms/ существует с ≥3 модулями',
      'tests на render atoms green',
    ],
    targetFiles: ['src/ui/atoms/', 'src/workGraphBacklogUiServer.mjs', ANALYTICS],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'docs-generator-unified-component-catalog',
    title: 'docs-generator: единый каталог components.md',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'atomic-spec-five-base-atoms'],
    basis: [
      'AN-21: Marketplace docs/ui/components.md — живой каталог ~98 компонентов.',
      'WG не имеет каталога; нужен unified generator из atomic-spec.',
    ],
    vector: [
      'packages/docs-generator/ — BVC spec → markdown sections.',
      'docs/ui/components.md в WG; sync hook для Marketplace section.',
    ],
    goal: ['Один generator; оба проекта ссылаются на один формат каталога.'],
    checks: [
      'docs/ui/components.md генерируется из spec',
      'npm run script docs:components green',
    ],
    targetFiles: ['packages/docs-generator/', 'docs/ui/components.md', ANALYTICS],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'workgraph-dev-ui-kit-route',
    title: 'Work Graph: /dev/ui-kit story route',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'workgraph-extract-ui-atoms-layer'],
    basis: [
      'AN-21 §4.4: Marketplace имеет GET /dev/ui-kit; WG — нет.',
      'Dev-only preview atoms по spec.',
    ],
    vector: [
      'GET /dev/ui-kit в workGraphBacklogUiServer (DEV flag).',
      'Sidebar: список atoms, preview variants.',
      'data-testid=ui-kit-root.',
    ],
    goal: ['Разработчик видит WG components без полного backlog UI.'],
    checks: [
      '/dev/ui-kit 200 in dev',
      'smoke test ui-kit route',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'src/ui/pages/ui-kit.mjs', ANALYTICS],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'intent-marketplace-backlog-bootstrap',
    title: 'intent/domains/marketplace: bootstrap backlog из docs/plans',
    department: 'domain-marketplace',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-21 §3.2 / Phase 5: WG как PM над Marketplace.',
      'docs/plans/*.md Marketplace → work.bvc items.',
    ],
    vector: [
      'intent/domains/marketplace/work/ — folder + index entries.',
      'Миграция top-5 plans в work items с parent epic.',
      'Verification matrix: phpunit/phpstan evidence hooks.',
    ],
    goal: ['Marketplace roadmap виден на Intent Roadmap Canvas WG.'],
    checks: [
      'intent/index.bvc содержит marketplace work ids',
      '≥5 marketplace work items в backlog',
    ],
    targetFiles: [
      'intent/domains/marketplace/work/',
      'intent/index.bvc',
      '../../04 Marketplace/docs/plans/',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'onebase-marketplace-catalog-import-bridge',
    title: 'OneBase → Marketplace catalog import bridge (P2)',
    department: 'domain-onebase',
    ownerRole: 'integration_architect',
    priority: 'low',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'intent-marketplace-backlog-bootstrap'],
    basis: [
      'AN-21 §3.3A: OneBase Номенклатура → category_nodes / listing_form_schema.',
      'Read-only import first; не ORM замена.',
    ],
    vector: [
      'OneBaseCatalogTreeImporter.php рядом с AvitoCatalogTreeImporter.',
      'CatalogFacetsToListingFormConverter для атрибутов.',
      'Evidence: import dry-run log.',
    ],
    goal: ['Один односторонний bridge каталога без двусторонней sync.'],
    checks: [
      'Importer unit test на fixture tree',
      'AN-17 cross-ref documented',
    ],
    targetFiles: [
      '../../04 Marketplace/packages/marketplace-core/src/Catalog/',
      'work/analytics/onebase-integration-vertical-stack.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'iohasc-theme-resolver-shared',
    title: 'IohascThemeResolver: shared runtime theming API (P2)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'low',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'extract-iohasc-design-tokens-package', 'workgraph-dual-layer-semantic-tokens'],
    basis: [
      'AN-21 Phase 2: MarketplaceThemeResolver — зрелый per-vertical runtime.',
      'Обобщить applyTheme(themeId, root) для WG + Marketplace.',
    ],
    vector: [
      'packages/design-tokens/themes/*.json + applyTheme.mjs.',
      'Marketplace: refactor MarketplaceThemeResolver → IohascThemeResolver.',
      'WG: data-iohasc-theme на html.',
    ],
    goal: ['Runtime theme switch без Tailwind rebuild в обоих продуктах.'],
    checks: [
      'applyTheme unit tests',
      'marketplace-psychology theme still works',
    ],
    targetFiles: [
      'packages/design-tokens/build/applyTheme.mjs',
      '../../04 Marketplace/app/Services/MarketplaceThemeResolver.php',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'pvrg-blade-adapter-marketplace',
    title: 'PVRG bladeAdapter для Marketplace trace (P2)',
    department: 'domain-marketplace',
    ownerRole: 'integration_architect',
    priority: 'low',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'intent-marketplace-backlog-bootstrap'],
    basis: [
      'AN-21 §3.2 п.4: trace Listing.php ↔ blade ↔ docs.',
      'ioHasC language registry — добавить blade adapter.',
    ],
    vector: [
      'bladeAdapter в language registry (parse *.blade.php).',
      'PVRG subgraph для marketplace-core listing form.',
    ],
    goal: ['Code↔docs trace для Marketplace в WG PVRG.'],
    checks: [
      'bladeAdapter registered',
      'get_pvrg_task_scope smoke on marketplace fixture',
    ],
    targetFiles: [
      '../../04 Marketplace/packages/marketplace-core/',
      'src/pvrg/',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
  },
  {
    workId: 'write-an30-closing-marketplace-shared-design-system',
    title: 'AN-30 closing analysis: epic-marketplace-shared-design-system',
    department: 'product-integration',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'extract-iohasc-design-tokens-package',
      'marketplace-adopt-generated-brand-tokens',
      'workgraph-dual-layer-semantic-tokens',
      'atomic-spec-five-base-atoms',
      'intent-marketplace-backlog-bootstrap',
    ],
    basis: [
      'Closing loop AN-22: эпик closed → closing-AN с feeds_epics.',
      'AN-21 §8 metrics — baseline vs achieved.',
    ],
    vector: [
      'work/analytics/closing-epic-marketplace-shared-design-system.md + journal AN-30.',
      'Outcomes: tokens unified, WG atomified, marketplace backlog in WG.',
    ],
    goal: ['Эпик закрыт с метриками и уроками DS integration.'],
    checks: [
      'analytics-records.jsonl содержит AN-30',
      'epic-marketplace-shared-design-system closed с evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-marketplace-shared-design-system.md',
      'work/analytics-records.jsonl',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-21',
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
    schema: 'workgraph.seed-epic-marketplace-shared-design-system.v1',
    epicId: EPIC_ID,
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
