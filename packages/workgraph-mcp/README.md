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
