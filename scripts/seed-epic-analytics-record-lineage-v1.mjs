#!/usr/bin/env node
/**
 * Seed: AN-51 — Analytics record lineage (graph storage, flat list UI).
 * Default status: backlog.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/analytics-record-lineage-flat-list-graph-storage.md';
const PLAN = 'docs/plan-analytics-record-lineage-v1.md';
const EPIC_ID = 'epic-analytics-record-lineage-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Analytics record lineage v1: graph storage, flat list, drawer drill-down (AN-51)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['implement-analytics-decision-structure', 'implement-intent-graph-drilldown-ui'],
    basis: [
      'AN-50 → AN-50.1: углубление разбора уже в markdown, но не в machine-readable lineage.',
      'AN-3 закрыл question→options→decision→work; не закрыт analysis→deeper analysis.',
      'AN-51: хранить граф рёбер (deepens/related/feeds/closes), показывать плоский recency-first список + lineage в drawer.',
    ],
    vector: [
      'P0: ADR graph storage vs tree navigation.',
      'P0: lineage fields в analytics-record.v1 + projection builder.',
      'P0: drawer секции родитель / продолжения / связанные.',
      'P1: badges в list-row; миграция AN-50↔AN-50.1.',
      'P2: MCP get_analytics_lineage.',
    ],
    goal: [
      'Оператор и агент видят цепочку AN-50 → AN-50.1 → epic без tree-view в главном списке.',
    ],
    checks: [
      'ADR analytics-record-lineage-v1 принят',
      'Projection и drawer lineage покрыты тестами',
      'AN-50.1 имеет lineage.parentKey в journal',
      'Список аналитики остаётся flat recency-first',
      'AN-51 closing doc опубликован',
    ],
    analysis: [
      'Зачем:',
      'Память решений: от обзора к детализации без потери ленты новых разборов.',
      'Границы:',
      'Не заменять AN-3 intent graph; не tree-view default; parentKey optional.',
      'Зависимости:',
      'implement-analytics-decision-structure, implement-intent-graph-drilldown-ui (done).',
    ],
    decision: [
      'Вердикт:',
      'полезно',
      'Исполнять по docs/plan-analytics-record-lineage-v1.md.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-analytics-record-lineage-v1.md',
      'src/analyticsPanelProjection.mjs',
      'src/analyticsRecordStore.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/analyticsPanelProjection.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'decide-analytics-lineage-storage-adr',
    title: 'ADR: analytics lineage — graph storage, flat list UI',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-51 §2: дерево в списке отвергнуто; граф рёбер + flat UI — канон.',
      'Согласовать с AN-3 intent graph (question→work) без дублирования.',
    ],
    vector: [
      'docs/adr-analytics-record-lineage-v1.md: relations deepens/related/feeds/closes.',
      'Projection vs duplicate markdown-only links.',
      'Migration: optional lineage block; AN-50.1 as reference.',
    ],
    goal: ['ADR принят; команда не строит tree-view как default navigation.'],
    checks: [
      'ADR опубликован с trace на AN-51',
      'Ссылка из plan-analytics-record-lineage-v1.md',
    ],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-analytics-record-lineage-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'extend-analytics-record-schema-lineage-v1',
    title: 'Extend analytics-record.v1 with optional lineage block',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-analytics-lineage-storage-adr'],
    basis: [
      'buildAnalyticsRecord не знает parentKey/relation — lineage только в markdown.',
    ],
    vector: [
      'src/analyticsRecordStore.mjs: optional lineage { parentKey, parentId, relation }.',
      'JSON schema or lint note in protocols/ if exists.',
      'tests/analyticsRecordStore.test.mjs or analyticsPanelProjection.test.mjs.',
    ],
    goal: ['Journal entries могут хранить machine-readable lineage без ломания старых записей.'],
    checks: [
      'Records без lineage — unchanged',
      'Record с lineage round-trips через journal read',
    ],
    targetFiles: ['src/analyticsRecordStore.mjs', 'tests/analyticsPanelProjection.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'implement-analytics-lineage-projection',
    title: 'Implement analytics-lineage.projection.v1 builder',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['extend-analytics-record-schema-lineage-v1'],
    basis: [
      'buildAnalyticsPanelProjection должен обогащать records parent/continuations/related.',
    ],
    vector: [
      'src/analyticsLineageProjection.mjs — buildAnalyticsLineageProjection(records).',
      'attachAnalyticsLineageToRecords в analyticsPanelProjection.mjs.',
      'Derive childKeys from parentKey index; support related edges when present.',
      'tests/analyticsLineageProjection.test.mjs.',
    ],
    goal: ['Каждая запись с lineage получает parent + continuations в API projection.'],
    checks: [
      'AN-50.1 fixture resolves parent AN-50',
      'analyticsPanelProjection tests green',
    ],
    targetFiles: [
      'src/analyticsLineageProjection.mjs',
      'src/analyticsPanelProjection.mjs',
      'tests/analyticsLineageProjection.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'wire-analytics-drawer-lineage-sections',
    title: 'UI: analytics drawer lineage sections (parent / continuations / related)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-analytics-lineage-projection'],
    basis: [
      'AN-3 drawer имеет intent graph sections; нет «Родительский разбор» / «Продолжения».',
    ],
    vector: [
      'workGraphBacklogUiServer.mjs: render lineage blocks in analytics detail drawer.',
      'Click parent/child → navigate to that AN record in same panel.',
      'Coexist with existing intentQuestion/intentOptions/selectedDecision sections.',
      'tests/workGraphBacklogUiServer.test.mjs smoke.',
    ],
    goal: ['Оператор углубляется AN-50 → AN-50.1 из drawer без поиска по списку.'],
    checks: [
      'Drawer shows parent when lineage.parentKey set',
      'Drawer lists continuations when children exist',
      'Navigation does not break intake/closing tabs',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'wire-analytics-list-lineage-badges',
    title: 'UI: lineage badges on flat analytics list rows',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-analytics-lineage-projection'],
    basis: [
      'AN-51: список остаётся flat recency-first; badge `↳ AN-50` или «N продолжений».',
    ],
    vector: [
      'renderAnalyticsPanel: footerLeft badge from record.lineage / record.continuations.',
      'Optional filter «только корневые» — defer if scope tight.',
    ],
    goal: ['В ленте видно, что запись — углубление или имеет детей, без tree collapse.'],
    checks: [
      'List order unchanged (recency desc)',
      'Badge visible for AN-50.1 when lineage seeded',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'migrate-analytics-lineage-seed-examples',
    title: 'Migrate AN-50 ↔ AN-50.1 lineage in analytics journal',
    department: 'system-runtime',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['extend-analytics-record-schema-lineage-v1'],
    basis: [
      'AN-50.1 уже ссылается на AN-50 в markdown; нужен canonical journal lineage block.',
    ],
    vector: [
      'Append journal entry or migration script setting lineage on analytics:work-graph-bvc-contract-verification.',
      'parentKey: AN-50, relation: deepens.',
      'Document in AN-51 closing as reference fixture.',
    ],
    goal: ['Reference pair AN-50/AN-50.1 machine-readable для тестов и demo.'],
    checks: [
      'Journal has lineage on AN-50.1 record',
      'Projection resolves parent/child',
    ],
    targetFiles: [
      'work/analytics-records.jsonl',
      'work/analytics/work-graph-bvc-contract-verification.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'implement-mcp-get-analytics-lineage',
    title: 'MCP: get_analytics_lineage(recordKey) — P2',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-analytics-lineage-projection'],
    basis: [
      'Агент должен запрашивать continuations без чтения всего journal.',
    ],
    vector: [
      'packages/workgraph-mcp: get_analytics_lineage(recordKey | recordId).',
      'Returns analytics-lineage.projection.v1 + related work items.',
      'tests/workgraph-mcp.test.mjs.',
    ],
    goal: ['Cursor получает lineage одним MCP-вызовом.'],
    checks: [
      'Tool registered and returns v1 schema',
      'README updated',
    ],
    targetFiles: [
      'packages/workgraph-mcp/src/index.mjs',
      'packages/workgraph-mcp/src/handlers.mjs',
      'tests/workgraph-mcp.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
  },
  {
    workId: 'write-closing-epic-analytics-record-lineage-v1',
    title: 'Closing: epic-analytics-record-lineage-v1 (AN-51)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'wire-analytics-drawer-lineage-sections',
      'wire-analytics-list-lineage-badges',
      'migrate-analytics-lineage-seed-examples',
    ],
    basis: [
      'Закрытие эпика: ADR, projection, UI, AN-50/50.1 fixture.',
    ],
    vector: [
      'work/analytics/closing-epic-analytics-record-lineage-v1.md',
      'Обновить work/analytics-records.jsonl closing record.',
    ],
    goal: ['AN-51 закрыт с проверяемыми артефактами.'],
    checks: [
      'Closing doc опубликован',
      'P0/P1 subtasks done',
    ],
    targetFiles: [
      'work/analytics/closing-epic-analytics-record-lineage-v1.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-51',
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
    schema: 'workgraph.seed-epic-analytics-record-lineage-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-51',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
