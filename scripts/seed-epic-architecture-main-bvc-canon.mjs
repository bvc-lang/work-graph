#!/usr/bin/env node
/**
 * Seed: AN-36 — Architecture main.bvc L1 canon hub (charter → canon → snapshot).
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/architecture-main-bvc-canon-hub.md';
const PLAN = 'docs/plan-architecture-main-bvc-canon.md';
const EPIC_ID = 'epic-architecture-main-bvc-canon';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Architecture main.bvc: L1 canon hub (charter → snapshot → UI BVC)',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-architecture-views-v1'],
    basis: [
      'AN-36: устав ≠ architecture map; нужен связующий BVC-файл architecture/main.bvc.',
      'AN-35: L1 governance — SSoT, digest, drift-check; сейчас канон в JS без BVC в drawer.',
      'Протокол architecture-graph-model-v1: L1 derived from charter + intent, но не материализован как hub.',
    ],
    vector: [
      'Track A: architecture/main.bvc v1 (7 blocks + edges + passport).',
      'Track B: loader + migrate architectureSnapshot.mjs + schema l1Canon/BVC fields.',
      'Track C: UI drawer BVC + canon badge; Track D: l1-check CLI + AN-36 closing.',
    ],
    goal: [
      'Оператор и агент видят трассируемую L1-карту: charter → architecture/main.bvc → snapshot → UI.',
    ],
    checks: [
      'architecture/main.bvc в репо с per-block BVC',
      'snapshot строится из canon, не inline JS array',
      'drawer L1 показывает Базис/Вектор/Цель',
      'bulk .bvc → .bvc migration phased (plan phase 3)',
      'architecture:l1-check green; AN-36 closing',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'architecture/main.bvc',
      'src/architectureL1Canon.mjs',
      'src/architectureSnapshot.mjs',
      'charter/main.bvc',
      'docs/plan-step-to-bvc-migration.md',
      'scripts/migrate-step-to-bvc.mjs',
      'protocols/architecture-graph-model-v1.bvc',
      'schemas/architecture-snapshot.v1.json',
      'src/workGraphBacklogUiServer.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'author-architecture-main-bvc-v1',
    title: 'Author architecture/main.bvc v1 (L1 blocks BVC + edges + passport)',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'Перенос 7 блоков из ARCHITECTURE_L1_BLOCKS + edges из протокола.',
      'Per-block Базис/Вектор/Цель — не только summary.',
    ],
    vector: [
      'architecture/main.bvc: root passport + 7 block atoms + edges atom.',
      'canon.id architecture-l1-blocks-v1; charter.ref + protocol.ref в метках.',
    ],
    goal: ['SSoT L1 существует как читаемый BVC-файл в Git.'],
    checks: [
      'architecture/main.bvc парсится без ошибок',
      '7 block ids совпадают с текущим runtime',
      'edges покрывают ARCHITECTURE_L1_EDGES',
    ],
    targetFiles: [
      'architecture/main.bvc',
      'src/architectureSnapshot.mjs',
      'protocols/architecture-graph-model-v1.bvc',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'charter-architecture-ref-derived-projections',
    title: 'Charter: architecture.ref + derived-projections footnote in §Слои_Ядра',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'author-architecture-main-bvc-v1'],
    basis: [
      'AN-35/AN-36: 6 слоёв charter vs 7 L1 blocks — нужна явная связь.',
    ],
    vector: [
      'charter/main.bvc: architecture.ref → architecture/main.bvc.',
      'Строка про Derived Projections как производный L1 слой.',
    ],
    goal: ['Устав явно указывает на architecture canon, без слияния артефактов.'],
    checks: [
      'charter содержит architecture.ref',
      'derived-projections упомянут в §Слои_Ядра или cross-ref',
    ],
    targetFiles: [
      'charter/main.bvc',
      'architecture/main.bvc',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'implement-architecture-l1-canon-loader',
    title: 'Implement loadArchitectureL1Canon() from architecture/main.bvc',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'author-architecture-main-bvc-v1'],
    basis: [
      'Runtime должен читать canon, не дублировать массив в JS.',
    ],
    vector: [
      'src/architectureL1Canon.mjs: parse BVC blocks, edges, digest.',
      'Export typed canon model for buildArchitectureSnapshot.',
    ],
    goal: ['Единая точка загрузки L1 для snapshot builder и CLI.'],
    checks: [
      'loader returns blocks + edges + canon metadata',
      'unit tests on fixture architecture/main.bvc',
    ],
    targetFiles: [
      'src/architectureL1Canon.mjs',
      'architecture/main.bvc',
      'tests/architectureL1Canon.test.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'migrate-architecture-snapshot-from-canon',
    title: 'Migrate architectureSnapshot.mjs to load L1 from canon file',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-architecture-l1-canon-loader'],
    basis: [
      'ARCHITECTURE_L1_BLOCKS / EDGES inline — drift risk (AN-35).',
    ],
    vector: [
      'buildArchitectureSnapshot imports canon loader.',
      'Remove duplicate ARCHITECTURE_L1_* exports or re-export from loader for tests.',
      'Snapshot includes l1Canon: { id, version, digest, sourcePath }.',
    ],
    goal: ['architecture.snapshot.v1 отражает canon file, не hardcoded JS.'],
    checks: [
      'architectureSnapshot.test.mjs green after migration',
      'MCP get_architecture_snapshot returns l1Canon',
    ],
    targetFiles: [
      'src/architectureSnapshot.mjs',
      'src/architectureL1Canon.mjs',
      'schemas/architecture-snapshot.v1.json',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'schema-architecture-snapshot-l1-bvc-fields',
    title: 'Schema: block basis/vector/goal + l1Canon in architecture.snapshot.v1',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'migrate-architecture-snapshot-from-canon'],
    basis: [
      'Drawer и MCP нужны structured BVC fields, не только summary string.',
    ],
    vector: [
      'schemas/architecture-snapshot.v1.json: l1Canon object + optional block BVC strings.',
      'Validate in architectureSnapshot.test.mjs subset schema check.',
    ],
    goal: ['Контракт snapshot документирует canon provenance и BVC.'],
    checks: [
      'schema validates fixture snapshot with l1Canon + block BVC',
      'breaking change documented in plan',
    ],
    targetFiles: [
      'schemas/architecture-snapshot.v1.json',
      'tests/architectureSnapshot.test.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'ui-architecture-block-drawer-bvc',
    title: 'UI: L1 block drawer shows BVC (Базис / Вектор / Цель) + canon source link',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'migrate-architecture-snapshot-from-canon'],
    basis: [
      'Сейчас buildBlockDetailSections показывает только summary (AN-36 user feedback).',
    ],
    vector: [
      'buildBlockDetailSections: renderDetailText for basis/vector/goal.',
      'Link «Источник: architecture/main.bvc» + canon id in drawer meta.',
      'Keep L2 graph + accordions as-is.',
    ],
    goal: ['Паритет drawer L1 с work item BVC presentation.'],
    checks: [
      'openBlockDetails renders BVC when present on block',
      'workGraphBacklogUiServer.test.mjs asserts BVC hooks',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/architectureSnapshot.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'ui-architecture-l1-canon-badge',
    title: 'UI: Architecture list header canon version/digest badge',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'ui-architecture-block-drawer-bvc'],
    basis: [
      'AN-35: operator visibility of canon freshness.',
    ],
    vector: [
      'Badge in architecture list panel header from snapshot.l1Canon.',
      'Tooltip: source path + digest short.',
    ],
    goal: ['Оператор видит версию L1 канона без открытия файла.'],
    checks: [
      'badge renders when l1Canon present',
      'hidden/degraded when snapshot loading',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'cli-architecture-l1-check',
    title: 'CLI: npm run architecture:l1-check (canon parse + charter mapping + golden mermaid)',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'migrate-architecture-snapshot-from-canon'],
    basis: [
      'AN-35 Phase A: CI gate for L1 drift.',
    ],
    vector: [
      'scripts/architecture-l1-check.mjs',
      'npm script architecture:l1-check',
      'Optional golden mermaid from canon-only export.',
    ],
    goal: ['PR с изменением L1 без canon diff ловится в CI.'],
    checks: [
      'l1-check exits 0 on main branch fixture',
      'documented in plan + AGENTS if needed',
    ],
    targetFiles: [
      'scripts/architecture-l1-check.mjs',
      'package.json',
      'docs/plan-architecture-main-bvc-canon.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'migrate-repo-step-files-to-bvc-bulk',
    title: 'Bulk migration: все legacy .bvc → .bvc (charter, protocols, rules, work)',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'author-architecture-main-bvc-v1',
      'implement-parser-dual-extension-step-bvc',
    ],
    basis: [
      'docs/plan-step-to-bvc-migration.md фаза 3: bulk rename после dual-read и new-write MVP.',
      'AN-36: architecture/main.bvc — первый новый canon; остальные protocols/charter/rules ещё .bvc.',
      'Публичный canon = BVC + .bvc (charter canon.public_format); .bvc — legacy read-only.',
    ],
    vector: [
      'Инвентарь всех *.bvc в repo (charter/, protocols/, rules/, intent legacy, plans/).',
      'npm run migrate:step-to-bvc -- --dry-run, затем phased PR: protocols → charter → rules → residual work.bvc.',
      'Обновить ссылки: intent/index.bvc, target_files, MCP prompts, тесты, CI bvc lint.',
      'Deprecation warning в parser для .bvc (не error до v2).',
    ],
    goal: [
      'Work Graph repo: новые и канонические артефакты на .bvc; .bvc только где явно legacy до v2.',
    ],
    checks: [
      'migrate:step-to-bvc dry-run без неожиданных путей',
      'charter + protocols + architecture canon на .bvc',
      'npm test + bvc lint green после phased apply',
      'plan-step-to-bvc-migration.md фаза 3 отмечена',
    ],
    targetFiles: [
      'docs/plan-step-to-bvc-migration.md',
      'scripts/migrate-step-to-bvc.mjs',
      'charter/main.bvc',
      'protocols/',
      'rules/',
      'architecture/main.bvc',
      'intent/index.bvc',
      'package.json',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
  },
  {
    workId: 'tests-architecture-main-bvc-canon',
    title: 'Tests: architecture main.bvc canon loader + snapshot BVC + UI hooks',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'ui-architecture-block-drawer-bvc',
      'cli-architecture-l1-check',
    ],
    basis: [
      'Regression guard for AN-36 epic delivery.',
    ],
    vector: [
      'tests/architectureL1Canon.test.mjs',
      'extend architectureSnapshot + workGraphBacklogUiServer tests',
    ],
    goal: ['CI ловит откат к inline JS L1 или missing BVC in drawer.'],
    checks: [
      'npm test green',
      'l1-check in test or ci script',
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
    analyticsKey: 'AN-36',
  },
  {
    workId: 'write-an36-closing-architecture-main-bvc-canon',
    title: 'AN-36 closing analysis: epic-architecture-main-bvc-canon',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'tests-architecture-main-bvc-canon',
    ],
    basis: [
      'Canon: closing analysis после done эпика по AN-36.',
    ],
    vector: [
      'work/analytics/closing-epic-architecture-main-bvc-canon.md',
      'analytics-records.jsonl closing entry',
    ],
    goal: ['AN-36 закрыт с evidence architecture/main.bvc hub live.'],
    checks: [
      'closing doc published',
      'journal entry appended',
      'epic closed with evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-architecture-main-bvc-canon.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-36',
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
    schema: 'workgraph.seed-epic-architecture-main-bvc-canon.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-36',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
