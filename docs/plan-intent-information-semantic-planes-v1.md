# Plan: информационная и смысловая плоскости WG v1 (AN-65, AN-68)

**Связи:** [AN-65](../work/analytics/work-graph-intent-information-plane.md), [AN-68](../work/analytics/work-graph-semantic-plane.md), [ADR](adr-intent-information-semantic-planes-v1.md), [dual-track](adr-dual-track-lite-heritage-v1.md)

## Цель эпика

Сделать явный навигационный слой поверх WG+BVC: сначала **информационная плоскость** (топология, evidence, статусы), затем **смысловая** (alignment намерения и кода, дрейф, вакуумы, срез для агента).

## Фазы

| Фаза | AN | Результат |
|------|-----|-----------|
| P0 — канон + MCP структуры | AN-65 | ADR, `query_intent_plane`, индекс связей |
| P0 — semantic MCP | AN-68 | `query_semantic_field`, `detect_semantic_drift`, `get_context_slice` |
| P1 — UI | оба | Граф плоскости + heatmap дрейфа |
| P2 | оба | Temporal snapshots, `find_semantic_voids`, конфликты |

## Зависимости (уже в бэклоге)

- `implement-mcp-get-unified-linkage` — базовые связи work↔code↔evidence
- `implement-full-semantic-search-workflow` — lexical/hybrid поиск (расширяем для semantic field)

## Anti-goals

- Не Notion/wiki для заметок
- Не свободный crawl графа агентом вне scope задачи
- Не глобальный граф across repos в v1
