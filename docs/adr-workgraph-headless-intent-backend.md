# ADR: Headless intent backend (MCP-first для агента)

## Статус

Принято (2026-05), обновлено 2026-05-30 после Phase 9–11.

## Контекст

Work Graph rebuild переносит intent graph и semantic navigation из ioHasC. **Агент в Cursor** потребляет intent через **MCP и worker CLI**, без React Flow canvas. **Operator dashboard** — отдельный human-in-the-loop слой (board, kanban, detail drawer); он не заменяет MCP для агента и не дублирует ioHasC Monaco shell.

## Решение

### MCP / CLI / derived JSON (primary для агента)

- `get_intent_hierarchy`, `get_pvrg_task_scope`, `get_unified_linkage`, `get_architecture_snapshot`, `get_operator_shell_snapshot`
- `get_step_graph_projection`, `get_step_graph_slice` — product `.bvc` refs без canvas
- `semantic_search` modes: `lexical-v1`, `hybrid-lexical-bm25-v1`, `hybrid-lexical-bm25-tfidf-v1`
- Graph RAG slice для worker; promote-ready queue (`get_promote_ready_queue`, `minPhase`)

### Operator UI (human operator, не agent runtime)

Реализовано для оператора, **не** как substitute MCP:

- Backlog board, kanban projection, linkage drilldown, PVRG scope panel
- Prompt rules editor MVP, hybrid semantic search toggle
- Playwright smoke (`npm run test:e2e`) — optional-env gate

### Не делаем (won't do без явного запроса)

- **React Flow / full semantic map canvas** в Work Graph (использовать `get_step_graph_slice` + architecture snapshot)
- Полный port ioHasC agent orchestrator multi-round loop (остаётся в `../project`)
- GBC/GFS/GVM mandatory gates (Phase 11 — optional pilots only)

### ioHasC IDE

Полный Semantic Map в `../project` **не удаляем** — optional IDE path. Work Graph не дублирует canvas 1:1.

## Последствия

- Intent navigation для агента — MCP tools + resources; dashboard — для человека
- UI WorkItems (`wire-pvrg-*`, `implement-kanban-*`, …) закрыты как operator MVP, не reopen canvas без ADR

## Ссылки

- [workgraph-intent-graph-mcp.md](workgraph-intent-graph-mcp.md)
- [plan-iohasc-rebuild-audit-gap-matrix.md](plan-iohasc-rebuild-audit-gap-matrix.md)
- [adr-workgraph-replace-ide-shell.md](adr-workgraph-replace-ide-shell.md)
