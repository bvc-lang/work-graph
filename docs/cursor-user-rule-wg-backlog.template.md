# Шаблон Cursor User Rule — Work Graph (multi-repo)

Скопируй блок ниже в **Cursor → Settings → Rules → User Rules** (глобально), если основной workspace — **ioHasC project**, а Work Graph живёт в соседнем репо и `.cursor/rules` WG не подхватываются.

```markdown
## Work Graph — единый бэkлог

- Trackable work (эпики, подзадачи, seed) — только через `intent/**/work/*.work.bvc` и MCP workgraph (`claim_work_item`, `update_work_item_status`, `create_work_item`).
- **Не** используй TodoWrite / чат-чеклисты для прогресса по `work.id`.
- Перед claim: `get_work_item`, `get_pvrg_task_scope`, `get_graph_rag_context`.
- `create_work_item` и правки `.work.bvc`: **Базис, Вектор, Цель, Проверки** — связный русский; техтермины MCP/BVC/Work Graph допустимы.
- «Что дальше?» → MCP `get_promote_ready_queue` / `get_current_cycle`, не выдумывай work.id.

Полные правила WG: clone work graph → `npm run sync:cursor-rules`. Primer: docs/workgraph-session-primer-runbook.md
```

Не дублирует полный `work-items-russian.mdc` — только essentials для снижения drift.
