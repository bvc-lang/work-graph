/**
 * Headless intent backend (без UI): MCP + CLI только.
 */

export const DEFAULT_NEXT_ACTION = 'просмотреть и перевести в ready';

/** @type {Array<Record<string, string>>} */
export const HEADLESS_INTENT_BACKEND_ITEMS = [
  {
    workId: 'implement-mcp-step-graph-slice',
    title: 'Headless: MCP step-graph slice из .bvc (без UI)',
    department: 'knowledge-publishing',
    ownerRole: 'retrieval_architect',
    priority: 'high',
    migrationStrategy: 'port',
    dependsOn: 'implement-mcp-get-unified-linkage',
    basis: 'ioHasC Semantic Map — React Flow UI; польза для агента — subgraph .bvc refs/imports. UI не нужен.',
    vector: 'src/stepGraphSlice.mjs: scan *.bvc, рёбра #ref; MCP get_step_graph_slice + get_step_graph_projection.',
    goal: 'Агент навигирует product step graph без semantic map canvas.',
    targetFiles: 'src/stepGraphSlice.mjs, packages/workgraph-mcp/src/handlers.mjs, packages/workgraph-mcp/src/index.mjs, tests/stepGraphSlice.test.mjs',
    checks: 'get_step_graph_slice возвращает step-graph.slice.v1\nТест на fixture .bvc с #ref между блоками',
  },
  {
    workId: 'document-headless-intent-backend-scope',
    title: 'Headless: ADR — scope intent backend без dashboard UI',
    department: 'product-architecture',
    ownerRole: 'system_architect',
    priority: 'low',
    migrationStrategy: 'rebuild',
    dependsOn: 'implement-mcp-step-graph-slice',
    basis: 'Решение «без UI» не зафиксировано; wire-pvrg-* и kanban остаются в backlog без явного wont-do.',
    vector: 'docs/adr-workgraph-headless-intent-backend.md — MCP-only surface, UI tasks deferred/wont-do.',
    goal: 'Не reopen dashboard semantic map без явного запроса.',
    targetFiles: 'docs/adr-workgraph-headless-intent-backend.md, docs/workgraph-intent-graph-mcp.md',
    checks: 'ADR перечисляет MCP tools и non-goals UI\nСсылка из plan-phase-8-plus-continuation.md',
  },
];
