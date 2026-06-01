# AN-20: UX Work Graph — текущее состояние, боли, вектор и центр-управления

**Запрос:** «проведи анализ как сейчас выглядит UX в продукте и куда нужно стремиться, какие боли закрывать. Сравни с конкурентами, возможно стоит что-то взять за основу. Видел HERMES-дашборд как пример».

## Кратко

UI сейчас — **VS Code shell с 9 равноправными вкладками** в боковом меню. Это хорошо для разработчика-исследователя (всё на виду), но **плохо для оператора agent-OS**: нет домашнего экрана «что делать сейчас», нет dock-а с живыми runs, нет inbox-а и нет cmd+k.

**Главный сдвиг:** превратить UI из **«редактора атомов с боковыми инструментами»** в **центр-управления над agent рабочий процесс** — постоянный dock текущего run, inbox блокеров, домашний экран с метриками цикла, и саморазвитие через сохранённые представления.

**Что взять:**
- **Linear** — cmd+k палитра, My Issues, Inbox, под-задачи без overlay
- **n8n / Temporal UI** — Executions panel как постоянный канал runs с retry на узле
- **Cursor agent chat** — persistent right dock с chat + tool calls + diff
- **HERMES / W&B / Datadog центр управления** — плитки KPI в верхней строке, состояние подсистем, drilldown
- **Plane / Height** — сохранённые представления, массовые действия, динамические фильтры

**Что НЕ копировать:** Trello-стиль доски без runs, Jira-стиль рабочий процесс editor, Notion database editing inline (у нас атом сложнее, чем строка БД).

---

## 1. Текущая карта UI (как есть на 2026-05-31)

### Top-level: `aside.sidebar + main.content + aside.detail-drawer`

**Левый сайдбар, 9 вкладок в 2 группах:**

| Группа | Вкладка | Что показывает |
|---|---|---|
| Планирование | **Доска** | Kanban (status × group) + классическая доска |
| | **Задачи** | Subtabs «Бэклог» / «Архив» с пагинацией |
| | **Карта архитектуры** | lit-flow граф, режим Full / Pipeline |
| | **Граф намерений** | intent-roadmap |
| Инструменты | **Схема** | Schematic view, Full / Pipeline |
| | **Проверки** | Verification matrix, codegen gate, worker runs, daemon journal, evidence, code-gap intake |
| | **Промпты** | Prompt rules editor (bounded `rules/agent-behavior/*.bvc`) |
| | **Память** | Memory projection list |
| | **Аналитика** | AN-records list (новые сверху) |

**Toolbar (один на все вкладки):**
- Search + semantic-search mode (`local` / `lexical-v1` / `hybrid-lexical-bm25-v1`)
- Cycle filter (текущий / все)
- Intent domain filter + clear

**Detail drawer:** overlay справа, ресайзится, открывается по клику на задачу. Показывает атом, evidence timeline, ui-refs, atom inspector, pvrg-task-scope, work-item-linkage.

**Intent composer:** скрытая вкладка под «Граф намерений» с chat-стилем «Preview draft → Создать задачу».

### API surface (≈30 endpoints)

`/api/snapshot`, `/api/dashboard-snapshot`, `/api/operator-shell-snapshot`, `/api/semantic-search`, `/api/prompt-rules*`, `/api/memory-projection`, `/api/analytics-projection`, `/api/architecture-snapshot`, `/api/intent-roadmap-projection`, `/api/intent-composer/*`, `/api/code-gap*`, `/api/work-item/*`, `/api/atom-inspector/*`, `/api/evidence-timeline`, `/api/pvrg-task-scope`, `/api/agent-run`, `/api/worker-provider-catalog`, `/api/agent-run/journal`, `/api/daemon-audit-tail`.

### Что уже спроектировано, но не выведено в основной UI

- **Operator Dashboard V2** ([ui/operator-dashboard-v2.bvc](../../ui/operator-dashboard-v2.bvc)): agent run panel, eligible queue, blocked reasons, verification matrix summary, phase roadmap, cycle slice — описано, но как отдельный snapshot, не как home-screen.
- **Operator Agent Run Panel** ([protocols/operator-agent-run-panel-v1.bvc](../../protocols/operator-agent-run-panel-v1.bvc)) — есть API `/api/agent-run*`, в UI нет постоянного места.
- **Kanban Board Projection** — есть `buildKanbanBoardProjection`, но рендер делит экран с legacy `#board`.

---

## 2. Сильные стороны (что нельзя терять)

1. **Уникальный набор вкладок** — Аналитика, Память, Промпты, Проверки в одном продукте; конкуренты этого не сводят.
2. **Detail drawer глубокий** — атом + evidence + ui-refs + linkage + pvrg в одном месте.
3. **Графы в трёх ипостасях** (architecture / intent / schematic) с full/pipeline режимами — редкая фича.
4. **Cross-highlight** task↔block уже работает на доске и architecture-canvas.
5. **Тёмная тема** по умолчанию, плотность Cursor/VS Code (соответствует целевой персоне разработчика).
6. **API-first** — все вкладки = JSON projection, легко переиспользовать в MCP/CLI.
7. **Trace-status и Verification matrix** — оператор видит, что прошло уровень A vs optional.

---

## 3. Боли (что не работает в UX)

### B1. Нет «домашнего экрана» — стартовая страница = Доска

Пользователь попадает в **Kanban**, но первое решение оператора — не «какую колонку посмотреть», а:
- что у меня заблокировано?
- какой следующий ready task?
- есть ли свежие failed verifications?
- что было в последних runs?

**Сейчас:** надо вручную обойти 4 вкладки.

### B2. Agent Run panel невидим

Самое ценное в agent-OS — **запуск worker**. Сейчас он:
- доступен только через API (`/api/agent-run` POST);
- журнал `/api/agent-run/journal` — read-only;
- нет UI кнопки «Run this task» на карточке.

**Сейчас:** оператор уходит в терминал (`npm run worker:live-loop` / curl) — это обходной путь, не product.

### B3. Нет cmd+k / command palette

9 вкладок + 256 WorkItems + 19 AN + N evidence — без палитры навигация по клику. Linear/Cursor приучили к «всё за 2 keystroke».

### B4. Нет Inbox / notifications

Если daemon упал, evidence пришла, новый AN появился — оператор не узнает, пока сам не зайдёт. Нет badge на сайдбаре, нет push.

### B5. Detail drawer перекрывает контент

Открыл задачу — закрыл список. Linear/Plane используют **разделённый экран** (slim list слева, detail справа в той же panel). У нас drawer-overlay = «всё или ничего».

### B6. Toolbar универсальный, не контекстный

Search + cycle + domain filter одинаковый для Доски, Проверок и Памяти. На Проверках domain filter не нужен, на Памяти cycle filter не работает.

### B7. Аналитика — пассивный список

19 разборов AN-1…AN-19 без:
- фильтра по tag/topic;
- связи AN ↔ epic/work item (хотя `relatedWorkItems` в схеме есть);
- diff / новизны: «что добавлено за неделю»;
- статуса (draft / published / заменён).

### B8. Графы изолированы от runs и evidence

На Architecture canvas нельзя:
- увидеть, какие узлы сейчас в `doing`;
- кликнуть «запустить worker на этом узле»;
- посмотреть последние evidence по узлу.

### B9. Нет персонализации

Все видят одинаково. Нет:
- «My queue» (по owner_role);
- сохранённых views («Blocked», «Verification failures», «My ready»);
- favorites/pinned tasks.

### B10. Нет insights / метрик цикла

Где сгорание бэклога, пропускная способность, blocked time, average ready→done? Phase roadmap есть, но без чисел.

### B11. BVC dialect → UX (новое после AN-19)

После Detect-or-Declare:
- atom inspector должен показывать `lang` (en/ru) и предупреждать на mixed keys;
- редактор должен подсказывать canonical EN keys;
- сейчас этого нет.

### B12. Массовые действия отсутствуют

Нельзя выбрать 5 задач и сменить status / owner. Каждое действие — drawer + клик.

---

## 4. Сравнение с конкурентами

### 4.1. Linear

| Что | Linear | Work Graph |
|---|---|---|
| Cmd+K палитра | ✅ central | ❌ |
| My Issues / Inbox | ✅ home | ❌ |
| Cycles / projects | ✅ first-class | ⚠️ есть cycle filter, нет cycle view |
| Sub-issues | ✅ inline | ⚠️ через parent_id, без UI tree |
| Разделённый экран (list + detail) | ✅ | ❌ overlay drawer |
| Сохранённые представления | ✅ | ❌ |
| Activity feed | ✅ | ⚠️ есть daemon audit tail |
| Slack/email notifications | ✅ | ❌ |

**Взять:** cmd+k, My Issues home, sub-issues tree, разделённый экран, сохранённые представления.  
**НЕ брать:** issue → ticket рабочий процесс (мы атомарнее), projects → workspaces (избыточно для одного репо).

### 4.2. Height.app

| Что | Height | Work Graph |
|---|---|---|
| AI auto-categorize tasks | ✅ | ⚠️ intent composer есть, не везде |
| Bulk multi-select | ✅ | ❌ |
| Custom fields | ✅ | ⚠️ labels JSON-style |
| Smart filters | ✅ | ❌ |

**Взять:** массовые действия, smart filters (saved + ручной).

### 4.3. n8n / Temporal UI

| Что | n8n / Temporal | Work Graph |
|---|---|---|
| Граф рабочий процесс | ✅ live edit | ✅ graph canvas (read-only) |
| Executions / runs panel | ✅ постоянный sidebar | ❌ только journal endpoint |
| Retry на узле | ✅ | ❌ |
| Drilldown узла → input/output | ✅ | ⚠️ через detail drawer |
| Schedule / triggers | ✅ | ⚠️ daemon, но без UI триггеров |

**Взять:** executions panel как dock; retry button на узле графа; node drilldown «input/output» в стиле Temporal.  
**НЕ брать:** drag-n-drop редактор узлов (наш граф — projection из .bvc, не единый источник правды).

### 4.4. Cursor / VS Code

| Что | Cursor | Work Graph |
|---|---|---|
| Persistent right dock (chat) | ✅ | ❌ |
| Tool calls inline | ✅ | ⚠️ через verification view |
| Diff view | ✅ | ❌ |
| Command palette | ✅ | ❌ |
| File tree (left) | ✅ | ⚠️ есть intent-tree-sidebar (work) |

**Взять:** правый dock как home для agent run; inline diff для evidence / atom inspector changes; cmd+k.

### 4.5. HERMES-style центр управления (W&B / Datadog / NASA HERMES dashboard)

«HERMES-дашборд» как класс = **центр управления с плитки KPI в верхней строке, состояние подсистем, поток событий в реальном времени, drilldown panels**. Это шаблон, который хорошо ложится на agent-OS:

| Слой | Что показывает | Аналог в Work Graph |
|---|---|---|
| **Top KPI tiles** | Uptime, пропускная способность, error rate, queue depth | Verification pass rate, ready queue depth, blocked count, daemon uptime |
| **System health panel** | Subsystems status | Sidecar / LLM / daemon / parser status |
| **Event stream** | Real-time log | Daemon audit tail + worker runs |
| **Active runs / missions** | What's executing now | Agent run panel V2 (claimed / doing / verify) |
| **Drilldown** | Per-mission detail | Detail drawer |

Этот шаблон **закрывает B1, B2, B4, B10 сразу**.

**Взять:** плитки KPI в верхней строке, event stream sidebar, состояние подсистем.  
**НЕ брать:** «cosmic» декор и сложные плоты — у нас не astrophysics.

### 4.6. Plane (открытый исходный код Linear)

Хорошо как **reference с открытым исходным кодом UI patterns**: cycles, modules, inbox, views. Близко к нашей нише, MIT — можно подсмотреть конкретные React-патерны.

### 4.7. GitHub Projects v2 / Notion

| Взять | Не брать |
|---|---|
| Table view как альтернатива Kanban | Database inline edit |
| Group by status / owner / cycle | Page wiki blocks |
| Insights tab | Permissions matrix |

---

## 5. Целевая UX-архитектура (вектор)

### 5.1. Новая структура навигации

```
┌─ Sidebar (компактный, 7 вкладок) ────────┐  ┌─ Right dock (persistent) ──┐
│ 🏠  Home (центр управления)               │  │ Agent Run panel             │
│ 📋  Задачи (разделённый экран)                  │  │ ─ task / provider / run     │
│ 🗺  Граф (architecture/intent/schematic) │  │ ─ live log + tool calls     │
│ ✅  Проверки                              │  │ ─ retry / cancel / diff     │
│ 🧠  Память                                │  └─────────────────────────────┘
│ 💬  Промпты                               │
│ 📊  Аналитика                             │  Toggleable dock как Cursor chat
└──────────────────────────────────────────┘
```

### 5.2. Home как центр управления (HERMES-стиль)

```
┌─ Top KPI tiles ─────────────────────────────────────────────────┐
│ Cycle progress 12/34 │ Ready 8 │ Blocked 3 │ Verify pass 91%   │
│ Throughput 4/day     │ Daemon up 2d │ Agent runs 7 (today)    │
└─────────────────────────────────────────────────────────────────┘

┌─ Inbox (events that need attention) ──────────────────────────┐
│ • AN-19 published — ADR multilingual принят                   │
│ • bvc-multilingual-conformance-tests перешла в verify         │
│ • Code-gap detected: src/foo.ts без trace                     │
│ • Daemon recovered after 12s outage                           │
└────────────────────────────────────────────────────────────────┘

┌─ My queue ────────────────┐ ┌─ Active runs ────────────────────┐
│ 1. adr-bvc-multilingual…  │ │ #423 worker on parser MVP …      │
│ 2. bvc-dialect-registry…  │ │   step 4/7 — tool listFiles       │
│ 3. extend-bvc-atom-draft… │ │ #422 done · evidence recorded    │
└───────────────────────────┘ └──────────────────────────────────┘
```

### 5.3. Задачи: разделённый экран

Левая колонка — list (300px), правая — detail (без overlay). Esc сворачивает в полный list. Поддержка multi-select для массовые действия (status, owner, claim).

### 5.4. Cmd+K палитра

Скоупы: `task:`, `an:`, `mem:`, `evidence:`, `run:`, `graph:node:`, `cmd:`. Fuzzy + semantic-search hybrid.

### 5.5. Сохранённые представления

Пресеты сразу: **My ready**, **Blocked**, **Verification failed**, **This cycle**, **Recently changed**. User-defined через «Save as view».

### 5.6. Graph ↔ runs

Узел архитектуры показывает badge `doing/verify/blocked`; right-click → «Run agent on this WorkItem» / «Open evidence timeline».

### 5.7. Аналитика — связи и фильтры

- Tag filter chips (`bvc`, `ui`, `onebase`)
- Связь AN → epic в карточке («Покрыта в epic bvc-multilingual-detect-or-declare»)
- Diff between published version (для AN-8, AN-19)
- Status badge: draft / published / заменён

### 5.8. Atom inspector — BVC dialect aware

- Бэйдж `lang: ru/en` в шапке
- Подсказка при mixed keys (`E_BVC_DIALECT_MIX`)
- Toggle «View as EN canonical» — показать normalized AST
- Header `@en` отображается явно

### 5.9. Notifications

- Badge на сайдбаре с number unread в Inbox
- Browser Notification API для критичных (daemon down, verification fail)
- Опционально — webhook/Slack (за `VITE_IOHASC_NOTIFY_WEBHOOK`)

---

## 6. Что взять, как именно

### 6.1. Источники паттернов

| Что | Откуда | Куда внедрить |
|---|---|---|
| Cmd+K палитра | Linear / Cursor | Глобальный layer, `Ctrl+K` / `Cmd+K` |
| Центр управления home | HERMES / W&B / Datadog | New view `home`, стартовый экран по умолчанию |
| Right dock chat/runs | Cursor | Replace agent-run-panel-v1 место |
| Разделённый экран list+detail | Linear / Plane | Заменить `detail-drawer` overlay |
| Сохранённые представления | Linear / Plane / Notion | Поверх `localStorage` filters |
| Массовые действия | Height / Linear | Multi-select на list rows |
| Executions panel | n8n / Temporal | Часть центр-управления + dock |
| Retry на узле графа | n8n | Action menu на node click |
| Insights метрики | Linear / GH Projects | New tab или раздел Home |
| Tag chips для AN | Notion / GH issues | Analytics panel header |
| Inline diff evidence | Cursor / GitHub | В detail drawer / inspector |

### 6.2. Что НЕ брать

- ❌ Drag-n-drop редактор графа (Notion canvas, n8n editor) — наш граф derived
- ❌ Per-user permissions matrix (Jira, Plane) — для одного арендатора pilot
- ❌ Database-like inline cell editing (Notion) — атом сложнее ячейки
- ❌ Переключатель нескольких рабочих областей (Linear) — у нас один Work Graph на репо

---

## 7. Приоритеты (P0/P1/P2)

### P0 — закрывают B1, B2, B3, B4

1. **Home (центр управления)** как стартовый view: KPI tiles + My queue + Active runs + Inbox.
2. **Right dock с Agent Run panel**: запуск worker из любой задачи, live log, retry.
3. **Cmd+K палитра**: tasks + AN + commands.
4. **Inbox с badge** в сайдбаре.

### P1 — закрывают B5, B6, B7, B9, B12

5. **Разделённый экран** для Задач (заменить drawer overlay).
6. **Сохранённые представления** и **массовые действия**.
7. **Аналитика с tag chips + AN→work-item ссылки + status badge**.
8. **Context-aware toolbar** (фильтры зависят от view).
9. **Persona presets**: My ready / Blocked / Verification failed.

### P2 — закрывают B8, B10, B11

10. **Graph node action menu**: run, show evidence, focus task.
11. **Insights view**: пропускная способность, сгорание бэклога, blocked time, verification pass rate.
12. **BVC dialect-aware atom inspector** (lang badge, mixed-key warning, EN canonical toggle).

---

## 8. Что НЕ делать

- Не строить **own design system** — Tailwind + CSS vars уже работают.
- Не вводить **per-user authn** — для одного арендатора pilot, добавит сложности.
- Не переписывать **graph engine** ещё раз — lit-flow + dagre достаточно для P0.
- Не делать **WYSIWYG editor для .bvc** — atom inspector + EN/RU toggle проще и безопаснее.
- Не дублировать **command-line tools в UI** (npm scripts), показывать только релевантные.

---

## 9. Метрики UX (как поймём, что выросло)

| Метрика | Сейчас | Цель |
|---|---|---|
| Кликов до запуска worker | 5+ (через CLI) | **1** (cmd+k → run) |
| Кликов до «My ready next task» | 4 (sidebar→Задачи→filter→find) | **0** (Home) |
| Time-to-first-action на старте | ~30s | **<5s** |
| % action из палитры vs нав | 0% | ≥40% |
| Notifications acknowledged | n/a | ≥80% inbox cleared |
| Сохранённые представления per active user | 0 | ≥3 |

---

## 10. Связь с другими аналитиками

- **AN-6** (tech audit) — sidebar шире монолита UI-сервера; модульный render близок к рекомендации тут.
- **AN-7** (user audit / positioning) — operator-первичен; центр-управления закрывает «нет позиционирования в UI».
- **AN-12** (graph canvas mess) — solved через lit-flow, но runs ↔ graph пока нет.
- **AN-19** (multilingual) — atom inspector должен стать BVC dialect-aware (B11).
- **AN-17** (OneBase vertical) — domain-specific home cards (например, «OneBase YAML coverage») — расширение центр-управления.

---

## 11. Риски

| Риск | Митигация |
|---|---|
| Home усложнит UX вместо упрощения | Начать с 4 tiles + 2 list-секций; не >7 элементов |
| Right dock конкурирует с detail drawer | Dock = runs, drawer = task detail; ортогональны |
| Cmd+K без сильного матчинга = мусор | Использовать существующий semantic-search backend (lexical+BM25) |
| Сохранённые представления в localStorage теряются | Опция export/import JSON в Промпты-стиле |
| Insights без живых данных = пустой график | На P2 после daemon-tail journal стабилизирован |
| HERMES-эстетика ≠ HERMES-функциональность | Брать паттерн, не визуал; цвета — Cursor dark, не «cosmic» |
| Центр управления в браузере жрёт RAM | KPI tiles на запросе раз в 30s, не WS; runs через polling 5s |

---

## 12. Финальный вердикт

UX сегодня — **сильный VS Code-style editor для исследователя**. Чтобы стать **консоль оператора для agent-OS**, нужен сдвиг:

1. **Home = центр управления** (HERMES-pattern KPI + Inbox + My queue + Active runs).
2. **Right dock = agent run** (Cursor-pattern persistent chat/run).
3. **Cmd+K + сохранённые представления + разделённый экран** (Linear-pattern productivity).
4. **Sidebar сжать до 7 вкладок** (Доска и Задачи можно слить через табы внутри).
5. **Аналитика и Память — связать с work items** (graph projection, не плоский список).

Это не редизайн с нуля, а **перенос фокуса** с «9 равноправных инструментов» на «оператор, который видит, что делать, и нажимает 1 клавишу».

---

**См. также:** [AN-6](product-self-audit-tech.md), [AN-7](product-self-audit-user.md), [AN-12](graph-canvas-layout-mess.md), [AN-19 multilingual](bvc-multilingual-keys-design.md), [Operator Dashboard V2 design](../../ui/operator-dashboard-v2.bvc), [Agent Run Panel protocol](../../protocols/operator-agent-run-panel-v1.bvc).
