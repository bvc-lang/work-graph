# Plan: epic-analytics-record-lineage-v1 (AN-51)

## Цель

Lineage между analytics-записями (AN-50 → AN-50.1): **граф в хранении**, **плоский recency-first список**, **lineage во drawer**.

## Источник

[AN-51](../work/analytics/analytics-record-lineage-flat-list-graph-storage.md)

## ADR

[docs/adr-analytics-record-lineage-v1.md](./adr-analytics-record-lineage-v1.md)

## Треки

| # | work.id | P | Суть |
|---|---------|---|------|
| A | `decide-analytics-lineage-storage-adr` | P0 | graph vs tree, flat UI canon |
| B | `extend-analytics-record-schema-lineage-v1` | P0 | `lineage.parentKey`, `relation` |
| C | `implement-analytics-lineage-projection` | P0 | `analytics-lineage.projection.v1` |
| D | `wire-analytics-drawer-lineage-sections` | P0 | родитель / продолжения / related |
| E | `wire-analytics-list-lineage-badges` | P1 | badge `↳ AN-50` в list-row |
| F | `migrate-analytics-lineage-seed-examples` | P1 | AN-50 ↔ AN-50.1 в journal |
| G | `implement-mcp-get-analytics-lineage` | P2 | MCP tool для агента |
| H | `write-closing-epic-analytics-record-lineage-v1` | — | closing |

## Критерий завершения (MVP = P0–P1)

- Journal поддерживает optional `lineage` block
- Projection отдаёт parent/continuations для записей с lineage
- Drawer показывает секции lineage; список остаётся flat + optional badge
- AN-50.1 имеет `lineage.parentKey: AN-50` в journal
- Тесты `analyticsPanelProjection` / UI smoke зелёные

## Зависимости

- `implement-analytics-decision-structure` (done, AN-3)
- `implement-intent-graph-drilldown-ui` (done, AN-3)

## Seed

```bash
npm run seed:epic-analytics-record-lineage-v1
```
