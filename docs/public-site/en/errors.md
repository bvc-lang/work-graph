## How to read errors

Work Graph errors come from MCP tools and local checks (`workgraph:doctor`, backlog lint). Codes are stable: put them in runbooks and automate recovery.

JSON for agents: `/api/docs/errors-context`.

## P0 codes

| Code | Meaning | Recovery |
|------|---------|----------|
| `duplicate_work_id` | A task with this `work.id` already exists under `intent/` | Pick a new id or update the existing `.bvc` |
| `invalid_bvc_section` | Atom missing Basis, Vector or Goal | Complete sections; see [BVC specification](/docs/bvc-spec) |
| `missing_evidence` | Task cannot close without proof | Run contract checks, attach logs, retry `assert_task_ready_for_done` |

## Common situations

**Agent created the task twice** — second `create_work_item` with the same id → `duplicate_work_id`. Fix: merge into one atom or use a new id suffix.

**“Done” in chat but board shows verify** — agent skipped `assert_task_ready_for_done` or got `ok: false`. Read `missing[]` for check id and missing evidence.

**Backlog lint fails in CI** — often `invalid_bvc_section` or broken intent hierarchy. Run `npm run lint:backlog` locally before push.

## Recovery policy

1. Do not set `work.status` to `done` manually while bypassing the gate — project memory and audit will diverge from the contract.
2. Fix evidence and contracts through git like any other change.
3. When unsure, open the task drawer in the UI and compare with `get_work_contract` output.

## Related tools

- `create_work_item`, `get_work_contract`, `assert_task_ready_for_done` — see [MCP tools](/docs/mcp-tools)
- Tier matrix — [Verification matrix](/docs/verification-matrix)
