# ADR-0001: Step↔code trace linkage scope (level 0)

| Field | Value |
|-------|-------|
| **Status** | accepted |
| **Date** | 2026-05-30 |
| **Deciders** | Work Graph rebuild / operator platform |
| **Analysis** | [2026-05-trace-linkage-necessity.md](../analysis/2026-05-trace-linkage-necessity.md) |
| **Protocol** | [step-code-trace-links-v1.bvc](../../protocols/step-code-trace-links-v1.bvc) (contract); [trace-linkage-scope-decision.bvc](../../protocols/trace-linkage-scope-decision.bvc) (accepted scope) |
| **Supersedes** | — |
| **Superseded by** | — |

## Context and problem statement

Work Graph перенёс протокол Trace Links v1 и MVP runtime (validator, linkage projection, code-gap), но не перенёс ioHasC codegen loop (`generate`, mandatory `validate:trace-links`, unified linkage из compiler blocks). Нужно зафиксировать **границу scope**, чтобы не тратить effort на parity без product case и не смешивать planning (`target_files`) с execution trace graph.

## Decision drivers

- Headless intent backend (MCP-first); Cursor — editor, не второй Monaco shell ([adr-workgraph-headless-intent-backend.md](../adr-workgraph-headless-intent-backend.md)).
- Operator loop уже закрывается через evidence + verification + bounded `target_files`.
- Duplicate source of truth (labels + markers + target_files) повышает drift без authoring discipline.
- Code-gap и compiler roundtrip уже дают **signals**, не blocking gates.

## Considered options

1. **Full ioHasC parity** — port generate, trace-links CI, TUR scanner mandatory, GBC trace slices.
2. **Level 1** — enforce trace labels for code-facing work items (lint warnings → errors).
3. **Level 0 (chosen)** — keep protocol + validator + optional code-gap; **target_files-first** authoring; defer codegen/trace CI parity.
4. **Remove trace protocol** — только `target_files`; потеря совместимости с intent tree и future memory/RAG.

## Decision outcome

**Chosen option: Level 0.**

We will treat [`protocols/step-code-trace-links-v1.bvc`](../../protocols/step-code-trace-links-v1.bvc) as the **contract** and keep `parseTraceLinksV1` / `validateTraceLinksV1` / linkage drilldown / optional `npm run code-gap:analyze` as **MVP tooling**. We will **not** port ioHasC `generate` or mandatory `validate:trace-links` into Work Graph mandatory CI without a new ADR. Code-facing work items may continue to use `work.target_files` as the primary scope pointer; trace labels are **encouraged but not required** until level 1 is explicitly adopted.

### Positive consequences

- Scope control aligned with headless ADR and audit-gap «deferred» for full orchestrator/codegen.
- No new mandatory CI burden or triple-maintenance of refs.
- Protocol and validator remain ready for level 1+ without rewrite.

### Negative consequences

- Operator drilldown weaker when items have only `target_files` without trace labels.
- No deterministic step→TS loop in this repo; codegen stays in `../project` (ioHasC).
- Rejected ioHasC ideas may resurface unless this ADR and analysis stay linked.

## Rejected / deferred alternatives

| Option | Outcome | Why |
|--------|---------|-----|
| Full ioHasC trace/codegen parity | **rejected** (for rebuild scope) | Cost >> value for MCP operator loop; IDE path remains in ioHasC |
| Level 1 lint enforcement | **deferred** | Enable when weak-target_files warnings recur in practice |
| Port `compileHascStepVectorToTs` / `generate` | **deferred** | Requires product decision «codegen-first»; track in audit-gap |
| Mandatory code-gap in `ci:mandatory` | **rejected** | Stays optional-env signal |

## Implementation notes

- Existing: `src/workGraphRuntime.mjs`, `src/unifiedLinkageProjection.mjs`, `src/codeGapAnalyzer.mjs`, operator code-gap panel.
- Optional eval: `npm run eval:optional:blocked-onebase-go` (env blocker, not trace graph).
- Do **not** add long analysis to roadmap files; link here and to [analysis](../analysis/2026-05-trace-linkage-necessity.md).

## Review criteria (when to reopen)

Supersede this ADR if **any**:

1. Product mandates **codegen-from-step** as primary delivery in Work Graph (not Cursor-only edits).
2. Regulated domain requires **atom→symbol** audit with CI blocking on broken links.
3. >N recurring incidents from `trace.weak_target_files_only` per quarter → adopt level 1 via new ADR.

## Links

- Analysis: [docs/analysis/2026-05-trace-linkage-necessity.md](../analysis/2026-05-trace-linkage-necessity.md)
- Audit-gap: [plan-iohasc-rebuild-audit-gap-matrix.md](../plan-iohasc-rebuild-audit-gap-matrix.md) § Architecture decisions
- ioHasC donor: `../project/docs/trace-links.md`, `validate:trace-links`
