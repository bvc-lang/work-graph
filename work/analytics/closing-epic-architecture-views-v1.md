# Closing: epic-architecture-views-v1

Эпик: `epic-architecture-views-v1`  
Источник: [AN-34](architecture-visualization-patterns-comparison.md)  
Закрыт: 2026-06-01

## Outcomes

### Track A — ADR + list

- `docs/adr-architecture-views-v1.md` — profiles List / Tree / Pipeline / Full / Export
- Architecture tab: blocks list-rows (`#architecture-blocks-list`)

### Track B — Tree + pipeline + matrix

- Рабочий процесс tree mode по `work.parent_id` (flat/tree toggle)
- Graph canvas default **pipeline** (`graphCanvasViewMode` localStorage)
- Domain × layer matrix prototype panel

### Track C — Export + tests

- `npm run architecture:export` — mermaid from snapshot
- `tests/architectureViewsProjection.test.mjs` — list, matrix, mermaid

## Уроки

1. List-first для операций; graph — для lineage, не home.
2. Pipeline default снимает AN-1 layout pain на первом открытии.
3. View toolbar `<select>` остаётся native — wave 3 не блокировал views epic.

## feeds_epics

- epic-architecture-views-v1
