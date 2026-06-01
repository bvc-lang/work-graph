#!/usr/bin/env node
/**
 * Seed WorkItems from analytics AN-7 (positioning C: 1С/OneBase vertical).
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:product-self-audit-user';
const ANALYTICS_KEY = 'AN-7';
const ANALYTICS_BODY = 'work/analytics/product-self-audit-user.md';
const TECH_BODY = 'work/analytics/product-self-audit-tech.md';
const EPIC_ID = 'pivot-to-1c-onebase-vertical';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'pivot продукта в 1С/OneBase vertical (позиция C из AN-7)',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'epic',
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'AN-7: четыре позиции (A memory layer / B agent governance / C 1С vertical / D open canon).',
      'Рекомендация: C — есть в charter, нет конкурентов, конкретный сегмент, платёжеспособный рынок RU/CIS.',
      `Связано с AN-6 (техдолг как следствие отсутствия позиции): ${TECH_BODY}.`,
    ],
    vector: [
      'Один прикладной сценарий 1С/OneBase, проведённый через golden path не-автором.',
      'Всё, что не служит этому сценарию, переезжает в experimental/ или признаётся R&D.',
      'Метрика успеха: один не-автор → одна реальная 1С-задача → verified с evidence.',
    ],
    goal: [
      'Продукт получает явного пользователя и измеримую ценность; charter и README соответствуют факту.',
    ],
    checks: [
      'charter/main.bvc описывает 1С/OneBase vertical как primary scope',
      'README.md имеет «Getting Started» для 1С-разработчика, не для автора',
      'experimental/ содержит всё, что не входит в vertical (Genesis, GVM, multi-domain ambitions)',
      'один не-автор завершил golden path с verified evidence',
    ],
    targetFiles: [
      'charter/main.bvc',
      'README.md',
      'experimental/',
      ANALYTICS_BODY,
      TECH_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'decide-positioning-from-an7',
    title: 'зафиксировать выбор позиции C (1С vertical) как decision record',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §8 — четыре позиции.`,
      'Без зафиксированного decision record вернёмся к «всё сразу».',
    ],
    vector: [
      'Decision record в intent graph: question «какая позиция продукта?», options A/B/C/D, selected C.',
      'Записать risks/assumptions, критерий разворота на A/B/D.',
    ],
    goal: [
      'Позиция C закреплена в intent graph; видна на дорожной карте намерений.',
    ],
    checks: [
      'intent question + 4 option nodes + decision node на C существуют',
      'AN-7 связан с decision через intakeSourceRef',
    ],
    targetFiles: [
      'intent/product/positioning/',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'rewrite-charter-for-1c-vertical',
    title: 'переписать charter/main.bvc под 1С/OneBase vertical',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-positioning-from-an7'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §6 — charter vs. реальность.`,
      'Текущий charter обещает «agentic engineering OS» без сегмента; vertical = боль конкретной аудитории.',
    ],
    vector: [
      'Блок «Вектор»: golden path конкретно для 1С-разработчика (конфигурация/обработка/отчёт).',
      'Блок «Анти-цели»: явный отказ от конкуренции с Cursor/Devin/Linear в общей нише.',
      'Domain vertical OneBase → primary scope, не «один из».',
      'Прежний charter сохранить в charter/legacy/main-pre-an7.bvc как след решения.',
    ],
    goal: [
      'Charter снова работает как компас: новый код можно сверить со scope.',
    ],
    checks: [
      'charter/main.bvc ссылается на AN-7 как обоснование',
      'все блоки переписаны (Базис/Вектор/Цель/Метки/Критерии_готовности/Анти_Цели)',
      'legacy charter сохранён',
    ],
    targetFiles: [
      'charter/main.bvc',
      'charter/legacy/main-pre-an7.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'rewrite-readme-for-1c-vertical',
    title: 'переписать README.md как Getting Started для 1С-разработчика',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['rewrite-charter-for-1c-vertical'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §3, §9 — нет «getting started», нет демо.`,
      'Сейчас README обрывается на seed-фазе и не объясняет, кому это нужно.',
    ],
    vector: [
      '«Зачем 1С-разработчику Work Graph» — одна страница, конкретный сценарий.',
      '5-минутный quick start: charter → пример 1С-задачи → команда → результат.',
      'Скриншот / GIF одного прогона golden path.',
    ],
    goal: [
      'Внешний 1С-разработчик за 5 минут понимает, что это и зачем.',
    ],
    checks: [
      'README имеет секцию «Кому это нужно» с одним сегментом',
      'README имеет «5-минутный quick start»',
      'README не упоминает Genesis/GVM/multi-domain как первоочередное',
    ],
    targetFiles: [
      'README.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'isolate-experimental-non-vertical',
    title: 'перенести всё не относящееся к 1С-vertical в experimental/',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['rewrite-charter-for-1c-vertical'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §9 — «спрятать остальное в experimental/».`,
      `Связано с ${TECH_BODY} §6 — charter vs реальность: 126 файлов src, 48 npm-скриптов.`,
    ],
    vector: [
      'Список «вне-vertical»: Genesis/GVM/Zig, multi-domain ambitions, Mermaid runtime UI, скрипты не-связанные с 1С.',
      'Перенести по `experimental/<domain>/`; в charter явно пометить как R&D.',
      'Не удалять — потерянная инвестиция, но убрать из основного потока внимания.',
      'package.json: scripts разбиты на core / experimental.',
    ],
    goal: [
      'Новый человек, читая src/, видит только то, что служит 1С-сценарию.',
    ],
    checks: [
      'experimental/ существует и помечен в README',
      'package.json scripts разделены',
      'npm run ci:mandatory не зависит от experimental/',
    ],
    targetFiles: [
      'experimental/',
      'package.json',
      'README.md',
      'charter/main.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'identify-first-1c-pilot-user',
    title: 'найти первого не-автора (1С-разработчика) и согласовать pilot-задачу',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['rewrite-readme-for-1c-vertical'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §3, §9 — нужен один не-автор, прошедший golden path.`,
      'Без внешнего пользователя продуктовая ценность не доказана.',
    ],
    vector: [
      'Профиль pilot-пользователя: 1С-разработчик/внедренец, готов потратить 1-2 часа на эксперимент.',
      'Согласованная pilot-задача: одна конкретная конфигурация / обработка / отчёт.',
      'NDA/договорённость не нужны — open eval, фидбек письменно.',
    ],
    goal: [
      'Есть конкретный человек, конкретная задача, согласованное время.',
    ],
    checks: [
      'work item pilot-user-<имя> создан с описанием профиля',
      'pilot-задача описана как .bvc с критериями verified',
      'дата прогона назначена',
    ],
    targetFiles: [
      'intent/product/pilot/',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'run-first-non-author-golden-path',
    title: 'провести pilot 1С-задачи через golden path и собрать evidence',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['identify-first-1c-pilot-user', 'isolate-experimental-non-vertical'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}) §9 — критерий завершения epic.`,
      'Это единственный gate, который доказывает продуктовую ценность.',
    ],
    vector: [
      'Pilot выполняет задачу: charter → work item → agent → code/конфигурация → trace → verified.',
      'Pilot пишет 5 пунктов фидбека: что понятно, что мешало, что бы оставил, что бы выкинул.',
      'Результат → retro analytics record AN-8.',
    ],
    goal: [
      'Один verified work item, выполненный не-автором, с письменным фидбеком и retro-аналитикой.',
    ],
    checks: [
      'work item pilot-задачи в статусе verified с evidence',
      'pilot-фидбек сохранён как work/analytics/pilot-1c-feedback-v1.md',
      'AN-8 retro создан с выводами для следующей итерации',
    ],
    targetFiles: [
      'work/analytics/pilot-1c-feedback-v1.md',
      'work/analytics-records.jsonl',
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
    schema: 'workgraph.seed-pivot-to-1c-onebase-vertical-tasks.v1',
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
