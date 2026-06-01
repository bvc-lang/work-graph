#!/usr/bin/env node
/**
 * Seed WorkItems: AN-28 — read-only chat ↔ Work Graph scope (no TodoWrite sync).
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/chat-work-graph-todo-sync.md';
const PLAN = 'docs/plan-chat-work-scope-readonly.md';
const EPIC_ID = 'epic-chat-work-scope-readonly';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Chat work scope (read-only): информативность без TodoWrite sync',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-agent-workgraph-enforcement', 'ux-mission-control-p0'],
    basis: [
      'AN-28: оператор хочет видеть задачи в чате, но TodoWrite↔kanban sync создаёт dual backlog.',
      'Инцидент T1–T10: chat todo «завис» после summary, хотя эпик в WG уже done.',
      'AN-25 запретил TodoWrite для trackable work; нужен read-only мост для UX.',
    ],
    vector: [
      'MCP/API compact rollup эпика (work.id + status) для scope.',
      'Agent-behavior: блок «Scope» в ответе из snapshot, не TodoWrite.',
      'P2: UI panel poll snapshot по activeWorkId / epicId.',
      'Без двусторонней записи статуса через chat todo.',
    ],
    goal: [
      'Оператор видит прогресс subtasks в контексте сессии из Work Graph, без ложных pending после reload.',
    ],
    checks: [
      'MCP get_epic_scope / resource возвращает children с work.status',
      'agent-behavior step chat-work-scope-readonly в bundle',
      'canon §Chat read-only scope в decision-pipeline-canon.md',
      'AN-29 closing analysis опубликован',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'packages/workgraph-mcp/src/handlers.mjs',
      'rules/agent-behavior/chat-work-scope-readonly.bvc',
      'docs/decision-pipeline-canon.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-28',
  },
  {
    workId: 'mcp-epic-rollup-scope-resource',
    title: 'MCP: epic scope rollup (read-only JSON для chat/UI)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-28 R3/V6: нужен compact JSON { epicId, children: [{ id, status, title }] }.',
      'intentRoadmapEpicProjection уже считает rollup — переиспользовать, не дублировать модель.',
    ],
    vector: [
      'Tool get_epic_work_scope или resource workgraph://epic/{id}/scope.',
      'Фильтр: только прямые children эпика; статусы из snapshot.',
      'Unit-тесты на фикстуре epic + subtasks.',
    ],
    goal: [
      'Агент и UI получают один API для read-only scope списка без TodoWrite.',
    ],
    checks: [
      'tests/mcp-epic-scope.test.mjs green',
      'MCP prompts ссылаются на get_epic_work_scope при execute эпика',
    ],
    targetFiles: [
      'packages/workgraph-mcp/src/handlers.mjs',
      'packages/workgraph-mcp/src/index.mjs',
      'src/intentRoadmapEpicProjection.mjs',
      'tests/mcp-epic-scope.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-28',
  },
  {
    workId: 'agent-behavior-chat-scope-block',
    title: 'agent-behavior: chat-work-scope-readonly step (Scope block)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'mcp-epic-rollup-scope-resource'],
    basis: [
      'AN-28 R2/V3: при execute эпика — markdown Scope с work.id из MCP, не TodoWrite T1/Tn.',
      'Дополняет cursor-ide-workgraph-parity без нарушения single-backlog rule.',
    ],
    vector: [
      'rules/agent-behavior/chat-work-scope-readonly.bvc — prompt_rule в bundle.',
      'Шаблон: ## Scope (read-only) + чеклист [x]/[ ]/[~] по work.status.',
      'Запрет TodoWrite для списка subtasks эпика (>3 пунктов с work.id).',
    ],
    goal: [
      'Cursor-агент показывает scope из WG в тексте ответа; оператор видит реальные work.id.',
    ],
    checks: [
      'rules/agent-behavior/chat-work-scope-readonly.bvc существует',
      'npm run audit:agent-behavior-rules green',
    ],
    targetFiles: [
      'rules/agent-behavior/chat-work-scope-readonly.bvc',
      'src/agentBehaviorRulesBundle.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-28',
  },
  {
    workId: 'document-chat-scope-readonly-canon',
    title: 'canon: Chat read-only scope (без TodoWrite sync)',
    department: 'agent-platform',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'agent-behavior-chat-scope-block'],
    basis: [
      'AN-28 §5–6: принцип «чат read, kanban write» не зафиксирован в canon отдельным §.',
      'decision-pipeline-canon уже имеет Agent intake vs execute — расширить.',
    ],
    vector: [
      'docs/decision-pipeline-canon.md §Chat read-only scope.',
      'protocols/decision-pipeline-canon-v1.bvc — блок chat-scope-readonly.',
      'Таблица: поверхность → read/write; TodoWrite только micro-steps.',
    ],
    goal: [
      'Канон явно запрещает TodoWrite sync и описывает допустимые read-only проекции.',
    ],
    checks: [
      'docs/decision-pipeline-canon.md содержит §Chat read-only scope',
      'protocol обновлён',
    ],
    targetFiles: [
      'docs/decision-pipeline-canon.md',
      'protocols/decision-pipeline-canon-v1.bvc',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-28',
  },
  {
    workId: 'ui-agent-scope-panel-poll',
    title: 'UI: session scope panel (poll epic scope, P2)',
    department: 'ui-dashboard',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'mcp-epic-rollup-scope-resource', 'ux-mission-control-p0'],
    basis: [
      'AN-28 R4/V4: живой список subtasks рядом с Agent Run dock, не в TodoWrite.',
      'Home/dock уже shipped (AN-20 P0); расширить dock или sidebar scope.',
    ],
    vector: [
      'GET /api/epic-scope?epicId=… или reuse snapshot slice.',
      'Poll 15–30s; клик → task drawer по work.id.',
      'data-testid=agent-scope-panel; e2e smoke optional.',
    ],
    goal: [
      'Оператор видит live rollup эпика без переключения на Доска и без chat todo.',
    ],
    checks: [
      'API epic-scope 200 + schema test',
      'Agent dock или sidebar показывает scope list',
      'Статус done на доске отражается после poll',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/missionControlClient.mjs',
      'src/homeSnapshotApi.mjs',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-28',
  },
  {
    workId: 'write-an29-closing-chat-work-scope-readonly',
    title: 'AN-29 closing analysis: epic-chat-work-scope-readonly',
    department: 'agent-platform',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'mcp-epic-rollup-scope-resource',
      'agent-behavior-chat-scope-block',
      'document-chat-scope-readonly-canon',
      'ui-agent-scope-panel-poll',
    ],
    basis: [
      'Closing loop AN-22: эпик closed → closing-AN с feeds_epics.',
      'AN-23/AN-26 — образцы post-mortem.',
    ],
    vector: [
      'work/analytics/closing-epic-chat-work-scope-readonly.md + journal AN-29.',
      'Outcomes: воспроизведён ли инцидент chat todo после scope panel.',
    ],
    goal: [
      'Эпик закрыт с outcomes; уроки для agent-UX интеграций.',
    ],
    checks: [
      'analytics-records.jsonl содержит AN-29',
      'epic-chat-work-scope-readonly closed с evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-chat-work-scope-readonly.md',
      'work/analytics-records.jsonl',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-28',
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
    schema: 'workgraph.seed-epic-chat-work-scope-readonly.v1',
    created,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
