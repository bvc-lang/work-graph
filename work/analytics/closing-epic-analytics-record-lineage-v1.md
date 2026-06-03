# Closing: epic-analytics-record-lineage-v1

Эпик: `epic-analytics-record-lineage-v1`  
Источник: [AN-51](analytics-record-lineage-flat-list-graph-storage.md)  
Закрыт: 2026-06-02

## Что сработало

- **ADR accepted:** [docs/adr-analytics-record-lineage-v1.md](../../docs/adr-analytics-record-lineage-v1.md) — graph storage, flat recency-first UI.
- **Schema:** optional `lineage` block on `analytics-record.v1` (`parentKey`, `parentId`, `relation`, `relatedKeys`).
- **Projection:** `src/analyticsLineageProjection.mjs` → `analytics-lineage.projection.v1` attached in panel API.
- **UI drawer:** секции «Родительский разбор», «Продолжения», «Связанные» + навигация по клику.
- **UI list:** badge `↳ AN-50` / «N продолжений» без tree-view.
- **Migration fixture:** AN-50.1 в journal с `lineage.parentKey: AN-50` (`scripts/migrate-analytics-lineage-an50-pair.mjs`).
- **MCP P2:** `get_analytics_lineage(recordKey | recordId)`.

## Tests

- `tests/analyticsLineageProjection.test.mjs`
- `tests/analyticsPanelProjection.test.mjs` — AN-50 ↔ AN-50.1 fixture
- `tests/workGraphBacklogUiServer.test.mjs` — lineage UI smoke
- `tests/workgraph-mcp.test.mjs` — MCP lineage
- `npm run test:deterministic` — green

## Что не сработало / осталось

- Filter «только корневые» в списке — defer.
- Bridge `lineage.parentKey` ↔ intent_node (AN-3 phase 2) — не в scope v1.
- Markdown «Связи» остаётся human-readable; machine source — journal `lineage`.

## Уроки

1. Flat recency list + drawer drill-down лучше tree-view для ~60+ записей.
2. `parentKey` index достаточен для continuations без хранения `childKeys`.
3. Intent graph (AN-3) и analysis lineage (AN-51) — разные слои; не смешивать в одной секции.

## feeds_epics

- epic-analytics-record-lineage-v1
