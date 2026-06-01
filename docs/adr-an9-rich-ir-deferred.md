# ADR: AN-9 RichIR — deferred (no Work Graph runtime hook)

**Status:** deferred  
**Date:** 2026-06-01  
**Context:** [AN-38 audit](../work/analytics/llm-pvrg-richir-memory-slices-usage-audit.md), [AN-9 analytics](../work/analytics/ir-rich-ir-open-canon.md)

## Decision

**RichIR / TurIr as LLM memory or agent IR layers are deferred** in Work Graph until a concrete use case and integration point are defined.

Work Graph runtime **does not** expose RichIR identifiers in `src/`. What works today:

| Layer | Schema / artifact | Consumer |
|-------|-------------------|----------|
| Task graph | `pvrg.task-scope.slice.v1`, `pvrg.graph_rag.context.v1` | WG worker (auto), Cursor MCP (`get_pvrg_task_scope`, `get_graph_rag_context`) |
| Memory | `memory-record.v1` | WG worker (auto), Cursor MCP (`list_memory_records`) |
| Evidence | `evidence-record.v1` | Graph RAG nodes, Cursor MCP (`list_evidence_records`) |
| Worker IR | `agent-worker.input.v1` / `agent-worker.output.v1` | WG agent worker only |

AN-9 remains **research / open canon** documentation — not a backlog commitment for runtime wiring.

## Rationale

1. AN-38 verified zero `RichIR`/`TurIr` matches in `src/` — no partial implementation to extend.
2. Graph RAG + memory + evidence already cover the stated AN-38 goal («durable context without replaying transcripts»).
3. Introducing RichIR without a distinct capability risks duplicating graph RAG and confusing operators (analytics vs production).

## Consequences

- Backlog items referencing «RichIR runtime» stay **backlog/deferred** unless tied to a new epic with explicit MCP or worker hook.
- Analytics docs (`ir-rich-ir-open-canon.md`, `unique-tech-stack-meta-review.md`) should label RichIR as **research-only**.
- Revisit when: (a) external RichIR spec stabilizes, or (b) a pilot needs CFG/bracket-IR trace beyond BVC + step-graph projection.

## Supersedes

Nothing. Confirms AN-38 §9 recommendation: do not invest in RichIR runtime before ADR.
