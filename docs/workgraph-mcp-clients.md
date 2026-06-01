# WorkGraph MCP Clients

## Цель

WorkGraph MCP exposes WorkItems to external agent clients. Cursor or Claude stays the chat/workbench UI; WorkGraph keeps the dashboard, kanban, runtime policy, evidence, and intent tree storage.

## Cursor

Project-local example:

```json
{
  "servers": [
    {
      "id": "workgraph",
      "command": "node",
      "args": ["packages/workgraph-mcp/src/index.mjs"],
      "cwd": "D:/Work/IDE/work graph",
      "env": {
        "WORKGRAPH_ROOT": "D:/Work/IDE/work graph"
      },
      "enabled": true
    }
  ]
}
```

If the client does not support `cwd`, use absolute args:

```json
{
  "command": "node",
  "args": ["D:/Work/IDE/work graph/packages/workgraph-mcp/src/index.mjs"],
  "env": {
    "WORKGRAPH_ROOT": "D:/Work/IDE/work graph"
  }
}
```

## Claude Desktop

Add an MCP server entry to Claude Desktop config:

```json
{
  "mcpServers": {
    "workgraph": {
      "command": "node",
      "args": ["D:/Work/IDE/work graph/packages/workgraph-mcp/src/index.mjs"],
      "env": {
        "WORKGRAPH_ROOT": "D:/Work/IDE/work graph"
      }
    }
  }
}
```

On Windows, prefer forward slashes in JSON paths or escape backslashes as `D:\\Work\\IDE\\work graph\\...`.

## Claude Code

Use the same command and environment:

```json
{
  "workgraph": {
    "command": "node",
    "args": ["D:/Work/IDE/work graph/packages/workgraph-mcp/src/index.mjs"],
    "env": {
      "WORKGRAPH_ROOT": "D:/Work/IDE/work graph"
    }
  }
}
```

## Diagnostics

- Run `npm install` in the WorkGraph repository root before connecting a client.
- Run `WORKGRAPH_ROOT=. npm run mcp:workgraph` from a terminal to check that the server starts. For PowerShell: `$env:WORKGRAPH_ROOT='.'; npm run mcp:workgraph`.
- If the client says the server is not found, replace relative `args` with an absolute path.
- If tools are not visible, **restart the MCP client** after editing config or after pulling server changes (new tools such as `get_promote_ready_queue`, `create_work_item`, and `semantic_search` require a process restart).
- After restart, verify tools: `get_current_cycle` should include `phase8PlusPromoteReadyQueue`; optional `get_promote_ready_queue` lists phase-8+ backlog items eligible for promote-ready.
- If write tools fail, read the returned error: `done` requires evidence, `blocked` requires a reason, and `claim_work_item` only accepts ready items.

## Tool surface (current)

Read: `list_work_items`, `get_work_item`, `get_backlog_snapshot`, `get_current_cycle`, `get_promote_ready_queue`, `read_work_item_atom`, `semantic_search`

Write: `create_work_item`, `update_work_item_status`, `add_work_item_evidence`, `claim_work_item`, `complete_work_item`
