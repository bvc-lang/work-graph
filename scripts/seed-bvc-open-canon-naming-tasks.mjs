#!/usr/bin/env node
/**
 * Seed WorkItems: reserve @bvc/spec + migration plan .bvc → .bvc
 * Sources: AN-18, AN-8 (updated), docs/adr-bvc-format-naming.md
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:bvc-naming-branding-review';
const ANALYTICS_KEY = 'AN-18';
const ANALYTICS_BODY = 'work/analytics/bvc-naming-branding-review.md';
const AN8_BODY = 'work/analytics/step-as-open-canon-standard.md';
const ADR_PATH = 'docs/adr-bvc-format-naming.md';
const MIGRATION_PLAN = 'docs/plan-step-to-bvc-migration.md';
const EPIC_ID = 'bvc-open-canon-naming';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'BVC open canon: reserve @bvc/spec + migration .bvc → .bvc',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) — .bvc занят ISO CAD, .bvc свободен.`,
      `AN-8 обновлён под BVC; ADR: ${ADR_PATH}.`,
      'step-canon слишком длинно; npm @bvc/* и org bvc-lang свободны.',
    ],
    vector: [
      'Опубликовать @bvc/spec@0.0.0 (placeholder).',
      'Зарезервировать GitHub org/repo bvc-lang.',
      'Исполнить plan-step-to-bvc-migration: dual-read → new-write .bvc.',
      'Charter + parser + VS Code: bvc primary, .bvc legacy.',
    ],
    goal: [
      'Публичный open canon имеет зафиксированное имя и зарезервированные npm/org; миграция не ломает существующие *.bvc.',
    ],
    checks: [
      '@bvc/spec опубликован на npm',
      'bvc-lang org или spec repo существует',
      `${MIGRATION_PLAN} актуален и все фазы 0–2 имеют owner`,
      'parser принимает .bvc и .bvc',
    ],
    targetFiles: [
      ADR_PATH,
      MIGRATION_PLAN,
      ANALYTICS_BODY,
      AN8_BODY,
      'charter/main.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'reserve-bvc-spec-npm-package',
    title: 'опубликовать @bvc/spec@0.0.0 (placeholder npm scope)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §9 — npm @bvc/spec свободен; root bvc занят.`,
      'Без publish scope может занять другой.',
    ],
    vector: [
      'Repo packages/bvc-spec/ или external bvc-lang/spec с package.json name @bvc/spec.',
      'README: BVC format, link ADR + AN-8, license Apache-2.0.',
      'npm publish --access public @bvc/spec@0.0.0.',
    ],
    goal: [
      'npmjs.com/package/@bvc/spec существует; scope @bvc зарезервирован.',
    ],
    checks: [
      'npm view @bvc/spec version returns 0.0.0',
      'README ссылается на ADR и migration plan',
    ],
    targetFiles: [
      'packages/bvc-spec/package.json',
      ADR_PATH,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'reserve-bvc-github-org',
    title: 'создать GitHub org/repo bvc-lang (spec placeholder)',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      `Источник: ${ANALYTICS_REF} — org bvc и bvc/bvc-spec свободны на проверку 2026-05-31.`,
    ],
    vector: [
      'Создать org bvc-lang или repo bvc-lang/spec.',
      'Initial commit: README, LICENSE (CC BY 4.0 spec text), link npm @bvc/spec.',
      'Discussions enabled для RFC.',
    ],
    goal: [
      'Публичный URL spec-репозитория зафиксирован в ADR и charter.',
    ],
    checks: [
      'GitHub repo доступен публично',
      'README описывает BVC = Basis Vector Goal, extension .bvc',
    ],
    targetFiles: [
      ADR_PATH,
      'charter/main.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'finalize-step-to-bvc-migration-plan',
    title: 'утвердить и дополнить plan-step-to-bvc-migration.md',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      `Draft: ${MIGRATION_PLAN} создан вместе с ADR.`,
      'Нужны owners и даты для фаз 1–2.',
    ],
    vector: [
      'Review фаз dual-read / new-write / optional rename с командой.',
      'Добавить таблицу затронутых путей (protocols/, work/, charter/).',
      'Ссылка из AN-8 и ADR на финальную версию плана.',
    ],
    goal: [
      'Migration plan — executable checklist, не draft.',
    ],
    checks: [
      `${MIGRATION_PLAN} имеет owners/dates на каждую фазу`,
      'lint:backlog проходит после добавления work items',
    ],
    targetFiles: [
      MIGRATION_PLAN,
      ADR_PATH,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-parser-dual-extension-step-bvc',
    title: 'parser/linter: читать .bvc и .bvc (один AST)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['finalize-step-to-bvc-migration-plan'],
    basis: [
      `${MIGRATION_PLAN} фаза 1 — dual-read без semantic diff.`,
    ],
    vector: [
      'HasC / step parser: register .bvc extension same as .bvc.',
      'Tests: один fixture в .bvc и .bvc → identical AST.',
      'Подготовка выделения в @bvc/parser (может быть follow-up work item).',
    ],
    goal: [
      'Фаза 1 migration plan выполнена в коде.',
    ],
    checks: [
      'unit test dual-extension green',
      'lint backlog не регрессит',
    ],
    targetFiles: [
      'src/',
      'tests/',
      MIGRATION_PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'update-charter-bvc-naming-adr',
    title: 'charter/main.bvc: public format BVC .bvc + ссылка на ADR',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['reserve-bvc-spec-npm-package'],
    basis: [
      `ADR ${ADR_PATH} принят; charter должен отражать naming для всех агентов.`,
    ],
    vector: [
      'Блок Метки или Паспорт: public_canon_format: bvc, extension: .bvc.',
      'Ссылка на ADR и AN-18 в relatedFiles / basis.',
      '.bvc остаётся internal legacy — явно указать.',
    ],
    goal: [
      'Charter — source of truth для naming; агент не продвигает .bvc наружу.',
    ],
    checks: [
      'charter/main.bvc содержит bvc и ссылку на adr-bvc-format-naming.md',
      'npm run lint:backlog green',
    ],
    targetFiles: [
      'charter/main.bvc',
      ADR_PATH,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
];

async function main() {
  const cwd = process.cwd();
  const existing = new Set((await readWorkItemsFromRepo({ cwd })).map((item) => item.id));
  let created = 0;
  let skipped = 0;

  for (const task of TASKS) {
    if (existing.has(task.workId)) {
      skipped += 1;
      console.log(`skip ${task.workId}`);
      continue;
    }

    const result = await createWorkItem(task, { cwd });
    existing.add(task.workId);
    created += 1;
    console.log(`created ${result.workId} → ${result.path}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-bvc-open-canon-naming-tasks.v1',
    analyticsRef: ANALYTICS_REF,
    epicId: EPIC_ID,
    created,
    skipped,
    total: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
