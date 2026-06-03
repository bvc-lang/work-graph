# AN-50: Вкладка «Проверки» — тесты, линтеры, свидетельства и связь намерения с кодом

**Запрос:** «Как у нас код покрывается тестами, какими; есть ли линтеры; как связаны с тестами LLM; чему служат свидетельства; это аналог CI/CD? Как WG проверяет намерение и соответствие кода намерению?»

**Связи:** [AN-49](work-graph-codebase-volume-rewrite-scope.md), [AN-22](pipeline-analysis-to-board.md), `protocols/rebuild-verification-loop.bvc`, `protocols/evidence-model-v1.bvc`, `src/verificationLoop.mjs`.

---

## Кратко

Вкладка **«Проверки»** — не запуск CI из браузера, а **пульт наблюдения**: матрица гейтов, свидетельства задач, воркер, daemon, пробелы code↔step.

| Вопрос | Ответ |
|--------|--------|
| Это CI/CD? | **Частично.** Те же команды (`npm run test:deterministic`, линтеры), но UI **read-only**; CI гоняет команды, WG **хранит доказательства** и **не пускает `done` без них**. |
| Тесты LLM = unit-тесты? | **Нет.** Unit — Tier A, детерминированные. LLM — Tier B/C: optional eval и **фикстуры полезности MCP**, не покрытие кода. |
| Свидетельства — proof чего? | Что **конкретная задача** выполнена/заблокирована **обоснованно**: команда, exit code, артеfact, прогон воркера — не «чат сказал готово». |
| Намерение ↔ код? | Отдельные контуры: **trace links**, **code-gap**, **lint alignment**, **charter preflight**, **target_files** в атоме задачи. |

---

## 1. Что на экране «Проверки»

```
Цикл проверки (read-only)
├── Бейджи Tier A / B / C
├── Матрица проверок (команда, уровень, статус)
├── Гейт codegen (trace.codegen / roundtrip / bracket IR)
├── Запуски воркера (agent worker)
├── Журнал daemon (observe → schedule → run → audit)
├── Недавние свидетельства (из атомов задач)
└── Пробелы code↔step (предложения задач, без автосоздания)
```

Источник данных: `/api/dashboard-snapshot` → `buildVerificationSummary()` + code-gap projection + хвосты журналов.

**Важно:** кнопки «запустить тесты» на панели нет — оператор или агент **запускает команды локально/в CI**, результат **записывает в свидетельства** задачи (`add_work_item_evidence` / MCP).

---

## 2. Три уровня проверок (verification matrix)

Определено в `src/verificationLoop.mjs`, протокол `rebuild-verification-loop.bvc`.

| Уровень | Имя в коде | Смысл | Блокирует CI? |
|---------|------------|-------|---------------|
| **A** | `deterministic` | Стабильные тесты без сети и LLM | **Да** (`ci:mandatory`) |
| **B** | `optional-env` | OneBase `go test`, `onebase check` — нужно окружение | Нет |
| **C** | `optional-llm` | Живая LLM, сценарии агента | Нет |

### Примеры строк матрицы (Tier A)

| ID | Команда | Задачи-гейт |
|----|---------|-------------|
| formatter-roundtrip | `npm run test:deterministic` | implement-step-atom-formatter |
| workgraph-runtime | то же | implement-workgraph-minimal-runtime |
| trace-links-v1 | то же | implement-step-code-trace-link-validator |
| ui-server-smoke | то же | runtime, schematic view |
| golden-path-runtime | то же | golden-path-test |
| onebase-gross-profit-static | то же | OneBase static fixture |

### Tier B (окружение)

| ID | Команда |
|----|---------|
| onebase-go-test | `npm run test:optional:onebase` → `go test ./...` |
| onebase-config-check | `npm run test:optional:onebase-check` |
| lowcode-arch-scaffold | `npm run verify:lowcode` |

### Tier C (LLM)

| ID | Статус |
|----|--------|
| onebase-llm-scenario | «вручную / будущий optional eval» |

**Статус строки матрицы** в UI — не live stdout CI, а **эвристика по задачам**: `done` + ключевые слова в свидетельствах (`npm test`, `go test`, `blocked`, …).

---

## 3. Какие «тесты» реально есть

### 3.1. Детерминированный suite (Tier A) — аналог unit/integration CI

```bash
npm run test:deterministic   # node --test tests/*.test.mjs
npm run ci:mandatory         # lint* + check* + test:deterministic + eval:llm-usefulness
```

**~138 файлов** в `tests/` — runtime, MCP, UI-server smoke, verification loop, worker, trace links, analytics и т.д.

**Не покрывают:** качество ответа живой модели, наличие Go в PATH, продакшен OneBase.

### 3.2. Линтеры и статические проверки (тоже Tier A / CI)

| Команда | Что проверяет |
|---------|---------------|
| `npm run lint:backlog` | схема `.bvc` / backlog |
| `npm run lint:intent-tree` | дерево `intent/` |
| `npm run lint:plan-work-alignment` | планы ↔ work.id, стадии pipeline |
| `npm run check:catalog-alignment` | каталог ↔ intent |
| `npm run check:audit-gap-matrix` | матрица пробелов аудита |
| `npm run bvc:lint` | формат BVC |
| `npm run audit:agent-behavior-rules` | правила агента |

Это **не Jest coverage %** — это **канон и согласованность репозитория намерений**.

### 3.3. Optional окружение (Tier B)

- `test:optional:onebase` — preflight `go version`, затем тесты OneBase
- `test:optional:onebase-check` — CLI `onebase check`
- При отсутствии Go/CLI задача может быть **`blocked`** со свидетельством — матрица показывает `blocked`, не «красный CI всего репо»

### 3.4. LLM-eval — **не те же тесты**

| Команда | Что это |
|---------|---------|
| `npm run eval:llm-usefulness` | **Фикстуры MCP**: может ли «LLM-агент» пройти сценарии read/write через handlers **без живой модели** |
| `npm run eval:live-llm` | **Живая модель** (optional); **не входит** в mandatory CI |

**`eval:llm-usefulness`** проверяет **поверхность инструментов для агента** (claim, evidence, intent hierarchy), а не покрытие строк кода.

**Живой LLM-тест** — Tier C: доказательство, что агент **умеет** workflow на endpoint; закрытие задачи `optional-live-llm-eval` требует **строку свидетельства** (endpoint, model, pass/fail).

**Итог:** unit-тесты и LLM-eval **разные доказательства**; матрица явно их разводит.

---

## 4. Свидетельства — proof чего?

### 4.1. Политика runtime

Из `workGraphRuntime.mjs`:

- **`done`** без непустого блока **Свидетельства** → ошибка политики
- **`blocked`** без причины → ошибка
- **`claim`** может добавить свидетельство захвата

Свидетельство в `.bvc` — **человекочитаемые строки** (`npm test passed`, `exit_code=0`, `go test ./...`).

### 4.2. Структурированная проекция

`protocols/evidence-model-v1.bvc` — типы: `command`, `test`, `file`, `change`, `decision`, `worker-run`, `blocker`.

MCP: `list_evidence_records`, `get_evidence_record` — для dashboard и памяти.

### 4.3. Чему служат (не абстрактный «quality»)

| Свидетельство доказывает | Пример |
|--------------------------|--------|
| **Задачу можно закрыть** | прогон `npm test`, diff, REST-check |
| **Почему blocked** | нет Go, нет OneBase CLI |
| **Что сделал воркер** | Worker Output: patchSummary, failureReason |
| **Codegen-целостность** | roundtrip, integrity hash |
| **Аудит для человека** | «кто, когда, какая команда» — без replay чата |

**Память проекта** (вкладка «Память») — **производная от закрытых задач** со свидетельствами, не замена тестам.

---

## 5. Связь с CI/CD

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Actions │     │  Локально        │     │  Work Graph     │
│  ci:mandatory   │     │  npm test        │     │  свидетельства  │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                    одни и те же команды (Tier A)
```

| CI/CD классика | Work Graph |
|----------------|------------|
| Pipeline pass/fail | Tier A в `ci:mandatory` |
| Artifact / log | Строки в **Свидетельства** задачи |
| Deploy gate | **`done` только с evidence** + matrix row `passed` |
| PR check | WG **не заменяет** GitHub Checks; **дублирует смысл** на уровне **work.id** |

WG добавляет слой **«доказательство привязано к намерению (задаче)»**, а не только «main зелёный».

---

## 6. Как WG проверяет намерение ↔ код

Это **не один тест**, а несколько механизмов:

### 6.1. Атом задачи как намерение

В `.bvc`: **Базис, Вектор, Цель, Проверки**, `work.target_files`, `work.depends_on`.

Закрытие задачи = заявление «намерение выполнено» + **свидетельства**.

### 6.2. Trace Links v1

Связи: work.id ↔ файлы ↔ evidence ↔ код (валидатор в deterministic suite).

Проверяет **ссылочную целостность**, не бизнес-логику.

### 6.3. Code-gap (панель «Пробелы code↔step»)

`codeGapAnalyzer` → отчёт → предложения задач: код есть, **связи с каноном/step нет**.

Оператор **вручную** «Добавить в бэклог» — автоматом задачи не создаются.

### 6.4. Codegen gate

Для задач с `trace.codegen*`: integrity, roundtrip, bracket IR drift (`codegenEvidence.mjs`).

Связь **сгенерированного кода** с step/IR.

### 6.5. Lint plan ↔ work alignment

`lint:plan-work-alignment` — unchecked todo в планах без `work.id`, задачи в `doing` без стадии.

**Намерение в документах** согласовано с **официальным бэклогом**.

### 6.6. Charter preflight

При promote/transition: **anti-goals** (нет orchestrator в target_files, нет markdown-канона и т.д.).

**Устав** vs **конкретная задача**.

### 6.7. Unified linkage / PVRG / GraphRAG

MCP: `get_unified_linkage`, `get_pvrg_task_scope`, `get_graph_rag_context` — **контекст для агента**, чтобы правки не уехали от scope задачи.

Не автоматический gate, но **направляет** исполнение.

### 6.8. Worker + verification matrix (local-cli)

`agentWorkerLocalCliProvider` — только **allowlist** команд из `VERIFICATION_MATRIX` для gated task id.

Связь **«эта задача → эта команда проверки»**.

---

## 7. Сводная схема

```
Намерение (.bvc задача)
    │
    ├─► Lint/intent/charter ──► канон репо OK?
    │
    ├─► Исполнение (агент/человек) ──► изменения в target_files
    │
    ├─► Tier A: npm test + lint ──► CI + свидетельство в задаче
    │
    ├─► Tier B: onebase check / go test ──► optional, blocked если нет env
    │
    ├─► Tier C: live LLM eval ──► optional proof для agent workflow
    │
    ├─► Trace links + code-gap ──► код ↔ канон согласован?
    │
    └─► done + свидетельства ──► память проекта
```

---

## 8. Чего WG **не** делает

- **Coverage %** по строкам (Istanbul) — не центральная метрика
- **Автозапуск CI** из вкладки «Проверки»
- **Доказательство «LLM не галлюцинирует»** — только workflow + optional eval
- **Полная верификация 1С/OneBase** без внешнего Go-runtime

---

## 9. Рекомендации

| ID | Смысл |
|----|--------|
| **R1** | Считать Tier A = **CI truth**; UI матрицы = **audit view** по задачам. |
| **R2** | Не путать `eval:llm-usefulness` с unit-тестами — это **контракт MCP для агента**. |
| **R3** | Закрытие задачи: **сначала команда + свидетельство**, потом `complete_work_item`. |
| **R4** | Намерение↔код: усиливать **code-gap + trace links**, не только «npm test green». |
| **R5** | В новой обёртке сохранить **три tier** и **evidence gates** — это ядро WG vs Linear. |

---

**См. также:** [AN-50.1](work-graph-bvc-contract-verification.md) (BVC как контракт исполнения), [AN-51](analytics-record-lineage-flat-list-graph-storage.md) (lineage разборов), [AN-45](work-graph-sidebar-sections-guide.md) (раздел «Проверки»), [docs/optional-live-llm-eval.md](../../docs/optional-live-llm-eval.md), `src/verificationLoop.mjs`, `src/workGraphRuntime.mjs`, `protocols/rebuild-verification-loop.bvc`.
