# ADR: информационная и смысловая плоскости Work Graph v1

**Status:** accepted  
**Date:** 2026-06-04  
**Context:** [AN-65](../work/analytics/work-graph-intent-information-plane.md), [AN-68](../work/analytics/work-graph-semantic-plane.md)

## Decision

Work Graph v1 вводит две **контрактные плоскости** поверх intent tree + BVC:

| Plane | Question | Primary artifacts |
|-------|----------|-------------------|
| **Information** | Где что лежит и как связано? | work items, evidence, unified linkage, statuses |
| **Semantic** | Насколько код/факты согласованы с намерением? | drift, voids, semantic field, context slice |

## Dimensions (shared vocabulary)

- **Topology** — nodes/edges (work, file, step, evidence)
- **State** — backlog status, pipeline stage, claim
- **Evidence** — свидетельства, trace refs, codegen records
- **Semantics** — alignment intent↔code, lexical/structural similarity
- **Time** — snapshots, temporal diff (P2)

## MCP mapping

| MCP tool | Plane | Notes |
|----------|-------|-------|
| `get_unified_linkage` | Information | Base graph |
| `query_intent_plane` | Information | Scoped navigation API (v1) |
| `semantic_search` | Semantic (lexical) | Existing workflow |
| `query_semantic_field` | Semantic | Field around workId |
| `detect_semantic_drift` | Semantic | BVC vs code/evidence |
| `get_context_slice` | Both | Agent bundle (graph RAG + semantic) |
| `find_semantic_voids` | Semantic | P1 |

## Anti-goals (v1)

1. Not a wiki / free-form notes store
2. No cross-repo federation
3. No unbounded agent graph crawl outside task scope
4. No duplicate graph store parallel to intent tree

## Heritage dual-track

Lite semantic plane ships on PVRG-lite + BVC. Heritage track (TurIr, pvrg-core) **extends** the same MCP names — see [adr-dual-track-lite-heritage-v1.md](adr-dual-track-lite-heritage-v1.md).

## Consequences

- Canonical model: `design-intent-plane-canonical-model-v1`
- Linkage index: `src/intentPlaneLinkageIndex.mjs`
- Plans: [plan-intent-information-semantic-planes-v1.md](plan-intent-information-semantic-planes-v1.md)
