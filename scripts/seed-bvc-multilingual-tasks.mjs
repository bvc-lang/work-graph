#!/usr/bin/env node
/**
 * Seed WorkItems: BVC multilingual Detect-or-Declare (AN-19)
 * Sources: AN-19, updated AN-8, docs/adr-bvc-multilingual-keys.md (to create)
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:bvc-multilingual-keys-design';
const ANALYTICS_KEY = 'AN-19';
const ANALYTICS_BODY = 'work/analytics/bvc-multilingual-keys-design.md';
const AN8_BODY = 'work/analytics/step-as-open-canon-standard.md';
const ADR_MULTILINGUAL = 'docs/adr-bvc-multilingual-keys.md';
const ADR_NAMING = 'docs/adr-bvc-format-naming.md';
const MIGRATION_PLAN = 'docs/plan-step-to-bvc-migration.md';
const DIALECTS_DIR = 'packages/bvc-dialects';
const EPIC_ID = 'bvc-multilingual-detect-or-declare';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'BVC multilingual: Detect-or-Declare + dialect registry (AN-19)',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['bvc-open-canon-naming'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) — inline bilingual aliases отклонены.`,
      `AN-8 §6 #1 superseded: EN canonical + registered dialects, не комментарии alias.`,
      'Существующий RU-корпус *.bvc должен работать через auto-detect без переписывания.',
    ],
    vector: [
      `Принять ADR ${ADR_MULTILINGUAL}.`,
      'Dialect registry en.json + ru.json; parser Detect-or-Declare.',
      'Расширить step-atom-draft lang; обновить llm-step-atom-writer.',
      'Conformance: EN/RU вход → один AST; round-trip preserve dialect.',
    ],
    goal: [
      'Мультиязычность BVC зафиксирована в ADR и исполняема: один dialect на атом, E_BVC_DIALECT_MIX при смешении.',
    ],
    checks: [
      `${ADR_MULTILINGUAL} принят`,
      `${DIALECTS_DIR}/en.json и ru.json существуют`,
      'parser резолвит lang (pragma / @lang / Labels.lang / auto-detect)',
      'conformance EN+RU green',
    ],
    targetFiles: [
      ADR_MULTILINGUAL,
      ANALYTICS_BODY,
      AN8_BODY,
      'schemas/step-atom-draft.v1.json',
      'protocols/llm-step-atom-writer.bvc',
      DIALECTS_DIR,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'adr-bvc-multilingual-keys',
    title: 'принять ADR docs/adr-bvc-multilingual-keys.md (Detect-or-Declare)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §10 — решения без ADR остаются только в аналитике.`,
      `Naming ADR ${ADR_NAMING} не покрывает canon language.`,
    ],
    vector: [
      `Создать ${ADR_MULTILINGUAL}: EN canonical, Detect-or-Declare, bvc-lang/dialects.`,
      'Один dialect per atom; E_BVC_DIALECT_MIX; round-trip preserve dialect.',
      `Cross-link: ${ADR_NAMING}, AN-8, AN-19.`,
    ],
    goal: [
      'Governance-слой для multilingual совпадает с AN-19; команда может ссылаться на ADR.',
    ],
    checks: [
      `${ADR_MULTILINGUAL} status Accepted`,
      'AN-8 и AN-19 ссылаются на ADR',
    ],
    targetFiles: [
      ADR_MULTILINGUAL,
      ADR_NAMING,
      AN8_BODY,
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'bvc-dialect-registry-en-ru',
    title: 'dialect registry: en.json + ru.json (Basis/Vector/Goal/Labels)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['adr-bvc-multilingual-keys'],
    basis: [
      `Источник: ${ANALYTICS_REF} §6 — registry в bvc-lang/dialects; pilot в репо.`,
      'Контракт: уникальные localized keys; profile/label keys всегда EN.',
    ],
    vector: [
      `Создать ${DIALECTS_DIR}/en.json (canonical) и ru.json.`,
      'JSON map canonicalEnKey → localizedKey для Basis/Vector/Goal/Labels.',
      'README: PR-based расширение dialects; link ADR.',
    ],
    goal: [
      'Парсер и linter могут загрузить registry без hardcode RU keywords.',
    ],
    checks: [
      'en.json и ru.json валидны',
      'ru покрывает все 4 обязательных BVC-ключа',
      'npm run lint:backlog green',
    ],
    targetFiles: [
      `${DIALECTS_DIR}/en.json`,
      `${DIALECTS_DIR}/ru.json`,
      ADR_MULTILINGUAL,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'extend-bvc-atom-draft-lang-field',
    title: 'schemas/step-atom-draft: поле lang (registered dialects)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['adr-bvc-multilingual-keys'],
    basis: [
      `Источник: ${ANALYTICS_REF} §7 — draft JSON должен нести lang для LLM formatter.`,
    ],
    vector: [
      'Добавить lang: enum [en, ru], default en в step-atom-draft.v1.json.',
      'Alias bvc-atom-draft.v1.json в docs при необходимости.',
      'Обновить validation tests для draft.',
    ],
    goal: [
      'LLM draft → formatter знает целевой dialect без guess.',
    ],
    checks: [
      'schema принимает lang: ru',
      'default en при отсутствии поля',
    ],
    targetFiles: [
      'schemas/step-atom-draft.v1.json',
      ADR_MULTILINGUAL,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'update-llm-bvc-atom-writer-multilingual',
    title: 'protocols/llm-step-atom-writer: один dialect на атом',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['adr-bvc-multilingual-keys', 'extend-bvc-atom-draft-lang-field'],
    basis: [
      `Источник: ${ANALYTICS_REF} §7 — протокол пишет «Formatter всегда Базис»; конфликт с atom.lang.`,
      'LLM-фрагмент без файла: обязателен @lang или Labels.lang.',
    ],
    vector: [
      'Обновить llm-step-atom-writer.bvc: выбор одного dialect; lang в draft/Labels.',
      'Formatter пишет ключи dialect из registry, не hardcode RU.',
      'Примеры EN и RU draft JSON.',
    ],
    goal: [
      'LLM-контракт согласован с Detect-or-Declare; нет mixed inline aliases.',
    ],
    checks: [
      'protocol описывает @lang и Labels.lang для фрагментов',
      'npm run eval:mandatory-prompt не регрессит',
    ],
    targetFiles: [
      'protocols/llm-step-atom-writer.bvc',
      'schemas/step-atom-draft.v1.json',
      ADR_MULTILINGUAL,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-parser-detect-or-declare',
    title: 'parser: Detect-or-Declare (pragma, @lang, auto-detect, E_BVC_DIALECT_MIX)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['bvc-dialect-registry-en-ru', 'implement-parser-dual-extension-step-bvc'],
    basis: [
      `Источник: ${ANALYTICS_REF} §5 — алгоритм parse_atom с resolved_lang и normalize to EN AST.`,
      '233 RU work items должны парситься без pragma (auto-detect).',
    ],
    vector: [
      'File pragma #!bvc lang=ru; atom header #Name@ru<[…]>; Labels.lang override.',
      'Auto-detect по первому BVC-ключу; atom.lang в AST для round-trip.',
      'Lint E_BVC_DIALECT_MIX при mixed keys в одном атоме.',
      'Загрузка dialect registry из packages/bvc-dialects.',
    ],
    goal: [
      'Фаза 1 open canon включает multilingual parser, не только dual extension.',
    ],
    checks: [
      'unit tests: EN atom, RU atom, mixed-file auto-detect',
      'mixed keys → lint error',
      'round-trip сохраняет dialect',
    ],
    targetFiles: [
      'src/',
      'tests/',
      DIALECTS_DIR,
      ADR_MULTILINGUAL,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'bvc-multilingual-conformance-tests',
    title: 'conformance: EN/RU .bvc → identical AST + dialect preserve',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-parser-detect-or-declare'],
    basis: [
      `Источник: ${ANALYTICS_REF} §7 — conformance suite дублируется для EN и RU.`,
      'AN-8 §6 #6 conformance tests — часть артефактного набора.',
    ],
    vector: [
      'tests/conformance/*.en.bvc и *.ru.bvc с expected AST JSON.',
      'Round-trip test: parse → format → parse identical dialect.',
      'CI gate в npm test или lint:backlog hook.',
    ],
    goal: [
      'Регрессии multilingual ловятся автоматически.',
    ],
    checks: [
      '≥2 EN и ≥2 RU conformance fixtures green',
      'dialect-preserve round-trip test green',
    ],
    targetFiles: [
      'tests/conformance/',
      ADR_MULTILINGUAL,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'charter-bvc-lang-pragma',
    title: 'charter/main.bvc: #!bvc lang=ru (явный dialect файла)',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['adr-bvc-multilingual-keys'],
    basis: [
      `Источник: ${ANALYTICS_REF} §7 — charter RU; pragma желателен, auto-detect достаточен.`,
      'Явность помогает агентам и tooling не гадать dialect.',
    ],
    vector: [
      'Первая строка charter/main.bvc: #!bvc lang=ru.',
      'Ссылка на ADR multilingual в basis или Метки.',
    ],
    goal: [
      'Charter — образец RU-файла с file-level pragma.',
    ],
    checks: [
      'charter начинается с #!bvc lang=ru',
      'lint:backlog green',
    ],
    targetFiles: [
      'charter/main.bvc',
      ADR_MULTILINGUAL,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'update-migration-plan-multilingual-an19',
    title: 'plan-step-to-bvc-migration: секция multilingual (AN-19)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['adr-bvc-multilingual-keys'],
    basis: [
      `${MIGRATION_PLAN} §«Что не мигрируем» устарело: «bilingual canon без изменений».`,
      `Источник: ${ANALYTICS_REF} — Detect-or-Declare, не inline aliases.`,
    ],
    vector: [
      'Заменить формулировку bilingual на registered dialects + auto-detect.',
      'Добавить todo фазы 1–2: registry, parser lang, conformance.',
      'Cross-link AN-19 и adr-bvc-multilingual-keys.',
    ],
    goal: [
      'Migration plan согласован с AN-19; исполнители не следуют старому §.',
    ],
    checks: [
      `${MIGRATION_PLAN} не содержит «bilingual canon без изменений»`,
      'todo multilingual tasks перечислены',
    ],
    targetFiles: [
      MIGRATION_PLAN,
      ADR_MULTILINGUAL,
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'sync-an14-ir-open-canon-multilingual',
    title: 'AN-14 ir-rich-ir: EN canonical + @bvc/* (supersedes bilingual AN-8)',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['adr-bvc-multilingual-keys'],
    basis: [
      'AN-14 §8: «bilingual, как в AN-8» и @step-canon/ir-* — stale после AN-18/AN-19.',
    ],
    vector: [
      'Обновить work/analytics/ir-rich-ir-open-canon.md §8: EN canonical + dialect registry.',
      'Заменить @step-canon на @bvc/* в таблице решений.',
      'Ссылка на AN-19 и adr-bvc-multilingual-keys.',
    ],
    goal: [
      'IR-аналитика не противоречит multilingual и naming ADR.',
    ],
    checks: [
      'AN-14 не содержит «bilingual, как в AN-8» без уточнения',
      '@bvc/* вместо @step-canon в §8',
    ],
    targetFiles: [
      'work/analytics/ir-rich-ir-open-canon.md',
      ANALYTICS_BODY,
      ADR_MULTILINGUAL,
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
    schema: 'workgraph.seed-bvc-multilingual-tasks.v1',
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
