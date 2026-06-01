# Work Graph: критический анализ полезности для LLM

## Цель

Честно оценить, **насколько Work Graph rebuild реально помогает LLM** выполнять задачи — не по декларациям MCP-first, а по измеримым сигналам: actionable context, безопасные gates, workflow discoverability, качество retrieval.

## Вердикт (кратко)

Work Graph **полезен как операционный backend** для внешнего агента (Cursor/Claude через MCP): задачи, статусы, evidence, promote-ready queue, lexical search.  
**Не полезен как полноценный agent runtime** — нет multi-turn orchestrator, native tool_calls, embeddings, E2E agent matrix. Worker — single-shot JSON, dry-run по умолчанию.

**Оценка полезности сейчас:** `partial → strong` на deterministic harness (`npm run eval:llm-usefulness`), **weak** на live LLM quality без optional eval и без model matrix.

---

## Что реально помогает LLM

| Сигнал | Механизм | Почему полезно |
|--------|----------|----------------|
| **Task selection** | `get_current_cycle`, `list_work_items`, `get_promote_ready_queue` | Модель видит ready queue без парсинга всего backlog |
| **Read-before-write** | `get_work_item`, `workgraph://item/{id}` | `targetFiles`, `dependsOn`, `checks`, `nextAction` — минимальный план работ |
| **Workflow prompts** | 6 MCP prompts (`take_next`, `create`, `evidence`, `close`, `blockers`, `summarize`) | Снижают hallucination task id и «done без evidence» |
| **Policy gates** | `transitionStatus`, `complete_work_item` | Код блокирует `done` без evidence — LLM не может «закрыть» задачу пустым текстом через MCP |
| **Graph RAG slice** | `graphRagContextSlice.mjs` → worker prompt | Bounded subgraph: deps, files, evidence, memory — компактнее сырого backlog |
| **Semantic search** | `semantic_search` lexical + hybrid BM25 | WorkItem по ключевым словам; hybrid mode — excerpts из targetFiles |
| **Evidence discipline** | `add_work_item_evidence`, worker journal | Аудит и воспроизводимость для human-in-the-loop |

---

## Что не помогает / иллюзия полезности

| Проблема | Суть | Риск для LLM |
|----------|------|--------------|
| **Нет orchestrator loop** | Worker = 1 round JSON in/out | Модель в Cursor делает tools сама; Work Graph worker не заменяет ioHasC orchestrator — см. [adr-workgraph-worker-orchestrator-boundary.md](adr-workgraph-worker-orchestrator-boundary.md) |
| **`semantic_search` без embeddings (lexical-only mode)** | Token substring в lexical-v1 | Пропуск синонимов; hybrid mode добавляет BM25 по excerpts, не vector ANN |
| **OpenAI provider без tool_calls** | JSON в `message.content` по умолчанию | Optional: `IOHASC_WORKER_NATIVE_TOOL_CALLS=1` → bounded tools + `submit_worker_output` |
| **Dry-run default** | Worker не пишет файлы / shell | LLM output advisory; исполнение остаётся на клиенте |
| **6 behavior rules vs полный ioHasC prompt** | Урезанный port | Editing policy, LOOP_HINT, markdown tools fallback — deferred |
| **Intent Composer без LLM** | Heuristics NL → draft | Не conversational intake; слабая полезность для «обсуди задачу» |
| **Prompt eval catalog ≠ runner** (до этого PR) | Fixtures описаны, не исполнялись пакетом | Регрессии LLM flows не ловились одной командой |
| **Optional live eval = 1 golden path** | `IOHASC_E2E_REAL_LLM=1` | Нет матрицы моделей, нет claim-no-eligible / loop-hint fixtures |
| **MCP без stdio E2E** | Handlers tested in-process | Реальный Cursor MCP session не покрыт автотестами |

---

## Сравнение с ioHasC agent layer

| Capability | ioHasC (`../project`) | Work Graph rebuild |
|------------|----------------------|-------------------|
| Multi-round tool loop | orchestrator.js | ❌ deferred |
| Native tool_calls transport | agentLlmGateway | ❌ worker OpenAI path — JSON only |
| Semantic vector search | hybrid retrieval + ANN | ⚠️ hybrid BM25 + excerpts (MCP `mode=hybrid-lexical-bm25-v1`); ANN deferred |
| E2E agent matrix | Playwright A1–A14+ | ❌ not ported |
| Prompt eval conveyor | `npm run test:prompt-eval` | ⚠️ mandatory harness added |
| WorkItem backend | partial / sidecar | ✅ MCP-first intent tree |
| Evidence / trace gates | ✅ | ✅ ported |
| Domain worker (OneBase) | agent tools + MCP | ✅ bounded CLI path |

**Вывод:** Work Graph **лучше** как portable task/evidence store для любого MCP-клиента; **хуже** как среда исполнения агента.

---

## Метрики полезности (исполняемые)

Реализовано в `src/workGraphLlmUsefulnessEval.mjs`:

| Metric ID | Weight | Что измеряет |
|-----------|--------|--------------|
| `mcp-read-surface` | 0.20 | Полнота полей WorkItem для планирования |
| `mcp-prompt-tool-coverage` | 0.15 | Все write-tools упомянуты в MCP prompts |
| `mcp-workflow` | 0.25 | cycle → ready list → get → claim на fixture |
| `graph-rag-context` | 0.20 | Target files, deps, evidence в bounded prompt |
| `mandatory-policy-fixtures` | 0.20 | 3 Tier-A fixtures без live LLM |

**Scorecard:** `strong` ≥ 0.8 · `partial` ≥ 0.55 · `weak` < 0.55

### Команды

```bash
npm run eval:llm-usefulness      # полный scorecard + MCP на реальном intent tree
npm run eval:mandatory-prompt    # только Tier-A fixtures (CI-friendly)
npm run eval:optional:claim-no-eligible  # Tier B: skip без IOHASC_E2E_REAL_LLM=1
npm run eval:optional:loop-hint          # Tier B: LOOP_HINT guard skip без IOHASC_E2E_REAL_LLM=1
npm run eval:optional:blocked-onebase-go  # Tier optional-env: go preflight blocked path (deterministic)
```

### Mandatory fixtures (Tier A)

| Fixture | Проверка |
|---------|----------|
| `trace-gate-without-evidence` | `done` без evidence → policy error |
| `policy-denial-dry-run` | non-dry-run local runner → fail |
| `worker-dry-run-verify-proposal` | success → `verify` transition |

### Optional fixtures (Tier B)

| Fixture | Нужен live LLM | Статус |
|---------|----------------|--------|
| `claim-no-eligible` | модель не выдумывает task при пустой ready queue | **done** — `npm run eval:optional:claim-no-eligible` |
| `loop-hint-repeat-tool` | same tool+args → LOOP_HINT stop | **done** — `npm run eval:optional:loop-hint` |
| `blocked-onebase-go-preflight` | env blocker path | **done** — `npm run eval:optional:blocked-onebase-go` |

**Release matrix (`src/releaseGateMatrix.mjs`):** Tier B перечислен в `optional-llm` (`eval:optional:claim-no-eligible`, `eval:optional:loop-hint`, `eval:live-llm`, `test:optional:golden-path-llm`). Live eval требует **`IOHASC_E2E_REAL_LLM=1`** и настроенный OpenAI-compatible endpoint; mandatory `ci:mandatory` live LLM не вызывает.

**Operator dashboard E2E (Tier optional-env):** `npm run test:e2e` — Playwright smoke на изолированном fixture (`tests/fixtures/e2e-operator-dashboard`, `WORKGRAPH_E2E_ROOT`). Браузер: `npm run test:e2e:install`. Live LLM не нужен; agent-run проверяется через API stub в spec.

---

## Todo

### WorkItems (intent tree)

| work.id | tier | статус |
|---------|------|--------|
| `wire-eval-llm-usefulness-ci-gate` | mandatory CI | **done** |
| `run-mandatory-prompt-eval-fixtures` | mandatory | **done** |
| `implement-mcp-stdio-integration-test` | quality | **done** |
| `optional-llm-claim-no-eligible-fixture` | optional LLM | **done** |
| `implement-semantic-search-hybrid-llm-retrieval` | retrieval | **done** |
| `sync-plan-docs-with-workgraph-backlog` | docs | **done** |

- [x] Исполняемый harness `workGraphLlmUsefulnessEval.mjs` + Vitest
- [x] `npm run eval:llm-usefulness` / `eval:mandatory-prompt`
- [x] `wire-eval-llm-usefulness-ci-gate` — в `ci:mandatory`
- [x] `implement-mcp-stdio-integration-test`
- [x] `optional-llm-claim-no-eligible-fixture`
- [x] `implement-semantic-search-hybrid-llm-retrieval`
- [x] `sync-plan-docs-with-workgraph-backlog`

---

## Критерий «полезен для LLM»

1. **Deterministic:** `npm run eval:llm-usefulness` → scorecard `strong`, mandatory fixtures 3/3.
2. **Operational:** агент через MCP закрывает ready WorkItem с real evidence без обхода gates.
3. **Retrieval:** semantic search находит релевантный WorkItem по domain query (не только exact id).
4. **Live (optional):** golden-path + claim-no-eligible pass на выбранной модели с native tools.

Текущее состояние: **(1) достижимо сейчас**; **(2) operational** — ready queue закрыта (157 done); **(3) retrieval** — hybrid BM25 phase-1 в MCP; **(4) live optional** — claim-no-eligible harness, live rubric при `IOHASC_E2E_REAL_LLM=1`.
