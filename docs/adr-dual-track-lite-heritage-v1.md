# ADR: dual-track — lite semantic plane vs ioHasC heritage

**Status:** accepted  
**Date:** 2026-06-04  
**Context:** [AN-69](../work/analytics/pvrg-ir-semantic-plane-usage-audit.md)

## Decision

Два **параллельных** эпика, не блокирующих друг друга:

| Track | Epic | Доставляет |
|-------|------|------------|
| **Lite** | `epic-intent-information-semantic-planes-v1` | PVRG-lite, lexical semantic MCP, UI graph |
| **Heritage** | `epic-iohasc-heritage-reuse-v1` | TurIr, pvrg-core adapter, GBC/GFS, embed |

## Matrix: capability → track

| Capability | Lite v1 | Heritage |
|------------|---------|----------|
| Task subgraph | `get_pvrg_task_scope` | + pvrg-core file/symbol nodes |
| Semantic query | `semantic_search` BM25/TF-IDF | + embeddings (later) |
| Drift | BVC + evidence + bracket hash | + IR Flow trace |
| Context slice | graph RAG bundle | + semantic runtime Stage 2 |
| Navigation API | `query_intent_plane` (planned) | same nodes, richer facts |

## Rule

Lite ships **first usable operator value**. Heritage **extends** schemas `pvrg.*` / `ir.flow.*`, не создаёт параллельный «semantic graph store».
