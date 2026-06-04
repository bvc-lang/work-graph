# Spec: LLM IR normalizer v1

**Schema:** `ir.flow.normalizer.result.v1`  
**Implementation:** `src/irFlow/llmIrNormalizer.mjs`

## Purpose

Convert BVC prose (numbered/bulleted steps) into structural `ir.flow.v1` for TurIr executor pilot workflows.

## Modes

| Mode | When | Network |
|------|------|---------|
| `deterministic-stub` | CI / `test:deterministic` | No |
| `provider` | Worker with LLM configured | Optional |

## Input

```json
{
  "taskId": "pilot-task",
  "prose": "1. Validate inputs\n2. Run verify gate\n3. Record evidence"
}
```

## Output

Normalizer returns `{ flow, validation, summary }` where `flow` conforms to `packages/ir-spec/schemas/ir-flow.v1.json`.

## Boundaries

- Does not call ioHasC `irNormalizer.js` directly; behavior is ported and adapted to WG worker provider hooks.
- Full LLM semantic node labeling is **P2**; v1 uses prose lines as action goals.
