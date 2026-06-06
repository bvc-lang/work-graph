#!/usr/bin/env node
/**
 * Seed: canon-aware work item → L1 block classifier (AN-81).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const EPIC_ID = 'epic-canon-aware-work-item-block-classifier-v1';
const ANALYTICS_KEY = 'AN-81';
const INTAKE_REF = 'work/analytics/canon-aware-work-item-block-classifier.md';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Canon-aware classifier v1: задачи на L1 любого проекта из architecture/main.bvc',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['extract-work-item-block-classifier'],
    basis: [
      'classifyWorkItemBlock() возвращает id starter-kit WG (domains, derived-projections), не блоки канона проекта.',
      'AN-80: в Gripe у всех 7 L1 taskIds пустые — рассинхрон классификатора и architecture/main.bvc.',
      'npm-first WG требует классификации без правки движка под каждый репозиторий.',
    ],
    vector: [
      'P0: classifyWorkItemForCanon(item, canon) — block_id override → path match → starter legacy → unclassified.',
      'P0: индекс intent_roots + architecture.container.*.paths per L1 block.',
      'P0: buildArchitectureSnapshot использует канон-резолвер, не хардкод id.',
      'P1: dynamic badges из canon.blocks; doctor/lint unclassified (v1).',
    ],
    goal: [
      'Вкладка «Архитектура» показывает taskIds для Gripe, WG-engine и starter без ручного патча classifyWorkItemBlock.',
    ],
    checks: [
      'tests/architectureSnapshot.test.mjs — Gripe-like fixture: catalog-pipeline получает facet tasks',
      'WG-engine tests: starter legacy не ломается',
      'architecture.snapshot.v1 содержит unclassified или пустой bucket для meta-задач вне L1',
      'npm run test:deterministic green',
    ],
    analysis: [
      'Зачем: перенести источник block id с хардкода на loadArchitectureL1Canon().',
      'Контекст: AN-80, AN-78; epic-architecture-main-bvc-canon закрыт — loader готов.',
    ],
    decision: [
      'Вердикт: полезно',
      'MVP: path index + explicit architecture.block_id + architecture.starter fallback.',
    ],
    targetFiles: [
      'src/workItemBlockClassifier.mjs',
      'src/architectureSnapshot.mjs',
      'src/ui/workItemClassifierBadge.mjs',
      'src/architectureL1Canon.mjs',
      'tests/architectureSnapshot.test.mjs',
      'tests/workItemClassifierBadge.test.mjs',
      'work/analytics/canon-aware-work-item-block-classifier.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: 'analytics:canon-aware-work-item-block-classifier',
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'build-canon-block-path-index',
    title: 'Runtime: индекс путей L1 из intent_roots и container.paths',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['Нет структуры longest-prefix match по путям канона.'],
    vector: [
      'buildCanonBlockPathIndex(canon) → Map<blockId, normalized path prefixes>.',
      'Нормализация: repo-relative, forward slashes, без ведущего ./',
    ],
    goal: ['Детерминированный индекс для classifyWorkItemForCanon.'],
    checks: ['unit test: Gripe fixture index содержит config/catalog-facets.php → catalog-pipeline'],
    targetFiles: ['src/workItemBlockClassifier.mjs', 'tests/architectureSnapshot.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: INTAKE_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-classify-work-item-for-canon',
    title: 'Runtime: classifyWorkItemForCanon — override, paths, starter, unclassified',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['build-canon-block-path-index'],
    basis: ['classifyWorkItemBlock не принимает canon и не читает architecture.block_id для snapshot.'],
    vector: [
      'Приоритет: architecture.block_id → target_files match → work atom path → starter legacy → unclassified.',
      'Возвращать { blockId, source, confidence? } для snapshot и badges.',
    ],
    goal: ['Один резолвер для architecture tab, operator shell, semantic search.'],
    checks: ['tests: explicit override; path match; starter fallback; unclassified'],
    targetFiles: ['src/workItemBlockClassifier.mjs', 'src/operatorShellProjection.mjs', 'src/semanticSearchWorkflow.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: INTAKE_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'wire-snapshot-canon-aware-classifier',
    title: 'Runtime: buildArchitectureSnapshot — canon classifier + unclassified',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-classify-work-item-for-canon'],
    basis: ['tasksByBlock вызывает classifyWorkItemBlock(item) без canon.'],
    vector: [
      'Передать canon в classifyWorkItemForCanon в цикле snapshot.',
      'Не пушить в block.taskIds если blockId unclassified или не в l1Blocks.',
      'counts.unclassified в architecture.snapshot.v1 (если schema bump нужен — минимально).',
    ],
    goal: ['Gripe UI architecture tab показывает задачи на L1 блоках.'],
    checks: ['integration test Gripe fixture: taskIds не пустые на catalog-pipeline'],
    targetFiles: ['src/architectureSnapshot.mjs', 'tests/architectureSnapshot.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: INTAKE_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'dynamic-classifier-badges-from-l1-canon',
    title: 'UI: бейджи классификатора из L1 канона, не ARCHITECTURE_BLOCK_BADGES',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-classify-work-item-for-canon'],
    basis: ['ARCHITECTURE_BLOCK_BADGES знает только starter id; Gripe block_id не отображается.'],
    vector: [
      'resolveWorkItemClassifierBadge принимает canon или block title lookup.',
      'Tone: по kind блока или default accent; label = architecture.title short.',
    ],
    goal: ['Kanban lozenge показывает catalog-pipeline / presentation для Gripe.'],
    checks: ['tests/workItemClassifierBadge.test.mjs с canon fixture'],
    targetFiles: ['src/ui/workItemClassifierBadge.mjs', 'tests/workItemClassifierBadge.test.mjs', 'src/workGraphBacklogUiServer.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: INTAKE_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'preserve-starter-kit-legacy-classifier',
    title: 'Runtime: legacy classifyWorkItemBlock при architecture.starter: true',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-classify-work-item-for-canon'],
    basis: ['Пустой/starter проект после init должен сохранить demo-классификацию.'],
    vector: [
      'Если canon.labels architecture.starter === true → fallback на текущий classifyWorkItemBlock.',
      'Документировать в packages/work-graph-cli/templates/starter README snippet.',
    ],
    goal: ['Обратная совместимость npm init и WG-engine repo tests.'],
    checks: ['tests/architectureSnapshot.test.mjs starter template unchanged behavior'],
    targetFiles: [
      'src/workItemBlockClassifier.mjs',
      'packages/work-graph-cli/templates/starter/architecture/main.bvc',
      'tests/architectureSnapshot.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: INTAKE_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'tests-canon-aware-classifier-fixtures',
    title: 'Tests: fixtures WG-engine + Gripe-like canon, deterministic classifier',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['wire-snapshot-canon-aware-classifier', 'preserve-starter-kit-legacy-classifier'],
    basis: ['Нет regression fixture для per-project L1 ids.'],
    vector: [
      'tests/fixtures/architecture-gripe-like/main.bvc — урезанный 3-block canon.',
      'Work items: facet import → catalog-pipeline; ui-kit → presentation.',
      'Snapshot golden: taskIds per block.',
    ],
    goal: ['CI ловит рассинхрон классификатора и канона (AN-80 class regressions).'],
    checks: ['npm run test:deterministic green'],
    targetFiles: [
      'tests/architectureSnapshot.test.mjs',
      'tests/fixtures/architecture-gripe-like/main.bvc',
      'tests/workItemClassifierBadge.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: INTAKE_REF,
    analyticsKey: ANALYTICS_KEY,
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const known = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (known.has(task.workId)) {
      console.log(`skip ${task.workId} (exists)`);
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
    schema: 'workgraph.seed-epic-canon-aware-work-item-block-classifier-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: ANALYTICS_KEY,
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
