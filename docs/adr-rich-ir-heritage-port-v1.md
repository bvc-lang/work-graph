# ADR: RichIR / TurIr heritage port — scope MVP

**Status:** accepted  
**Date:** 2026-06-04  
**Context:** [adr-iohasc-heritage-reuse-v1.md](adr-iohasc-heritage-reuse-v1.md), [packages/ir-spec](../packages/ir-spec/)

## Decision

Port **minimal IR Flow runtime** в WG:

- `validateIrFlow` — structural validation `ir.flow.v1`
- `executeIrFlowCfg` — deterministic walk start→action/decision→end
- `llmIrNormalizer` — stub + hook для LLM (deterministic CI без network)

**Не portим:** полный TurIr bundle editor, Shannon barrier UI, React panels из ioHasC.

## Scope MVP

| In | Out |
|----|-----|
| JSON `ir.flow.v1` validate/execute | Full ioHasC `src/ir/turIr.ts` |
| Trace `ir.flow.execution.v1` | LLM normalizer production endpoint in CI |
| Optional verify gate label `trace.ir_flow` | CFG editor in dashboard |

## Integration

- Evidence / verify: work items с `trace.ir_flow` path в labels.
- Semantic plane: IR для **исполнимого workflow**, не backlog navigation.
- Supersedes **partially** AN-9 defer для heritage pilot only.

## Consequences

- Code: `src/irFlow/`
- Tests: `tests/irFlowExecutor.test.mjs`, `tests/irFlowNormalizer.test.mjs`
- Spec: `packages/ir-spec/schemas/ir-flow.v1.json`
