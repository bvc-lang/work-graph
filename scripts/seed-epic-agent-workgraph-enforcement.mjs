#!/usr/bin/env node
/**
 * Seed WorkItems: AN-25 — agent Work Graph enforcement (single backlog, no chat todo bypass).
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/agent-bypass-work-graph-dual-backlog.md';
const PLAN = 'docs/plan-agent-workgraph-enforcement.md';
const EPIC_ID = 'epic-agent-workgraph-enforcement';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Agent Work Graph enforcement: единый бэклог, без обхода через chat todo',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-decision-pipeline-canonization'],
    basis: [
      'AN-25: LLM обходит Work Graph через TodoWrite в чате, seed→doing и код без claim/evidence.',
      'Канон AN-22/MCP описан, но IDE-агент Cursor не имеет жёсткого enforcement.',
      'Инцидент ux-mission-control-p0 (2026-05-31): dual backlog chat todo + work.bvc + код без evidence.',
    ],
    vector: [
      'Cursor rule alwaysApply: single backlog — trackable work только через work.id.',
      'Agent-behavior step: parity IDE ↔ MCP (claim перед кодом, evidence при закрытии).',
      'Seed scripts: default status backlog, не doing.',
      'Lint plan↔work mirror; canon intake-only vs execute.',
    ],
    goal: [
      'Cursor-агент не ведёт параллельный todo в чате; исполнение только через claimed work items с evidence.',
    ],
    checks: [
      '.cursor/rules/agent-workgraph-single-backlog.mdc exists alwaysApply',
      'rules/agent-behavior/cursor-ide-workgraph-parity.bvc в bundle',
      'seed-*.mjs default status backlog',
      'lint plan-work alignment green',
      'AN-26 closing analysis опубликован',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      '.cursor/rules/agent-workgraph-single-backlog.mdc',
      'rules/agent-behavior/cursor-ide-workgraph-parity.bvc',
      'docs/decision-pipeline-canon.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-25',
  },
  {
    workId: 'add-cursor-rule-single-backlog',
    title: 'Cursor rule: agent-workgraph-single-backlog (alwaysApply)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-25 R1: TodoWrite для trackable work создаёт shadow backlog вне доски.',
      'Существующие .cursor/rules не запрещают chat todo для проектных задач.',
    ],
    vector: [
      '.cursor/rules/agent-workgraph-single-backlog.mdc — alwaysApply: true.',
      'Запрет TodoWrite для work дольше одного round; исключение — micro-steps внутри claimed work.id.',
      'docs/plan-*.md todo только с явной ссылкой work.id в строке.',
    ],
    goal: [
      'Cursor IDE agent получает жёсткое правило: один бэклог = intent/**/work/*.work.bvc.',
    ],
    checks: [
      'файл .cursor/rules/agent-workgraph-single-backlog.mdc с alwaysApply',
      'npm run audit:agent-behavior-rules или ручная проверка в Cursor',
    ],
    targetFiles: ['.cursor/rules/agent-workgraph-single-backlog.mdc', ANALYTICS],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-25',
  },
  {
    workId: 'add-cursor-ide-workgraph-parity-step',
    title: 'agent-behavior step: cursor-ide-workgraph-parity',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'add-cursor-rule-single-backlog'],
    basis: [
      'mcp-editing-policy.bvc покрывает MCP; IDE-агент пишет src/ и seed без claim.',
      'AN-25 R2: parity — код только под claimed work.id, evidence при закрытии.',
    ],
    vector: [
      'rules/agent-behavior/cursor-ide-workgraph-parity.bvc — prompt_rule в bundle.',
      'Перед правкой src/: read atom / get_work_item; после: evidence + status update.',
      'Ссылка на protocols/decision-pipeline-canon-v1.bvc и operational bypass.',
    ],
    goal: [
      'Системный промпт/bundle агента содержит parity IDE↔MCP для backlog и исполнения.',
    ],
    checks: [
      'rules/agent-behavior/cursor-ide-workgraph-parity.bvc существует',
      'npm run audit:agent-behavior-rules green',
    ],
    targetFiles: [
      'rules/agent-behavior/cursor-ide-workgraph-parity.bvc',
      'rules/agent-behavior/mcp-editing-policy.bvc',
      'src/agentBehaviorRulesBundle.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-25',
  },
  {
    workId: 'fix-seed-default-status-backlog',
    title: 'seed scripts: default work.status backlog (не doing)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'Seed-скрипты ставят status: doing при создании — обход ready→claim (AN-25 §2.3).',
      'ux-mission-control-p0 и bvc-tooling-external seed — примеры anti-pattern.',
    ],
    vector: [
      'Обновить scripts/seed-*.mjs: default status backlog.',
      'Опциональный флаг --activate-ready только после operator review (document in script header).',
      'Этот seed (seed-epic-agent-workgraph-enforcement) — этalon с backlog.',
    ],
    goal: [
      'Новые work items из seed не попадают на доску как doing без явного review.',
    ],
    checks: [
      'grep seed scripts: нет status: doing без комментария opt-in',
      'npm run seed:epic-agent-workgraph-enforcement создаёт backlog items',
    ],
    targetFiles: [
      'scripts/seed-epic-agent-workgraph-enforcement.mjs',
      'scripts/seed-ux-mission-control-p0.mjs',
      'scripts/seed-bvc-tooling-external.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-25',
  },
  {
    workId: 'lint-plan-work-id-mirror',
    title: 'lint: plan.md todo ↔ work.id mirror',
    department: 'agent-platform',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'add-cursor-rule-single-backlog'],
    basis: [
      'docs/plan-*.md с чеклистами становятся вторым бэклогом без work.id (AN-25 §2.4).',
      'plan-history-in-md требует md-планы, но не связывает todo с work items.',
    ],
    vector: [
      'scripts/lint-plan-work-alignment.mjs — warning если - [ ] в plan без work.id.',
      'warning если work.status doing но pipeline_stage < ready.',
      'Подключить в npm run lint:backlog или ci:mandatory (warning only).',
    ],
    goal: [
      'Планы и бэклог не расходятся silently; drift виден в lint.',
    ],
    checks: [
      'tests/lint-plan-work-alignment.test.mjs green',
      'npm run lint:plan-work-alignment без errors на текущих plan-*.md',
    ],
    targetFiles: [
      'scripts/lint-plan-work-alignment.mjs',
      'tests/lint-plan-work-alignment.test.mjs',
      'package.json',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-25',
  },
  {
    workId: 'document-agent-intake-vs-execute-policy',
    title: 'canon: intake-only vs execute (когда seed эпик, когда только AN)',
    department: 'agent-platform',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'add-cursor-ide-workgraph-parity-step'],
    basis: [
      'AN-25 R5: «что дальше?» → только analytics; seed эпик — после «создавай и делай».',
      'Сейчас агент преждевременно создаёт seed эпиков на аналитический вопрос.',
    ],
    vector: [
      'Дополнить docs/decision-pipeline-canon.md §Agent intake vs execute.',
      'protocols/decision-pipeline-canon-v1.bvc — блок agent-intake-policy.',
      'Таблица: вопрос / команда пользователя → допустимый артеfact (AN only | epic seed | code).',
    ],
    goal: [
      'Оператор и агент знают, когда писать только AN-XX, а когда создавать work items.',
    ],
    checks: [
      'docs/decision-pipeline-canon.md содержит §Agent intake vs execute',
      'protocol обновлён или добавлен agent-intake-policy block',
    ],
    targetFiles: [
      'docs/decision-pipeline-canon.md',
      'protocols/decision-pipeline-canon-v1.bvc',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-25',
  },
  {
    workId: 'write-an26-closing-agent-workgraph-enforcement',
    title: 'AN-26 closing analysis: epic-agent-workgraph-enforcement',
    department: 'agent-platform',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'add-cursor-rule-single-backlog',
      'add-cursor-ide-workgraph-parity-step',
      'fix-seed-default-status-backlog',
      'lint-plan-work-id-mirror',
      'document-agent-intake-vs-execute-policy',
    ],
    basis: [
      'Правило epic closed_without_closing_analysis: closing AN после done эпика.',
      'AN-23 — образец closing для pipeline canonization.',
    ],
    vector: [
      'work/analytics/closing-epic-agent-workgraph-enforcement.md + journal AN-26.',
      'Метрики: воспроизведён ли инцидент dual backlog после rule; seed defaults.',
    ],
    goal: [
      'Эпик закрыт с зафиксированными outcomes и уроками для следующих agent-policy задач.',
    ],
    checks: [
      'analytics-records.jsonl содержит AN-26',
      'epic-agent-workgraph-enforcement closed с verified evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-agent-workgraph-enforcement.md',
      'work/analytics-records.jsonl',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-25',
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
    schema: 'workgraph.seed-epic-agent-workgraph-enforcement.v1',
    created,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
