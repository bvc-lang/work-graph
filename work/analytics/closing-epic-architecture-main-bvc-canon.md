# Closing: epic-architecture-main-bvc-canon

Эпик: `epic-architecture-main-bvc-canon`  
Источник: [AN-36](architecture-main-bvc-canon-hub.md)  
Закрыт: 2026-06-01

## Outcomes

### Track A — Canon file

- `architecture/main.bvc` — passport, 7 L1 blocks + BVC, 8 edges, container labels
- `charter/main.bvc` — `architecture.ref`, footnote для `derived-projections`
- `protocols/architecture-graph-model-v1.bvc` — `design.input` → canon path

### Track B — Runtime

- `src/architectureL1Canon.mjs` — parse/load/validate, digest, dual-read paths
- `src/architectureSnapshot.mjs` — L1 from canon (no inline arrays)
- `schemas/architecture-snapshot.v1.json` — `l1Canon`, block BVC fields

### Track C — UI

- Architecture drawer: BVC triplet + canon source link
- List header: canon version/digest badge

### Track D — Quality + migration

- `npm run architecture:l1-check` — green (digest `b7a62e2e`)
- `tests/architectureL1Canon.test.mjs`, snapshot/UI tests updated
- Bulk `.step` → `.bvc` in Work Graph repo (`migrate:step-path-references`)

## Метрики

| Метрика | Итог |
|---------|------|
| L1 blocks in canon | 7 |
| architecture:l1-check | pass |
| @bvc-lang/cli / spec npm | 0.1.6 / 0.0.2 |

## feeds_epics

- epic-architecture-main-bvc-canon
