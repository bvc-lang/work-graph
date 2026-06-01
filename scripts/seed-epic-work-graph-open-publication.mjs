#!/usr/bin/env node
/**
 * Seed: AN-42 — публикация Work Graph: лицензии, форматы, open core.
 * Default status: backlog.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/open-publication-technology-holdback-strategy.md';
const PLAN = 'docs/plan-work-graph-open-publication.md';
const EPIC_ID = 'epic-work-graph-open-publication';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Публикация Work Graph: лицензии, открытые форматы и open core (AN-42)',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [],
    basis: [
      'Разбор AN-42: в эпоху LLM защита через секретность алгоритмов не работает — код и prompts быстро копируются.',
      'Публиковать проект нужно как open core: открытые форматы и reference implementations, коммерческая ценность — в packs и сервисе.',
      'BVC — единственный универсальный человекочитаемый формат; IR и PVRG — машинные спецификации второго уровня.',
    ],
    vector: [
      'Принять ADR по лицензиям: CC BY 4.0 для specs, Apache-2.0 для core code, commercial для domain packs.',
      'Разметить репозиторий и пакеты на public / private / experimental.',
      'Опубликовать draft specs и лицензии для BVC, IR/RichIR, PVRG.',
      'Разделить Work Graph core и коммерческие packs; оформить trademark/conformance policy.',
      'Legal hygiene, CI guard npm pack, закрытие разбора AN-42.',
    ],
    goal: [
      'Work Graph готов к публичному релизу: понятно что открыто, под какой лицензией, что продаётся отдельно, и как защищён бренд.',
    ],
    checks: [
      'ADR open publication принят и ссылается на AN-42',
      'У BVC, IR и PVRG есть draft spec и лицензии на reference code',
      'Core и commercial packs разделены; trademark/conformance policy опубликована',
      'CI не пускает private paths в npm pack; разбор AN-42 закрыт итоговой записью',
    ],
    analysis: [
      'Зачем:',
      'Без явной лицензионной стратегии публикация либо отдаст всё конкурентам без moat, либо убьёт доверие к форматам.',
      'Границы:',
      'Юридические решения по патентам — отдельный review с специалистом; в эпике — документирование решения, не юридическая услуга.',
      'Зависимости:',
      'Связано с AN-8 (BVC), AN-9 (IR), AN-10 (PVRG), AN-16 (стек технологий).',
    ],
    decision: [
      'Вердикт:',
      'полезно',
      'Исполнять по плану docs/plan-work-graph-open-publication.md после ADR.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-work-graph-open-publication.md',
      'packages/bvc-spec/',
      'packages/bvc-cli/',
      'PUBLIC_API.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'decide-work-graph-open-publication-adr',
    title: 'ADR: стратегия публикации Work Graph — лицензии и open core',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-42 перечисляет варианты: Apache-2.0, MPL-2.0, BUSL, CC BY для specs — но без ADR команда будет спорить при каждом PR.',
      'Нужно зафиксировать: что открываем как стандарт, что остаётся commercial, почему не «прячем алгоритмы».',
    ],
    vector: [
      'docs/adr-work-graph-open-publication.md: open core, лицензии по слоям (BVC/IR/PVRG/core/packs).',
      'Отклонить BUSL для форматов; зафиксировать Apache-2.0 vs MPL-2.0 для core.',
    ],
    goal: ['Стратегия публикации зафиксирована до разметки пакетов и публикации specs.'],
    checks: [
      'ADR опубликован в docs/',
      'Таблица лицензий по слоям BVC / IR / PVRG / Work Graph / packs',
      'ADR ссылается на epic-work-graph-open-publication и AN-42',
    ],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-work-graph-open-publication.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'inventory-public-private-packages-an42',
    title: 'Инвентаризация: public, private и experimental пакеты',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-work-graph-open-publication-adr'],
    basis: [
      'Сейчас один репозиторий смешивает core, R&D (GVM/Genesis), eval fixtures и vertical packs — при публикации это утечка и путаница.',
      'AN-42 требует явных границ: packages/public, packages/private, fixtures/public vs private.',
    ],
    vector: [
      'Составить реестр каталогов с метками public | private | experimental.',
      'Пометить eval corpus, customer fixtures, operator playbooks как private.',
      'Документ в docs/publication-inventory-an42.md или раздел в ADR.',
    ],
    goal: ['Любой maintainer видит, что можно публиковать в npm/tarball, а что нет.'],
    checks: [
      'Реестр public/private/experimental опубликован',
      'Eval и customer fixtures помечены private',
      'experimental/* не обещается как продукт в README',
    ],
    targetFiles: [ANALYTICS, PLAN, 'docs/publication-inventory-an42.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'publish-bvc-open-standard-pack-an42',
    title: 'BVC как открытый стандарт: spec CC BY + пакеты Apache-2.0',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'inventory-public-private-packages-an42'],
    basis: [
      'AN-42: BVC — единственный универсальный человекочитаемый формат; без открытой spec он не станет стандартом.',
      'AN-8 уже описывает артефакты @bvc/spec, parser, CLI — нужно довести лицензии и conformance.',
    ],
    vector: [
      'Spec BVC под CC BY 4.0 в packages/bvc-spec или отдельном spec-репо.',
      'packages/bvc-cli и parser — Apache-2.0, LICENSE в каждом package.json.',
      'Conformance tests/tests/conformance/*.bvc + PUBLIC_API для stable surface.',
    ],
    goal: ['BVC можно цитировать, реализовать и проверить совместимость без доступа к закрытым packs.'],
    checks: [
      'Spec BVC имеет явную лицензию CC BY 4.0',
      'Пакеты @bvc/* помечены Apache-2.0',
      'Conformance suite описан в PUBLIC_API или spec README',
    ],
    targetFiles: [
      ANALYTICS,
      'work/analytics/step-as-open-canon-standard.md',
      'packages/bvc-spec/',
      'packages/bvc-cli/',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'publish-ir-richir-public-spec-an42',
    title: 'IR/RichIR: публичная draft spec и лицензии reference code',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'publish-bvc-open-standard-pack-an42'],
    basis: [
      'IR — машинный формат второго уровня (BVC → IR); AN-42 не позиционирует его как язык для оператора.',
      'AN-9: нужны JSON Schema, conformance levels, EN-canon — опубликовать как draft/RFC.',
    ],
    vector: [
      'Draft spec ir-flow.v1 + RichIR fields — CC BY 4.0.',
      'Reference validator/executor modules — Apache-2.0, отвязать от UI Work Graph где возможно.',
      'README: «AI-agent workflow IR with BVC semantics», не universal language.',
    ],
    goal: ['IR/RichIR можно интегрировать в сторонние tools без форка Work Graph UI.'],
    checks: [
      'Draft IR spec опубликован с лицензией CC BY 4.0',
      'Reference code помечен Apache-2.0',
      'В docs явно: IR — машинный exchange format, не readable-формат',
    ],
    targetFiles: [ANALYTICS, 'work/analytics/ir-rich-ir-open-canon.md', 'schemas/'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'publish-pvrg-public-spec-an42',
    title: 'PVRG: публичная schema spec и lite scanner под Apache-2.0',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'publish-bvc-open-standard-pack-an42'],
    basis: [
      'PVRG — deterministic project graph для AI-agent context; AN-42: открыть schema + lite scanner, advanced adapters — commercial.',
      'AN-10: JSON Schema nodes/edges, conformance levels — не «убийца Sourcegraph», а portable graph.',
    ],
    vector: [
      'pvrg.v1 JSON Schema + spec doc — CC BY 4.0.',
      'Lite scanner / format package — Apache-2.0.',
      'Позиционирование: graph schema + MCP subgraph, не универсальный readable-формат.',
    ],
    goal: ['PVRG можно использовать как открытый project graph без закрытых ranking policies.'],
    checks: [
      'PVRG schema spec опубликован',
      'Lite scanner/package имеет Apache-2.0 LICENSE',
      'Advanced language adapters не обещаны в public MVP',
    ],
    targetFiles: [ANALYTICS, 'work/analytics/pvrg-verified-reference-graph.md', 'pvrg-core/'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'split-work-graph-core-commercial-packs-an42',
    title: 'Разделить Work Graph core и коммерческие domain packs',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'inventory-public-private-packages-an42'],
    basis: [
      'AN-42: core app/MCP/CLI — Apache-2.0; OneBase/1С vertical pack, eval corpus, enterprise features — commercial.',
      'Без границы monetization останется только «всё бесплатно» или «всё закрыто».',
    ],
    vector: [
      'Описать packages/commercial/* или отдельный private repo для vertical packs.',
      'Eval corpus и customer fixtures — proprietary, не в public tarball.',
      'README: open local audit layer; advanced domain packs — separately.',
    ],
    goal: ['Понятно, что скачивает пользователь с GitHub/npm, а что покупает или получает по лицензии.'],
    checks: [
      'Документ или ADR-приложение описывает core vs commercial packs',
      'Eval corpus не попадает в public release artifacts',
      'README формулирует open core без обещания всех vertical features',
    ],
    targetFiles: [ANALYTICS, PLAN, 'README.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'trademark-conformance-policy-an42',
    title: 'Trademark и conformance: BVC-compatible, Work Graph brand',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'publish-bvc-open-standard-pack-an42'],
    basis: [
      'AN-42: рост через brand + conformance, не через секретность; trademark защищает имя, не идею.',
      'Нужны правила: кто может писать «BVC-compatible», что считается stable API.',
    ],
    vector: [
      'PUBLIC_API.md: stable vs experimental surfaces.',
      'Trademark policy draft: BVC, Work Graph, PVRG — использование в marketing и совместимости.',
      'Conformance: passing tests/conformance = право на badge (описание процесса).',
    ],
    goal: ['Экосистема может заявлять совместимость по правилам, а не произвольно.'],
    checks: [
      'PUBLIC_API.md опубликован',
      'Trademark / conformance policy draft в docs/',
      'Описан процесс «BVC-compatible» через conformance suite',
    ],
    targetFiles: [ANALYTICS, 'PUBLIC_API.md', 'docs/trademark-conformance-policy.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'legal-hygiene-public-release-an42',
    title: 'Legal hygiene: LICENSE, SECURITY, PRIVACY по пакетам',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-work-graph-open-publication-adr'],
    basis: [
      'Публичный релиз без LICENSE в каждом пакете и SECURITY.md вызывает вопросы у компаний и блокирует adoption.',
      'AN-42: specs CC BY, code Apache — файлы лицензий должны быть явными.',
    ],
    vector: [
      'LICENSE / LICENSE-spec в корне и packages/*.',
      'SECURITY.md, PRIVACY.md — что локально, что не отправляется.',
      'CONTRIBUTING.md: CLA или DCO — решение зафиксировать в ADR.',
    ],
    goal: ['Юрист или security reviewer может за 10 минут понять условия использования public release.'],
    checks: [
      'У public packages есть LICENSE с правильным SPDX identifier',
      'SECURITY.md и PRIVACY.md опубликованы',
      'CONTRIBUTING или ADR описывает contributor terms',
    ],
    targetFiles: [ANALYTICS, 'LICENSE', 'SECURITY.md', 'PRIVACY.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'review-patent-defensive-publication-an42',
    title: 'Review: patent strategy и defensive publication для BVC/IR/PVRG',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-work-graph-open-publication-adr'],
    basis: [
      'AN-42: до широкого релиза нужно решить — patent, defensive publication или только copyright+trademark.',
      'Это не юридическая услуга в эпике, а документированное решение для команды.',
    ],
    vector: [
      'work/analytics/patent-defensive-publication-decision-an42.md: варианты, рекомендация, дата публикации specs.',
      'Checklist: что раскрыто до/после консультации с патентным специалистом (если будет).',
    ],
    goal: ['Команда знает, зачем датируем specs и не публикуем «случайно» до patent review при необходимости.'],
    checks: [
      'Decision doc опубликован',
      'Указана связь с датами публикации BVC/IR/PVRG specs',
      'Явно: документ не заменяет юриста',
    ],
    targetFiles: [
      ANALYTICS,
      'work/analytics/patent-defensive-publication-decision-an42.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'ci-guard-private-paths-npm-pack-an42',
    title: 'CI: private paths не попадают в npm pack',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'inventory-public-private-packages-an42', 'split-work-graph-core-commercial-packs-an42'],
    basis: [
      'AN-42: package-level защита через files в package.json и npm pack --dry-run в CI.',
      'Без автоматической проверки eval/fixtures/private утекут в tarball при ошибке maintainer.',
    ],
    vector: [
      'Скрипт или CI job: npm pack --dry-run для public packages, snapshot списка файлов.',
      'Fail если path содержит eval, private, customer, real-trade, secret.',
    ],
    goal: ['Public npm release не содержит private corpus и commercial packs по ошибке.'],
    checks: [
      'CI job или script проверяет npm pack output',
      'Тест на forbidden path patterns',
      'Документировано в plan или ADR',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'scripts/check-npm-pack-public-boundary.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
  },
  {
    workId: 'write-an42-closing-work-graph-open-publication',
    title: 'Закрыть разбор AN-42 после эпика open publication',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'ci-guard-private-paths-npm-pack-an42',
      'trademark-conformance-policy-an42',
      'legal-hygiene-public-release-an42',
    ],
    basis: [
      'Эпик завершён — без итоговой записи разбор AN-42 в UI останется незакрытым.',
      'Оператору нужен перечень: ADR, specs, лицензии, inventory, CI guard.',
    ],
    vector: [
      'Итоговый md: work/analytics/closing-epic-work-graph-open-publication.md',
      'Запись в work/analytics-records.jsonl через seed:analytics-record',
    ],
    goal: ['Разбор AN-42 закрыт: видно, что стратегия публикации реализована и чем подтверждена.'],
    checks: [
      'Итоговый md опубликован',
      'Строка добавлена в analytics-records.jsonl',
      'Перечислены ADR, BVC/IR/PVRG specs, inventory, legal docs, CI guard',
    ],
    analysis: [
      'Зачем:',
      'Точка для оператора: «AN-42 отработан, вот доказательства».',
      'Когда:',
      'После завершения эпика и зелёных проверок CI.',
    ],
    decision: [
      'Вердикт:',
      'полезно',
      'Последняя задача эпика.',
    ],
    targetFiles: [
      'work/analytics/closing-epic-work-graph-open-publication.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-42',
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
    schema: 'workgraph.seed-epic-work-graph-open-publication.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-42',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
