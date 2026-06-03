# Design: SDK contract wrapper v1 (P2 — MCP-first)

**Status:** design-only (deferred implementation)  
**Epic:** `epic-work-graph-bvc-contract-verification-v1`  
**Sources:** [AN-50.1](../work/analytics/work-graph-bvc-contract-verification.md), [ADR: work-item contract projection](./adr-work-item-contract-projection-v1.md)

---

## Goal

Provide ergonomic npm/TypeScript sugar for agents and CI scripts **without** introducing a second source of truth beside Work Graph MCP.

**Canonical surface:** MCP tools in `@work-graph/mcp`:

| MCP tool | Role |
|----------|------|
| `get_work_contract` | Read `work-item-contract.v1` projection |
| `validate_evidence` | Pre-flight structured evidence vs contract |
| `assert_task_ready_for_done` | Dry-run readiness → `violations[]` |
| `add_work_item_evidence` | Append prose and/or structured evidence |
| `complete_work_item` | Transition to `done` with shared readiness rules |

Resource: `workgraph://contract/{workId}`

---

## Non-goals (MVP defer)

- No standalone `@work-graph/contract-layer` npm package yet.
- No duplicate projection logic outside `src/workItemContractProjection.mjs`.
- No bypass of MCP write path for backlog mutations.

---

## Proposed package sketch (`@work-graph/contract-layer`)

Thin client over MCP stdio or HTTP transport:

```typescript
import { WorkGraphContractClient } from '@work-graph/contract-layer';

const client = WorkGraphContractClient.fromEnv(); // WORKGRAPH_ROOT

const contract = await client.getContract('implement-step-code-trace-link-validator');
const check = await client.validateEvidence('implement-step-code-trace-link-validator', {
  type: 'command',
  status: 'succeeded',
  command: contract.output.evidenceRequired[0]?.cmd ?? 'npm run test:deterministic',
  exitCode: 0,
});
await client.assertReady('implement-step-code-trace-link-validator');
await client.addEvidence('implement-step-code-trace-link-validator', { structuredEvidence: check.normalized });
await client.complete('implement-step-code-trace-link-validator', { evidence: check.normalized.summary });
```

All methods map 1:1 to MCP tool calls; responses are pass-through JSON.

---

## Auto-evidence generation

Helper (future) runs **allowed commands only** from contract projection:

```typescript
const run = await client.runAllowedCheck('work-id', {
  pick: 'primary', // first evidenceRequired row
  cwd: process.cwd(),
});
// run → { command, exitCode, stdoutTail, structuredEvidence }
await client.addEvidence('work-id', { structuredEvidence: run.structuredEvidence });
```

**Safety rules:**

- Command allowlist comes from `contract.output.evidenceRequired[].cmd` and matrix hints — never arbitrary shell.
- Non-zero exit → `status: failed`, do not call `complete_work_item`.
- stdout/stderr truncated before storage (same limits as worker journal).

---

## Migration path

1. **Now:** agents use MCP tools directly (Cursor, CLI sidecar).
2. **Next:** optional `@work-graph/contract-layer` re-exports typed wrappers + `runAllowedCheck`.
3. **Later:** CI job template `work-graph verify --work-id=…` calling the same MCP server.

Structured evidence remains optional in atom-draft schema; Tier A gate tasks enforce via runtime (`add_work_item_evidence`, `complete_work_item`).

---

## References

- `src/workItemContractProjection.mjs` — projection
- `src/workItemReadyForDone.mjs` — shared readiness
- `src/structuredEvidenceV1.mjs` — evidence-record shape + append validation
- `packages/workgraph-mcp/README.md` — operator/agent flow
