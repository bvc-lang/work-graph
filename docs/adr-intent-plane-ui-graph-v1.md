# ADR: UI граф информационной плоскости v1

**Status:** accepted  
**Date:** 2026-06-04  
**Context:** [AN-65](../work/analytics/work-graph-intent-information-plane.md), [spec-query-intent-plane-mcp-v1.md](spec-query-intent-plane-mcp-v1.md)

## Decision

Вкладка **Архитектура** dashboard получает панель **«Плоскость»** с lit-flow графом:

- Источник: `GET /api/intent-plane/graph?start=&direction=&depth=&drift=1`
- Стартовый узел — выбранная задача или epic из drawer
- Клик по узлу → task drawer (как architecture/intent roadmap)

## UX scenario (архитектор)

1. Открыть задачу → перейти в Архитектура → плоскость показывает downstream depth=1
2. Включить drift overlay → узлы окрашены по `drift_score` (legend: aligned / review / drift)
3. Клик по «горячему» узлу → drawer с drift summary

## Backend contract

| Endpoint | Returns |
|----------|---------|
| `/api/intent-plane/graph` | `{ query, projection, driftBatch? }` |
| `/api/semantic-drift/batch` | `{ entries: [{ workId, drift_score }] }` |

Projection schema: `workgraph.graph-canvas-lit-flow-projection.v1` via `buildGraphCanvasProjectionFromIntentPlane`.

## Anti-goals

- Не дублировать full architecture L2 map
- Не editable graph — read-only navigation
