# Plan: Architecture domains L1 hierarchy (AN-39)

## Цель

Выровнять L1-карту, intent tree и UI: группа **«Домены › …»**, симметричные блоки OneBase и Marketplace, корректная классификация задач.

## Почему

AN-39: intent уже `domains/onebase` + `domains/marketplace`, L1 — только `domain-onebase`; Marketplace уходит в `derived-projections`. Оператор и агент видят разную модель.

## Что делать

### Track A — Decision & canon

1. ADR: вариант B+ (group + два domain L1).
2. `architecture/main.bvc`: `architecture.group: domains` на domain-блоках; новый `domain-marketplace` + L2 + edges.
3. Обновить `protocols/architecture-graph-model-v1.bvc` (domain blocks v2 footnote).

### Track B — Runtime & classify

4. `classifyWorkItemBlock` → `domain-marketplace`.
5. L2 nodes / scan paths для marketplace (по необходимости, симметрия onebase).
6. Schema `architecture-snapshot.v1.json`: optional `group` на block.

### Track C — UI

7. Architecture list/graph: секция «Домены › {title}».
8. Intent hierarchy labels согласованы с architecture titles.

### Track D — Quality

9. Tests + `architecture:l1-check`.
10. AN-39 closing analysis.

## Todo

- [x] `seed:epic-architecture-domains-l1-hierarchy`
- [x] `decide-architecture-domains-l1-model`
- [x] `update-architecture-main-bvc-domains-structure`
- [x] `extend-classify-work-item-block-domains`
- [x] `schema-architecture-block-group-field`
- [x] `ui-architecture-domains-breadcrumb-group`
- [x] `align-intent-hierarchy-domain-labels`
- [x] `tests-architecture-domains-l1-hierarchy`
- [x] `write-an39-closing-architecture-domains-l1-hierarchy`

## Критерий завершения

- Marketplace work items на L1-блоке `domain-marketplace`, не только в derived-projections.
- UI показывает группу «Домены» с OneBase и Marketplace.
- `npm run architecture:l1-check` green; AN-39 closing опубликован.
