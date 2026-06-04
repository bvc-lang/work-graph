## Why MCP in Work Graph

MCP is how IDE agents read backlog, contracts and evidence. The HTML site is for humans; **MCP tools** are programmatic access to the same git-backed data.

Before creating work items, use `/api/docs/bvc-authoring-context`. Full tool schemas: `/api/docs/mcp-tools-context`.

## P0 tools

| Tool | Input | Output | When to call |
|------|-------|--------|--------------|
| `create_work_item` | `workId`, `title`, `basis`, `vector`, `goal` | `workId`, `path` | New task with a BVC contract |
| `get_work_contract` | `workId` | `workId`, `contract` | Before edits and for scope |
| `assert_task_ready_for_done` | `workId` | `ok`, `missing[]` | Before moving to done |

## Typical agent flow

1. **Read contract** — `get_work_contract(workId)` → Basis, Vector, Goal, `target_files`, checks.
2. **Claim work** — `claim_work_item` when project policy requires an explicit claim.
3. **Execute** — edits only inside the allowlist; commands only from the approved list.
4. **Attach evidence** — test output, traces, structured records (`submit_evidence` and related paths per MCP version).
5. **Check readiness** — `assert_task_ready_for_done`; if `ok: false`, do not close the task.

## Tool errors

| Code | Meaning | Action |
|------|---------|--------|
| `duplicate_work_id` | `work.id` already exists | New id or update the existing atom |
| `invalid_bvc_section` | Missing Basis, Vector or Goal | Complete the contract |
| `missing_evidence` | No proof for Tier A | Run checks, attach logs |

Details: [Errors and recovery](/docs/errors).

## Setup

After `npx @work-graph/cli init .`, the project gets `.cursor/mcp.json` (or equivalent) with `npx -y @work-graph/mcp` and `WORKGRAPH_ROOT`. Reload MCP in your IDE after `npm install`.

Client discovery: `/.well-known/mcp.json`.
