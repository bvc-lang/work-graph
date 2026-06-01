#!/usr/bin/env node
/**
 * Seed advanced WorkItems from analytics AN-3 (intent graph storage as canon).
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:intent-graph-storage-roadmap';
const ANALYTICS_KEY = 'AN-3';
const ANALYTICS_BODY = 'work/analytics/intent-graph-storage-roadmap.md';
const DECISION_ID = 'decision:intent-graph-storage-v1';
const QUESTION_ID = 'iq:intent-graph-storage';
const SELECTED_OPTION_ID = 'option-c-intent-node-canon';

const TASKS = [
  {
    workId: 'design-intent-graph-storage-v1',
    title: 'спроектировать хранение графа намерений v1',
    department: 'system-runtime',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    dependsOn: ['design-work-item-hierarchy-v1'],
    basis: [
      `Источник: аналитика ${ANALYTICS_REF} (${ANALYTICS_KEY}), блок «Порядок реализации» п.12.`,
      `Выбран продвинутый вариант: отдельный canon intent_node, а не markdown-only и не UI-only дорожная карта.`,
      `question_id=${QUESTION_ID}; selected_option=${SELECTED_OPTION_ID}; decision_id=${DECISION_ID}.`,
      ANALYTICS_BODY,
    ],
    vector: [
      'Описать protocols/intent-graph-storage-v1.bvc: question, option, decision, work_ref, evidence_ref.',
      'Описать canonical links: analyzes, offers_option, selects, creates_work, parent_of, depends_on, verified_by.',
      'Зафиксировать, что «Дорожная карта» является view выбранной ветки intent graph, а не primary storage.',
      'Определить JSON/projection shape для intent_node и lineage query.',
    ],
    goal: [
      'Канон graph of intent v1 позволяет восстановить путь question → options → selected decision → epic/task → subtasks → evidence.',
    ],
    checks: [
      'protocols/intent-graph-storage-v1.bvc описывает node kinds и links',
      'protocols/intent-tree-workgraph-layout.bvc ссылается на intent graph storage как канон',
      'документирована разница intent graph vs roadmap view',
    ],
    targetFiles: [
      'protocols/intent-graph-storage-v1.bvc',
      'protocols/intent-tree-workgraph-layout.bvc',
      'src/intentGraphGbcSliceBoundary.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-intent-node-atom-profile',
    title: 'реализовать atom.profile intent_node и parser/projection',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    dependsOn: ['design-intent-graph-storage-v1'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), п.12–13.`,
      'Без отдельного intent_node варианты и решения остаются текстом и не становятся валидируемым графом.',
    ],
    vector: [
      'Добавить профиль atom.profile=intent_node с labels intent.id, intent.node_kind, intent.parent_id, intent.link.*.',
      'Реализовать parser/projection для question/option/decision/work_ref/evidence_ref.',
      'Линтер: missing linked node, cycle в intent.parent_id, selected decision без option, work_ref без work.id.',
      'Сохранить WorkItem как execution layer; intent_node хранит смысл и lineage.',
    ],
    goal: [
      'IntentNode-атомы читаются из intent tree, валидируются и собираются в graph projection.',
    ],
    checks: [
      'node --test покрывает parse intent_node и lint ошибок',
      'projection возвращает question → options → decision → work refs',
      'существующие WorkItem tests не ломаются',
    ],
    targetFiles: [
      'src/intentTreeWorkItems.mjs',
      'src/intentTreeLint.mjs',
      'src/intentHierarchy.mjs',
      'tests/intentTreeLint.test.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-analytics-decision-structure',
    title: 'структурировать варианты и выбранное решение в analytics projection',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['implement-intent-node-atom-profile'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), п.13.`,
      'AN-n должен показывать не только markdown, но и machine-readable options/selected decision/tasks.',
    ],
    vector: [
      'Расширить analytics projection: question, options[], selectedDecision, relatedWorkItems, relatedIntentNodes.',
      'Связать AN-n с intent_node через intake.source_ref и intent.question_id/decision_id.',
      'В drawer Analytics показать «Варианты решений», «Выбранное решение», «Задачи из решения».',
    ],
    goal: [
      'Аналитика становится входной точкой графа намерений: варианты и решение доступны UI/agent без парсинга markdown.',
    ],
    checks: [
      'analyticsPanelProjection test покрывает selectedDecision и relatedIntentNodes',
      'analytics drawer показывает варианты и выбранное решение',
      'AN-3 отображает задачи из решения после seed',
    ],
    targetFiles: [
      'src/analyticsPanelProjection.mjs',
      'src/analyticsRecordWorkItems.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/analyticsPanelProjection.test.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-intent-lineage-labels-for-work-items',
    title: 'добавить lineage labels на WorkItem из выбранного решения',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['implement-intent-node-atom-profile', 'implement-work-item-parent-id-runtime'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), п.14.`,
      'WorkItem должен знать, из какого вопроса/варианта/решения он создан, иначе roadmap теряет причину появления задач.',
    ],
    vector: [
      'MCP create_work_item принимает intentQuestionId, intentOptionId, intentDecisionId и пишет labels.',
      'Default analysis показывает lineage по-русски: вопрос → выбранное решение → задача.',
      'Seed-скрипты AN-2/AN-3 создают parent/child и decision lineage labels.',
    ],
    goal: [
      'Любая задача, созданная из AN-n, имеет machine-readable lineage до вопроса и выбранного решения.',
    ],
    checks: [
      'create_work_item пишет intent.question_id / intent.option_id / intent.decision_id',
      'related analytics tasks находятся по intake и intent labels',
      'lint ловит work_ref на несуществующее decision_id',
    ],
    targetFiles: [
      'packages/workgraph-mcp/src/handlers.mjs',
      'src/workItemCreateAnalysis.mjs',
      'src/analyticsRecordWorkItems.mjs',
      'tests/workItemCreateAnalysis.test.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-roadmap-from-intent-graph-view',
    title: 'построить дорожную карту как выбранную ветку графа намерений',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    dependsOn: ['implement-analytics-decision-structure', 'implement-intent-lineage-labels-for-work-items'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), п.15.`,
      'Дорожная карта должна показывать выбранные решения и созданные из них эпики/подзадачи, а не быть самостоятельным хранилищем.',
    ],
    vector: [
      'Projection: selected decision → epic/work item → children → depends_on/evidence.',
      'UI: roadmap view скрывает отклонённые варианты, но даёт переход к полному AN-n/intent graph.',
      'Сортировка по dependency/order/status; rollup прогресса берётся из parent/child canon.',
    ],
    goal: [
      'Раздел «Дорожная карта» отображает выбранную ветку intent graph с задачами, подзадачами и прогрессом.',
    ],
    checks: [
      'roadmap projection строится из intent graph, не из markdown',
      'UI test показывает selected branch и переход к AN-n',
      'отклонённые варианты не попадают в roadmap, но видны в analytics/intent graph',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/intentGraphGbcSliceBoundary.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-intent-graph-drilldown-ui',
    title: 'реализовать drilldown графа намерений: вопрос → варианты → решение → задачи',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['implement-roadmap-from-intent-graph-view'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), п.16.`,
      'Оператору нужен сквозной путь от вопроса до evidence, чтобы понимать почему задача существует.',
    ],
    vector: [
      'Analytics drawer / отдельный intent graph view: question, options, selected decision, tasks, subtasks, evidence.',
      'Навигация по узлам без потери контекста: назад к AN-n, к задаче, к evidence.',
      'Отображение связей analyzes/offers_option/selects/creates_work/parent_of/verified_by.',
    ],
    goal: [
      'Оператор видит полный lineage решения и может перейти из любого узла к связанному AN-n/WorkItem/evidence.',
    ],
    checks: [
      'UI содержит drilldown для AN-3 graph path',
      'клик по WorkItem из graph path открывает task drawer и возвращает назад',
      'тест покрывает empty/partial lineage без падения',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS_BODY,
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

    await createWorkItem(task, { root: cwd });
    created += 1;
    console.log(`created ${task.workId}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-intent-graph-storage-roadmap-tasks.v1',
    analyticsKey: ANALYTICS_KEY,
    created,
    skipped,
    total: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
