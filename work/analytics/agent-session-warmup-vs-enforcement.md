# AN-57: Прогрев сессии агента vs enforcement — почему Cursor игнорирует правила WG

**Запрос:** «Изучи разборы — были примеры для Claude, которые прогревали сессию. Агент не читает правила, пишет по-английски, не меняет статус задачи. Нужен прогрев или мы его уже реализовали?»

**Статус:** принято (analysis), implementation — не seeded  
**Связи:** [AN-25](agent-bypass-work-graph-dual-backlog.md), [AN-26](closing-epic-agent-workgraph-enforcement.md), [AN-31](promptpilot-claude-note-vs-work-graph.md), [AN-47](iohasc-agent-stack-port-eval.md), [llm-pvrg-richir-memory-slices-usage-audit.md](llm-pvrg-richir-memory-slices-usage-audit.md), [plan-workgraph-llm-usefulness.md](../docs/plan-workgraph-llm-usefulness.md)

---

## Кратко

| Вопрос | Ответ |
|--------|--------|
| Есть ли «прогрев сессии» для Claude в WG? | **Нет** — отдельного primer / few-shot под claim→status→evidence→русский не реализовано |
| Реализован ли enforcement AN-25/26? | **Частично** — `.cursor/rules/*.mdc`, agent-behavior bundle, MCP prompts, lint; но только **declarative**, без hard gate в Cursor |
| Есть ли few-shot «прогрев» вообще? | **Да, в ioHasC** (`project/src/agent/fewShotLibrary.js`) — но про tool flow, **не про Work Graph** |
| Почему агент пишет по-английски и не меняет статус? | Неверный workspace root, rules в `.gitignore`, нет auto-inject в Cursor IDE, модель обходит soft rules через TodoWrite |
| Нужен ли прогрев? | **Да, как дополнение** к rules — не замена AN-26 |

**Вывод:** канон и правила **описаны и частично развёрнуты**, но **session warm-up для дисциплины WG не сделан**. Симптомы (английский prose, TodoWrite, код без `update_work_item_status`) — ожидаемы при работе из репозитория `project` без WG rules и без primer на первом ходе.

---

## 1. Три разных «прогрева» (не путать)

| Подход | Что делает | Аналог в экосистеме | В WG |
|--------|------------|---------------------|------|
| **Session memory** | После сессии → заметки для следующей | Claude Note → `MEMORY.md` | Closing AN + rules; **нет** daemon |
| **Few-shot в system prompt** | 1–3 примера «как правильно» на каждый turn | ioHasC `fewShotLibrary.js` | **Нет** WG-примеров |
| **Declarative rules** | alwaysApply `.mdc`, agent-behavior `.bvc` | Cursor Rules, `CLAUDE.md` | **Есть локально**, см. §3 |
| **MCP workflow prompts** | Entrypoint «take_next_work_item» | PromptPilot job template | **Есть**, но **не auto-inject** |
| **CI prompt eval** | Регрессия policy offline | `test:prompt-eval` в ioHasC | `eval:mandatory-prompt` — **не прогрев live-сессии** |

[AN-31](promptpilot-claude-note-vs-work-graph.md): Claude Note = **WHAT WE LEARNED**; Work Graph = **WHAT TO DO + PROOF**. «Прогрев» в духе Claude Note **не дублируем** — promote path: note → rule или closing AN.

---

## 2. Что уже реализовано (enforcement layer)

Эпик `epic-agent-workgraph-enforcement` закрыт ([AN-26](closing-epic-agent-workgraph-enforcement.md)). Артефакты:

| Артефакт | Назначение | В git? | Доходит до Cursor IDE? |
|----------|------------|--------|-------------------------|
| `.cursor/rules/agent-workgraph-single-backlog.mdc` | запрет TodoWrite для trackable work | **Нет** (`.cursor/` в `.gitignore`) | только если workspace = work graph |
| `.cursor/rules/work-items-russian.mdc` | русский prose в задачах | **Нет** | то же |
| `.cursor/rules/work-item-claim-context.mdc` | MCP перед claim | **Нет** | то же |
| `rules/agent-behavior/cursor-ide-workgraph-parity.bvc` | parity IDE ↔ MCP | **Да** | **Нет auto-inject** (только WG worker bundle) |
| `rules/agent-behavior/chat-work-scope-readonly.bvc` | read-only scope вместо TodoWrite для эпика | **Да** | **Нет auto-inject** |
| MCP `TOOL_RULES` + 6 prompts | workflow + русский в create | **Да** | только если агент **вызвал** MCP prompt/tool |
| `npm run lint:plan-work-alignment` | plan todo ↔ work.id | **Да** | CI, не сессия |
| `npm run eval:mandatory-prompt` | Tier-A fixtures (done без evidence и т.д.) | **Да** | offline harness |

**AN-26 честно:** enforcement только declarative; **lint-ить сессию Cursor невозможно**.

### 2.1. Инциденты после «закрытия» enforcement

По транскриптам сессий (2026-05-31 — 2026-06-01) агент **продолжает**:

- создавать **TodoWrite** T1/T5 для эпиков и subtasks;
- писать код **без** `claim_work_item` / `update_work_item_status`;
- seed/create work items с **английским** telegraphic prose (до rusify-pass).

Это подтверждает [AN-25](agent-bypass-work-graph-dual-backlog.md): канон **описан**, IDE-агент **не в жёстком контуре**.

### 2.2. Два workspace — два набора правил

| Workspace root | `.cursor/rules` | WG enforcement |
|----------------|-----------------|----------------|
| `D:/Work/IDE/work graph` | 7 файлов (single-backlog, work-items-russian, claim-context, …) | **Подхватывается** |
| `D:/Work/IDE/project` (ioHasC) | 3 файла (typescript-first, theme, plan-history) | **Не подхватывается** |

Если оператор работает в **project**, WG rules **отсутствуют в контексте** — даже если файлы есть на диске в соседнем репо.

---

## 3. Few-shot в ioHasC — не прогрев WG

В `../project` реализован полный конвейер ([adr-agent-few-shot-dynamics.md](../project/docs/adr-agent-few-shot-dynamics.md)):

```
userMessagePreview → fewShotStrategy → fewShotLibrary (≤3 примера)
    → compileFewShotExamplesMarkdown → ## FEW-SHOT EXAMPLES в system prompt
```

Примеры покрывают: read→write, plan mode, bug fix, tests, RLM large file, local LLM JSON — **не** claim Work Graph, **не** русский BVC, **не** `update_work_item_status`.

Grep по `fewShotLibrary.js` на `workgraph` / `claim` / `evidence` / русский — **пусто**.

**Worker WG** auto-inject graph RAG + memory ([llm-pvrg-richir-memory-slices-usage-audit.md](llm-pvrg-richir-memory-slices-usage-audit.md) §8). **Cursor IDE** — модель должна **сама** вызвать MCP; auto-inject вне нашего контроля (Cursor решает system prompt).

---

## 4. Почему агент «не читает правила»

| Причина | Механизм |
|---------|----------|
| **Soft enforcement** | `.mdc` — рекомендация в system prompt; модель может игнорировать под давлением «быстро сделать» |
| **Конкурирующий инструмент** | TodoWrite удобнее для orchestration → shadow backlog ([AN-25](agent-bypass-work-graph-dual-backlog.md) §2) |
| **Нет эталонного turn** | Без few-shot «правильный ход» модель копирует паттерн generic coding agent |
| **Rules не в git** | `.cursor/` gitignored → на другой машине / clone rules может не быть |
| **Wrong workspace** | project root → WG rules не загружены |
| **Seed/MCP English defaults** | До `rusify-all-work-items` шаблоны давали EN bullets; rusify правит **файлы**, не **поведение** агента |
| **Нет primer на старт** | Первое «делай эпики» не включает MCP `take_next_work_item` |

---

## 5. Сравнение: enforcement vs прогрев

```
                    ┌─────────────────────────────────────┐
                    │         Cursor IDE agent            │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   .cursor/rules.mdc          FEW-SHOT EXAMPLES            MCP tools/prompts
   (declarative, AN-26)       (ioHasC only, AN-57 gap)     (on demand)
          │                           │                           │
          │ soft                      │ per-turn examples           │ must invoke
          ▼                           ▼                           ▼
   «не TodoWrite»              «вот как claim→evidence»      claim_work_item(...)
```

**Enforcement без прогрева** = правила есть, но модель не видела **конкретного** успешного trace.  
**Прогрев без enforcement** = примеры без запрета dual backlog — модель всё равно уйдёт в TodoWrite.

Нужны **оба слоя**.

---

## 6. Рекомендации (decision)

### D1 — Не считать AN-26 «достаточным» для Cursor IDE (P0, осознание)

Closing enforcement закрывает **declarative layer**. Проблема английского / статусов / TodoWrite — **не баг lint**, а **missing warm-up + workspace hygiene**.

### D2 — Закоммитить или шарить Cursor rules (P0)

Варианты (выбрать один при эпике):

| Вариант | Плюс | Минус |
|---------|------|-------|
| Убрать `.cursor/rules/` из `.gitignore` | rules в clone | `mcp.json` с секретами — отдельно |
| `docs/cursor-rules/` + `npm run sync:cursor-rules` | secrets-safe | шаг синка |
| Symlink из project → work graph rules | multi-repo UX | хрупко на Windows |

Минимум: **7 `.mdc` из work graph должны быть воспроизводимы** на любой машине.

### D3 — WG few-shot в ioHasC или embedded agent (P1)

Добавить 1–2 записи в `fewShotLibrary.js` (или WG-native compiler):

- **Пример A:** `take_next_work_item` → claim → `doing` → код → `add_work_item_evidence` → `complete_work_item`; prose задачи на русском.
- **Пример B:** запрет TodoWrite для эпика; read-only scope block ([AN-28](chat-work-graph-todo-sync.md)).

Task type: `workgraph_execute` или hook по `WG_PROJECT_ROOT` / MCP server `workgraph` enabled.

### D4 — Session primer (операторский, P0 без кода)

Первое сообщение в сессии WG:

1. «Корень — work graph, MCP workgraph включён».
2. «Перед кодом: claim + update_work_item_status».
3. Вызов MCP prompt `take_next_work_item` или `summarize_current_cycle`.

Это **не автоматизация**, но снижает drift до D3/D5.

### D5 — User rule в Cursor (P1)

Глобальное user rule с 5 строк из `agent-workgraph-single-backlog.mdc` + «work items на русском» — страховка при workspace = project.

### D6 — Не дублировать Claude Note (P2, осознанно)

Session memory daemon ([AN-31](promptpilot-claude-note-vs-work-graph.md)) — optional; committed work → evidence + closing AN, exploratory → можно Obsidian/CN.

### D7 — E2E замер Cursor MCP usefulness (P2)

[llm-pvrg-richir-memory-slices-usage-audit.md](llm-pvrg-richir-memory-slices-usage-audit.md) §9: worker замерен, Cursor — только UAT. Расширить `workGraphLlmUsefulnessEval.mjs` или Playwright matrix: «агент с rules+few-shot vs без».

---

## 7. Что **не** делать

- **Не удалять TodoWrite** из Cursor — нужен для micro-steps внутри claimed `work.id` ([AN-25](agent-bypass-work-graph-dual-backlog.md) R7).
- **Не требовать MCP на каждый read** — file read быстрее; требовать MCP на **mutate backlog** и **status**.
- **Не путать** `eval:mandatory-prompt` с прогревом — это CI regression, не live primer.
- **Не auto-inject в Cursor system prompt** — вне контроля WG; только rules + MCP + (будущий) ioHasC few-shot при embedded agent ([AN-47](iohasc-agent-stack-port-eval.md)).

---

## 8. Кандидат на эпик (не seeded)

| work.id (draft) | Суть | Приоритет |
|-----------------|------|-----------|
| `epic-agent-session-warmup-v1` | эпик | P1 |
| `commit-or-sync-cursor-wg-rules` | D2 | P0 |
| `add-workgraph-few-shot-examples` | D3 в ioHasC | P1 |
| `document-session-primer-runbook` | D4 в `docs/workgraph-mcp-clients.md` | P0 |
| `eval-cursor-mcp-usefulness-fixture` | D7 | P2 |

Intake: `intake.analytics_key: AN-57`. Seed — **после** явного «создавай задачи / делай» ([AN-25](agent-bypass-work-graph-dual-backlog.md) R5).

---

## 9. Связи с другими AN

| AN | Связь |
|----|-------|
| **AN-25** | dual backlog, TodoWrite — корневая проблема |
| **AN-26** | enforcement declarative complete; этот AN — **следующий слой** |
| **AN-28** | read-only scope вместо TodoWrite для эпика |
| **AN-31** | Claude Note vs WG memory; прогрев ≠ MEMORY.md |
| **AN-47** | embedded agent / few-shot port из ioHasC |
| **AN-50** | verification gates; агент обходит status → ложный «done» на доске |

---

## 10. Кратко (повтор)

- **Прогрев сессии для WG-дисциплины не реализован** — есть enforcement (rules + MCP + lint), нет few-shot / primer.
- **ioHasC few-shot есть**, но не про Work Graph; **Claude Note-style warm-up** — не цель WG ([AN-31](promptpilot-claude-note-vs-work-graph.md)).
- **Практика сейчас:** workspace = work graph, primer в первом сообщении, закоммитить rules; **следующий шаг продукта:** WG few-shot + sync rules (D2–D3).

---

**См. также:** [decision-pipeline-canon.md](../docs/decision-pipeline-canon.md), [workgraph-mcp-prompts.md](../docs/workgraph-mcp-prompts.md), [plan-agent-workgraph-enforcement.md](../docs/plan-agent-workgraph-enforcement.md), [../project/docs/adr-agent-few-shot-dynamics.md](../project/docs/adr-agent-few-shot-dynamics.md).
