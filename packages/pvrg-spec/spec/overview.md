# PVRG v1 — overview (draft)

Published: 2026-06-01

PVRG is a **machine-readable project graph**, not a human authoring format.

## Principles

1. **Deterministic** — graph structure from parsers, not LLM generation
2. **Typed nodes** — code, work items, BVC atoms, tests, evidence
3. **Verified edges** — optional `verified: true` when link checked by tooling
4. **Agent context** — subgraph extraction for MCP / agent prompts

## Lite vs full scanner

| Tier | Scope |
|------|-------|
| Lite (Work Graph) | architecture snapshot, OneBase YAML nodes |
| Full (`pvrg-core/`) | multi-language AST, logical components, GFS overlay |

## Conformance

Future: invariant checks («work item without target file»). Not blocking MVP.
