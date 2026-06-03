# AN-47: ioHasC agent stack — аналоги Cursor, перенос в WG и облачный SDK

**Запрос:** «Изучи код ioHasC: какие там технологии, есть ли аналоги Composer / дифов / Memories; можно ли перенести чат с оркестратором в WG, подключив облачные SDK вместо локальных LLM; цель — одно окно без переключения Cursor ↔ WG».

**Связи:** [AN-46](work-graph-agent-sdks-integration.md) (SDK и продукт), [AN-45](work-graph-sidebar-sections-guide.md) (пульт WG), [AN-40](work-graph-project-deployment-model.md) (развёртывание), [docs/adr-workgraph-worker-orchestrator-boundary.md](../../docs/adr-workgraph-worker-orchestrator-boundary.md), [docs/workgraph-mcp-client-strategy.md](../../docs/workgraph-mcp-client-strategy.md).

**Источник кода:** репозиторий ioHasC (`../project`), обход `src/agent/`, `src/llm/`, `src/panels/` (2026-06-01).

---

## Кратко

ioHasC — **не пустая оболочка**: там полноценный чат, многораундовый оркестратор, ~91 инструмент, стрим, plan mode, память проекта, дифы в чате, встроенная панель Work Graph. Это **свой агентный IDE**, а не клон Cursor.

| Вопрос | Ответ |
|--------|--------|
| Есть ли аналог Composer? | **Частично** — цикл инструментов и plan mode, без единой панели Composer |
| Есть ли дифы? | **В чате** — карточки +/- ; правки **сразу в файлы**, без Accept/Reject в редакторе |
| Есть ли Memories? | **Другая модель** — architecture memory + compaction + git-checkpoint, не «запомни предпочтение пользователя» |
| Перенести orchestrator в WG + облачный SDK? | **Технически да, продуктово нет** — charter и ADR уже отложили; дублирует ~15k строк и ломает Monaco/LSP |
| Одно окно? | **ioHasC + embed WG + SDK как transport** — не WG + свой чат |

---

## 1. Карта подсистем ioHasC

```
┌─────────────────────────────────────────────────────────┐
│  agentPanel.js — UI чата, composer, режимы, compaction   │
│  agentChat.js  — стрим, карточки дифов, фазы инструментов│
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  orchestrator.js — цикл LLM ↔ tools, plan/debug/ask      │
│  tools.js + toolSchemas.js (~91 tool)                    │
│  contextBuilder.js — проекторы в system prompt           │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  agentLlmGateway.js — единая точка запроса к модели      │
│  agentLlmTransport.js — OpenAI-compat, Ollama native     │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  sidecar — git, bash, MCP, LSP, OneBase REST             │
│  workspaceApi — Monaco, дерево файлов, буферы            │
└─────────────────────────────────────────────────────────┘
```

| Модуль | Путь | Назначение |
|--------|------|------------|
| UI чата | `src/agent/agentPanel.js` | Сессии, отправка, меню, WG-панель внутри чата |
| Оркестратор | `src/agent/orchestrator.js` | `runAgentConversationTurn`: стрим → tool calls → повтор |
| Composer-input | `src/agent/agentComposerDom.js` | Поле ввода с `@path`, slash-меню |
| Инструменты | `src/agent/tools.js` | Файлы, PVRG, LSP, WG, OneBase, web, checkpoint |
| LLM | `src/llm/agentLlmGateway.js` | Стрим и non-stream; **Cursor SDK в браузере нет** |
| Память проекта | `src/agent/architectureMemoryV1.js` | `.iohasc/architecture-memory.v1.json` |
| Compaction | `src/agent/agentSessionCompaction.js` | Сжатие истории чата для контекста |
| Checkpoints | `src/agent/checkpoints.js` | Git commit/restore через sidecar |
| WG (legacy в ioHasC) | `src/agent/agentWorkGraph.ts` | Бэклог `.step`, autonomous loop |
| WG embed | `src/panels/workGraphDashboardMount.ts`, `main.js` | Сайдбар и вкладка WG в IDE |

---

## 2. Сравнение с Cursor

| Функция Cursor | ioHasC | Близость |
|----------------|--------|----------|
| Composer (мультифайл) | Несколько `writeFile` / `applyPatch` за ход; plan mode; `/run-plan`; PWR (план→работа→ревью) | ~60% |
| Inline diff Accept/Reject | Нет — `confirmAgentWrite()` всегда `true`; диф только в чате (`lineDiff.js`) | ~40% |
| Memories (пользователь) | Нет — architecture memory, passport, compaction handoff | другая модель |
| Background agents | `agentWorkGraphRunAutonomousLoop` + daemon scheduler | частично |
| @‑файлы, slash | `agentComposerDom.js`, `agentSlashToolPicker.js` | есть |
| Стрим | SSE OpenAI-compat / Ollama native; preview записи во время стрима | есть |

**Вывод:** ioHasC сильнее всего в **оркестраторе и инструментах**; слабее в **inline-редакторе и user memories**.

---

## 3. Память: три слоя (не путать)

| Слой | Где | Что хранит |
|------|-----|------------|
| **Architecture memory** | `.iohasc/architecture-memory.v1.json` | Снимок проекта для prompt (граф, charter, runtime) |
| **Compaction handoff** | IndexedDB + `agentSessionCompaction.js` | Краткое резюме длинного чата |
| **Git / WG checkpoint** | `checkpoints.js`, `.iohasc/workgraph-checkpoint.v1.json` | Откат кода; resume по задаче WG |

Work Graph **memory records** (из закрытых `.bvc`) — отдельный контур учёта; он **дополняет**, а не заменяет architecture memory в IDE.

---

## 4. LLM сегодня и куда ставить облачный SDK

**Сейчас в ioHasC:** `agentLlmTransport.js` — `auto`, OpenAI chat completions, Ollama native; локальные модели по умолчанию.

**Cursor / Claude SDK в браузерном чате ioHasC — не подключены.** В WG worker — провайдеры `cursor-sdk`, `claude-sdk-api` (фон, env-gated).

| Вариант | Суть | Оценка |
|---------|------|--------|
| **A. SDK как transport в ioHasC** | Новый адаптер в `agentLlmGateway` вместо Ollama | ✅ оркестратор и UI остаются |
| **B. SDK только в WG worker** | Демон: claim → SDK → свидетельство | ✅ уже есть; без чата |
| **C. Перенос orchestrator в WG** | ~15k строк agent + новый chat UI | ❌ charter anti-goal |

---

## 5. Перенос orchestrator в WG — разбор

### Что переносится относительно легко

- Ядро `orchestrator.js` — при абстракции `workspaceApi` (файлы без Monaco)
- Architecture memory, compaction, checkpoint (файлы в `.iohasc/`)
- Часть WG-tools из `agentWorkGraph.ts` (уже есть MCP в WG)

### Что ломается без IDE

- ~91 tool: LSP, фокус PVRG-карты, `openProjectFile`, streaming preview в редактор
- Sidecar: git, bash, MCP, OneBase
- `agentPanel.js` (~7k) — DOM, IndexedDB, composer
- Диф «как в Cursor» — нет Monaco для inline

### Что уже решено в WG

| Артеfact | Решение |
|----------|---------|
| Charter | «Не переносить монолитный orchestrator» |
| ADR worker boundary | WG = однораундовый worker; ioHasC = multi-round chat |
| NLUX chat в WG | Отменён — generic chat не тянет tool cards / diff |
| `operator-agent-run-panel-v1` | Agent Run (задача → прогон), не свободный чат |
| `workgraph-mcp-client-strategy` | Чат — у Cursor/Claude; WG — пульт + MCP |

---

## 6. Одно окно: три пути

| Путь | Одно окно? | Комментарий |
|------|------------|-------------|
| **ioHasC как оболочка** | ✅ лучший | Чат + WG sidebar/embed уже в `main.js` |
| **WG panel в Cursor** | ⚠️ частично | Webview на пульт; чат — родной Cursor + MCP |
| **WG + свой чат на SDK** | ❌ | Второй слабый чат; NLUX-провал повторится |

**SDK не даёт UI чата Cursor** — только агента «сзади». Одно окно = **embed**, не merge через SDK.

---

## 7. Рекомендуемая архитектура

```
ioHasC (одна оболочка)
├── чат + orchestrator + tools + Monaco
├── LLM: cursor-sdk / claude-sdk (новый transport)
├── WG: split / sidebar / iframe пульт
└── фон: WG daemon + SDK

Work Graph
├── канон .bvc, MCP, пульт, проверки, memory records
└── без второго свободного чата
```

---

## 8. Таблица port / embed / defer

| Модуль ioHasC | Действие | Куда |
|---------------|----------|------|
| `orchestrator.js` | **defer** (остаётся в ioHasC) | — |
| `agentPanel.js`, `agentChat.js` | **embed** в ioHasC | не переносить в WG |
| `tools.js` (полный) | **defer** | MCP + sidecar для WG worker |
| `architectureMemoryV1.js` | **port** (schema) | общий `.iohasc/` в проекте |
| `agentWorkGraph.ts` (legacy) | **replace** | канон WG `.bvc` + MCP |
| `workGraphDashboardMount.ts` | **embed** | расширить split с WG UI :4177 |
| LLM gateway | **extend** | + SDK transport в ioHasC |
| WG worker providers | **keep** | фон в WG repo |

---

## 9. Рекомендации

| ID | Смысл |
|----|--------|
| **R1** | Не переносить orchestrator в WG — усилить **embed WG в ioHasC** и **MCP** для Cursor-пользователей. |
| **R2** | Облачный SDK — **transport в ioHasC** (вариант A), не переписывание чата в WG. |
| **R3** | Добавить Accept/Reject для правок — **в ioHasC** (`confirmAgentWrite`), если нужен паритет с Cursor. |
| **R4** | User Memories Cursor не копировать — связать **architecture memory** (IDE) и **memory records** (WG после закрытия задачи). |
| **R5** | Эпик «одно окно»: fullscreen WG panel в ioHasC + единый `WORKGRAPH_ROOT`, без второго браузера. |

---

## 10. Дорожная карта (приоритеты)

| P | Задача |
|---|--------|
| **P0** | Embed WG UI в ioHasC (вкладка/split, не :4177 в отдельном окне) |
| **P0** | MCP `@work-graph/mcp` в ioHasC sidecar / Cursor параллельно |
| **P1** | Transport `cursor-sdk` / `claude-sdk` в `agentLlmGateway.js` |
| **P1** | Опциональный confirm перед записью файлов (диф Accept) |
| **P2** | Свести legacy `agentWorkGraph.ts` к MCP-only против `.bvc` канона |
| **—** | Полный port orchestrator в WG — **не делать** без отмены charter |

---

**См. также:** [AN-46](work-graph-agent-sdks-integration.md), [AN-38](llm-pvrg-richir-memory-slices-usage-audit.md), [docs/plan-iohasc-rebuild-audit-gap-matrix.md](../../docs/plan-iohasc-rebuild-audit-gap-matrix.md), протокол `protocols/operator-agent-run-panel-v1.bvc`.
