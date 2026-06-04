# Spec: Semantic plane MCP P0 v1

**Tools:** `query_semantic_field`, `detect_semantic_drift`, `get_context_slice`

## query_semantic_field

```json
{
  "q": "payment gateway validator",
  "scope": { "workId": "optional-anchor" },
  "depth": 1,
  "limit": 12
}
```

Response: ranked nodes `{ id, kind, score, label }` + edges from intent plane index.

## detect_semantic_drift

```json
{ "workId": "ready-task" }
```

Response:

```json
{
  "schema": "semantic.drift.result.v1",
  "workId": "ready-task",
  "alignment_score": 0.72,
  "drift_score": 0.28,
  "reasons": [{ "code": "low_goal_overlap", "message": "...", "weight": 0.4 }]
}
```

See [semantic-plane-metrics-v1.md](semantic-plane-metrics-v1.md).

## get_context_slice

```json
{ "workId": "ready-task", "maxTokens": 4000 }
```

Combines graph RAG context slice + semantic field anchor + evidence read model.

## Agent example: «правлю валидатор»

1. `get_context_slice({ workId: "implement-step-code-trace-link-validator" })`
2. `detect_semantic_drift({ workId: "implement-step-code-trace-link-validator" })`
3. `query_semantic_field({ q: "validator trace link", scope: { workId: "..." } })`

## Resource (optional P1)

`workgraph://semantic/{workId}` — deferred; JSON tool responses suffice for v1.
