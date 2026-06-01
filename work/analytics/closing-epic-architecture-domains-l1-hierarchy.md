# Closing: epic-architecture-domains-l1-hierarchy

Эпик: `epic-architecture-domains-l1-hierarchy`  
Источник: [AN-39](architecture-domains-l1-hierarchy.md)  
Закрыт: 2026-06-01

## Outcomes

### Decision & canon

- [docs/adr-architecture-domains-l1-hierarchy.md](../docs/adr-architecture-domains-l1-hierarchy.md) — вариант B+ (peers + `architecture.group`)
- `architecture/main.bvc` — `domain-onebase` + `domain-marketplace` с `architecture.group: domains`; edge `domain-marketplace -> work-graph : maps_to`
- Digest canon: `765dc062` (8 blocks, 9 edges)

### Runtime

- `src/architectureL1Canon.mjs` — `ARCHITECTURE_L1_BLOCK_COUNT = 8`, поле `group` в block projection
- `src/architectureSnapshot.mjs` — `classifyWorkItemBlock` → `domain-marketplace` по department / intent path
- `schemas/architecture-snapshot.v1.json` — optional `blocks[].group`

### UI & intent

- `src/architectureViewsProjection.mjs` — `formatArchitectureBlockDisplayTitle`, `listTitle` «Домены › …»
- `src/workGraphBacklogUiServer.mjs` — секция «Домены» в architecture list + grouped drawer title
- `src/intentHierarchy.mjs` — `domain/marketplace`, labels OneBase / Marketplace

### Layout

- `src/graphCanvasLayout.mjs`, `src/schematicView.mjs` — node `domain-marketplace`

## Метрики

| Метрика | Итог |
|---------|------|
| L1 blocks | 8 |
| L1 edges | 9 |
| architecture:l1-check | pass |
| npm test | pass |

## feeds_epics

- epic-architecture-domains-l1-hierarchy
