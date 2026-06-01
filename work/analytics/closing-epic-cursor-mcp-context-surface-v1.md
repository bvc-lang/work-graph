# Closing: epic-cursor-mcp-context-surface-v1 (AN-38)

**Epic:** `epic-cursor-mcp-context-surface-v1`  
**Date:** 2026-06-01  
**Source:** [AN-38 audit](llm-pvrg-richir-memory-slices-usage-audit.md)

## Delivered

| Subtask | Outcome |
|---------|---------|
| `implement-mcp-get-graph-rag-context` | MCP tool `get_graph_rag_context` + resource `workgraph://pvrg/graph-rag/{workId}` |
| `implement-mcp-memory-records-tools` | `list_memory_records`, `get_memory_record` + `workgraph://memory/records`, `workgraph://memory/record/{recordId}` |
| `implement-mcp-evidence-records-tools` | `list_evidence_records`, `get_evidence_record` + evidence resources |
| `add-cursor-rule-proactive-pvrg-context` | `.cursor/rules/work-item-claim-context.mdc` (alwaysApply) |
| `extend-llm-usefulness-eval-cursor-mcp-surface` | `evaluateCursorMcpContextSurface` in `workGraphLlmUsefulnessEval.mjs` |
| `decide-an9-rich-ir-runtime-or-deferred` | [docs/adr-an9-rich-ir-deferred.md](../../docs/adr-an9-rich-ir-deferred.md) |

## Evidence

- `npm run test:deterministic` — 648/648 green
- New MCP tools registered in `packages/workgraph-mcp/src/index.mjs`
- Handlers in `packages/workgraph-mcp/src/handlers.mjs`

## Remaining (out of scope)

- Auto-injection into Cursor system prompt (Cursor-controlled, not WG)
- RichIR runtime (deferred per ADR)
