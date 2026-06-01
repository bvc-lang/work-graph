# WorkGraph MCP Client Strategy

## Решение

WorkGraph becomes an MCP-first operational backend for agent clients. Cursor, Claude Desktop, Claude Code, or another MCP client provides the chat/workbench UI; WorkGraph provides tasks, status policy, evidence, backlog/dashboard, and intent tree storage.

## Граница UI

The WorkGraph dashboard remains the place for kanban, backlog overview, dependencies, verification, memory, and read-only projections. It should not compete with Cursor/Claude as the primary agent chat UI.

The MCP server exposes WorkGraph to external clients through standard protocol surfaces:

- tools for reading WorkItems and guarded writes;
- resources for backlog, current cycle, and individual items;
- prompts for common SCRUM-style WorkGraph workflows.

## MVP Tools And Resources

Read tools:

- `list_work_items`
- `get_work_item`
- `get_backlog_snapshot`
- `get_current_cycle`
- `read_work_item_atom`

Write tools:

- `create_work_item`
- `update_work_item_status`
- `add_work_item_evidence`
- `claim_work_item`
- `complete_work_item`

Search tools:

- `semantic_search`

Resources:

- `workgraph://backlog`
- `workgraph://cycle/current`
- `workgraph://item/{workId}`

## Portability Rule

The server must be a stdio MCP server with no Cursor API dependency. `WORKGRAPH_ROOT` points to the WorkGraph repository, and the same command should work from Cursor, Claude Desktop, Claude Code, and other MCP clients.

## Safety Gates

- Status changes go through WorkGraph transition helpers.
- `done` requires evidence.
- `blocked` requires a reason.
- Agents should read a WorkItem before writing.
- Destructive or broad file changes remain subject to the user's agent client approval flow.
