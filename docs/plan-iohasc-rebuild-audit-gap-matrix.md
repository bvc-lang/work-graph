# Audit-gap matrix: ioHasC rebuild vs original plan

## Цель

Честно сопоставить исходные обещания переноса ioHasC с фактическим состоянием Work Graph rebuild: отделить **implemented** от **contract-only**, **stub** и **deferred**, и связать оставшиеся gaps с follow-up (если есть).

## Почему

После закрытия фаз 0–11 backlog показывал `done` для многих подсистем, хотя значительная часть была закрыта как design/protocol без пользовательской реализации. Audit-gap track (2026-05) закрыт; эта ревизия фиксирует **post-provider-rollout** факт.

## Легенда статусов

| Статус | Значение |
|---|---|
| **implemented** | Работает в runtime/UI/CLI; есть тесты или проверяемый артефакт |
| **contract-only** | Есть `.bvc` protocol, schema или module API, но нет end-to-end UX |
| **stub** | Минимальный placeholder (dry-run, static gate, derived view) |
| **deferred** | Осознанно отложено (GBC/GFS/GVM, full IDE shell, full orchestrator port) |
| **replace** | Старый контур заменён другим (не port 1:1) |

## Матрица: capability → strategy → fact → follow-up

| Capability (ioHasC / plan) | Strategy | Fact state | Evidence | Follow-up |
|---|---|---|---|---|
| Work Graph runtime (claim, evidence, transitions) | rebuild | **implemented** | `src/workGraphRuntime.mjs`, tests | — |
| `.bvc` backlog canon + schema lint | port + rebuild | **implemented** | `work/backlog.bvc`, `src/backlogSchemaLint.mjs` | — |
| Intent tree migration | rebuild | **implemented** | `src/intentTreeMigration.mjs`, `intent/index.bvc` | — |
| Operator dashboard (backlog board, detail drawer) | replace | **implemented** | `src/workGraphBacklogUiServer.mjs` | — |
| Architecture / schematic views | replace | **implemented** | `src/architectureSnapshot.mjs`, `src/schematicView.mjs` | — |
| Verification loop + release gates | rebuild | **implemented** | `src/verificationLoop.mjs`, `src/releaseGateMatrix.mjs` | — |
| Agent worker live-loop | rebuild | **implemented** | `src/agentWorkerLiveLoop.mjs`, `npm run worker:live-loop` | — |
| OpenAI-compatible worker provider | rebuild | **implemented** | `src/agentWorkerOpenAiProvider.mjs`, optional `npm run eval:live-llm` | optional live run |
| Cursor SDK worker provider | rebuild | **implemented** | `src/agentWorkerCursorSdkProvider.mjs`, `IOHASC_CURSOR_SDK_WORKER=1` | — |
| Claude SDK/API worker provider | rebuild | **implemented** | `src/agentWorkerClaudeProvider.mjs`, `IOHASC_CLAUDE_WORKER=1` | — |
| Local CLI worker provider | rebuild | **implemented** | `src/agentWorkerLocalCliProvider.mjs`, verification allowlist | — |
| Provider registry + capability selection | rebuild | **implemented** | `src/workGraphWorkerProvider.mjs`, catalog 5/5 implemented | — |
| Provider selection / fallback runtime | rebuild | **implemented** | `runWorkerWithSelectionAndFallback`, fallback evidence | — |
| Operator Agent Run panel | replace | **implemented** | UI «Агент», `POST /api/agent-run`, journal, persist | — |
| Work-item promote ready (backlog→ready) | rebuild | **implemented** | `src/workGraphPromoteReadyApi.mjs`, UI | — |
| Agent run backlog persist | rebuild | **implemented** | `src/workGraphBacklogPersist.mjs`, `src/agentRunApi.mjs` | — |
| WorkGraph daemon scheduler tick | rebuild | **implemented** | `src/workGraphDaemonTick.mjs`, `npm run daemon:once`, `GET /api/daemon-audit-tail` + панель «Проверки» | — |
| Runner queue projection + UI strip | rebuild | **implemented** | `src/workGraphRunnerQueueProjection.mjs` | — |
| OneBase golden path static verify | port + rebuild | **implemented** | `src/onebaseGrossProfitStaticVerify.mjs` | — |
| OneBase tool execution path (worker) | port + rebuild | **implemented** | `src/onebaseWorkerTools.mjs`, local runner preflight | — |
| Sidecar / MCP execution boundary | rebuild | **implemented (design)** | `protocols/sidecar-mcp-execution-boundary-v1.bvc`, `buildToolTransportBoundary()` | sidecar/MCP transport runtime deferred |
| Language adapter layer | rebuild | **implemented (MVP)** | `src/languageAdapterRegistry.mjs`, `src/languageAdapters/` | deeper parsers optional |
| Graph RAG / context bundle for worker | rebuild | **implemented (MVP)** | `src/graphRagContextSlice.mjs`, live-loop + OpenAI prompt | — |
| Atom Inspector (form edit) | replace | **implemented** | `src/atomInspector.mjs`, detail drawer editor | — |
| Prompt-step rules UI | replace | **implemented (MVP)** | «Промпты» view + editor MVP (`promptRulesEditorApi.mjs`) | full diff/review workflow deferred |
| Agent behavior rules bundle | port + rebuild | **implemented** | `rules/agent-behavior/` incl. MCP rules; `npm run audit:agent-behavior-rules` vs tool-rules-migrated | Monaco-only rules deferred |
| Low-code scaffold CLI | defer + port | **implemented (CLI MVP)** | `npm run scaffold:arch-rules`, `npm run verify:lowcode` | TurIr/Handlebars deferred |
| Bounded target file read for worker | rebuild | **implemented** | `src/workGraphBoundedTargetFileRead.mjs` | — |
| Memory record writer + evidence read model | rebuild | **implemented (MVP)** | `src/memoryRecordWriter.mjs`, `src/memoryWorkerSlice.mjs`, evidence timeline UI | — |
| PVRG / trace envelope / unified linkage | port + rebuild | **implemented (MVP)** | linkage drilldown + PVRG scope panel | level 1 trace authoring optional — [ADR-0001](decisions/0001-trace-linkage-scope.md) |
| Full ioHasC step→code codegen + trace CI | port | **rejected (rebuild scope)** | ADR-0001; donor `../project` | remains in ioHasC IDE |
| Semantic map / search workflow | replace | **implemented (MVP)** | hybrid semantic search API/UI, cross-highlight, `semantic_search` MCP | vector ANN phase-2 ADR; no React Flow canvas |
| Codegen / code-gap feeder | port | **implemented (MVP)** | `codeGapOperatorProjection`, draft intake API | auto-promotion rules optional |
| Agent orchestrator + full tool surface | port + rebuild | **deferred** | Old: `../project/src/agent/orchestrator.js` | stays in ioHasC; rebuild via providers |
| Prompt eval / E2E agent matrix | port | **implemented (optional)** | mandatory prompt eval in CI; `e2e/workgraph-agent-matrix.json` W1–W4; Playwright operator smoke | live LLM matrix optional |
| GBC / GFS / GVM | defer | **pilot (optional-env)** | boundary protocols + `probe:gbc-module-slice-pilot`, GFS passport read, `IOHASC_GVM_VERIFY` stub | mandatory FlatBuffers deferred |
| Full IDE shell (Monaco, file tree, terminal) | replace | **deferred** | External IDE (Cursor) + dashboard | — |
| Role-chain handoff in worker | rebuild | **implemented** | live-loop + `protocols/role-chain-handoff-v1.bvc` | — |

## Architecture decisions registry

Реестр: [`docs/decisions/README.md`](decisions/README.md). Pre-decision analysis: [`docs/analysis/`](analysis/).

| Topic | ADR | Status | Note |
|-------|-----|--------|------|
| Step↔code trace scope | [0001-trace-linkage-scope.md](decisions/0001-trace-linkage-scope.md) | accepted (level 0) | Analysis: [2026-05-trace-linkage-necessity.md](analysis/2026-05-trace-linkage-necessity.md) |
| Replace IDE shell | [adr-workgraph-replace-ide-shell.md](adr-workgraph-replace-ide-shell.md) | accepted | § Замена IDE shell ниже |
| Headless MCP-first | [adr-workgraph-headless-intent-backend.md](adr-workgraph-headless-intent-backend.md) | accepted | no React Flow canvas |

## Замена IDE shell (осознанное решение)

ADR: [adr-workgraph-replace-ide-shell.md](adr-workgraph-replace-ide-shell.md).

| Старый ioHasC | Rebuild replacement | State |
|---|---|---|
| Monaco workspace + file explorer | External IDE (Cursor) + bounded `targetFiles` read | **implemented** |
| Agent panel in IDE | Operator Agent Run panel + provider catalog | **implemented** |
| Settings / MCP UI | Sidecar/MCP boundary protocol; MCP in `../project` | **contract-only** |
| Bottom terminal | External shell / `local-cli` verification allowlist | **partial** |
| PVRG map in right panel | Architecture/schematic views + PVRG task scope in detail drawer | **implemented (MVP)** |

## Provider-neutral executors (факт post-rollout)

```
Work Graph / .bvc = source of truth

Agent Worker Adapter:
  input:  task snapshot, memory slice, allowed tools, target files, policy, provider hints
  providers: local | openai-compatible | cursor-sdk | claude-sdk-api | local-cli
  output: patch summary, evidence, transition request, logs, failure reason

Provider НЕ меняет Work Graph напрямую (кроме explicit persist API после operator run).
```

| Provider | Registry | Fact | Live env |
|---|---|---|---|
| local (dry-run) | yes | **implemented** | default CI |
| openai-compatible | yes | **implemented** | `IOHASC_E2E_REAL_LLM=1` |
| cursor-sdk | yes | **implemented** | `IOHASC_CURSOR_SDK_WORKER=1` |
| claude-sdk-api | yes | **implemented** | `IOHASC_CLAUDE_WORKER=1` |
| local-cli | yes | **implemented** | `IOHASC_LOCAL_CLI_WORKER=1` + `allowShell` |
| capability-based selection | yes | **implemented** | `selectWorkerProvider()` |
| fallback with evidence | yes | **implemented** | `buildProviderFallbackEvidence()` |

## Сводка по фазам (честная, post audit-gap)

| Phase | Backlog | Honest delivery |
|---|---|---|
| 0 Inventory | done | **implemented** |
| 1 Live loop | done | **implemented** — all providers + fallback |
| 2 Daemon OS | done | **implemented** |
| 3 Step / intent | done | **implemented** |
| 4 Trace / PVRG | done | **implemented (MVP)** — linkage drilldown, PVRG scope, hybrid search |
| 5 IR / codegen | done | **implemented (MVP)** — compiler roundtrip, code-gap analyzer fixture |
| 6 Memory | done | **partial** — worker memory slice MVP yes; journal persist optional |
| 7 OneBase | done | **implemented (MVP)** — static + worker tools |
| 8 Agent / prompt | done | **implemented (MVP)** — providers, behavior rules audit, optional LLM eval matrix |
| 9 UI | done | **implemented (MVP)** — kanban, prompt editor, hybrid search, operator E2E optional |
| 10 CI | done | **implemented** — release matrix, Playwright optional-env |
| 11 GBC/GVM | done | **pilot (optional-env)** — read-only probes, GVM stub gate |
| **Audit-gap track** | **done** | 116 WorkItems; provider rollout complete |

## Post-rollout backlog (не блокирует honest completion)

| Item | Priority | Notes |
|---|---|---|
| MemoryRecord in worker `memorySlice` | medium | **done** — `memoryWorkerSlice.mjs` |
| Code-gap feeder in operator workflow | low | **done** — verification panel + API |
| Full semantic search workflow | low | **done** | CLI `semantic:search`, UI `GET /api/semantic-search`, MCP `semantic_search` |
| Sidecar/MCP transport runtime | low | **done** | `workGraphToolTransportRuntime.mjs` |
| Optional `npm run eval:live-llm` on real endpoint | optional | **done** | `optional-live-llm-eval` — 2026-05-29 LM Studio qwen/qwen3.5-9b |
| Code-gap draft intake promotion | low | **done** | verification panel + `codeGapDraftIntakeApi.mjs` |
| MemoryRecord journal persist | low | **done** | `memoryRecordWriter.mjs` + worker slice |
| Full agent orchestrator port | deferred | use `../project` |
| Post-rollout trace.status backfill | low | **done** | `npm run backfill:trace-status-verified` for done items |

## Todo

- [x] Составить audit-gap matrix (2026-05)
- [x] Закрыть audit-gap implementation track в `work/backlog.bvc`
- [x] Post-provider-rollout reconcile (this revision)
- [x] Optional: прогнать `npm run eval:live-llm` на локальной LLM (2026-05-29, qwen/qwen3.5-9b @ LM Studio :1234)
- [x] Post-rollout: memory slice + code-gap operator wiring
- [x] Post-rollout reconcile Phase 9–11 (audit-gap matrix + headless ADR + trace.status backfill)

## Критерий завершения reconcile

Matrix отражает факт после `implement-local-cli-worker-provider`; планы не называют missing то, что implemented; оставшиеся gaps явно помечены contract-only/deferred/optional; audit-gap track = **done**.
