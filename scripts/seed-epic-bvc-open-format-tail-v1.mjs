#!/usr/bin/env node
/**
 * Seed: AN-37 — BVC open format tail (post-canon hardening).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/bvc-open-format-tail-v1.md';
const PLAN = 'docs/plan-bvc-open-format-tail-v1.md';
const EPIC_ID = 'epic-bvc-open-format-tail-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'BVC open format tail v1: deprecation, tests, npm sync, ioHasC bridge plan',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [
      'epic-architecture-main-bvc-canon',
      'epic-architecture-views-v1',
      'epic-gripe-ds-visual-default-wave3',
    ],
    basis: [
      'AN-37: после trilogy AN-33/34/36 остались хвосты plan-step-to-bvc фазы 2–3.',
      'WG repo на .bvc; ioHasC ../project — отдельный трек.',
      'npm readme/CDN отстают от GitHub (@bvc-lang/cli 0.1.6).',
    ],
    vector: [
      'Track A: parser deprecation warning для legacy .step read.',
      'Track B: deterministic test regressions post embedded UI fix.',
      'Track C: npm/github publishables sync.',
      'Track D: plan-iohasc-project-bvc-bridge + lint:backlog green.',
    ],
    goal: [
      'Открытый BVC контур стабилен: CI green, npm/docs актуальны, ioHasC bridge спланирован.',
    ],
    checks: [
      'Deprecation warning в bvcFileFormat',
      'npm test deterministic green',
      '@bvc-lang/spec/cli версии согласованы',
      'plan-iohasc-project-bvc-bridge.md',
      'AN-37 closing',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'src/bvcFileFormat.mjs',
      'docs/plan-step-to-bvc-migration.md',
      'packages/bvc-spec/',
      'packages/bvc-cli/',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-37',
  },
  {
    workId: 'parser-legacy-step-read-deprecation-warning',
    title: 'Parser: console warning on legacy .step read (not error until v2)',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'ready',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'plan-step-to-bvc-migration.md фаза 3: deprecation notice.',
      'Dual-read остаётся; только warn для оператора/CI.',
    ],
    vector: [
      'resolveBvcReadablePath / readBvcTextFile emit once-per-path warning.',
      'Test in bvcDualExtension or bvcFileFormat tests.',
    ],
    goal: ['Чтение .step возможно, но явно помечено legacy.'],
    checks: [
      'Warning text mentions .bvc canon',
      'npm test green',
      'plan-step фаза 3 checkbox',
    ],
    targetFiles: [
      'src/bvcFileFormat.mjs',
      'packages/bvc-cli/lib/bvcFileFormat.mjs',
      'tests/bvcDualExtension.test.mjs',
      PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-37',
  },
  {
    workId: 'fix-deterministic-test-regressions-post-canon',
    title: 'Fix deterministic test regressions after canon trilogy',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'parser-legacy-step-read-deprecation-warning'],
    basis: [
      'После embedded UI fix и bulk migration — хвост падающих tests (MCP stdio, analytics).',
    ],
    vector: [
      'Прогон npm run test:deterministic; triage failures.',
      'Минимальные фиксы без scope creep.',
    ],
    goal: ['ci:mandatory test:deterministic green.'],
    checks: ['npm run test:deterministic exit 0'],
    targetFiles: [
      'tests/',
      'src/workGraphBacklogUiServer.mjs',
      PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-37',
  },
  {
    workId: 'sync-bvc-lang-npm-github-publishables',
    title: 'Sync @bvc-lang/spec and cli npm/GitHub publishables',
    department: 'system-runtime',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'npm CDN отстаёт; GitHub PUBLISH.md stub добавлен.',
      'Spec readme Governance без ISO STEP mention.',
    ],
    vector: [
      'Bump @bvc-lang/spec 0.0.3 if needed; verify cli 0.1.6 readme on npm.',
      'export + push GitHub mirrors.',
    ],
    goal: ['npmjs.com readme = GitHub для spec/cli.'],
    checks: [
      'npm view @bvc-lang/spec version',
      'npm view @bvc-lang/cli version',
      'no PUBLISH.md 404 on cli repo',
    ],
    targetFiles: [
      'packages/bvc-spec/',
      'packages/bvc-cli/',
      'dist/bvc-spec-github/',
      'dist/bvc-cli-github/',
      PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-37',
  },
  {
    workId: 'author-plan-iohasc-project-bvc-bridge',
    title: 'Author plan: ioHasC project (.step) → .bvc bridge',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'WG migrated; ../project (ioHasC) still .step — global replace preserves ../project paths.',
    ],
    vector: [
      'docs/plan-iohasc-project-bvc-bridge.md: scope, phases, rollback.',
      'Link from plan-step-to-bvc-migration.md external repos section.',
    ],
    goal: ['Ясный отдельный трек для ioHasC без смешения с WG done.'],
    checks: [
      'plan file in docs/',
      'charter cross-ref if needed',
    ],
    targetFiles: [
      'docs/plan-iohasc-project-bvc-bridge.md',
      'docs/plan-step-to-bvc-migration.md',
      PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-37',
  },
  {
    workId: 'lint-backlog-after-epic-trilogy-close',
    title: 'lint:backlog green after epic trilogy close',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'fix-deterministic-test-regressions-post-canon',
    ],
    basis: [
      'После массового close 30 work items — schema lint и intent tree alignment.',
    ],
    vector: [
      'npm run lint:backlog && npm run lint:intent-tree',
      'npm run intent:migrate if needed',
    ],
    goal: ['Backlog schema без drift после close trilogy.'],
    checks: ['lint:backlog exit 0'],
    targetFiles: [
      'intent/',
      'work/backlog.bvc',
      'scripts/lint-backlog.mjs',
      PLAN,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-37',
  },
  {
    workId: 'write-an37-closing-bvc-open-format-tail-v1',
    title: 'AN-37 closing analysis: epic-bvc-open-format-tail-v1',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'lint-backlog-after-epic-trilogy-close',
    ],
    basis: ['Closing после done эпика AN-37.'],
    vector: [
      'work/analytics/closing-epic-bvc-open-format-tail-v1.md',
      'analytics-records.jsonl entry',
    ],
    goal: ['AN-37 закрыт с evidence.'],
    checks: ['closing doc published'],
    targetFiles: [
      'work/analytics/closing-epic-bvc-open-format-tail-v1.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-37',
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
    schema: 'workgraph.seed-epic-bvc-open-format-tail-v1.v1',
    epicId: EPIC_ID,
    created,
    totalTasks: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
