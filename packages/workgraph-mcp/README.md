# @work-graph/mcp

[MCP](https://modelcontextprotocol.io) server for Work Graph — list, create, and update work items in `intent/**/*.work.bvc`.

Website: [workgraph.ru/en](https://workgraph.ru/en/)

Works with any MCP-capable agent client (Cursor, Claude Desktop, Claude Code, and others).

## After `work-graph init`

`npx @work-graph/cli init .` writes `.cursor/mcp.json` when you use Cursor. The entry looks like:

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

Reload MCP in your IDE after init. For Claude Desktop / Claude Code and other clients, use the same command and env — see [workgraph-mcp-clients.md](https://github.com/bvc-lang/work-graph/blob/main/docs/workgraph-mcp-clients.md) in the monorepo.

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

## Links

- Website: https://workgraph.ru/en/
- npm: https://www.npmjs.com/package/@work-graph/mcp
- Monorepo: https://github.com/bvc-lang/work-graph
