# ADR: Замена полного IDE shell на operator dashboard + Cursor

## Статус

Принято (2026-05).

## Контекст

ioHasC IDE (`../project`) объединяет Monaco, дерево файлов, терминал, панель агента и PVRG-карту в одном web-shell. Work Graph rebuild переносит **intent graph, backlog и verification** в отдельный репозиторий с operator dashboard. Команда продолжает редактировать код во **внешнем IDE (Cursor)**; споры о «переносить ли Monaco целиком» блокируют фокус на bounded operator workflow.

## Решение

### Не переносим 1:1 (replace, не port)

| Старый контур ioHasC | Замена в Work Graph rebuild | Примечание |
|---|---|---|
| Monaco workspace + file explorer | Cursor + `work.target_files` / MCP read | Bounded read по трассируемым файлам |
| Agent chat panel в IDE | Operator «Агент» + worker providers | Однораундовый run, не полный orchestrator |
| Settings / MCP UI | Контракт sidecar/MCP; конфиг в `../project` | Runtime остаётся в ioHasC |
| Bottom terminal | Внешний shell / `local-cli` allowlist | Verification через `runCommand` gate |
| PVRG map (правая панель) | Architecture/schematic views + PVRG task scope в detail drawer | Bounded subgraph, не full canvas port |

### Что остаётся в ioHasC IDE

- Полный orchestrator, multi-round chat, semantic map canvas (optional path).
- Genesis/GVM dev panels, LSP, semantic search ANN в браузере — **не дублируем** в Work Graph без явного ADR.

### Источник правды

- Work items, cycles, evidence — **Work Graph** (`.work.bvc`, operator dashboard, MCP).
- Исполнение патчей — worker adapter + внешний IDE; worker **не** пишет в Work Graph напрямую, кроме explicit persist API после operator run.

## Почему

1. **Scope control:** rebuild закрывает operator loop (backlog → run → verify), а не второй IDE.
2. **Reuse:** Cursor уже даёт editor + agent; дублирование Monaco — высокая стоимость без новой ценности для оператора backlog.
3. **Traceability:** `targetFiles` и PVRG slice связывают задачу с кодом без полного file tree.

## Последствия

- Новые фичи «редактор кода» — в `../project` или через MCP tools, не в dashboard.
- Dashboard расширяем projection-панелями (PVRG scope, linkage, prompts read-only), не full IDE.
- Reopen переноса Monaco — только через новый ADR с явным business case.

## Ссылки

- [plan-iohasc-rebuild-audit-gap-matrix.md](plan-iohasc-rebuild-audit-gap-matrix.md) — раздел «Замена IDE shell»
- [plan-iohasc-full-rebuild-backlog.md](plan-iohasc-full-rebuild-backlog.md)
- [adr-workgraph-headless-intent-backend.md](adr-workgraph-headless-intent-backend.md) — MCP-only path для агента (ортогонально operator UI)
