#!/usr/bin/env node
/**
 * Seed: AN-34 — Architecture views v1 (list / tree / pipeline / full / export).
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/architecture-visualization-patterns-comparison.md';
const PLAN = 'docs/plan-architecture-views-v1.md';
const EPIC_ID = 'epic-architecture-views-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Architecture views v1: list + tree + pipeline graph + export',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['ux-mission-control-p0', 'implement-graph-canvas-svg-edges-v1'],
    basis: [
      'AN-34: list-first mission control + tree для composition + pipeline для lineage.',
      'AN-1: full diagram ломается без compact cards и layout hygiene.',
      'AN-20: graph не home; drawer для глубины.',
    ],
    vector: [
      'Track A: ADR profiles + architecture blocks list tab.',
      'Track B: workflow tree mode, pipeline default, matrix prototype.',
      'Track C: mermaid export CLI + tests + AN-34 closing.',
    ],
    goal: [
      'Оператор видит architecture и backlog в правильном view profile без canvas-only dead-end.',
    ],
    checks: [
      'ADR architecture-views-v1 опубликован',
      'Architecture tab: list-rows + Tree/Pipeline toggle',
      'workflow tree mode по work.parent_id',
      'AN-34 closing + epic done',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'src/workGraphBacklogUiServer.mjs',
      'src/architectureSnapshot.mjs',
      'docs/adr-architecture-views-v1.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'adr-architecture-views-v1-profiles',
    title: 'ADR: Architecture views v1 (List / Tree / Pipeline / Full / Export)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-34 §3–§6: профили view и anti-patterns (no Mermaid runtime canvas, no tree for depends_on).',
      'Согласовать с graph-canvas-layout-mess и parent-subtask-hierarchy.',
    ],
    vector: [
      'docs/adr-architecture-views-v1.md: matrix view × use case.',
      'When to use list vs tree vs pipeline vs full graph.',
      'Link из AN-34 и architecture tab help text.',
    ],
    goal: ['Единый канон view profiles для UI и агента.'],
    checks: [
      'adr-architecture-views-v1.md в docs/',
      'profiles: List, Tree, Pipeline, Full, Export',
      'anti-patterns явно перечислены',
    ],
    targetFiles: [
      'docs/adr-architecture-views-v1.md',
      ANALYTICS,
      'work/analytics/graph-canvas-layout-mess.md',
      'work/analytics/parent-subtask-hierarchy.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'architecture-blocks-list-view-tab',
    title: 'Architecture tab: blocks list (list-rows) alongside canvas',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'adr-architecture-views-v1-profiles'],
    basis: [
      'Сейчас Architecture = canvas-first; операции (filter, sort, jump) слабее списка.',
      'AN-34: list-rows primary для каталога blocks.',
    ],
    vector: [
      'renderArchitectureBlocksList из architectureSnapshot.',
      'View toggle list | graph; row click → drawer L2.',
      'Reuse wg-list-row / pagination patterns из workflow.',
    ],
    goal: ['Architecture blocks browsable as dense list without opening full graph.'],
    checks: [
      'Architecture tab показывает list mode',
      'click row открывает block detail drawer',
      'workGraphBacklogUiServer.test.mjs покрывает list mount',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/architectureSnapshot.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'workflow-tree-mode-parent-id',
    title: 'Workflow: tree mode по work.parent_id (epic / subtask hierarchy)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'adr-architecture-views-v1-profiles'],
    basis: [
      'parent_id runtime уже есть; UI — flat list/kanban only.',
      'AN-34 + parent-subtask-hierarchy: tree для смысловой иерархии, не для depends_on.',
    ],
    vector: [
      'View mode tree в workflow toolbar (list | kanban | tree).',
      'Build tree from work.parent_id + epic roots (item_kind=epic).',
      'Expand/collapse; select → detail drawer.',
    ],
    goal: ['Epic/subtask composition видна без manual grouping filters.'],
    checks: [
      'workflow tree mode рендерит nested epic → subtasks',
      'depends_on edges не смешиваются с parent tree',
      'tests на tree projection',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/workItemHierarchy.mjs',
      'work/analytics/parent-subtask-hierarchy.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'graph-pipeline-default-compact-nodes',
    title: 'Graph: pipeline default + compact canvas cards (AN-1 tail)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'adr-architecture-views-v1-profiles', 'architecture-blocks-list-view-tab'],
    basis: [
      'AN-1 layout mess: oversized nodes, overlapping edges.',
      'AN-34: pipeline graph default для lineage; full graph secondary.',
    ],
    vector: [
      'Default Architecture graph layout = pipeline (LR/TB profile).',
      'Compact node cards: title + status + 1-line summary.',
      'Dagre spacing tuning; fit-view on mode switch.',
    ],
    goal: ['Pipeline graph readable at first open without manual pan/zoom marathon.'],
    checks: [
      'Architecture opens in pipeline profile by default',
      'node card height bounded; no label overlap in fixture snapshot test',
      'link to graph-canvas-layout-mess remediation',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'work/analytics/graph-canvas-layout-mess.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'architecture-domain-layer-matrix-prototype',
    title: 'Matrix view prototype: domain × layer × status heat',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'architecture-blocks-list-view-tab'],
    basis: [
      'AN-34 §4: heat matrix для coverage gaps (domain × layer).',
      'Secondary view — не заменяет list/pipeline.',
    ],
    vector: [
      'Prototype tab or sub-mode under Architecture.',
      'Cells = count/status rollup from architectureSnapshot.',
      'Click cell → filtered list-rows.',
    ],
    goal: ['Быстро увидеть пробелы coverage по domain/layer без full graph.'],
    checks: [
      'matrix renders from snapshot fixture',
      'cell click filters list view',
      'marked prototype in UI (badge or label)',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/architectureSnapshot.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'architecture-snapshot-mermaid-export-cli',
    title: 'CLI: architecture-export --format mermaid from snapshot',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'adr-architecture-views-v1-profiles'],
    basis: [
      'AN-34: static Mermaid export для docs/PR — не runtime canvas.',
      'Reuse architectureSnapshot graph projection.',
    ],
    vector: [
      'npm run iohasc -- architecture-export --format mermaid --out path',
      'Or workgraph CLI equivalent if iohasc bridge deferred.',
      'Golden file test on fixture snapshot.',
    ],
    goal: ['Architecture diagram exportable for markdown docs without screenshot.'],
    checks: [
      'CLI emits valid mermaid flowchart/graph from fixture',
      'documented in plan + ADR Export profile',
      'test asserts stable output hash or snapshot',
    ],
    targetFiles: [
      'scripts/architecture-export.mjs',
      'src/architectureSnapshot.mjs',
      'docs/adr-architecture-views-v1.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'tests-architecture-views-v1',
    title: 'Tests: architecture views v1 (list, tree, pipeline layout gate)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'architecture-blocks-list-view-tab',
      'workflow-tree-mode-parent-id',
      'graph-pipeline-default-compact-nodes',
    ],
    basis: [
      'Regression guard для multi-view UX из AN-34.',
    ],
    vector: [
      'workGraphBacklogUiServer.test.mjs: list tab, tree mode, pipeline default.',
      'Optional layout bounds check from AN-1 recommendations.',
    ],
    goal: ['CI ловит откат к canvas-only или broken pipeline default.'],
    checks: [
      'tests/workGraphBacklogUiServer.test.mjs extended',
      'npm test green',
    ],
    targetFiles: [
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS,
      PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
  },
  {
    workId: 'write-an34-closing-architecture-views-v1',
    title: 'AN-34 closing analysis: epic-architecture-views-v1',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'tests-architecture-views-v1',
      'architecture-snapshot-mermaid-export-cli',
    ],
    basis: [
      'Canon: closing analysis после done эпика по AN-34.',
    ],
    vector: [
      'work/analytics/closing-epic-architecture-views-v1.md',
      'analytics-records.jsonl closing entry',
      'feeds_epics link back to epic',
    ],
    goal: ['AN-34 закрыт с evidence multi-view delivery.'],
    checks: [
      'closing doc published',
      'journal entry appended',
      'epic closed with evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-architecture-views-v1.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-34',
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
    schema: 'workgraph.seed-epic-architecture-views-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-34',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
