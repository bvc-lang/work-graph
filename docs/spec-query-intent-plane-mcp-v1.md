# Spec: MCP `query_intent_plane` v1

**Schema:** `intent.plane.query.v1` / `intent.plane.query.result.v1`

## Request

```json
{
  "startNode": { "kind": "work", "id": "child-task" },
  "direction": "downstream",
  "depth": 1,
  "filters": { "status": "backlog", "department": "system-runtime" },
  "returnFormat": "json"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `startNode.id` | yes | work id or analytics key |
| `direction` | no | `downstream` (default), `upstream`, `lateral`, `both` |
| `depth` | no | 0..3, default 1 |
| `filters.status` | no | work.status label |
| `filters.department` | no | work.department |
| `returnFormat` | no | `json` or `markdown` |

## Response

```json
{
  "schema": "intent.plane.query.result.v1",
  "focusWorkId": "child-task",
  "direction": "downstream",
  "depth": 1,
  "nodes": [{ "id": "child-task", "kind": "work", "title": "...", "status": "backlog" }],
  "edges": [{ "from": "child-task", "to": "src/child.mjs", "relation": "targets" }]
}
```

## Examples

### Upstream dependencies

```json
{ "startNode": { "kind": "work", "id": "child-task" }, "direction": "upstream", "depth": 1 }
```

### Lateral siblings (same epic parent)

```json
{ "startNode": { "kind": "work", "id": "child-task" }, "direction": "lateral", "depth": 1 }
```

### Empty graph

When `startNode` unknown → `{ "error": "unknown_start_node", "nodes": [], "edges": [] }`

## Agent limits

- Read-only
- max depth 3
- allowed node kinds: work, file (v1)

## Error codes

| Code | When |
|------|------|
| `unknown_start_node` | id not in index |
| `depth_out_of_range` | depth > 3 |
| `invalid_direction` | not in enum |
