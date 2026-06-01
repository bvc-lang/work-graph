#!/usr/bin/env node
/**
 * Seed WorkItems: BVC phase 2 — new-write `.bvc` (plan-step-to-bvc-migration §2)
 * Idempotent: skips existing work.id.
 * Default status: backlog (не doing). Перевод в ready/doing — после operator review / claim.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const MIGRATION_PLAN = 'docs/plan-step-to-bvc-migration.md';
const ADR_NAMING = 'docs/adr-bvc-format-naming.md';
const EPIC_ID = 'bvc-phase2-new-write';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'BVC phase 2: new-write .bvc (format CLI + work item policy)',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['bvc-open-canon-naming'],
    basis: [
      'Фаза 0–1 закрыта: @bvc-lang/spec на npm, dual-read parser, bvc-lang/spec на GitHub.',
      `План ${MIGRATION_PLAN} §2 — переход от legacy read .bvc к canonical write .bvc.`,
      'Work Graph pilot: новые work items и protocols должны использовать .bvc без mass-rename.',
    ],
    vector: [
      'CLI bvc format — canonical writer с сохранением atom.lang.',
      'Новые WorkItem → intent/**/work/*.work.bvc; legacy .work.bvc readable.',
      'MCP create_work_item и protocol bvc-new-write-policy-v1.bvc.',
      'Тесты round-trip + intent-tree lint dual suffix.',
    ],
    goal: [
      'Фаза 2 MVP в Work Graph: format CLI работает; новые атомы пишутся в .bvc; MCP рекомендует канон.',
    ],
    checks: [
      'npm run bvc format на conformance fixture green',
      'create_work_item создаёт *.work.bvc',
      'lint:backlog без ошибок после seed',
      `${MIGRATION_PLAN} §2 отмечен done для MVP пунктов`,
    ],
    targetFiles: [
      MIGRATION_PLAN,
      ADR_NAMING,
      'src/bvcFormatCli.mjs',
      'src/bvcNewWritePolicy.mjs',
      'packages/bvc-cli/bin/bvc.mjs',
      'protocols/bvc-new-write-policy-v1.bvc',
    ],
    intakeSourceKind: 'plan',
    intakeSourceRef: MIGRATION_PLAN,
    analyticsKey: 'AN-18',
  },
  {
    workId: 'implement-bvc-format-cli',
    title: 'реализовать bvc format (canonical .bvc writer)',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'formatStepAtomDraft + parseBvcFileContent уже есть; нужен file-level writer и CLI wiring.',
    ],
    vector: [
      'src/bvcFormatCli.mjs + formatBvcFileContent в bvcFileFormat.mjs.',
      'packages/bvc-cli/bin/bvc.mjs command format; scripts/bvc-format.mjs.',
      'Round-trip tests на conformance fixtures.',
    ],
    goal: [
      'bvc format <path.bvc> пишет sibling .bvc с сохранением lang и file pragma.',
    ],
    checks: [
      'npm run bvc format tests/conformance/minimal.en.bvc --stdout',
      'node --test tests/bvcFormatCli.test.mjs',
    ],
    targetFiles: ['src/bvcFormatCli.mjs', 'src/bvcFileFormat.mjs', 'packages/bvc-cli/bin/bvc.mjs'],
    intakeSourceKind: 'plan',
    intakeSourceRef: MIGRATION_PLAN,
  },
  {
    workId: 'implement-new-write-work-item-bvc',
    title: 'new-write policy: WorkItem → *.work.bvc',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'intentPathForItem historically возвращал .work.bvc; фаза 2 меняет default для новых файлов.',
    ],
    vector: [
      'src/bvcNewWritePolicy.mjs — intentPathForNewWorkItem.',
      'intentTreeWorkItems + intentHierarchy + intentTreeLint dual suffix.',
    ],
    goal: [
      'appendWorkItemAtomToIntentTree и MCP create_work_item создают *.work.bvc.',
    ],
    checks: [
      'seed script создаёт .work.bvc файлы',
      'intent tree lint принимает .work.bvc и .work.bvc',
    ],
    targetFiles: ['src/bvcNewWritePolicy.mjs', 'src/intentTreeWorkItems.mjs', 'src/intentTreeLint.mjs'],
    intakeSourceKind: 'plan',
    intakeSourceRef: MIGRATION_PLAN,
  },
  {
    workId: 'document-bvc-new-write-mcp-policy',
    title: 'protocol + MCP hints для .bvc new-write',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-new-write-work-item-bvc'],
    basis: [
      'Агенты и MCP должны явно рекомендовать .bvc для новых protocol/work atoms.',
    ],
    vector: [
      'protocols/bvc-new-write-policy-v1.bvc — канон политики.',
      'packages/workgraph-mcp create_work_item description + default checks.',
    ],
    goal: [
      'MCP и protocol документируют: новые atoms → .bvc; .bvc только legacy read.',
    ],
    checks: [
      'protocols/bvc-new-write-policy-v1.bvc существует',
      'create_work_item tool description упоминает .work.bvc',
    ],
    targetFiles: ['protocols/bvc-new-write-policy-v1.bvc', 'packages/workgraph-mcp/src/index.mjs'],
    intakeSourceKind: 'plan',
    intakeSourceRef: MIGRATION_PLAN,
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

  console.log(JSON.stringify({ schema: 'workgraph.seed-bvc-phase2-new-write.v1', created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
