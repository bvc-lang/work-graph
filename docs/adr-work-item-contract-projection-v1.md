# ADR: Work-item contract projection v1

**Status:** accepted (AN-50.1)  
**Date:** 2026-06-02  
**Epic:** `epic-work-graph-bvc-contract-verification-v1`  
**Sources:** [AN-50.1](../work/analytics/work-graph-bvc-contract-verification.md), [AN-50](../work/analytics/verification-panel-tests-evidence-intent.md), `protocols/evidence-model-v1.bvc`, `src/verificationLoop.mjs`

## Context

BVC WorkItem atoms already encode intent (basis/vector/goal/checks, `work.target_files`, matrix gate rows). Agents and the «Проверки» panel lack a **single machine-readable contract** and structured **violations[]** before `done`.

## Decision

1. **Projection, not duplicate YAML** — `work-item-contract.v1` is a **read-model** built from atom + `VERIFICATION_MATRIX` + evidence-model. Optional atom `contract.override` may merge later; until then, no mandatory `contract:` block in every `.work.bvc`.

2. **Pure projection module** — `src/workItemContractProjection.mjs`:
   - `buildWorkItemContractV1(workItem, ctx) → WorkItemContractV1`
   - **Pure:** no I/O, no status mutation, no evidence writes
   - **Deterministic:** same inputs → same JSON

3. **Shared readiness evaluation** — `src/workItemReadyForDone.mjs`:
   - `evaluateWorkItemReadyForDone(workItem, ctx) → { ok, violations[], suggestedCommands[] }`
   - Used by **`assert_task_ready_for_done`** (dry-run) and **`complete_work_item`** (enforce)
   - `complete_work_item` **does not require** a prior assert call (humans, scripts, idempotent reclaim)

4. **Tier from matrix** — rows where `workId ∈ row.gateTaskIds`:
   - Map tier: `deterministic` → A, `optional-env` → B, `optional-llm` → C
   - Multiple rows: **highest tier wins** (A > B > C); `matrixRowIds[]` = all matches; `matrixRowId` = primary (first Tier A, else first match)
   - Not in any `gateTaskIds`: `verification.tier: null` (checks + target_files only)

5. **Structured evidence migration**
   - **P0 gate (Tier A gate tasks):** `type`, `command`, `exitCode`, `status: succeeded`, `taskId`
   - **P1 strict:** + `time`, `source`, `summary` per `evidence-record-v1`
   - **P1 audit:** + `artifacts[]`, optional stdout hash
   - Prose in «Свидетельства» remains valid for non-gate tasks

6. **UI contract summary (P1)** — compact strip on «Проверки» for selected task: tier, matrix row, violation count; expand → **text list** of `violations[]` (not a new heatmap matrix)

7. **Contract Health metrics (P1)** — dashboard snapshot: `% gate tasks with structured evidence`, `% assert first-pass` (requires lightweight assert audit log)

## Schemas

### work-item-contract.v1

See AN-50.1 §3.

### work-item-ready-for-done.v1

```json
{
  "schema": "work-item-ready-for-done.v1",
  "workId": "implement-mcp-get-work-contract",
  "ok": false,
  "violations": [
    {
      "code": "missing_evidence",
      "severity": "error",
      "message": "done requires non-empty evidence",
      "fix": "add_work_item_evidence with command output"
    },
    {
      "code": "structured_evidence_required",
      "severity": "error",
      "message": "Tier A gate task requires command evidence with exitCode=0",
      "fix": "validate_evidence then add structured payload"
    },
    {
      "code": "matrix_gate_pending",
      "severity": "warn",
      "message": "matrix row trace-links-v1: gate task implement-step-code-trace-link-validator not done",
      "fix": null
    }
  ],
  "suggestedCommands": ["npm run test:deterministic"]
}
```

## MCP tools

| Tool | Behavior |
|------|----------|
| `get_work_contract(workId)` | Returns `work-item-contract.v1` |
| `validate_evidence(workId, evidenceJson)` | Pre-flight vs contract + evidence-model-v1 |
| `assert_task_ready_for_done(workId)` | Dry-run `evaluateWorkItemReadyForDone` |
| `complete_work_item(workId, evidence)` | Same evaluate; on fail return `violations[]` (P0.5), do not require prior assert |

**Cursor rule (recommended, not protocol):** assert → fix → complete.

## Consequences

- **Positive:** one source of truth for gates; agent-friendly fixes; no second orchestrator
- **Negative:** projection must stay in sync with matrix/atom changes — golden tests required
- **Risk mitigated:** “magic projection” — ADR + pure module + fixtures

## Anti-goals

- Tree-only contract YAML in every atom
- Mandatory assert before complete at protocol level
- Big-bang structured evidence for all tasks
- SDK contract wrapper before MCP v1 stable (P2)
