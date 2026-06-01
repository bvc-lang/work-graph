# Work Graph: intent graph через MCP

## Цель

Дать агенту (Cursor, Claude) **read-only навигацию** по intent graph Work Graph без dashboard UI и без полного `get_backlog_snapshot`.

## Типовой flow

1. **`get_intent_hierarchy`** — domain tree (`intent.hierarchy.snapshot.v1`): слои system/ui/domain/research, списки `workIds` по доменам.
2. **`get_architecture_snapshot`** — L1 blocks (`architecture.snapshot.v1`): связь задач с architecture block через cross-highlight эвристику.
3. **`get_unified_linkage`** — edges step↔code↔task (`unified-linkage.projection.v1`).
4. **`get_pvrg_task_scope`** — bounded subgraph одной задачи (`pvrg.task-scope.slice.v1`): `depends_on`, `target_files`, linkage expansion.
5. **`get_step_graph_slice`** — subgraph `.bvc` block refs (`step-graph.slice.v1`).
6. **`get_work_item`** — полный atom для выбранного `workId`.

`semantic_search` mode: `hybrid-lexical-bm25-tfidf-v1` — TF-IDF vector channel (без neural embeddings).

## Ограничения

- Neural embedding ANN — deferred; сейчас `tfidf-v1`.
- Linkage — derived projection, не live PVRG file graph ioHasC.
- **Dashboard UI не развиваем** — см. [adr-workgraph-headless-intent-backend.md](adr-workgraph-headless-intent-backend.md).

## Связанные WorkItems

- `implement-mcp-get-intent-hierarchy` … `implement-mcp-intent-graph-resources`
- UI parity: deferred (headless only) — см. [adr-workgraph-headless-intent-backend.md](adr-workgraph-headless-intent-backend.md)

См. также [`packages/workgraph-mcp/README.md`](../packages/workgraph-mcp/README.md).
