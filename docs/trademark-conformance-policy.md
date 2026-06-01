# Trademark & conformance policy

**Эпик:** `epic-work-graph-open-publication`  
**ADR:** [adr-work-graph-open-publication.md](adr-work-graph-open-publication.md)

## Protected names

| Mark | Owner use | Third-party use |
|------|-----------|-----------------|
| **BVC** | format name, `@bvc-lang/*` packages | descriptive «BVC file» OK; «BVC-compatible» only per conformance |
| **Work Graph** | product, MCP, UI | no confusing similarity in competing PM tools |
| **PVRG** | graph schema name | «PVRG-compatible» when schema + invariants pass |

## BVC-compatible claim

A tool may claim **BVC-compatible** if:

1. Parses `.bvc` atoms with `#Name<[ Basis / Vector / Goal / Labels ]>` structure
2. Passes `tests/conformance/*.bvc` fixtures (or equivalent published suite)
3. Does not use `BVC` in product name in misleading way (e.g. «BVC Pro Enterprise» implying official endorsement)

Conformance suite: `tests/bvcConformance.test.mjs` + `tests/conformance/`.

## Stable vs experimental API

See [PUBLIC_API.md](../PUBLIC_API.md) at repo root.

## Logo

`public/assets/workgraph-logo.svg` — do not use in forks without clear «unofficial» labeling if confusing.

## Enforcement

Friendly notice first; trademark complaint for deliberate consumer confusion.
