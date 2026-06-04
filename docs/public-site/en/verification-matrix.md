## Why a verification matrix

Work Graph closes work on a **contract verdict**, not agent prose. The tier A/B/C matrix defines what proof is required for a `work.id` given its BVC labels and checks.

MCP tool: `assert_task_ready_for_done` — returns `ok` and a `missing[]` list with specific violations.

## Tier levels

| Tier | Requirement | Example |
|------|-------------|---------|
| **A** | Deterministic command with exit code 0 | `npm test`, `npm run lint:backlog`, `bvc lint` |
| **B** | Optional or environment gate | staging check, manual script with log |
| **C** | Manual review / policy | architecture approval, security sign-off |

Tier A is required for production-ready work items by default. B/C are declared in the atom **Checks** section.

## What operators see

In the Work Graph UI (`npm run workgraph:ui`), the matrix appears on **Verification**: which commands passed, what is missing, links to evidence records. Agents see the same state via MCP — no “green on the board, red in the contract” drift.

## Verdict examples

**Ready** — all Tier A checks green, evidence linked to `work.id`, `assert_task_ready_for_done` → `{ "ok": true, "missing": [] }`.

**Not ready** — tests were not run: `missing` lists check id and `missing_evidence` or command output.

**Manual gate** — Tier C: evidence record `manual-review` with `succeeded` and reviewer reference.

## Link to BVC

The **Checks** section in `.bvc` and the UI matrix share one definition of ready. Agents must not declare done while `missing[]` is non-empty — the board stays at `verify` or `blocked`.

See also [Evidence ledger](/evidence-ledger) and [MCP tools](/docs/mcp-tools).
