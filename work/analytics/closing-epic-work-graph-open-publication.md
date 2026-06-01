# Closing: epic-work-graph-open-publication

Эпик: `epic-work-graph-open-publication`  
Источник: [AN-42](open-publication-technology-holdback-strategy.md)  
Закрыт: 2026-06-01

## Outcomes

### Decision & legal

- [docs/adr-work-graph-open-publication.md](../docs/adr-work-graph-open-publication.md) — Apache-2.0 core, CC BY 4.0 specs, commercial packs
- [docs/publication-inventory-an42.md](../docs/publication-inventory-an42.md) — public / private / experimental
- Root `LICENSE`, `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`
- [patent-defensive-publication-decision-an42.md](patent-defensive-publication-decision-an42.md)
- [docs/trademark-conformance-policy.md](../docs/trademark-conformance-policy.md)
- [PUBLIC_API.md](../PUBLIC_API.md)

### Format specs

| Format | Package | License |
|--------|---------|---------|
| BVC | `@bvc-lang/spec`, `@bvc-lang/cli` | spec CC BY 4.0, code Apache-2.0 |
| IR Flow | `@work-graph/ir-spec` | draft schema |
| PVRG | `@work-graph/pvrg-spec` | draft schema |
| Bracket IR trace | `protocols/bracket-ir-trace-envelope-v1.bvc` | defer full compiler |

### CI

- `scripts/check-npm-pack-public-boundary.mjs` — private paths не в npm pack
- `npm run check:npm-pack-boundary`

### Core vs commercial

- Open core: runtime, MCP, CLI, BVC/IR/PVRG reference specs
- Commercial/defer: OneBase vertical pack, eval corpus, full Bracket IR compiler, Genesis/GVM

## Метрики

| Метрика | Итог |
|---------|------|
| ADR принят | yes |
| Inventory | yes |
| Legal hygiene | yes |
| CI pack guard | yes |
| BVC conformance tests | existing |

## feeds_epics

- epic-work-graph-open-publication

## Следующие шаги (вне эпика)

- Patent attorney review при business trigger
- npm publish `@bvc-lang/*` и `@work-graph/*` когда готов registry
- IR/PVRG conformance fixtures
