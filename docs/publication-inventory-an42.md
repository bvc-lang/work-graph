# Publication inventory (AN-42)

Реестр каталогов и пакетов для публичного релиза Work Graph.  
**ADR:** [adr-work-graph-open-publication.md](adr-work-graph-open-publication.md)

## Legend

| Mark | Meaning |
|------|---------|
| **public** | можно публиковать в git/npm tarball |
| **private** | не включать в public release |
| **experimental** | видимый код, не stable API |

## Packages (`packages/`)

| Path | Mark | License | Notes |
|------|------|---------|-------|
| `bvc-spec/` | public | Apache-2.0 + spec CC BY 4.0 | `@bvc-lang/spec` |
| `bvc-cli/` | public | Apache-2.0 | `@bvc-lang/cli` |
| `bvc-dialects/` | public | Apache-2.0 | dialect registry |
| `ir-spec/` | public | CC BY 4.0 spec | draft IR/RichIR |
| `pvrg-spec/` | public | CC BY 4.0 spec | draft PVRG schema |
| `work-graph-cli/` | public | Apache-2.0 | `work-graph init/ui` |
| `workgraph-mcp/` | public | Apache-2.0 | MCP server (currently private npm flag) |
| `design-tokens/` | public | Apache-2.0 | shared tokens |
| `atomic-spec/` | public | Apache-2.0 | atomic design atoms |
| `docs-generator/` | public | Apache-2.0 | component catalog tool |

## Core application

| Path | Mark | Notes |
|------|------|-------|
| `src/workGraph*.mjs` | public | backlog UI, runtime, MCP handlers |
| `src/architecture*.mjs` | public | architecture views |
| `src/intentTree*.mjs` | public | intent tree I/O |
| `src/bracketIrTraceSignal.mjs` | public | trace hash/drift only |
| `protocols/` | public | sidecar protocols (BVC atoms) |
| `schemas/` | public | JSON schemas |
| `skills/install-work-graph/` | public | agent skill |

## Private (never in npm pack / public tarball)

| Path | Mark | Reason |
|------|------|--------|
| `tests/fixtures/eval/` | private | eval corpus quality |
| `tests/fixtures/customer/` | private | customer data |
| `work/analytics/` (operator notes) | private | internal strategy drafts — **except** published analytics md |
| `.cursor/` | private | local IDE config |
| `charter/.iohasc/` | private | operator passport snapshots |

## Experimental / defer

| Path | Mark | Notes |
|------|------|-------|
| `experimental/` | experimental | Genesis, GVM, R&D |
| Bracket IR parser/lowering | experimental | lives in sibling `project` repo; defer full port |
| OneBase vertical codegen pack | commercial | dual-license when productized |
| `pvrg-core/` (sibling repo) | public ref | full scanner; WG ships schema + lite only |

## CI enforcement

`npm run check:npm-pack-boundary` — dry-run pack для public packages; fail on private path patterns.

## Maintainer checklist before publish

1. Inventory row exists for every new top-level directory
2. `LICENSE` / `license` field in package.json
3. `npm run check:npm-pack-boundary` green
4. No secrets in `tests/fixtures/`
