# Analysis: информационная плоскость WG (BVC + навигация)

**Type:** explanation (Diátaxis) — разбор, pre-epic  
**Date:** 2026-06-04  
**Outcome:** [AN-65](../work/analytics/work-graph-intent-information-plane.md) (`разбор`)

## Вопрос

Можно ли с помощью Work Graph и BVC строить информационную плоскость и навигацию по ней?

## Вывод

Да: WG+BVC уже задают многомерный граф (семантика, топология, состояние, доказательность, время). Базовая навигация есть через MCP (`get_unified_linkage`, PVRG scope, graph RAG, evidence filters) и UI-проекции; для явной плоскости нужен единый `query_intent_plane`, материализованные индексы, temporal-снимки и граф-вью в UI. Плоскость должна оставаться контрактной (не KB/Notion), навигация агента — в `allowed scope`.

Полный разбор, сценарии, anti-goals и roadmap — в [AN-65](../work/analytics/work-graph-intent-information-plane.md).

**См. также:** смысловая плоскость (намерение vs код) — [AN-68](../work/analytics/work-graph-semantic-plane.md), [analysis entry](2026-06-semantic-plane.md).
