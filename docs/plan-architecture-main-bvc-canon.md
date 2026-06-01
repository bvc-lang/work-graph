# Plan: Architecture main.bvc — L1 canon hub

## Цель

Ввести **`architecture/main.bvc`** как SSoT L1-карты системы: per-block BVC, edges, intent roots, L2 container refs; связать устав → canon → `architecture.snapshot.v1` → UI.

## Почему

AN-36: устав задаёт рамку, но не структурную карту; runtime держит L1 в JS без BVC; drawer блоков не показывает Базис/Вектор/Цель. AN-35: без canon-файла нет digest, drift-check и governance.

## Что делать

### Track A — Canon artifact

1. Авторинг `architecture/main.bvc` (7 L1 blocks + edges + passport).
2. Строка в `charter/main.bvc`: `architecture.ref` + footnote `derived-projections`.
3. Обновить `protocols/architecture-graph-model-v1.bvc`: `design.input` включает `architecture/main.bvc`.

### Track B — Runtime loader

4. `src/architectureL1Canon.mjs` — parse/load BVC canon.
5. Миграция `architectureSnapshot.mjs`: убрать inline `ARCHITECTURE_L1_BLOCKS` / `EDGES`.
6. Расширить `schemas/architecture-snapshot.v1.json`: `l1Canon`, block `basis`/`vector`/`goal`.

### Track C — UI & operator visibility

7. Drawer L1: BVC triplet + link «Источник: architecture/main.bvc».
8. Badge canon version/digest в Architecture list header.
9. List row: preview vector (optional).

### Track D — Quality & closing

10. `scripts/architecture-l1-check.mjs` + `npm run architecture:l1-check`.
11. Tests: canon loader, snapshot BVC fields, UI hooks.
12. **Bulk migration** `.bvc` → `.bvc` (plan-step-to-bvc-migration § phase 3).
13. AN-36 closing analysis.

## Todo

- [ ] `seed:epic-architecture-main-bvc-canon`
- [ ] `author-architecture-main-bvc-v1`
- [ ] `charter-architecture-ref-derived-projections`
- [ ] `implement-architecture-l1-canon-loader`
- [ ] `migrate-architecture-snapshot-from-canon`
- [ ] `schema-architecture-snapshot-l1-bvc-fields`
- [ ] `ui-architecture-block-drawer-bvc`
- [ ] `ui-architecture-l1-canon-badge`
- [ ] `cli-architecture-l1-check`
- [ ] `migrate-repo-step-files-to-bvc-bulk`
- [ ] `tests-architecture-main-bvc-canon`
- [ ] `write-an36-closing-architecture-main-bvc-canon`

## Критерий завершения

- L1 читается из `architecture/main.bvc`; JS не дублирует block list.
- Drawer блока показывает BVC; snapshot содержит `l1Canon` metadata.
- `npm run architecture:l1-check` green; AN-36 closing опубликован.
