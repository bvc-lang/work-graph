# Closing: epic-iohasc-heritage-reuse-v1

**Date:** 2026-06-04  
**Epic:** `epic-iohasc-heritage-reuse-v1`  
**Intake:** [AN-69](pvrg-ir-semantic-plane-usage-audit.md)

## Outcome

Heritage-трек ioHasC formalized: ADR + port-registry + MVP ports for TurIr, pvrg-core adapter, semantic runtime Stage 2, GBC slice, Vector DSL bridge, embed contract, dual-track alignment.

## Delivered

| Wave | Artifacts |
|------|-----------|
| P0 | `docs/adr-iohasc-heritage-reuse-v1.md`, `docs/iohasc-heritage-port-registry.v1.json`, `npm run check:iohasc-heritage-port-registry` |
| P1 | `src/irFlow/*`, RichIR ADR, LLM normalizer spec |
| P2 | `src/pvrgCoreScannerAdapter.mjs` |
| P3 | `src/semanticRuntimeStage2.mjs` |
| P4 | `src/vectorDslCodegenPort.mjs` |
| P5 | `src/gbcSliceMvp.mjs` |
| P6 | `docs/adr-iohasc-workgraph-embed-v1.md` |
| Align | `docs/adr-dual-track-lite-heritage-v1.md` |

## Deferred (explicit)

- GVM verify / Genesis IDE — `optional-gvm-verify-worker-gate`
- Full ioHasC orchestrator port — embed-only
- Production LLM normalizer endpoint — deterministic stub in CI

## Verification

```bash
npm run check:iohasc-heritage-port-registry
node --test tests/irFlowExecutor.test.mjs tests/irFlowNormalizer.test.mjs tests/pvrgCoreScannerAdapter.test.mjs tests/semanticRuntimeStage2.test.mjs tests/gbcSliceMvp.test.mjs
```

## Next

Continue `epic-intent-information-semantic-planes-v1` on lite track; heritage extends same MCP surface without duplicate graph store.
