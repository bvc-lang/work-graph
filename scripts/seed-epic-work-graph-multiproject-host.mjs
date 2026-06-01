#!/usr/bin/env node
/**
 * Seed: AN-40 — несколько проектов в одной консоли Work Graph (гибрид).
 * Default status: backlog.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/work-graph-project-deployment-model.md';
const PLAN = 'docs/plan-work-graph-multiproject-host.md';
const EPIC_ID = 'epic-work-graph-multiproject-host';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Несколько проектов в одной консоли Work Graph (AN-40)',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [],
    basis: [
      'Сейчас Work Graph живёт «один репозиторий — один инстанс»: свой канон, свой UI на порту 4177.',
      'Для нескольких похожих проектов это означает N копий движка и N вкладок в браузере.',
      'Разбор AN-40 рекомендует гибрид: канон в git каждого проекта, консоль WG подключает корни и переключается.',
    ],
    vector: [
      'Зафиксировать модель в ADR (вариант C — гибрид).',
      'Сделать реестр подключённых корней проектов.',
      'Научить backlog UI и снимок архитектуры читать выбранный корень.',
      'CLI для init / register / ui.',
      'Переключатель проекта в шапке UI.',
      'Runbook, тесты, закрытие разбора AN-40.',
    ],
    goal: [
      'Один процесс Work Graph, несколько проектов: переключение без второго сервера на 4177.',
    ],
    checks: [
      'В реестре два корня; переключение в UI без перезапуска сервера',
      'WG_PROJECT_ROOT или repoRoot меняет данные в backlog UI',
      'CLI init создаёт .work-graph/config.json и каркас intent/',
      'npm test зелёный; разбор AN-40 закрыт итоговой записью',
    ],
    analysis: [
      'Зачем:',
      'Масштабирование на семейство похожих репозиториев без размножения инсталляций.',
      'Границы:',
      'Pilot — локальные корни; удалённые репозитории — позже.',
    ],
    decision: [
      'Вердикт:',
      'полезно',
      'Исполнять по плану docs/plan-work-graph-multiproject-host.md после ADR.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'src/workspaceRegistry.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'src/architectureSnapshot.mjs',
      'packages/work-graph-cli/',
      'docs/runbook-deploy-work-graph-on-project.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'decide-work-graph-multiproject-deployment-model',
    title: 'ADR: гибридная модель развёртывания Work Graph',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'В AN-40 три модели: встроенный WG, отдельный хост, гибрид (канон в проекте, консоль снаружи).',
      'AN-8 — канон рядом с кодом; AN-20 — пересмотреть «один WG на репо».',
      'Решение нужно до кода реестра и переключателя.',
    ],
    vector: [
      'docs/adr-work-graph-multiproject-host.md: вариант C, почему A/B не подходят, схема реестра.',
    ],
    goal: ['Модель развёртывания зафиксирована до начала реализации.'],
    checks: [
      'ADR опубликован в docs/',
      'Варианты A и B отклонены с обоснованием',
      'ADR ссылается на эпик epic-work-graph-multiproject-host',
    ],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-work-graph-multiproject-host.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'implement-workspace-registry-multiproject',
    title: 'Реестр подключённых проектов (~/.work-graph/workspaces.json)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-work-graph-multiproject-deployment-model'],
    basis: [
      'Консоли нужен список подключённых проектов: id, путь, когда открывали.',
      'AN-40: ~/.work-graph/workspaces.json; на pilot — только локальные корни.',
    ],
    vector: [
      'src/workspaceRegistry.mjs: read/write/list/register/resolve.',
      'Схема workspaces.v1 + tests/workspaceRegistry.test.mjs.',
    ],
    goal: ['UI и CLI знают подключённые корни и получают абсолютный путь по id.'],
    checks: [
      'register добавляет корень без дублей',
      'resolve возвращает абсолютный путь',
      'tests/workspaceRegistry.test.mjs проходит',
    ],
    targetFiles: ['src/workspaceRegistry.mjs', 'tests/workspaceRegistry.test.mjs', PLAN],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'implement-backlog-ui-reporoot-multiproject',
    title: 'Backlog UI: работа с выбранным корнем проекта',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-workspace-registry-multiproject'],
    basis: [
      'Backlog UI молча берёт cwd — при multiproject нужен явный выбранный корень.',
      'Второй инстанс на 4177 даёт EADDRINUSE — один сервер, смена корня без restart.',
    ],
    vector: [
      'repoRoot из WG_PROJECT_ROOT, query или активной записи реестра.',
      'Порт и host — из конфига или env.',
    ],
    goal: ['Один UI-сервер отдаёт backlog и snapshot для выбранного проекта.'],
    checks: [
      'Snapshot API меняется при смене repoRoot без restart',
      'tests/workGraphBacklogUiServer.test.mjs зелёные',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'implement-architecture-snapshot-reporoot-aware',
    title: 'Снимок архитектуры по выбранному корню проекта',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-backlog-ui-reporoot-multiproject'],
    basis: [
      'architectureSnapshot завязан на cwd; loadArchitectureL1Canon уже принимает repoRoot.',
    ],
    vector: ['repoRoot параметр сквозь buildArchitectureSnapshot / buildSnapshot.'],
    goal: ['Карта архитектуры соответствует активному проекту, а не cwd процесса.'],
    checks: [
      'architecture:l1-check с --cwd на чужой корень',
      'tests/architectureSnapshot.test.mjs покрывают foreign repoRoot',
    ],
    targetFiles: ['src/architectureSnapshot.mjs', 'tests/architectureSnapshot.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'implement-work-graph-cli-multiproject',
    title: 'CLI Work Graph: init, register, ui',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-workspace-registry-multiproject'],
    basis: [
      'Подключение нового репо — пара команд, не ручное копирование intent/ и конфигов.',
    ],
    vector: [
      'packages/work-graph-cli: init, register, ui.',
    ],
    goal: ['Новый проект: init + register без чтения внутренней документации WG.'],
    checks: [
      'init создаёт intent/, charter/, architecture/main.bvc, .work-graph/config.json',
      'register добавляет cwd в workspaces.json',
      'npm test в packages/work-graph-cli проходит',
    ],
    targetFiles: ['packages/work-graph-cli/', 'src/workspaceRegistry.mjs', PLAN],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'implement-ui-project-switcher-multiproject',
    title: 'Переключатель проектов в UI',
    department: 'ui-dashboard',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-backlog-ui-reporoot-multiproject',
      'implement-workspace-registry-multiproject',
    ],
    basis: [
      'Главный UX multiproject: видеть текущий проект и менять без перезапуска.',
      'Сохранённые представления (AN-20) — отдельный localStorage на проект.',
    ],
    vector: [
      'Шапка sidebar: имя проекта, добавить/зарегистрировать.',
      'POST /api/workspace/switch; опционально Cmd+K project:.',
    ],
    goal: ['Переключение между проектами из UI за пару кликов.'],
    checks: [
      'Тест: switch меняет snapshot',
      'UI показывает имя активного корня',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'docs-runbook-deploy-work-graph-on-project',
    title: 'Инструкция: подключить Work Graph к новому проекту',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-work-graph-cli-multiproject'],
    basis: [
      'CLI бесполезен, если порядок действий знает только автор репозитория.',
    ],
    vector: ['docs/runbook-deploy-work-graph-on-project.md + ссылка из README.'],
    goal: ['Оператор подключает второй репо по инструкции без созвона с автором.'],
    checks: ['Runbook опубликован', 'README ссылается на runbook'],
    targetFiles: ['docs/runbook-deploy-work-graph-on-project.md', 'README.md', PLAN],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'tests-work-graph-multiproject-host',
    title: 'Тесты: несколько проектов в одной консоли',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-ui-project-switcher-multiproject',
      'implement-architecture-snapshot-reporoot-aware',
    ],
    basis: ['AN-40: два корня, switch без перезапуска — критерий готовности эпика.'],
    vector: ['Тесты: реестр, repoRoot snapshot, switch handler.'],
    goal: ['Регрессии multiproject ловятся в npm test.'],
    checks: ['npm test зелёный', 'Покрыты register, switch, foreign repoRoot'],
    targetFiles: [
      'tests/workspaceRegistry.test.mjs',
      'tests/architectureSnapshot.test.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
  },
  {
    workId: 'write-an40-closing-work-graph-multiproject-host',
    title: 'Закрыть разбор AN-40 после эпика multiproject host',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'tests-work-graph-multiproject-host'],
    basis: [
      'Эпик завершён — осталось оформить итог, иначе AN-40 в UI висит незакрытым.',
    ],
    vector: [
      'Итоговый md: work/analytics/closing-epic-work-graph-multiproject-host.md',
      'Запись в work/analytics-records.jsonl через seed:analytics-record',
    ],
    goal: ['Разбор AN-40 закрыт: видно, что рекомендация реализована и чем подтверждена.'],
    checks: [
      'Итоговый md опубликован',
      'Строка в analytics-records.jsonl',
      'Перечислены ADR, реестр, CLI, переключатель, runbook',
    ],
    analysis: [
      'Зачем:',
      'Точка для оператора: «AN-40 отработан, вот доказательства».',
      'Когда:',
      'После done у эпика и зелёных тестов.',
    ],
    decision: [
      'Вердикт:',
      'полезно',
      'Последняя задача эпика.',
    ],
    targetFiles: [
      'work/analytics/closing-epic-work-graph-multiproject-host.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-40',
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
    schema: 'workgraph.seed-epic-work-graph-multiproject-host.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-40',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
