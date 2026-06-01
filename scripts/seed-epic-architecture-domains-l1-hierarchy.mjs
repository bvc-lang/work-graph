#!/usr/bin/env node
/**
 * Seed: AN-39 — Architecture domains L1 hierarchy (Домены › OneBase / Marketplace).
 * Default status: backlog.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/architecture-domains-l1-hierarchy.md';
const PLAN = 'docs/plan-architecture-domains-l1-hierarchy.md';
const EPIC_ID = 'epic-architecture-domains-l1-hierarchy';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Architecture domains L1: группа «Домены › OneBase / Marketplace»',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-architecture-main-bvc-canon'],
    basis: [
      'AN-39: intent tree multi-domain (onebase + marketplace), L1 — только domain-onebase.',
      'Marketplace tasks классифицируются в derived-projections, не в domain L1.',
      'UI «Домен OneBase» как peer создаёт ложное впечатление единственного прикладного домена.',
    ],
    vector: [
      'Track A: ADR + architecture/main.bvc (group domains, block domain-marketplace).',
      'Track B: classifyWorkItemBlock + snapshot schema group field.',
      'Track C: UI breadcrumb «Домены › …»; Track D: tests + AN-39 closing.',
    ],
    goal: [
      'Оператор и агент видят согласованную модель прикладных доменов на L1, intent и backlog.',
    ],
    checks: [
      'architecture/main.bvc: domain-onebase + domain-marketplace с architecture.group: domains',
      'classifyWorkItemBlock(marketplace) → domain-marketplace',
      'Architecture UI: группа Домены с двумя блоками',
      'architecture:l1-check green; AN-39 closing',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'architecture/main.bvc',
      'src/architectureSnapshot.mjs',
      'src/architectureL1Canon.mjs',
      'src/intentHierarchy.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'schemas/architecture-snapshot.v1.json',
      'protocols/architecture-graph-model-v1.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'decide-architecture-domains-l1-model',
    title: 'ADR: модель доменов L1 (вариант B+ — group + domain-* peers)',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-39 §3: варианты A (hub), B (peers + group), C (UI-only).',
      'Charter MVP OneBase не запрещает второй domain на architecture map.',
    ],
    vector: [
      'docs/adr-architecture-domains-l1-hierarchy.md: выбор B+, edges, migration notes.',
      'Cross-ref AN-35 governance при смене block count.',
    ],
    goal: ['Решение зафиксировано до правки architecture/main.bvc.'],
    checks: [
      'ADR опубликован',
      'Варианты A/C отклонены с rationale',
      'feeds_epics ссылается на epic-architecture-domains-l1-hierarchy',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-architecture-domains-l1-hierarchy.md',
      'protocols/architecture-graph-model-v1.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'update-architecture-main-bvc-domains-structure',
    title: 'architecture/main.bvc: group domains + block domain-marketplace + L2',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-architecture-domains-l1-model'],
    basis: [
      'Симметрия domain-onebase: intent roots, L2 container, maps_to work-graph.',
      'AN-39: marketplace-domain paths intent/domains/marketplace, domains/marketplace/.',
    ],
    vector: [
      'architecture.group: domains на domain-onebase и domain-marketplace.',
      'L2 marketplace-domain с BVC pipeline (analysis/decision/verdict).',
      'Edge domain-marketplace -> work-graph : maps_to.',
    ],
    goal: ['Canon отражает оба прикладных домена на L1.'],
    checks: [
      'domain-marketplace block в main.bvc',
      'architecture:l1-check green после правки',
      'L2 pipeline labels для marketplace-domain',
    ],
    targetFiles: [
      'architecture/main.bvc',
      'src/architectureL1Canon.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'extend-classify-work-item-block-domains',
    title: 'classifyWorkItemBlock: domain-marketplace + snapshot block assignment',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'update-architecture-main-bvc-domains-structure'],
    basis: [
      'Сейчас marketplace → derived-projections по эвристике department/title.',
    ],
    vector: [
      'src/architectureSnapshot.mjs: department domain-marketplace, path intent/domains/marketplace.',
      'Тесты на sample marketplace work items.',
    ],
    goal: ['Matrix и L1 counters включают marketplace tasks в domain-marketplace.'],
    checks: [
      'classifyWorkItemBlock(marketplace item) === domain-marketplace',
      'architectureSnapshot.test.mjs green',
    ],
    targetFiles: [
      'src/architectureSnapshot.mjs',
      'tests/architectureSnapshot.test.mjs',
      'intent/domains/marketplace/work',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'schema-architecture-block-group-field',
    title: 'Schema snapshot: optional group field on L1 blocks',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'update-architecture-main-bvc-domains-structure'],
    basis: [
      'UI и MCP должны читать group без парсинга raw BVC.',
    ],
    vector: [
      'schemas/architecture-snapshot.v1.json: blocks[].group',
      'architectureL1Canon loader → snapshot build.',
    ],
    goal: ['Snapshot экспортирует architecture.group для consumers.'],
    checks: [
      'schema validates blocks with group',
      'buildArchitectureSnapshot includes group on domain blocks',
    ],
    targetFiles: [
      'schemas/architecture-snapshot.v1.json',
      'src/architectureL1Canon.mjs',
      'src/architectureSnapshot.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'ui-architecture-domains-breadcrumb-group',
    title: 'UI Architecture list: секция «Домены › {block title}»',
    department: 'product-ux',
    ownerRole: 'ux_designer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'schema-architecture-block-group-field'],
    basis: [
      'AN-39: оператор ожидает иерархию «Домены › OneBase», не плоский «Домен OneBase» среди ядерных блоков.',
    ],
    vector: [
      'workGraphBacklogUiServer.mjs: group headers для blocks.group === domains.',
      'Non-domain blocks без изменения порядка peer-секции.',
    ],
    goal: ['Architecture list визуально отделяет прикладные домены от ядра.'],
    checks: [
      'UI smoke: grouped domain section visible',
      'workGraphBacklogUiServer tests при наличии',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'align-intent-hierarchy-domain-labels',
    title: 'intentHierarchy: labels согласованы с architecture domain titles',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'update-architecture-main-bvc-domains-structure'],
    basis: [
      '«Домен OneBase» vs «Домены › OneBase» — единый словарь в intent tree и architecture UI.',
    ],
    vector: [
      'src/intentHierarchy.mjs: domain/onebase, domain/marketplace labels.',
      'Optional prefix «Домены ›» только в architecture view, не ломая intent sidebar.',
    ],
    goal: ['Нет противоречивых подписей между intent roadmap и architecture list.'],
    checks: [
      'intent tree label для marketplace согласован',
      'lint:intent-tree green',
    ],
    targetFiles: [
      'src/intentHierarchy.mjs',
      'tests/intentHierarchy.test.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'tests-architecture-domains-l1-hierarchy',
    title: 'Tests: domains L1 hierarchy (canon, classify, UI hooks)',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'extend-classify-work-item-block-domains',
      'ui-architecture-domains-breadcrumb-group',
    ],
    basis: [
      'Block count и digest меняются при добавлении domain-marketplace.',
    ],
    vector: [
      'architectureL1Canon + architectureSnapshot + pipeline tests.',
      'architecture:l1-check в CI path.',
    ],
    goal: ['Регрессии domain hierarchy ловятся автоматически.'],
    checks: [
      'npm test green',
      'npm run architecture:l1-check green',
    ],
    targetFiles: [
      'tests/architectureL1Canon.test.mjs',
      'tests/architectureSnapshot.test.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS,
      PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
  },
  {
    workId: 'write-an39-closing-architecture-domains-l1-hierarchy',
    title: 'AN-39 closing analysis: epic-architecture-domains-l1-hierarchy',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'tests-architecture-domains-l1-hierarchy',
    ],
    basis: [
      'Canon: closing analysis после done эпика по AN-39.',
    ],
    vector: [
      'work/analytics/closing-epic-architecture-domains-l1-hierarchy.md',
      'analytics-records.jsonl closing entry',
    ],
    goal: ['AN-39 закрыт с evidence grouped domains на L1.'],
    checks: [
      'closing doc published',
      'journal entry appended',
      'epic closed with evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-architecture-domains-l1-hierarchy.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-39',
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
    schema: 'workgraph.seed-epic-architecture-domains-l1-hierarchy.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-39',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
