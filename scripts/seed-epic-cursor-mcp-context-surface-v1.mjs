#!/usr/bin/env node
/**
 * Seed: AN-38 — Cursor MCP context surface v1.
 *
 * Дыры из аудита: WG worker auto-инжектит Graph RAG + memory в system prompt,
 * но `packages/workgraph-mcp/` не отдаёт graph RAG / memory / evidence
 * сторонней LLM (Cursor). Эпик закрывает эти три tool surface + Cursor rule
 * + usefulness eval + решение по AN-9 RichIR runtime.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/llm-pvrg-richir-memory-slices-usage-audit.md';
const EPIC_ID = 'epic-cursor-mcp-context-surface-v1';
const MCP_INDEX = 'packages/workgraph-mcp/src/index.mjs';
const MCP_HANDLERS = 'packages/workgraph-mcp/src/handlers.mjs';
const MCP_TESTS = 'tests/workgraph-mcp.test.mjs';
const EVAL_SRC = 'src/workGraphLlmUsefulnessEval.mjs';
const EVAL_TESTS = 'tests/workGraphLlmUsefulnessEval.test.mjs';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Cursor MCP context surface v1: graph RAG, memory, evidence + usefulness eval',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [
      'implement-pvrg-graph-rag-context-slice',
      'implement-memory-record-worker-slice-mvp',
      'design-evidence-model-v1',
      'implement-mcp-get-pvrg-task-scope',
    ],
    basis: [
      'AN-38: WG agent worker auto-инжектит pvrg.graph_rag.context.v1 + memory-worker.slice.v1 в system prompt и видит связные WorkItem/Evidence/Memory.',
      'Cursor через workgraph-mcp получает только PVRG task scope + step graph + architecture; memory/evidence/full graph RAG отсутствуют как MCP tools — внешняя LLM теряет durable память проекта.',
      'Также нет E2E замера usefulness для Cursor MCP surface (workGraphLlmUsefulnessEval покрывает только worker prompt).',
    ],
    vector: [
      'T1: MCP tool get_graph_rag_context + resource workgraph://pvrg/graph-rag/{workId} (порт buildGraphRagContextForWorkerInput).',
      'T2: MCP tools list_memory_records, get_memory_record + resource workgraph://memory/records (read-only обёртка над memoryRecordWriter).',
      'T3: MCP tools list_evidence_records, get_evidence_record + resource workgraph://evidence/records (поверх evidenceReadModel).',
      'T4: Cursor rule в .cursor/rules — проактивно вызывать get_pvrg_task_scope/get_graph_rag_context перед claim.',
      'T5: fixture cursor-mcp-context-surface в workGraphLlmUsefulnessEval — графовые tools/resources в scorecard.',
      'T6: AN-9 RichIR решение — runtime hook или deferred close.',
    ],
    goal: [
      'Cursor видит graph RAG / memory / evidence как MCP tools и resources; usefulness eval ловит регрессии cursor-mcp-context-surface; AN-9 RichIR имеет решение.',
    ],
    checks: [
      'tests/workgraph-mcp.test.mjs: новые tools зарегистрированы и возвращают v1 schemas',
      'eval:llm-usefulness scorecard включает cursor-mcp-context-surface',
      'docs обновлены под новые tools/resources',
      'AN-38 closing analysis опубликован',
    ],
    targetFiles: [
      ANALYTICS,
      MCP_INDEX,
      MCP_HANDLERS,
      MCP_TESTS,
      EVAL_SRC,
      EVAL_TESTS,
      'src/graphRagContextSlice.mjs',
      'src/memoryRecordWriter.mjs',
      'src/evidenceReadModel.mjs',
      '.cursor/rules/',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-38',
  },
  {
    workId: 'implement-mcp-get-graph-rag-context',
    title: 'MCP: get_graph_rag_context + resource workgraph://pvrg/graph-rag/{workId}',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'src/graphRagContextSlice.mjs строит pvrg.graph_rag.context.v1 (WorkItems + FileArtifacts + Evidence + MemoryRecord + edges), но это worker-only — Cursor через workgraph-mcp не имеет соответствующего tool/resource.',
      'AN-38 §3: главная дыра surface для Cursor; есть intent implement-pvrg-graph-rag-context-slice (builder done), осталось exposure через MCP.',
    ],
    vector: [
      'Добавить server.tool get_graph_rag_context(workId, maxNodes?, maxDepth?) в packages/workgraph-mcp/src/index.mjs.',
      'Хендлер в packages/workgraph-mcp/src/handlers.mjs вызывает buildGraphRagContextForWorkerInput с repo snapshot + evidence + memory writers.',
      'Resource workgraph://pvrg/graph-rag/{workId} с тем же payload.',
      'Покрыть tests/workgraph-mcp.test.mjs + stdio integration (tests/workgraph-mcp-stdio.test.mjs).',
    ],
    goal: [
      'Внешняя LLM (Cursor) за один MCP-вызов получает pvrg.graph_rag.context.v1 для seed workId — те же связные данные, что и WG worker в system prompt.',
    ],
    checks: [
      'get_graph_rag_context возвращает schema pvrg.graph_rag.context.v1',
      'tests/workgraph-mcp.test.mjs зелёные',
      'tests/workgraph-mcp-stdio.test.mjs прогон через listTools/callTool',
      'README packages/workgraph-mcp обновлён',
    ],
    targetFiles: [
      MCP_INDEX,
      MCP_HANDLERS,
      MCP_TESTS,
      'tests/workgraph-mcp-stdio.test.mjs',
      'src/graphRagContextSlice.mjs',
      'packages/workgraph-mcp/README.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-38',
  },
  {
    workId: 'implement-mcp-memory-records-tools',
    title: 'MCP: list_memory_records / get_memory_record + workgraph://memory/records',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'memory-record-v1 (protocols/project-memory-v1.bvc) есть в репо: writers, UI /api/memory-records, worker slice — но Cursor через MCP не видит ни одного memory record.',
      'AN-38 §6: Cursor может получить часть memory косвенно через PVRG slice, но это случайно — нет первичного канала для durable project memory.',
    ],
    vector: [
      'server.tool list_memory_records(filter?) + get_memory_record(recordId) — read-only поверх memoryRecordWriter / memory-record-v1 JSON.',
      'Resource workgraph://memory/records — minimal projection без полного prompt-rule dump.',
      'Тесты: workgraph-mcp.test.mjs + fixture с несколькими memory kinds (decision, invariant, domain-fact).',
    ],
    goal: [
      'Cursor видит durable project memory как первичный MCP канал и может выбрать запись по type/sourceWorkItem без чтения внутренних .work.bvc.',
    ],
    checks: [
      'list_memory_records возвращает schema memory-record-list.v1',
      'get_memory_record возвращает memory-record-v1',
      'tests/workgraph-mcp.test.mjs зелёные',
      'README packages/workgraph-mcp + protocols/project-memory-v1.bvc trace обновлены',
    ],
    targetFiles: [
      MCP_INDEX,
      MCP_HANDLERS,
      MCP_TESTS,
      'src/memoryRecordWriter.mjs',
      'protocols/project-memory-v1.bvc',
      'packages/workgraph-mcp/README.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-38',
  },
  {
    workId: 'implement-mcp-evidence-records-tools',
    title: 'MCP: list_evidence_records / get_evidence_record + workgraph://evidence/records',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-mcp-get-graph-rag-context'],
    basis: [
      'evidence-record-v1 (src/evidenceReadModel.mjs) включается в graph RAG slice как nodes, но отдельного MCP tool нет — Cursor не может опросить структурированный evidence без полного graph RAG.',
      'AN-38 §3: третья из трёх дыр Cursor surface (после graph RAG и memory).',
    ],
    vector: [
      'server.tool list_evidence_records(filter?) + get_evidence_record(recordId) поверх buildEvidenceReadModelForTask.',
      'Resource workgraph://evidence/records.',
      'Тесты + README.',
    ],
    goal: [
      'Cursor получает evidence-record-v1 как первичный канал — отдельно от graph RAG, для целевых вопросов про результаты прогонов и провайдеров.',
    ],
    checks: [
      'list_evidence_records возвращает schema evidence-record-list.v1',
      'get_evidence_record возвращает evidence-record-v1',
      'tests/workgraph-mcp.test.mjs зелёные',
    ],
    targetFiles: [
      MCP_INDEX,
      MCP_HANDLERS,
      MCP_TESTS,
      'src/evidenceReadModel.mjs',
      'packages/workgraph-mcp/README.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-38',
  },
  {
    workId: 'add-cursor-rule-proactive-pvrg-context',
    title: 'Cursor rule: проактивно читать PVRG/graph RAG/memory перед claim',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-mcp-get-graph-rag-context',
      'implement-mcp-memory-records-tools',
    ],
    basis: [
      'MCP даёт tools, но Cursor сам решает, что звать — без правила модель часто игнорирует graph RAG / memory и читает .work.bvc по одному.',
      'AN-38 §8: usefulness Cursor surface поднимается, если в .cursor/rules жёстко прописать порядок вызовов перед claim/execute.',
    ],
    vector: [
      'Создать .cursor/rules/work-item-claim-context.mdc с alwaysApply=true: перед claim вызвать get_work_item, get_pvrg_task_scope, get_graph_rag_context, list_memory_records (по workId).',
      'Связать с AGENTS.md и docs/agent-tool-capabilities (если есть в WG) — единый источник правды.',
      'Lint: добавить упоминание правила в lint:cursor-rules или эквивалент.',
    ],
    goal: [
      'Cursor агент детерминированно читает task-scoped context (PVRG + graph RAG + memory) перед началом работы без дополнительной подсказки оператора.',
    ],
    checks: [
      'Файл .cursor/rules/work-item-claim-context.mdc существует с alwaysApply=true',
      'Правило ссылается на новые MCP tools',
      'lint:backlog/lint:cursor-rules зелёные',
    ],
    targetFiles: [
      '.cursor/rules/work-item-claim-context.mdc',
      '.cursor/rules/work-item-bvc-quality.mdc',
      'AGENTS.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-38',
  },
  {
    workId: 'extend-llm-usefulness-eval-cursor-mcp-surface',
    title: 'eval:llm-usefulness — fixture cursor-mcp-context-surface (graph/memory/evidence)',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-mcp-get-graph-rag-context',
      'implement-mcp-memory-records-tools',
      'implement-mcp-evidence-records-tools',
    ],
    basis: [
      'src/workGraphLlmUsefulnessEval.mjs проверяет worker prompt + intent-graph-mcp-surface, но cursor-mcp-context-surface (graph RAG + memory + evidence tools) не в scorecard.',
      'AN-38 §8: без замера новые MCP tools могут отрегрессировать незамеченно — параллельный риск утечки usefulness как у worker prompt.',
    ],
    vector: [
      'Добавить fixture cursor-mcp-context-surface в workGraphLlmUsefulnessEval.mjs: вызовы get_graph_rag_context, list_memory_records, list_evidence_records по seed workId.',
      'Asserts на schema id, минимальный node coverage, presence required edges (depends_on, has_evidence, writes_memory).',
      'Покрыть в ci:mandatory.',
    ],
    goal: [
      'npm run eval:llm-usefulness ловит регрессию любого из трёх новых MCP tools и фиксирует minimum usefulness score для cursor-mcp-context-surface.',
    ],
    checks: [
      'fixture cursor-mcp-context-surface зелёный',
      'tests/workGraphLlmUsefulnessEval.test.mjs обновлены',
      'eval:llm-usefulness в ci:mandatory',
    ],
    targetFiles: [
      EVAL_SRC,
      EVAL_TESTS,
      MCP_INDEX,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-38',
  },
  {
    workId: 'decide-an9-rich-ir-runtime-or-deferred',
    title: 'AN-9 RichIR: решение runtime hook или deferred close',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-38 §5: identifier RichIR/TurIr в src/ Work Graph отсутствует — только analytics docs (AN-9 ir-rich-ir-open-canon, unique-tech-stack-meta-review, pvrg-verified-reference-graph).',
      'Существование research-only концепта без runtime hook вводит в заблуждение читателей backlog и плодит ложные ожидания.',
    ],
    vector: [
      'Опубликовать ADR или decision-note: runtime wiring (use case + integration point) ИЛИ закрыть AN-9 как deferred research с явным статусом.',
      'Если deferred — обновить ссылки в AN-38 §5 и meta-review docs, чтобы было видно: только roadmap.',
      'Если runtime — отдельный epic с buildRichIrSliceForWorkerInput или MCP tool.',
    ],
    goal: [
      'AN-9 RichIR имеет недвусмысленный статус (runtime epic ИЛИ deferred) и читатель backlog не путает research analytics с production capability.',
    ],
    checks: [
      'ADR или decision-note опубликован',
      'Ссылки в AN-38 §5 и unique-tech-stack-meta-review обновлены',
      'analytics-records.jsonl содержит запись о решении',
    ],
    targetFiles: [
      'work/analytics/ir-rich-ir-open-canon.md',
      'work/analytics/unique-tech-stack-meta-review.md',
      'work/analytics/llm-pvrg-richir-memory-slices-usage-audit.md',
      'work/analytics-records.jsonl',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-38',
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
    schema: 'workgraph.seed-epic-cursor-mcp-context-surface-v1.v1',
    epicId: EPIC_ID,
    created,
    totalTasks: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
