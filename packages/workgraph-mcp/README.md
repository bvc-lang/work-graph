# @work-graph/mcp

[MCP](https://modelcontextprotocol.io) server for Work Graph — list, create, and update work items in `intent/**/*.work.bvc`.

## Cursor

After `npx @work-graph/cli init .`, `.cursor/mcp.json` includes:

```json
{
  "mcpServers": {
    "workgraph": {
      "command": "npx",
      "args": ["-y", "@work-graph/mcp"],
      "env": {
        "WORKGRAPH_ROOT": "${workspaceFolder}",
        "WG_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

Reload MCP in Cursor after init.

## Standalone

```bash
WORKGRAPH_ROOT=/path/to/project npx @work-graph/mcp
```

Requires a project with `.work-graph/config.json` (run `npx @work-graph/cli init` first).

## Contract tools (AN-50.1)

| Tool | Description |
|------|-------------|
| `get_work_contract` | Returns `work-item-contract.v1` projection (input/output/verification) |
| `assert_task_ready_for_done` | Dry-run readiness check → `violations[]` |
| `validate_evidence` | Validate structured evidence JSON vs contract |
| `add_work_item_evidence` | Append prose and/or `structuredEvidence` (Tier A gates enforce structured command) |
| `complete_work_item` | Enforces same readiness rules; returns `violations[]` on failure |

Resource: `workgraph://contract/{workId}`

Recommended agent flow: `get_work_contract` → run checks → `validate_evidence` → `assert_task_ready_for_done` → `complete_work_item`.
