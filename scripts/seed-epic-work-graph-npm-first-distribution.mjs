#!/usr/bin/env node
/**
 * Seed: AN-43 — npm-first distribution (user-first install).
 * Default status: backlog.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/work-graph-npm-first-distribution.md';
const PLAN = 'docs/plan-work-graph-npm-first-distribution.md';
const EPIC_ID = 'epic-work-graph-npm-first-distribution';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Work Graph npm-first: user-first install через npm (AN-43)',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [],
    basis: [
      'Per-project install (AN-40) убрал multiproject host, но оставил dev-first: clone WG + engineRoot в config.',
      'Обычный пользователь ожидает npm-модель: версия в package.json, CI из коробки, без ручных путей.',
      'Dev-first (WORKGRAPH_ENGINE_ROOT) остаётся для контрибьютеров WG — одна кодовая база, два способа установки.',
    ],
    vector: [
      'ADR npm-first: user-first default, dev-first override, legacy engineRoot deprecated.',
      'Резолвер движка: ENV → legacy config → node_modules.',
      'Опубликовать @work-graph/cli и @work-graph/mcp; init без user-facing engineRoot.',
      'README, runbook, skill install-work-graph — только npx work-graph init.',
      'Тесты и closing doc.',
    ],
    goal: [
      'Любой проект поднимает Work Graph через npm install без clone внешнего движка; contributors сохраняют WORKGRAPH_ENGINE_ROOT.',
    ],
    checks: [
      'ADR и plan приняты',
      '@work-graph/cli и @work-graph/mcp на npm',
      'init создаёт devDependencies и config без engineRoot',
      'Документация и skill не продают ручной clone',
      'Тесты npm-first path зелёные',
    ],
    analysis: [
      'Зачем:',
      'engineRoot как основной UX — временный костыль разработки WG, не продуктовая модель.',
      'Границы:',
      'Полный split @work-graph/runtime / ui-server — phase 2; MVP может bundle в cli.',
      'Зависимости:',
      'AN-40 (per-project), AN-42 (open publication / npm publish).',
    ],
    decision: [
      'Вердикт:',
      'полезно',
      'Исполнять по docs/plan-work-graph-npm-first-distribution.md.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-work-graph-npm-first-distribution.md',
      'packages/work-graph-cli/',
      'packages/workgraph-mcp/',
      'skills/install-work-graph/SKILL.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'decide-work-graph-npm-first-distribution-adr',
    title: 'ADR: npm-first distribution — user-first vs dev-first',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'Без ADR команда продолжит документировать engineRoot для всех.',
      'Нужно зафиксировать приоритет резолвера и целевые npm-пакеты.',
    ],
    vector: [
      'docs/adr-work-graph-npm-first-distribution.md',
      'Таблица user-first / dev-first / legacy.',
    ],
    goal: ['Стратегия npm-first зафиксирована до рефакторинга init и publish.'],
    checks: [
      'ADR в docs/',
      'Ссылается на AN-40, AN-43, epic',
    ],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-work-graph-npm-first-distribution.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'implement-engine-root-resolver-npm-first',
    title: 'Резолвер движка: WORKGRAPH_ENGINE_ROOT → legacy → node_modules',
    department: 'engineering',
    ownerRole: 'backend_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-work-graph-npm-first-distribution-adr'],
    basis: [
      'Сейчас engineRoot в config — единственный путь для большинства сценариев.',
      'Нужен единый getEngineRoot() с приоритетом ENV, legacy warning, npm default.',
    ],
    vector: [
      'src/workGraphEngineRoot.mjs (или аналог): resolveEngineRoot().',
      'Deprecated warning при legacy config.engineRoot.',
      'require.resolve / createRequire для @work-graph/runtime из node_modules.',
    ],
    goal: ['CLI, MCP и UI server используют один резолвер.'],
    checks: [
      'ENV override работает для contributors',
      'Legacy config → warning + работает',
      'Без config и ENV — резолв из node_modules',
    ],
    targetFiles: [
      'src/workGraphProjectInit.mjs',
      'packages/work-graph-cli/',
      'packages/workgraph-mcp/',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'refactor-init-npm-devdependencies',
    title: 'init: devDependencies @work-graph/*, config v2 без engineRoot',
    department: 'engineering',
    ownerRole: 'backend_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-engine-root-resolver-npm-first'],
    basis: [
      'workGraphProjectInit сейчас пишет engineRoot — это dev-first UX.',
      'User-first init должен добавить @work-graph/cli и @work-graph/mcp в package.json.',
    ],
    vector: [
      'init . → npm install -D @work-graph/cli @work-graph/mcp (или merge в существующий package.json).',
      '.work-graph/config.json schema v2 без engineRoot.',
      '.cursor/mcp.json с npx -y @work-graph/mcp.',
      'npm scripts workgraph:ui, workgraph:doctor.',
    ],
    goal: ['npx work-graph init . — полный onboarding без clone WG.'],
    checks: [
      'Свежий проект после init имеет devDeps и scripts',
      'config.json не содержит engineRoot для новых install',
    ],
    targetFiles: [
      'src/workGraphProjectInit.mjs',
      'packages/work-graph-cli/',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'publish-work-graph-cli-npm',
    title: 'Опубликовать @work-graph/cli на npm (снять private)',
    department: 'engineering',
    ownerRole: 'release_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-work-graph-npm-first-distribution-adr'],
    basis: [
      'packages/work-graph-cli уже @work-graph/cli но private: true.',
      'User-first требует npx @work-graph/cli init из registry.',
    ],
    vector: [
      'Снять private, Apache-2.0, files/bin корректны.',
      'npm publish; GitHub release tag.',
      'check:npm-pack-boundary зелёный.',
    ],
    goal: ['@work-graph/cli доступен через npx без clone репо.'],
    checks: [
      'npm view @work-graph/cli version',
      'npx @work-graph/cli --help работает',
    ],
    targetFiles: ['packages/work-graph-cli/package.json', 'PUBLIC_API.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'publish-work-graph-mcp-npm',
    title: 'Переименовать и опубликовать @work-graph/mcp (ex @iohasc/workgraph-mcp)',
    department: 'engineering',
    ownerRole: 'release_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-engine-root-resolver-npm-first'],
    basis: [
      'MCP сейчас @iohasc/workgraph-mcp — не совпадает с брендом Work Graph.',
      'User-first: MCP из node_modules, npx -y @work-graph/mcp.',
    ],
    vector: [
      'Rename package to @work-graph/mcp.',
      'MCP резолвит engine через resolveEngineRoot / cwd project.',
      'npm publish; обновить init template .cursor/mcp.json.',
    ],
    goal: ['Cursor MCP подключается через @work-graph/mcp без путей к clone.'],
    checks: [
      'npm view @work-graph/mcp',
      'MCP tools работают на проекте после npm install',
    ],
    targetFiles: ['packages/workgraph-mcp/package.json', 'packages/workgraph-mcp/src/'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'refactor-run-ui-mcp-from-node-modules',
    title: 'run-ui / run-mcp: запуск из node_modules пакетов',
    department: 'engineering',
    ownerRole: 'backend_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-engine-root-resolver-npm-first',
      'refactor-init-npm-devdependencies',
    ],
    basis: [
      'backlog:ui и MCP handlers сейчас assume monorepo cwd или engineRoot.',
      'После npm install движок и ui-server должны стартовать из установленных пакетов.',
    ],
    vector: [
      'work-graph ui → resolve runtime + ui-server paths from node_modules.',
      'Bundling MVP или отдельный @work-graph/runtime publish.',
      'doctor проверяет node_modules, не только config paths.',
    ],
    goal: ['npm run workgraph:ui поднимает backlog UI без внешнего clone.'],
    checks: [
      'Проект с только devDeps WG поднимает UI на 4177',
      'doctor pass на npm-first install',
    ],
    targetFiles: [
      'packages/work-graph-cli/',
      'src/workGraphBacklogUiServer.mjs',
      'src/workGraphProjectInit.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'update-docs-skill-npm-first',
    title: 'Документация и skill: npx work-graph init, engineRoot только в CONTRIBUTING',
    department: 'product-architecture',
    ownerRole: 'technical_writer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'refactor-init-npm-devdependencies'],
    basis: [
      'README и install-work-graph skill сейчас учат clone + engineRoot.',
      'User-first: первый абзац README = npx @work-graph/cli init .',
    ],
    vector: [
      'README.md, runbook, skills/install-work-graph/SKILL.md.',
      'CONTRIBUTING.md: WORKGRAPH_ENGINE_ROOT для contributors.',
      'Deprecate user-facing engineRoot в adr per-project install (ссылка на npm-first ADR).',
    ],
    goal: ['Новичок не видит ручной clone в основной документации.'],
    checks: [
      'README начинается с npm init path',
      'Skill: одна команда init, без engineRoot',
      'engineRoot только в CONTRIBUTING',
    ],
    targetFiles: [
      'README.md',
      'skills/install-work-graph/SKILL.md',
      'docs/runbook-work-graph-per-project.md',
      'CONTRIBUTING.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'tests-work-graph-npm-first-distribution',
    title: 'Тесты: npm-first init, resolveEngineRoot, smoke без clone',
    department: 'engineering',
    ownerRole: 'qa_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-engine-root-resolver-npm-first',
      'refactor-init-npm-devdependencies',
    ],
    basis: [
      'Без тестов npm path регрессирует к engineRoot UX.',
    ],
    vector: [
      'Unit: resolveEngineRoot priority (env, legacy, node_modules).',
      'Integration: init fixture → config v2, package.json devDeps.',
      'Optional: smoke с npm pack / verdaccio.',
    ],
    goal: ['CI ловит поломку user-first install.'],
    checks: [
      'npm run test:deterministic включает npm-first cases',
      'Legacy engineRoot path всё ещё покрыт',
    ],
    targetFiles: ['tests/', 'scripts/seed-epic-work-graph-npm-first-distribution.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'implement-optional-global-engine-npm-first',
    title: 'Optional: --use-global-engine / npm install -g @work-graph/engine',
    department: 'engineering',
    ownerRole: 'backend_engineer',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'refactor-run-ui-mcp-from-node-modules'],
    basis: [
      'Power users могут хотеть один global engine на машину — не блокер MVP.',
      'ADR допускает phase 2: work-graph init --use-global-engine.',
    ],
    vector: [
      'Флаг init --use-global-engine → config.useGlobalEngine.',
      'Резолвер: global install path после ENV, до node_modules.',
      'Документировать как optional в runbook.',
    ],
    goal: ['Global engine доступен opt-in, не default.'],
    checks: [
      'Без флага — node_modules default',
      'С флагом и global install — ui стартует',
    ],
    targetFiles: ['packages/work-graph-cli/', 'src/workGraphProjectInit.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
  },
  {
    workId: 'write-closing-work-graph-npm-first-distribution',
    title: 'Closing: epic-work-graph-npm-first-distribution (AN-43)',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'publish-work-graph-cli-npm',
      'publish-work-graph-mcp-npm',
      'update-docs-skill-npm-first',
      'tests-work-graph-npm-first-distribution',
    ],
    basis: [
      'Закрытие эпика с evidence: npm versions, test output, doc links.',
    ],
    vector: [
      'work/analytics/closing-epic-work-graph-npm-first-distribution.md',
      'Обновить work/analytics-records.jsonl.',
      'Пометить subtasks done в intent tree.',
    ],
    goal: ['AN-43 закрыт с проверяемыми артефактами.'],
    checks: [
      'Closing doc опубликован',
      'Эпик и подзадачи в done/backlog согласно факту',
    ],
    targetFiles: [
      'work/analytics/closing-epic-work-graph-npm-first-distribution.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-43',
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
    schema: 'workgraph.seed-epic-work-graph-npm-first-distribution.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-43',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
