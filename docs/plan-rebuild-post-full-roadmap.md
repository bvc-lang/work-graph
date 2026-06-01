# Post-full roadmap: provider rollout

## Цель

После закрытия полного ioHasC rebuild roadmap (фазы 0–11) подключить optional real LLM execution к Work Graph live-loop без нарушения deterministic CI.

## Почему

Live-loop и daemon уже работают в dry-run/local mode. Post-MVP требует проверяемого пути к OpenAI-compatible provider (LM Studio / LiteLLM / Ollama proxy) с сохранением Worker Input/Output v1 и role-chain handoff.

## Что сделано

- `src/agentWorkerOpenAiProvider.mjs` — prompt builder, env contract, HTTP provider с mock-fetch tests
- `src/agentWorkerCursorSdkProvider.mjs` — env-gated Cursor SDK adapter (`IOHASC_CURSOR_SDK_WORKER=1`)
- `src/agentWorkerClaudeProvider.mjs` — Anthropic Messages API, structured output validation (`IOHASC_CLAUDE_WORKER=1`)
- `src/agentWorkerLocalCliProvider.mjs` — verification allowlist CLI runner (`IOHASC_LOCAL_CLI_WORKER=1`)
- `src/workGraphWorkerProvider.mjs` — catalog **5/5 implemented**, selection + fallback
- `src/agentWorkerLiveLoop.mjs` — `--provider` + auto selection, role handoff
- `npm run worker:live-loop:openai` — optional live path при `IOHASC_E2E_REAL_LLM=1`
- `scripts/run-optional-golden-path-llm-eval.mjs` — делегирует в openai provider path
- `src/workGraphBoundedTargetFileRead.mjs` — bounded read только по targetFiles
- `src/workGraphRunnerQueueProjection.mjs` — JSON queue projection + optional SQLite sync
- `src/operatorShellProjection.mjs` — runnerQueue в operator-shell.snapshot.v2
- Operator UI: Agent Run panel, provider catalog, journal, backlog persist
- `protocols/sidecar-mcp-execution-boundary-v1.bvc` + `buildToolTransportBoundary()`

## Todo

- [x] Реализовать OpenAI-compatible worker provider + tests
- [x] Cursor SDK / Claude SDK / local-cli providers (env-gated, mock tests)
- [x] Provider selection + fallback в live-loop и daemon tick
- [x] Operator Agent Run panel MVP
- [x] Reconcile audit-gap matrix post-provider-rollout
- [ ] Прогнать optional live eval на локальной LLM (`IOHASC_E2E_REAL_LLM=1`, `IOHASC_LLM_BASE_URL`, `IOHASC_LLM_MODEL`)
- [x] Bounded file-read tool для targetFiles
- [x] SQLite optional queue projection + runner queue UI strip

## Env contract (optional live)

| Variable | Назначение |
|---|---|
| `IOHASC_E2E_REAL_LLM=1` | OpenAI-compatible live HTTP path |
| `IOHASC_LLM_BASE_URL` | base URL, default `http://127.0.0.1:1234/v1` |
| `IOHASC_LLM_MODEL` | model id на стороне прокси |
| `IOHASC_LLM_API_KEY` | optional Bearer token |
| `IOHASC_CURSOR_SDK_WORKER=1` | Cursor SDK adapter path |
| `IOHASC_CLAUDE_WORKER=1` | Claude API path |
| `IOHASC_CLAUDE_API_KEY` | Anthropic API key |
| `IOHASC_LOCAL_CLI_WORKER=1` | verification allowlist CLI (requires `allowShell`) |

Запуск OpenAI-compatible eval:

```powershell
$env:IOHASC_LLM_MODEL='your-model'
$env:IOHASC_LLM_BASE_URL='http://127.0.0.1:1234/v1'  # optional
npm run eval:live-llm
```

## Audit-gap status

См. [`plan-iohasc-rebuild-audit-gap-matrix.md`](plan-iohasc-rebuild-audit-gap-matrix.md).

**Audit-gap implementation track — done.** Post-rollout memory slice + code-gap operator projection done; optional: full semantic search, sidecar/MCP transport runtime, live LLM eval.

## Критерий завершения

Deterministic suite зелёный; provider catalog 5/5 implemented; live-loop поддерживает explicit и auto provider selection; audit-gap matrix reconciled; optional eval документирован.
