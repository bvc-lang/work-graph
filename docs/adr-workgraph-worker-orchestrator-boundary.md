# ADR: Граница Work Graph worker и ioHasC orchestrator

## Статус

Принято (2026-05).

## Контекст

Work Graph вводит **agent worker live loop** — однораундовый адаптер с provider registry (local, openai-compatible, cursor-sdk, claude-sdk-api, local-cli). ioHasC (`../project`) сохраняет полный **orchestrator**: multi-round tool loop, nudge/retry, multi-phase workflow, semantic context builder.

Без явной границы команда смешивает «запустить worker на задачу» и «вести диалог в IDE», что ломает evidence model и persist contract.

## Решение

### Work Graph worker (этот репозиторий)

**Ответственность:**

- Вход: task snapshot, memory slice, allowed tools, `targetFiles`, policy, provider hints.
- Один (или bounded) run round → patch summary, evidence lines, transition request (`verify` / failure).
- Persist через explicit API: `POST /api/agent-run`, journal, backlog status update.
- Provider selection + fallback с записью evidence.

**Не делает:**

- Multi-round native `tool_calls` loop с nudge/retry.
- Полный system prompt / context builder ioHasC.
- Прямую запись в intent tree без operator persist gate.

**Ключевые модули:** `src/agentWorkerLiveLoop.mjs`, `src/agentRunApi.mjs`, `protocols/role-chain-handoff-v1.bvc`.

### ioHasC orchestrator (`../project`)

**Ответственность:**

- Interactive chat, plan mode, slash commands, orchestrator rounds.
- Semantic search, LSP, checkpoints, MCP sidecar sync.
- E2E agent scenarios, prompt conveyor, behavior rules.

**Не делает:**

- Source of truth для WorkItem status / cycles (читает через bridge/MCP при интеграции).

### Контракт обмена

```
Operator dashboard / MCP
  → select task + provider
  → worker adapter (single round)
  → evidence + transition request
  → persist API → backlog .bvc

Cursor / ioHasC IDE (optional)
  → full orchestrator for exploratory edits
  → must not silently override Work Graph status
```

## Почему

Worker должен быть **deterministic и testable** в CI (`local` dry-run). Orchestrator — **interactive** и привязан к IDE bundle. Слияние увеличивает flakiness и дублирует 80% `src/agent/orchestrator.js`.

## Последствия

- «Порт orchestrator» — **deferred**; использовать `../project` для chat-grade agent.
- Новые worker capabilities — через provider registry и tool transport, не копирование orchestrator.js.
- Full handoff chain — `protocols/role-chain-handoff-v1.bvc`, не implicit chat memory.

## Ссылки

- [plan-workgraph-llm-usefulness.md](plan-workgraph-llm-usefulness.md)
- [plan-iohasc-rebuild-audit-gap-matrix.md](plan-iohasc-rebuild-audit-gap-matrix.md) — Provider-neutral executors
- [adr-workgraph-replace-ide-shell.md](adr-workgraph-replace-ide-shell.md)
