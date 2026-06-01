# AN-34: Визуализация архитектуры проекта — списки, деревья, диаграммы

**Запрос:** в каком виде лучше показывать архитектуру — плоские списки с углубление (как сейчас), дерево, схемы/диаграммы; сравнить с другими продуктами; зафиксировать выводы.

## Кратко

**Один «лучший» вид не существует.** Архитектура в Work Graph — это сразу несколько срезов: **операционный** (что делать), **структурный** (из чего состоит), **связный** (как части зависят). Индустрия решает это **мульти-view**, а не заменой списка диаграммой.

| Срез | Лучший паттерн | Роль в WG |
|------|----------------|-----------|
| Ежедневная работа, статусы, evidence | **Списки + drawer** | ✅ основной UX (задачи, промпты, память, аналитика) |
| Иерархия «эпик → подзадачи», домены intent | **Дерево / collapsible groups** | ⚠️ частично (рабочий процесс epic groups); нужен `parent_id` |
| Зависимости и lineage между блоками | **Layered graph (Pipeline → Full)** | ⚠️ есть, но layout/edges — боль (см. AN-1, AN-4, AN-5) |
| Презентация / подключение / ADR | **Статические C4 / Mermaid / DSL** | ✅ docs/export; ❌ не runtime canvas |
| Обзор «кто от кого зависит» на 50+ модулей | **Matrix / catalog map** | ❌ нет; кандидат на Phase B |

**Рекомендация:** не отказываться от списков; **не делать full graph единственной «картой архитектуры»**; канонизировать **три режима одной модели** — List / Tree / Pipeline graph — с общим snapshot и cross-highlight в drawer.

---

## 1. Что уже есть в Work Graph (2026-05-31)

### 1.1. Списки + углубление (основной паттерн)

| Раздел | Список | Детализация |
|--------|--------|-------------|
| Задачи | backlog / archive / kanban | detail drawer: atom, evidence, linkage, inspector |
| Промпты | prompt rules list | editor в drawer |
| Память | memory records | drawer с полями record |
| Аналитика | AN-records (intake / closing) | drawer + related tasks |
| Architecture blocks | косвенно через graph click | drawer L2 stack (вертикальный список) |

**Плюсы:** масштабируется на сотни сущностей, пагинация, semantic search, API-first projections, привычно оператору (Linear/Jira list DNA).

**Минусы:** **глобальная картина** и **межблочные связи** не видны без перехода на graph-вкладку; parent/child между задачами не машинный (см. [parent-subtask-hierarchy.md](parent-subtask-hierarchy.md)).

### 1.2. Graph canvas (Architecture / Schematic / Intent roadmap)

- Модель: `architecture.snapshot.v1`, lit-flow projection, режимы **Full / Pipeline**
- Layout: ручная сетка + dagre (разные code path)
- Interaction: click → drawer, cross-highlight task↔block

**Плюсы:** уникально для agent-OS — связь «блок ↔ work item ↔ evidence» в одном продукте ([AN-20](ux-current-state-and-vector.md) §2).

**Минусы:** задокументированы системно в [graph-canvas-layout-mess.md](graph-canvas-layout-mess.md) — ручная сетка ≠ топология графа; карточки-«мини-статьи»; три layout-движка; проблемы рёбер после lit-flow ([AN-5](graph-edges-n8n-parity.md)).

### 1.3. «Дерево» сегодня — фрагментарно

| Где | Форма |
|-----|--------|
| `intent/{domain}/…/work/` на диске | папки, не UI tree |
| Рабочий процесс epic groups | collapsible группа + «Развернуть» |
| L2 в architecture drawer | vertical stack — **самый аккуратный layout**, потому что следует дереву |
| File tree в IDE | вне WG backlog UI |

---

## 2. Ранние разборы (не повторять, опираться)

| ID | Файл | Вывод, релевантный этому вопросу |
|----|------|----------------------------------|
| — | [graph-canvas-layout-mess.md](graph-canvas-layout-mess.md) | Full graph на одной сетке → «каша»; нужен dagre + compact nodes + Pipeline mode |
| AN-4 | [graph-visualization-engine.md](graph-visualization-engine.md) | Canvas = viewport + layout + nodes + edges; n8n/Vue Flow как референс; lit-flow выбран |
| AN-5 | [graph-edges-n8n-parity.md](graph-edges-n8n-parity.md) | Стрелки — отдельная инженерная задача, не «поправить координаты» |
| AN-20 | [ux-current-state-and-vector.md](ux-current-state-and-vector.md) | 9 вкладок; graph — одна из ипостасей; центр-управления + разделённый экран важнее новой диаграммы |
| — | [parent-subtask-hierarchy.md](parent-subtask-hierarchy.md) | Tree для **задач** ≠ `depends_on`; нужен `work.parent_id` + board tree mode |
| AN-10 | [pvrg-verified-reference-graph.md](pvrg-verified-reference-graph.md) | Code-level graph (PVRG) — другой слой, не замена architecture UI |
| AN-14 | [compiler-round-trip-low-code-каркас.md](compiler-round-trip-low-code-каркас.md) | Structurizr DSL → diagrams = **docs**, не product runtime |

**Вывод:** вопрос «список vs дерево vs диаграмма» у нас уже **частично закрыт** для graph-слоя; этот AN-34 **обобщает** и фиксирует продуктовую стратегию выбора вида.

---

## 3. Пять паттернов — сравнение

### 3.1. Плоский список + углубление

**Примеры:** Linear issues list, Jira backlog, WG prompts/memory/analytics, Backstage catalog **table view**.

| Критерий | Оценка |
|----------|--------|
| Сканирование 100+ элементов | ★★★★★ |
| Статус / фильтры / pagination | ★★★★★ |
| Межэлементные связи | ★☆☆☆☆ |
| Подключение «как устроен продукт» | ★★☆☆☆ |
| Стоимость поддержки UI | ★★★★★ |
| Agent/MCP consumable | ★★★★★ |

**Когда primary:** операционная работа, review, audit trail.

---

### 3.2. Иерархическое дерево

**Примеры:** IDE file tree, Jira epic/sub-task (с parent link), Notion sidebar, Structurizr **System Context tree**, Miro outline.

| Критерий | Оценка |
|----------|--------|
| Комposition (часть–целое) | ★★★★★ |
| Порядок исполнения (`depends_on`) | ★★☆☆☆ (путают с parent) |
| Глубина >3 уровней | ★★★☆☆ (усталость, narrow sidebar) |
| Связи «брат–брат» across branches | ★☆☆☆☆ |
| Реализация в WG | ★★★☆☆ (epic groups есть; intent tree — нет в UI) |

**Когда primary:** навигация по **domains / epics / modules folder**; sidebar или nested list в «Задачи».

**Риск для WG:** подменить `depends_on` parent-child — уже описан в parent-subtask-hierarchy.

---

### 3.3. Graph / diagram canvas

**Примеры:** n8n, Structurizr diagrams, C4 PlantUML, CodeSee maps, Sourcegraph scip graph, WG architecture/intent/schematic.

| Критерий | Оценка |
|----------|--------|
| Dependencies & lineage | ★★★★★ |
| «Красота» презентации | ★★★★☆ |
| Layout при >15 узлах | ★★☆☆☆ (без auto-layout + routing) |
| Ежедневный triage | ★★☆☆☆ |
| Стоимость (layout + edges + a11y) | ★★☆☆☆ |

**Когда primary:** **explore mode** — «покажи как OneBase связан с trace-evidence»; не главный экран.

**Урок WG:** Pipeline (5–7 узлов) ≈ C4 **Container diagram** одного сценария; Full graph ≈ **Component** — только с dagre и compact nodes ([graph-canvas-layout-mess.md](graph-canvas-layout-mess.md) §C.9).

---

### 3.4. Layered views (C4 / zoom levels)

**Примеры:** Structurizr (Context → Container → Component → Code), Backstage **layers**, SonarQube dependency hierarchy.

Паттерн: **одна модель — несколько preset views**, не один canvas на всё.

| Уровень | Что показывает | WG-аналог |
|---------|----------------|-----------|
| L0 Context | система и внешние акторы | Home центр управления + charter |
| L1 Container | крупные блоки (runtime, storage) | **Pipeline graph** |
| L2 Component | внутренности блока | **L2 drawer stack** (уже tree-like) |
| L3 Code | файлы, symbols | PVRG / semantic search (не canvas) |

**Рекомендация:** формализовать это как **Architecture View Profile** в snapshot, а не три unrelated вкладки.

---

### 3.5. Matrix / heatmap / catalog map

**Примеры:** Backstage **dependency graph** + catalog matrix, NDepend matrix, AWS **Well-Architected** pillars grid, internal «domain × layer» spreadsheets.

| Критерий | Оценка |
|----------|--------|
| Big picture 20–80 модулей | ★★★★★ |
| Точные edge paths | ★★☆☆☆ |
| Стоимость реализации | ★★★★☆ (таблица из snapshot) |
| WG сегодня | ★☆☆☆☆ |

**Когда полезно:** «какой domain в каком layer», coverage gaps, heat by status (doing/blocked).

---

## 4. Как делают другие (design & analysis tools)

| Продукт | Основной вид | Graph | Tree | List | Заметка |
|---------|--------------|-------|------|------|---------|
| **Structurizr** | DSL → static diagrams | ★★★ | ★ | — | Views by zoom; runtime не интерактивный editor |
| **C4-PlantUML** | generated PNG/MD | ★★★ | — | — | Docs-only |
| **Backstage** | Catalog **list/table** + optional graph | ★★ | ★★ | ★★★★ | Developer portal: search first |
| **Linear** | **List/Kanban** + cmd+k | ★ | ★★ (sub-issues) | ★★★★★ | Нет architecture graph |
| **Jira** | List/board + **epic tree** | ★ (plugins) | ★★★ | ★★★★ | Hierarchy через parent link |
| **n8n** | **Graph editor** | ★★★★★ | — | ★ (executions list) | Graph = product core; WG graph read-only |
| **Sourcegraph / CodeSee** | Code graph | ★★★★ | ★★ | ★★★ | Code topology, не product architecture |
| **SonarGraph / NDepend** | Matrix + dependency graph | ★★★ | ★★ | ★★ | Analysis batch, не live ops |
| **Mermaid in Notion/GitHub** | встроенная статика | ★★ | — | — | Ок для ADR; плохой runtime UX (AN-4) |
| **Cursor / Copilot** | chat + **file tree** | — | ★★★ | ★★ | Нет project architecture map |

**Паттерн лидеров:** **list/search — default; graph — secondary explore; tree — hierarchy navigation; diagrams — export/docs.**

---

## 5. Сводная матрица (что выбрать когда)

| Задача пользователя | Лучший вид | Плохой выбор |
|---------------------|------------|--------------|
| «Что делать сегодня?» | List/Kanban + Home | Full architecture graph |
| «Из чего состоит эпик?» | Tree (parent_id) | Flat backlog |
| «Как блок A связан с B?» | Pipeline graph → click edge | Scroll flat list |
| «Почему layout кривой?» | Fix engine, не новый вид | Больше ручных координат |
| «Показать архитектуру новичку» | Pipeline + 1-page C4 export | Full graph 30 nodes |
| «Найти все verify-failed по domain» | Filtered list + saved view | Graph |
| «Где дыра code↔step?» | Verification list + code-gap | Schematic only |

---

## 6. Рекомендуемая целевая модель для Work Graph

### 6.1. Принцип: **One snapshot — multiple views**

```
architecture.snapshot.v1 / operator-shell.snapshot.v2
        │
        ├── ListView      → blocks as rows (NEW: optional «Architecture» list tab)
        ├── TreeView      → domain → epic → tasks (parent_id + intent domain)
        ├── PipelineGraph → 5–9 nodes, стартовый экран по умолчанию for «Граф»
        ├── FullGraph     → dagre + lit-flow, opt-in
        └── ExportView    → Mermaid/Structurizr fragment for ADR
```

Все views читают **одну projection**; cross-highlight task↔node сохраняется.

### 6.2. Что оставить как есть

- **Списки** для Prompts, Memory, Analytics, Рабочий процесс — с пагинацией (недавно добавлена).
- **Detail drawer** как единая детализация (не дублировать на canvas).
- **Pipeline mode** как default graph (не Full).

### 6.3. Что добавить (приоритет)

| P | Фича | Паттерн | Связь |
|---|------|---------|-------|
| **P0** | Compact nodes on canvas; summary только в drawer | Graph hygiene | [graph-canvas-layout-mess.md](graph-canvas-layout-mess.md) §A.1 |
| **P0** | Pipeline = default tab при открытии «Граф» | C4 Container | AN-4 |
| **P1** | `work.parent_id` + collapsible tree в «Задачи» | Tree | parent-subtask-hierarchy |
| **P1** | Architecture **list tab** (blocks as list-rows, без canvas) | List | низкий cost, high a11y |
| **P2** | Domain × layer **matrix** из snapshot | Matrix | новый вид |
| **P2** | Export snapshot → Mermaid/C4 markdown | Docs | не runtime |
| **P3** | Full graph только после layout quality gate в CI | Graph | edge_crossings metric |

### 6.4. Чего не делать

- ❌ Заменить все списки одной большой диagramой.
- ❌ Mermaid в runtime product UI как основной canvas (AN-4).
- ❌ Третий ручной layout-движок для новой вкладки.
- ❌ Tree вместо graph для **depends_on** / execution order.

---

## 7. Ответ на исходный вопрос

| Вариант | Вердикт |
|---------|---------|
| **Плоские списки + углубление** | ✅ **Оставить primary** для операций и каталогов (задачи, правила, память, AN). |
| **Дерево** | ✅ **Добавить** для иерархии смысла (epic/parent, intent domain), не для runtime deps. |
| **Схемы/диаграммы** | ✅ **Оставить secondary** — Pipeline graph + drawer L2; Full graph после layout; static export для docs. |
| **Один вид для всего** | ❌ Отвергнуть — противоречит и нашему опыту (AN-1), и индустрии (C4, Backstage). |

**Лучший UX для WG:** **list-first центр управления** + **tree для composition** + **pipeline graph для lineage** + **drawer для глубины**. Full graph — опытный пользователь режим, не витрина.

---

## 8. Todo (если заводить epic)

- [ ] ADR «Architecture views v1»: List / Tree / Pipeline / Full / Export profiles
- [ ] Список architecture blocks (list-rows) как альтернатива canvas-only
- [ ] `work.parent_id` + tree mode в рабочий процесс (см. parent-subtask-hierarchy)
- [ ] Pipeline default + compact canvas cards (закрыть хвост AN-1)
- [ ] Matrix view prototype: domain × layer × status heat
- [ ] `npm run iohasc -- architecture-export --format mermaid` из snapshot

---

## Связи

| AN | Связь |
|----|-------|
| AN-1 (layout mess) | почему full diagram ломается |
| AN-4, AN-5 | graph engine и edges |
| AN-20 | UX navigation; graph не home |
| parent-subtask-hierarchy | tree для задач |
| AN-10 PVRG | code graph — отдельный слой |

**feeds_epics:** `epic-architecture-views-v1` — seed `npm run seed:epic-architecture-views-v1`, plan `docs/plan-architecture-views-v1.md`
