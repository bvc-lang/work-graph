#!/usr/bin/env node
/**
 * Seed WorkItems: AN-57 — agent session warm-up (few-shot + reproducible Cursor rules + primer).
 * Default status: backlog (canon AN-25 R3).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/agent-session-warmup-vs-enforcement.md';
const PLAN = 'docs/plan-agent-session-warmup-v1.md';
const EPIC_ID = 'epic-agent-session-warmup-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Прогрев сессии агента: few-shot WG, воспроизводимые Cursor rules, primer',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-agent-workgraph-enforcement'],
    basis: [
      'AN-57: declarative enforcement (AN-25/26) не останавливает drift — агент пишет по-английски, не меняет work.status, использует TodoWrite.',
      'Few-shot в ioHasC есть, но не про claim→evidence→русский BVC; WG worker auto-inject не доходит до Cursor IDE.',
      '.cursor/rules WG лежат локально и в .gitignore — на clone правил может не быть; workspace project не подхватывает WG rules.',
    ],
    vector: [
      'Воспроизводимый путь Cursor rules (commit docs/cursor-rules + sync или селективный un-ignore).',
      'Runbook session primer для оператора + ссылка в workgraph-mcp-clients.md.',
      '1–2 few-shot примера Work Graph в ioHasC fewShotLibrary (claim, status, evidence, русский prose).',
      'Опционально: user-rule шаблон; eval fixture Cursor MCP usefulness (P2).',
    ],
    goal: [
      'Cursor-агент в сессии WG воспроизводимо следует claim→code→evidence→done и пишет задачи по-русски — не только по soft .mdc без primer.',
    ],
    checks: [
      'docs/cursor-rules/*.mdc в git + npm run sync:cursor-rules (или эквivalent)',
      'docs/plan-agent-session-warmup-v1.md todo с work.id',
      'few-shot workgraph_execute (или hook) в project fewShotLibrary',
      'runbook session primer в docs/workgraph-mcp-clients.md',
      'AN-58 closing analysis опубликован',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/cursor-rules/',
      'scripts/sync-cursor-wg-rules.mjs',
      '../project/src/agent/fewShotLibrary.js',
      '../project/src/agent/fewShotStrategy.js',
      'docs/workgraph-mcp-clients.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-57',
  },
  {
    workId: 'sync-cursor-wg-rules-to-repo',
    title: 'Воспроизводимые Cursor rules WG (docs/cursor-rules + sync)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-57 D2: .cursor/ в .gitignore — seven .mdc (single-backlog, work-items-russian, claim-context) не переносятся на другую машину.',
      'mcp.json может содержать локальные пути — нельзя слепо коммитить весь .cursor/.',
    ],
    vector: [
      'Каталог docs/cursor-rules/ — канон alwaysApply .mdc (копия из .cursor/rules/).',
      'scripts/sync-cursor-wg-rules.mjs — копирует в .cursor/rules/ (npm run sync:cursor-rules).',
      'README в docs/cursor-rules: после clone выполнить sync; .cursor/mcp.json остаётся локальным.',
      'CI или lint: предупреждение если docs/cursor-rules и .cursor/rules расходятся (optional).',
    ],
    goal: [
      'Любой clone work graph получает те же WG Cursor rules одной командой без ручного копирования.',
    ],
    checks: [
      'docs/cursor-rules/agent-workgraph-single-backlog.mdc существует',
      'npm run sync:cursor-rules обновляет .cursor/rules/',
      'tests/sync-cursor-wg-rules.test.mjs green (dry-run diff)',
    ],
    targetFiles: [
      'docs/cursor-rules/',
      'scripts/sync-cursor-wg-rules.mjs',
      'package.json',
      '.gitignore',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-57',
  },
  {
    workId: 'document-session-primer-runbook',
    title: 'Runbook: session primer для оператора WG + MCP clients doc',
    department: 'agent-platform',
    ownerRole: 'product_owner',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'sync-cursor-wg-rules-to-repo'],
    basis: [
      'AN-57 D4: первое сообщение «делай эпики» без primer → модель уходит в TodoWrite и EN prose.',
      'docs/workgraph-mcp-clients.md описывает MCP, но не чеклист старта сессии.',
    ],
    vector: [
      'docs/workgraph-session-primer-runbook.md — чеклист: workspace root, MCP workgraph, sync rules, primer-текст.',
      'Шаблон первого сообщения: take_next_work_item / summarize_current_cycle + запрет TodoWrite для trackable work.',
      'Ссылка из docs/workgraph-mcp-clients.md и README (краткий блок «Старт сессии»).',
    ],
    goal: [
      'Оператор копирует primer или следует runbook — агент с первого хода в WG-контуре без dual backlog.',
    ],
    checks: [
      'docs/workgraph-session-primer-runbook.md существует',
      'docs/workgraph-mcp-clients.md содержит § Session primer со ссылкой',
    ],
    targetFiles: [
      'docs/workgraph-session-primer-runbook.md',
      'docs/workgraph-mcp-clients.md',
      'README.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-57',
  },
  {
    workId: 'add-workgraph-few-shot-examples',
    title: 'Few-shot примеры Work Graph в ioHasC (claim→evidence, русский)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-57 D3: ioHasC fewShotLibrary не содержит workgraph/claim/evidence — модель не видит эталонный trace.',
      'Enforcement .mdc soft; few-shot per-turn даёт конкретный успешный паттерн (adr-agent-few-shot-dynamics).',
    ],
    vector: [
      'Добавить FEW_SHOT_WORKGRAPH_CLAIM_EXECUTE и FEW_SHOT_WORKGRAPH_NO_TODOWRITE в ../project/src/agent/fewShotLibrary.js.',
      'fewShotStrategy: task type workgraph_execute при WG_PROJECT_ROOT / user preview «work graph» / MCP workgraph.',
      'Тесты: tests/agent-few-shot-selection.test.js — ids и порядок для workgraph_execute.',
      'Опционально: compile hook если agent embedded в WG UI (AN-47).',
    ],
    goal: [
      'System prompt ioHasC/Cursor с few-shot показывает правильный WG pipeline и русский prose в work item.',
    ],
    checks: [
      'fewShotLibrary содержит workgraph claim→evidence example',
      'selectFewShotExampleIds(workgraph_execute) возвращает WG ids первыми',
      'npm run test:agent-behavior или vitest few-shot green в project',
    ],
    targetFiles: [
      '../project/src/agent/fewShotLibrary.js',
      '../project/src/agent/fewShotStrategy.js',
      '../project/tests/agent-few-shot-selection.test.js',
      '../project/docs/adr-agent-few-shot-dynamics.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-57',
  },
  {
    workId: 'document-cursor-user-rule-wg-template',
    title: 'Шаблон Cursor user rule для WG при workspace = project',
    department: 'agent-platform',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'sync-cursor-wg-rules-to-repo'],
    basis: [
      'AN-57 D5: оператор часто открывает ioHasC project — WG .mdc не загружаются.',
      'User rule глобально дублирует 5 строк single-backlog + русский BVC как страховка.',
    ],
    vector: [
      'docs/cursor-user-rule-wg-backlog.template.md — текст для Cursor Settings → Rules.',
      'Ссылка из session primer runbook; не дублировать полный work-items-russian — только essentials.',
    ],
    goal: [
      'При multi-repo setup оператор может включить user rule и снизить drift без смены workspace root.',
    ],
    checks: [
      'docs/cursor-user-rule-wg-backlog.template.md существует',
      'session primer runbook ссылается на шаблон',
    ],
    targetFiles: [
      'docs/cursor-user-rule-wg-backlog.template.md',
      'docs/workgraph-session-primer-runbook.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-57',
  },
  {
    workId: 'eval-cursor-mcp-usefulness-fixture',
    title: 'Eval fixture: Cursor MCP usefulness (rules + primer path)',
    department: 'agent-platform',
    ownerRole: 'integration_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'add-workgraph-few-shot-examples', 'document-session-primer-runbook'],
    basis: [
      'AN-57 D7: worker usefulness замерен (workGraphLlmUsefulnessEval); Cursor IDE — только UAT.',
      'llm-pvrg audit P3: нет E2E «агент с rules+few-shot vs без».',
    ],
    vector: [
      'Расширить PROMPT_EVAL_WORKGRAPH_FIXTURES_V1 или отдельный catalog: cursor-mcp-primer-v1.',
      'Fixture: agent must call claim before write; must not invent work id; Russian create_work_item fields.',
      'npm run eval:mandatory-prompt или eval:llm-usefulness включает tier optional-llm fixture (document env).',
    ],
    goal: [
      'Регрессия «прогрев + rules» измерима одной командой; не замена live Cursor E2E, но baseline.',
    ],
    checks: [
      'src/workGraphToolSurfaceAudit.mjs содержит cursor-mcp-primer fixture',
      'scripts/run-mandatory-prompt-eval-fixtures.mjs не регрессит',
      'docs/plan-workgraph-llm-usefulness.md обновлён',
    ],
    targetFiles: [
      'src/workGraphToolSurfaceAudit.mjs',
      'src/workGraphLlmUsefulnessEval.mjs',
      'scripts/run-mandatory-prompt-eval-fixtures.mjs',
      'docs/plan-workgraph-llm-usefulness.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-57',
  },
  {
    workId: 'write-an58-closing-agent-session-warmup-v1',
    title: 'Закрыть разбор AN-58 после эпика agent-session-warmup-v1',
    department: 'agent-platform',
    ownerRole: 'product_owner',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'sync-cursor-wg-rules-to-repo',
      'document-session-primer-runbook',
      'add-workgraph-few-shot-examples',
      'document-cursor-user-rule-wg-template',
      'eval-cursor-mcp-usefulness-fixture',
    ],
    basis: [
      'Правило epic closed_without_closing_analysis: итоговый разбор после done эпика.',
      'AN-57 задаёт гипотезу «прогрев + rules»; closing фиксирует что сработало на инцидентах TodoWrite/EN.',
    ],
    vector: [
      'work/analytics/closing-epic-agent-session-warmup-v1.md + journal AN-58.',
      'Метрики: воспроизводимость rules на clone; наличие few-shot ids; primer в docs.',
    ],
    goal: [
      'Эпик закрыт с зафиксированными outcomes и уроками для embedded agent (AN-47).',
    ],
    checks: [
      'work/analytics-records.jsonl содержит AN-58',
      'epic-agent-session-warmup-v1 closed с verified evidence',
    ],
    targetFiles: [
      'work/analytics/closing-epic-agent-session-warmup-v1.md',
      'work/analytics-records.jsonl',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-57',
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
    schema: 'workgraph.seed-epic-agent-session-warmup-v1.v1',
    created,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
