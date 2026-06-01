# AN-35: Актуальность L1 architecture blocks — управление и автоматизация

**Запрос:** как лучше держать L1 architecture blocks в актуальном состоянии; не путать с пересчётом задач/L2.

**Короткий ответ:** L1 — это **архитектурный канон** (6–8 устойчивых системных блоков), а не live-проекция репозитория. Оптимальная стратегия — **гибрид**: канон в **версионируемом `.bvc`-артефакте** (SSoT), runtime **загружает и валидирует** его, CI **ловит расхождение** относительно charter/protocol и экспортов; изменение L1 — **осознанный ADR-контур** (протокол + work item + тесты), а не LLM и не «автоскан всего repo».

---

## 1. Проблема

Сегодня L1 живёт в **трёх местах без связующего контракта свежести**:

| Источник | Что задаёт | Обновляется |
|----------|------------|-------------|
| `charter/main.bvc` §Слои_Ядра | 6 слоёв ядра (Step Canon, Work Graph, Memory, Trace, Agent, Domain) | вручную при pivot |
| `protocols/architecture-graph-model-v1.bvc` | L1 blocks v1, edge types, углубление | design work + протокол |
| `src/architectureSnapshot.mjs` | `ARCHITECTURE_L1_BLOCKS`, `ARCHITECTURE_L1_EDGES` — **фактический runtime** | правка кода |

**Следствия:**

- Charter говорит «6 слоёв», runtime показывает **7 блоков** (+ `derived-projections` как отдельный L1) — это не баг UI, а **рассинхрон канонов**.
- Нет поля `l1CanonId` / hash в `architecture.snapshot.v1` — оператор не видит, устарела ли карта.
- Изменение `classifyWorkItemBlock()` **не меняет L1**, но меняет матрицу/счётчики — легко принять за «архитектура изменилась».
- LLM **не участвует** в построении snapshot и **не должен** быть источником L1 без human gate.

**Цель управление:** ответить на три вопроса:

1. **Когда** L1 считается изменённой (структурно)?
2. **Кто** утверждает изменение?
3. **Как** автоматически поймать, что charter/protocol/code разъехались?

---

## 2. Что такое «L1 изменилась» (определения)

| Событие | L1 канон | Пример |
|---------|----------|--------|
| Новый/удалённый блок, rename id, новое ребро L1 | ✅ да | добавили `marketplace-domain` |
| Смена `summary`, `intentRoots`, контейнеров L2 | ✅ да (minor версия канона) | новый protocol path в Step Canon |
| +50 задач в Derived Projections | ❌ нет | эвристика `classifyWorkItemBlock` |
| Новые файлы в repo без правки канона | ❌ нет (до intake) | новый `src/foo.mjs` |
| OneBase scan добавил узлы в `domain-onebase` L2 | ❌ L1 нет, L2 да | onebase YAML появился на диске |

**Правило:** L1 меняется только через **явное решение** (`architecture-l1-blocks-vN`), не через backlog churn.

---

## 3. As-is: что уже есть

| Механизм | Покрытие L1 |
|----------|-------------|
| `buildArchitectureSnapshot()` | собирает snapshot из канона + backlog |
| `tests/architectureSnapshot.test.mjs` | count блоков, schema, sample edges |
| `npm run architecture:export` | mermaid **только L1 nodes + edges** (удобно для diff) |
| MCP `get_architecture_snapshot` | runtime read, без версии канона |
| AN-34 architecture views | UX List/Graph/Matrix — **не** управление L1 |

**Пробела:** нет **freshness gate**, нет **единого SSoT-файла**, нет **sync charter → L1**.

---

## 4. Варианты стратегии

### 4.1. Status quo+ (код как SSoT)

**Как:** правим только `architectureSnapshot.mjs`; PR + тесты + обновление протокола «когда вспомнили».

| + | − |
|---|---|
| Минимум работ | Drift charter ↔ code не виден |
| Быстрый старт | L1 не discoverable для не-разработчиков |
| | Агент может править JS без ADR |

**Вердикт:** достаточно для MVP, **недостаточно** для «держать актуальным» как процесс.

---

### 4.2. L1 canon в `.bvc` (рекомендуемый SSoT)

**Как:** новый артефакт `protocols/architecture-l1-canon.v1.bvc` (или блок в `architecture-graph-model-v1.bvc` v2):

```text
#Architecture_L1_Canon<[
  canon.id: architecture-l1-blocks-v1
  canon.version: 1
  blocks: step-canon, work-graph, ...
  edges: step-canon->work-graph:feeds, ...
]>
```

Runtime: `loadArchitectureL1Canon()` → `buildArchitectureSnapshot()` **не** дублирует массив в JS.

| + | − |
|---|---|
| Step-трассируемость, diff в Git, agent-readable | Нужен parser + миграция из JS |
| Один файл для оператора и CI | L2 containers всё ещё объёмные |

**Вердикт:** **лучший SSoT** для Work Graph / step-canon культуры.

---

### 4.3. Полностью автоматический L1 из charter + intent tree

**Как:** парсить `charter/main.bvc` + `intent/index.bvc` → генерировать блоки и edges.

| + | − |
|---|---|
| «Всегда синхрон с уставом» | Charter **не** graph-ready (нет edges, нет L2 paths) |
| | Intent domains ≠ architecture blocks 1:1 |
| | Шум: каждая новая папка intent ≠ новый L1 |
| | Ломает стабильность UI (AN-34: 6–8 блоков — продуктовое решение) |

**Вердикт:** использовать как **input для расхождение-report**, не как единственный генератор L1.

---

### 4.4. LLM-assisted refresh

**Как:** периодически «перечитай repo и предложи L1».

| + | − |
|---|---|
| Находит новые домены | Недетерминизм, hallucinated blocks |
| | Конфликт с architecture edge semantics |

**Вердикт:** только **draft intake AN** → human verdict → canon update (как AN-22 pipeline). **Не** runtime.

---

### 4.5. Рекомендуемый гибрид (целевая модель)

```
charter/main.bvc ──────┐
                        ├──► расхождение report (CI) ──► warning / blocking gate
protocol architecture-* ┤
                        │
architecture-l1-canon.bvc ──► load canon ──► buildArchitectureSnapshot()
                        │                           │
workgraph.snapshot.v1 ──┴──► classify + L2 derive ──┘
```

**Принципы:**

1. **SSoT L1** — `.bvc` canon с `canon.id` + monotonic `canon.version`.
2. **Runtime** embeds `l1Canon: { id, version, digest }` в каждый `architecture.snapshot.v1`.
3. **CI gate** `architecture:l1-check` — три проверки (см. §5).
4. **Process** — изменение L1 = work item `product-architecture` + протокол + closing note в analytics.
5. **L2/L3** — полуавтомат (как сейчас): containers из canon, files из `targetFiles` + domain scans.

---

## 5. Конкретные проверки (CI / CLI)

Предлагаемый скрипт `scripts/architecture-l1-check.mjs` (или `npm run architecture:l1-check`):

| # | Проверка | Тип | Действие при fail |
|---|----------|-----|-------------------|
| G1 | `canon.blocks.length` ∈ [6, 8] | invariant | fail CI |
| G2 | каждый `block.id` из canon ⊆ snapshot export | structural | fail CI |
| G3 | `ARCHITECTURE_L1_EDGES` refs существующие block ids | structural | fail CI |
| G4 | charter layers (regex/parse) **покрыты** canon blocks (mapping table) | расхождение warn | warn → позже fail |
| G5 | mermaid export canon **stable** на fixture backlog (`architecture-l1.fixture.mmd`) | golden | fail CI при изменении без `--update` |
| G6 | orphan `intentRoots` paths (optional) | hygiene | warn in report |
| G7 | `classifyWorkItemBlock` unknown bucket rate < X% tasks unclassified to default | quality | warn |

**Digest:** SHA-256 нормализованного JSON `{ blocks: [{id,title,intentRoots}], edges }` — кладём в snapshot как `l1CanonDigest`.

**Operator UX (Phase B):** в Architecture → List header badge: `L1 canon v1 · digest ab12cd34` + link «Drift report».

---

## 6. Процесс обновления L1 (human gate)

Связка с [pipeline-analysis-to-board.md](pipeline-analysis-to-board.md) (AN-22):

```
AN/intake (зачем меняем L1)
    → work item: architecture-l1-canon-v2 (product-architecture)
    → правка protocols/architecture-l1-canon.bvc + architecture-graph-model-v1.bvc
    → обновление mapping charter ↔ blocks (если новый слой)
    → tests + golden mermaid --update (осознанно)
    → closing AN: «L1 v1→v2, миграция classify rules»
    → UI/MCP автоматически подхватывают новый canon
```

**Триггеры для intake (когда заводить work):**

- Pivot устава (новый domain vertical, split/merge слоёв).
- >N задач с `targetFiles` вне всех L2 path prefixes (orphan artifacts report).
- Epic closing рекомендует новый системный блок (feeds `architecture-l1` tag).
- OneBase / Marketplace выходит за `domain-onebase` без maps_to.

**Не триггер:** смена счётчиков матрицы, новые задачи в существующем блоке.

---

## 7. Charter ↔ L1 mapping (зафиксировать явно)

Сегодня расхождение уже есть — его нужно **канонизировать таблицей**, а не игнорировать:

| Charter §Слои_Ядра | L1 block id | Примечание |
|--------------------|-------------|------------|
| Step Canon | `step-canon` | 1:1 |
| Work Graph | `work-graph` | 1:1 |
| Project Memory | `project-memory` | 1:1 |
| Trace/Evidence | `trace-evidence` | 1:1 |
| Agent Runtime | `agent-runtime` | 1:1 |
| Domain Vertical | `domain-onebase` | первый wedge; будущие домены — новые L1 или под-L2 |
| *(нет в charter)* | `derived-projections` | **производный слой** UI/research; отдельный L1 по ADR architecture-l1-blocks-v1 |

**Рекомендация:** дополнить charter одной строкой: «Derived projections (UI, dashboard, architecture map) — производный слой, L1 block `derived-projections`». Тогда G4 расхождение check станет зелёным.

---

## 8. Фазы внедрения

### Phase A — visibility (1–2 дня, низкий риск)

- [ ] Добавить в snapshot `l1Canon: { id, version, digest }` (hardcode v1 из текущего JS).
- [ ] CLI `npm run architecture:l1-check` — G1–G3 + golden mermaid на fixture.
- [ ] Документ mapping charter ↔ L1 (§7) в `protocols/architecture-graph-model-v1.bvc`.
- [ ] UI: subtitle «Канон L1 v1» в Architecture list header.

### Phase B — SSoT migration (3–5 дней)

- [ ] `protocols/architecture-l1-canon.v1.bvc` + loader `src/architectureL1Canon.mjs`.
- [ ] Удалить дублирующий массив из `architectureSnapshot.mjs` (import canon).
- [ ] G4 charter расхождение + orphan intentRoots warn.
- [ ] MCP: поле `l1Canon` в `get_architecture_snapshot`.

### Phase C — operational loop (по мере зрелости)

- [ ] Daemon / `workgraph integrity` включает `architecture:l1-check`.
- [ ] Quarterly AN «L1 freshness review» (шаблон closing).
- [ ] Optional: suggest-only scan «candidate blocks» из intent domains → intake, **не** auto-merge.

---

## 9. Что **не** делать

- **Не** генерировать L1 из LLM в CI без golden diff.
- **Не** автоматически добавлять L1 block на каждую папку `intent/*`.
- **Не** смешивать `work.depends_on` и architecture edges (уже в протоколе — сохранять).
- **Не** хранить L1 только в UI localStorage / operator settings.

---

## 10. Связанные артефакты

| Артефакт | Роль |
|----------|------|
| [architecture-visualization-patterns-comparison.md](architecture-visualization-patterns-comparison.md) (AN-34) | UX views; L1 управление ортогонален |
| `protocols/architecture-graph-model-v1.bvc` | контракт L1/L2/L3 |
| `src/architectureSnapshot.mjs` | runtime builder (today: canon embedded) |
| `schemas/architecture-snapshot.v1.json` | расширить `l1Canon` |
| `charter/main.bvc` §Слои_Ядра | upstream intent |
| AN-22 pipeline | процесс изменения канона |

---

## 11. Рекомендация (итог)

| Вопрос | Ответ |
|--------|--------|
| Ручная или авто? | **Ручная с human gate** для структуры L1; **авто** для наполнения (tasks, L2 files) |
| Где SSoT? | **`.bvc` canon** (Phase B); до миграции — JS + обязательный протокол в том же PR |
| Как понять, что L1 изменилась? | `l1Canon.version` + digest + CI golden mermaid + расхождение charter |
| LLM? | Только **intake draft** в analytics, не production snapshot |

**Следующий практический шаг:** Phase A — `architecture:l1-check` + `l1Canon` в snapshot + charter mapping в протоколе. Это даёт 80% пользы без большой миграции.

---

## Todo (исполнение AN-35)

- [ ] Phase A: `l1Canon` metadata в `architecture.snapshot.v1` + schema update
- [ ] Phase A: `scripts/architecture-l1-check.mjs` + npm script + test
- [ ] Phase A: charter строка про `derived-projections`
- [ ] Phase B: `architecture-l1-canon.v1.bvc` + loader
- [ ] Phase B: UI badge canon version в Architecture
- [ ] Process: шаблон work item `sync-architecture-l1-canon-vN`

**feeds_epics (кандидат):** `epic-architecture-views-v1` (расширение) или новый `epic-architecture-l1-управление`.
