# Optional live LLM eval (Tier B)

Прогон **не входит** в mandatory CI. Нужен доступный OpenAI-compatible endpoint (LM Studio, LiteLLM, Ollama OpenAI route).

## Команда

```powershell
$env:IOHASC_LLM_MODEL='your-model-id'
$env:IOHASC_LLM_BASE_URL='http://127.0.0.1:1234/v1'  # опционально
npm run eval:live-llm
```

Опционально с `taskId` для golden-path eval:

```powershell
npm run eval:live-llm -- <taskId>
```

## Проверка окружения без вызова LLM

```powershell
npm run eval:live-llm
```

Без `IOHASC_LLM_MODEL` скрипт завершится с `failureClass: env_blocker` и подсказками PowerShell/bash — это ожидаемое поведение в CI и на машине без сервера.

## Критерий закрытия WorkItem `optional-live-llm-eval`

1. Хотя бы один успешный прогон на живом endpoint.
2. Evidence в WorkItem (через MCP `add_work_item_evidence` или `complete_work_item`): endpoint, model id, pass/fail.
3. Убедиться, что `npm run ci` / `npm test` **не** зависят от live LLM.

## Связанные файлы

- `scripts/run-eval-live-llm.mjs` — обёртка с `IOHASC_E2E_REAL_LLM=1`
- `src/evalLiveLlmEnv.mjs` — валидация env
- `tests/evalLiveLlmEnv.test.mjs` — deterministic tests
