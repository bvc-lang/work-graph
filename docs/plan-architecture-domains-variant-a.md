# Plan: Architecture domains — variant A (L1 hub)

## Цель

Один L1-блок **«Дomены»** (`domains`); **OneBase** и **Marketplace** — L2-контейнеры внутри него.

## Почему

Операторская модель: родитель «Домены» на карте, drill-down на verticals. Variant B+ (два peer L1 `domain-*`) дублировал уровень и смешивал L1/L2 в UI.

## Что сделано

- [x] `architecture/main.bvc`: блок `domains`, L2 `onebase-domain` / `marketplace-domain`
- [x] Edges: `domains -> work-graph : maps_to`, `agent-runtime -> domains : uses`
- [x] L1 count **7**, edges **8**
- [x] `classifyWorkItemBlock` → `domains` для onebase/marketplace work items
- [x] Layout / schematic / snapshot onebase graph на блоке `domains`
- [x] Тесты + `architecture:l1-check`

## Todo

- [x] ADR B+ помечен superseded в `docs/adr-architecture-domains-l1-hierarchy.md`
- [x] MCP / matrix: block id `domains` (departments `domain-*` без изменений; hardcoded L1 block id в consumers не было)

## Критерий завершения

- Список «Архитектура»: одна строка **Домены**; клик → L2 OneBase + Marketplace + задачи
- `npm run architecture:l1-check` и `npm test` green
