#!/usr/bin/env node
/**
 * Seed WorkItems: BVC external tooling (@bvc-lang/cli npm + GitHub + MCP prompts).
 * Default status: backlog (не doing). Перевод в ready/doing — после operator review / claim.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const MIGRATION_PLAN = 'docs/plan-step-to-bvc-migration.md';
const EPIC_ID = 'bvc-tooling-external';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'BVC external tooling: @bvc-lang/cli npm + GitHub + MCP prompts',
    department: 'product',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['bvc-phase2-new-write'],
    basis: [
      'Фаза 2 MVP закрыта: format CLI и new-write *.work.bvc в Work Graph.',
      `План ${MIGRATION_PLAN} §1–2: publish @bvc-lang/cli, MCP prompt examples, GitHub bvc-lang/cli.`,
      'Внешние потребители (Cursor, CI) должны ставить CLI без monorepo checkout.',
    ],
    vector: [
      'packages/bvc-cli → @bvc-lang/cli с lib/ sync и зависимостью @bvc-lang/spec.',
      'verify + export scripts; npm publish; repo github.com/bvc-lang/cli.',
      'workgraph-mcp prompts: явные правила .bvc для create_work_item.',
    ],
    goal: [
      '@bvc-lang/cli@0.1.0 на npm; публичный репозиторий cli; MCP prompts рекомендуют .bvc.',
    ],
    checks: [
      'npm run verify:bvc-cli-publish green',
      'npm view @bvc-lang/cli version',
      'github.com/bvc-lang/cli доступен',
      'create_work_item prompt упоминает *.work.bvc',
    ],
    targetFiles: [
      MIGRATION_PLAN,
      'packages/bvc-cli/package.json',
      'scripts/sync-bvc-cli-lib.mjs',
      'scripts/verify-bvc-cli-publish-ready.mjs',
      'scripts/export-bvc-cli-github.mjs',
      'packages/workgraph-mcp/src/prompts.mjs',
    ],
    intakeSourceKind: 'plan',
    intakeSourceRef: MIGRATION_PLAN,
    analyticsKey: 'AN-18',
  },
  {
    workId: 'publish-bvc-lang-cli-npm',
    title: 'опубликовать @bvc-lang/cli на npm',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'Phase 1 оставил CLI только в monorepo; spec уже @bvc-lang/spec@0.0.1.',
    ],
    vector: [
      'prepack sync-bvc-cli-lib; verify script; npm publish --access public.',
    ],
    goal: [
      'npm install -g @bvc-lang/cli даёт bvc lint и bvc format.',
    ],
    checks: [
      'npm view @bvc-lang/cli version',
      'npm pack --dry-run в packages/bvc-cli',
    ],
    targetFiles: ['packages/bvc-cli/package.json', 'scripts/verify-bvc-cli-publish-ready.mjs'],
    intakeSourceKind: 'plan',
    intakeSourceRef: MIGRATION_PLAN,
  },
  {
    workId: 'export-bvc-cli-github',
    title: 'экспорт и публикация github.com/bvc-lang/cli',
    department: 'architecture',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'publish-bvc-lang-cli-npm'],
    basis: [
      'Зеркало spec: dist export + push в org bvc-lang.',
    ],
    vector: [
      'scripts/export-bvc-cli-github.mjs → dist/bvc-cli-github.',
      'README root + LICENSE; repository url в package.json.',
    ],
    goal: [
      'Публичный репозиторий bvc-lang/cli с тегом v0.1.0.',
    ],
    checks: [
      'https://github.com/bvc-lang/cli',
      'package.json repository.url совпадает',
    ],
    targetFiles: ['scripts/export-bvc-cli-github.mjs', 'packages/bvc-cli/README.md'],
    intakeSourceKind: 'plan',
    intakeSourceRef: MIGRATION_PLAN,
  },
  {
    workId: 'extend-mcp-prompts-bvc-new-write',
    title: 'MCP prompts: рекомендация .bvc для новых atoms',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'create_work_item tool description обновлён; prompts TOOL_RULES ещё без явного .bvc канона.',
    ],
    vector: [
      'packages/workgraph-mcp/src/prompts.mjs — TOOL_RULES + create_work_item workflow.',
      'protocols/bvc-new-write-policy-v1.bvc cross-link в prompt text.',
    ],
    goal: [
      'Агенты через MCP prompts создают *.work.bvc, не *.work.bvc.',
    ],
    checks: [
      'TOOL_RULES содержит new-write .bvc',
      'create_work_item prompt шаг про .work.bvc',
    ],
    targetFiles: ['packages/workgraph-mcp/src/prompts.mjs', 'protocols/bvc-new-write-policy-v1.bvc'],
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

  console.log(JSON.stringify({ schema: 'workgraph.seed-bvc-tooling-external.v1', created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
