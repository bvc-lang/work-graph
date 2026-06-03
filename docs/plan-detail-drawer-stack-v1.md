# Plan: epic-detail-drawer-stack-v1 (AN-54)

## Цель

Единый **стек detail-drawer** (очередь типизированных фреймов) вместо ad hoc L1/L2; drill-down «родитель epic», analytics task, architecture L2 — через `stack.push`.

## Источник

[AN-54](../work/analytics/detail-drawer-stack-modal-queue.md)

## ADR

`docs/adr-detail-drawer-stack-v1.md` (на decide-subtask)

## Треки

| # | work.id | P | Суть |
|---|---------|---|------|
| A | `decide-detail-drawer-stack-adr` | P0 | frame types, push/pop canon, L2 deprecate |
| B | `implement-detail-drawer-stack-core` | P0 | `detailDrawerStack.mjs` + shell hooks |
| C | `wire-task-hierarchy-stack-navigation` | P0 | parent epic / child → push |
| D | `migrate-analytics-drilldown-to-drawer-stack` | P1 | related task + lineage on stack |
| E | `migrate-architecture-l2-to-drawer-stack` | P1 | architecture-l2 frame |
| F | `wire-drawer-stack-uniform-back-esc` | P2 | Esc, overlay, breadcrumb |
| G | `write-closing-epic-detail-drawer-stack-v1` | — | closing |

## MVP (P0)

- ADR принят
- Stack module с `push` / `pop` / `reset` и registry renderers
- Клик «Родитель» в task drawer открывает epic **поверх**, back возвращает к задаче
- Analytics related task + lineage + architecture L2 на stack
- Esc/overlay/breadcrumb единые правила
- Тесты smoke в `workGraphBacklogUiServer.test.mjs`

**Status:** done (2026-06-02) — см. `work/analytics/closing-epic-detail-drawer-stack-v1.md`

## Зависимости

- `wire-analytics-related-task-sub-drawer` (done — refactor target)
- `implement-work-item-parent-id-runtime` (done)

## Seed

```bash
npm run seed:epic-detail-drawer-stack-v1
```
