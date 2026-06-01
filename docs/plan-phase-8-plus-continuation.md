# Phase 8+ continuation track

## Цель

После закрытия фаз 8–11 на уровне design/done держать исполняемую очередь backlog→ready для post-phase work и синхронизировать OneBase parity evidence с фактическими CLI capabilities.

## Почему

- Фазы 8–11 отмечены done, но часть execution items (prompt eval fixtures, semantic map UI MVP, live onebase check) остаётся вне ready queue.
- Локальный OneBase ещё без `check`/`describe`/`ai-guide` — parity matrix должна хранить probe evidence, а не предполагать наличие команд.

## Что сделано

- `npm run probe:onebase-cli` → `work/onebase-cli-capabilities.v1.json`
- `buildPhasePromoteReadyQueue()` + MCP `get_promote_ready_queue` (после перезапуска MCP)
- `get_current_cycle` включает `phase8PlusPromoteReadyQueue`
- WorkItems в **ready**: _пусто_
- **done (175+):** Phase 8+ track; waves 1–5 incl. Phase 6 memory/evidence, claim idempotency, OneBase PVRG nodes, native tool_calls flag, REST evidence adapter; Phase 0 migration.strategy lint + audit-gap reconcile; Phase 4 PVRG/linkage UI + ANN ADR; Phase 7 codegen readiness; Phase 8 loop-hint optional eval

## Todo

### Ready (исполнять сейчас)

_post-rollout hygiene (2026-05-30): audit-gap matrix reconciled Phase 9–11; headless ADR обновлён; `npm run backfill:trace-status-verified` для done WorkItems._

Следующий optional track: live LLM re-run при смене модели (`npm run eval:live-llm`); headless-only features без нового dashboard canvas.

### Backlog (execution track)

Сиды:
- `npm run seed:all-phases-backlog` — 36 items (фазы 0–11)
- `npm run seed:intent-graph-port-backlog` — intent graph MCP wave (**done**, 8/8)

| Wave | Статус | Фокус |
|------|--------|--------|
| all-phases | 36 backlog | cross-phase execution |
| intent-graph MCP | **done** | `get_intent_hierarchy`, linkage, PVRG scope, resources |

**Intent graph MCP (закрыто):** см. [`docs/workgraph-intent-graph-mcp.md`](workgraph-intent-graph-mcp.md). Restart MCP в Cursor после pull.

### Backlog (следующая волна — execution track, 36 items)

Сид: `npm run seed:all-phases-backlog` (идемпотентно). **3 задачи на фазу 0–11**, зависят от phase epic (`phase-N-*`).

| Phase | work.id (кратко) |
|-------|------------------|
| 0 | `refresh-audit-gap-matrix-on-iohasc-changes` **(done)**, `implement-migration-label-backlog-lint` **(done)**, `document-rebuild-scope-replace-decisions` |
| 1 | `document-worker-orchestrator-boundary` **(done)**, `implement-worker-claim-idempotency-guard` **(done)**, `optional-worker-openai-native-tool-calls` **(done)** |
| 2 | `implement-daemon-watch-mode-smoke` **(done)**, `wire-audit-journal-operator-dashboard` **(done)**, `implement-draft-intake-promotion-rules` **(done)** |
| 3 | `implement-charter-preflight-promote-gate` **(done)**, `implement-intent-tree-orphan-detection` **(done)**, `wire-catalog-passport-alignment-cli` **(done)** |
| 4 | `wire-pvrg-task-scope-dashboard-panel` **(done)**, `wire-unified-linkage-operator-drilldown` **(done)**, `implement-semantic-search-vector-ann-phase2` **(done)** |
| 5 | `port-compiler-round-trip-cli-from-iohasc` **(done)**, `implement-full-code-gap-analyzer-port` **(done)**, `wire-codegen-evidence-verification-panel` **(done)** |
| 6 | `implement-memory-record-dashboard-projection` **(done)**, `wire-graph-rag-memory-slice-fusion` **(done)**, `implement-evidence-timeline-operator-view` **(done)** |
| 7 | `implement-onebase-rest-evidence-adapter` **(done)**, `wire-onebase-pvrg-domain-graph-nodes` **(done)**, `evaluate-onebase-vector-dsl-codegen-readiness` **(done)** |
| 8 | `optional-llm-loop-hint-repeat-tool-fixture` **(done)**, `port-full-agent-tool-rules-migrated-bundle` **(done)**, `implement-workgraph-agent-e2e-scenario-matrix` **(done)** |
| 9 | `implement-kanban-board-projection-ui` **(done)**, `implement-prompt-step-rules-editor-mvp` **(done)**, `wire-dashboard-hybrid-semantic-search-api` **(done)** |
| 10 | `implement-playwright-operator-dashboard-e2e` **(done)**, `wire-optional-llm-eval-release-matrix` **(done)**, `extend-promote-ready-queue-all-phases` **(done)** |
| 11 | `pilot-gbc-module-slice-ingest-boundary` **(done)**, `pilot-gfs-overlay-passport-read-path` **(done)**, `optional-gvm-verify-worker-gate` **(done)** |

**Promote-ready (phase 8+):** Phase 11 GBC/GFS/GVM pilots закрыты. Следующий track — post-phase provider rollout / audit-gap items.

### Done (этот track)

- [x] `run-mandatory-prompt-eval-fixtures` + `wire-eval-llm-usefulness-ci-gate`
- [x] `implement-semantic-map-ui-cross-highlight`
- [x] `upgrade-onebase-cli-v047` → `wire-onebase-live-check-gates` → `chain-onebase-upgrade-to-live-gates`
- [x] `implement-mcp-stdio-integration-test`
- [x] `optional-llm-claim-no-eligible-fixture`
- [x] `implement-semantic-search-hybrid-llm-retrieval`
- [x] `sync-plan-docs-with-workgraph-backlog`
- [x] Intent graph MCP wave: `implement-mcp-get-intent-hierarchy` … `extend-llm-usefulness-eval-intent-graph-mcp`
- [x] `implement-worker-claim-idempotency-guard` — lease guard в runtime, live-loop и MCP
- [x] `wire-onebase-pvrg-domain-graph-nodes` — catalog/document nodes в architecture snapshot
- [x] Phase 6 memory/evidence: `implement-memory-record-dashboard-projection`, `wire-graph-rag-memory-slice-fusion`, `implement-evidence-timeline-operator-view`
- [x] `optional-worker-openai-native-tool-calls` — IOHASC_WORKER_NATIVE_TOOL_CALLS=1 + bounded OpenAI tools
- [x] `implement-onebase-rest-evidence-adapter` — describe/check CLI → evidence-record.v1
- [x] Phase 4: PVRG scope panel, linkage drilldown, semantic ANN phase-2 ADR
- [x] `optional-llm-loop-hint-repeat-tool-fixture` — agentToolLoopGuard + eval:optional:loop-hint
- [x] `port-full-agent-tool-rules-migrated-bundle` — MCP rules + audit vs tool-rules-migrated
- [x] `implement-workgraph-agent-e2e-scenario-matrix` — e2e/workgraph-agent-matrix.json W1–W4
- [x] Phase 9 UI: kanban projection, prompt rules editor MVP, hybrid semantic search mode toggle
- [x] Phase 10: Playwright operator dashboard E2E, optional LLM release matrix, promote-ready queue minPhase=0
- [x] Phase 11: GBC module slice pilot, GFS passport read path, optional GVM verify worker gate
- [x] Post-rollout reconcile: audit-gap matrix, headless ADR, trace.status backfill script
- [x] `blocked-onebase-go-preflight` — eval:optional:blocked-onebase-go deterministic fixture
- [x] Decision registry — `docs/decisions/` + ADR-0001 trace linkage scope + analysis

## Критерий завершения

Mandatory fixtures зелёные; semantic map cross-highlight в UI; onebase check gate без skip на обновлённом CLI; parity artifact актуален после каждого обновления OneBase.
