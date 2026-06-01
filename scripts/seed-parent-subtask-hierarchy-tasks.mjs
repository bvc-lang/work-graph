#!/usr/bin/env node
/**
 * Seed WorkItems from analytics AN-2 block C (advanced work.parent_id hierarchy).
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:parent-subtask-hierarchy';
const ANALYTICS_KEY = 'AN-2';
const ANALYTICS_BODY = 'work/analytics/parent-subtask-hierarchy.md';

const TASKS = [
  {
    workId: 'design-work-item-hierarchy-v1',
    title: 'спроектировать иерархию WorkItem v1 (эпик и подзадачи)',
    department: 'system-runtime',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['define-workitem-v1'],
    basis: [
      `Источник: аналитика ${ANALYTICS_REF} (${ANALYTICS_KEY}), блок C п.8 — protocol work-item-hierarchy-v1.`,
      'Сейчас нет work.parent_id; depends_on не выражает композицию эпик → подзадачи.',
      ANALYTICS_BODY,
    ],
    vector: [
      'Описать protocols/work-item-hierarchy-v1.bvc: work.parent_id, work.item_kind (epic|task|subtask), derived children и lifecycle parent/child.',
      'Правила lint: parent exists, no cycles, parent не зависит от child, epic/task/subtask совместимы со status transitions.',
      'Rollup v1 канонический: parent нельзя закрыть без done/verified children; depends_on остаётся для порядка исполнения.',
    ],
    goal: [
      'Канон иерархии согласован с define-workitem-v1; агент создаёт эпик и подзадачи через MCP без ad-hoc labels.',
    ],
    checks: [
      'protocols/work-item-hierarchy-v1.bvc описывает parent_id и item_kind',
      'lint rules задокументированы в backlog-schema-lint-v1',
      'описаны правила rollup close gate и parent/child lifecycle',
    ],
    targetFiles: [
      'protocols/work-item-hierarchy-v1.bvc',
      'protocols/backlog-schema-lint-v1.bvc',
      'src/backlogSchemaLint.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-work-item-parent-id-runtime',
    title: 'реализовать work.parent_id в runtime, lint, gates и MCP create_work_item',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['design-work-item-hierarchy-v1'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), блок C п.9.`,
    ],
    vector: [
      'parseWorkItems: поля parentId, itemKind и derived children из label work.parent_id / work.item_kind.',
      'backlogSchemaLint: missing parent, self-parent, parent cycle, parent depends_on child, invalid item_kind.',
      'Promote/complete gates: parent close блокируется, пока children не done/verified; child claim уважает обычные depends_on.',
      'MCP create_work_item: параметры parentId/itemKind → labels + intake в analysis.',
    ],
    goal: [
      'Подзадача создаётся с parentId; runtime, lint и execution gates поддерживают иерархию как канон, не как UI-группировку.',
    ],
    checks: [
      'npm test покрывает parse parent_id и lint errors',
      'create_work_item с parentId пишет work.parent_id в атом',
      'complete/promote gate не даёт закрыть parent с незавершёнными children',
    ],
    targetFiles: [
      'src/workGraphRuntime.mjs',
      'src/backlogSchemaLint.mjs',
      'src/workItemExecutionGate.mjs',
      'packages/workgraph-mcp/src/handlers.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-backlog-ui-parent-child-tree',
    title: 'реализовать UI дерева задач: родитель, подзадачи, rollup и навигация',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['implement-work-item-parent-id-runtime'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), блок C п.10.`,
      'Оператор должен видеть общую задумку родителя и список подзадач в одном drawer.',
    ],
    vector: [
      'Detail drawer: секция «Подзадачи» (derived children), ссылка «Родитель» у child.',
      'Rollup N/M детей done/verified + явный статус блокировки close gate, если дети не завершены.',
      'Kanban/tree grouping по parent_id: collapse/expand эпиков, без дублирования children[] в атомах.',
    ],
    goal: [
      'В UI понятна иерархия: эпик с общей задумкой, подзадачи, прогресс и причина блокировки закрытия parent.',
    ],
    checks: [
      'workGraphBacklogUiServer тест или e2e smoke на parent/child panel',
      'rollup отображается для эпика с ≥1 child',
      'клик parent/child сохраняет навигацию назад в drawer',
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
  {
    workId: 'implement-linkage-parent-of-edges',
    title: 'добавить parent_of / child_of в linkage, Graph RAG и trace',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    dependsOn: ['implement-work-item-parent-id-runtime'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), блок C п.11.`,
    ],
    vector: [
      'unifiedLinkageProjection: рёбра parent_of по work.parent_id.',
      'Graph RAG context slice включает parent/children соседей и rollup state.',
      'Trace/drilldown показывает parent_of рядом с depends_on, чтобы агент понимал композицию и порядок исполнения отдельно.',
    ],
    goal: [
      'Linkage graph отражает иерархию рядом с depends_on.',
    ],
    checks: [
      'тест unifiedLinkageProjection на parent_of edges',
      'Graph RAG slice содержит parent/children для выбранного work.id',
    ],
    targetFiles: [
      'src/unifiedLinkageProjection.mjs',
      'tests/unifiedLinkageProjection.test.mjs',
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
    schema: 'workgraph.seed-parent-subtask-hierarchy-tasks.v1',
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
