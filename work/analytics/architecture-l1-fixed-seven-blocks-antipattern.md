# AN-78: Жёсткий лимит «ровно 7 L1-блоков» — противоречие протоколу, UX и реальности

**Запрос:** оператор не может удалить L1-блок, не может добавить 8-й/9-й/10-й «пустой» слот; кажется, что модель канона противоречит здравому смыслу и UX Work Graph.

**Короткий ответ:** замечание **обосновано**. В коде v1 была константа `ARCHITECTURE_L1_BLOCK_COUNT = 7` с fail-hard валидацией — это **технический артеfact миграции**, не продуктовое правило. **Решение (2026-06-05):** engine **не диктует** cardinality L1; валидируется только **≥ 1 блок** + структура (уникальные ids, edges, containers). Work Graph **не навязывает** архитектуру проекта — `architecture/main.bvc` полностью owned проектом.

**Статус fix:** `ARCHITECTURE_L1_MIN_BLOCK_COUNT = 1`; upper bound снят; `architecture:l1-check` проверяет mermaid по фактическим block ids канона.

---

## 1. Симптом (что видит оператор)

| Ожидание | Факт v1 |
|----------|---------|
| «У меня 5 подсистем — хочу 5 блоков на карте» | ❌ Ошибка: `expected 7 L1 blocks, got 5` |
| «Добавлю 8-й блок под новый домен» | ❌ `got 8` — UI «Архитектура» не загружается |
| «Удалю лишний блок» | ❌ `got 6` |
| «Оставлю placeholder TBD на будущее» | ⚠️ Только **внутри** одного из 7 слотов; отдельный 8-й слот невозможен |
| Starter-kit: «замените demo canon своим» | Подразумевает свободу модели, но **count жёстко 7** |

Итог: оператор попадает в **ловушку фиксированной решётки** — не может ни сжать карту под маленький проект, ни расширить под второй/третий vertical, не трогая исходники `@work-graph/cli`.

---

## 2. Противоречия между артефактами

| Источник | Что декларирует | Что делает на практике |
|----------|-----------------|------------------------|
| `protocols/architecture-graph-model-v1.bvc` §L1 | «**6–8** устойчивых блоков» | — |
| `work/analytics/architecture-l1-freshness-governance.md` (AN-35) check **G1** | `canon.blocks.length` ∈ **[6, 8]** | — |
| `src/architectureL1Canon.mjs` | — | **ровно 7**, иначе throw |
| `scripts/architecture-l1-check.mjs` | — | дублирует проверку `!== 7` |
| `packages/work-graph-cli/templates/starter/architecture/main.bvc` | demo «замените на свой» | 7 demo-блоков — единственный «легальный» count для npm-проекта |
| `schemas/architecture-snapshot.v1.json` | `blocks[]` без min/max на L1 | snapshot **наследует** count из канона, но loader падает раньше |

**Вывод:** продукт **сам себе противоречит**. Оператор читает протокол «6–8», а runtime отвечает «ровно 7 или death».

---

## 3. Откуда взялось «ровно 7»

Хронология (упрощённо):

1. **До main.bvc:** L1 жил в `ARCHITECTURE_L1_BLOCKS` внутри `architectureSnapshot.mjs` — фиксированный массив из **7** записей, скопированный с протокола v1 WG.
2. **AN-36 / epic-architecture-main-bvc-canon:** канон вынесли в `architecture/main.bvc` как SSoT; при переносе count **закодировали как инвариант** (`ARCHITECTURE_L1_BLOCK_COUNT = 7`), чтобы golden-тесты и digest не «плавали».
3. **AN-39 / domains epic:** реальная потребность → **7→8** L1 (`domain-marketplace`), правка константы, edges, classify, ADR.
4. **Variant A ADR:** откат к **8→7** через hub-блок `domains` + L2-контейнеры — снова правка константы и канона.

Паттерн: **каждое изменение cardinality L1 = релиз engine + ADR + тесты**, хотя данные уже живут в `.bvc` и должны быть self-describing.

Magic number 7 — это **страховка от accidental drift при первом выносе в BVC**, которая **застряла** и стала продуктовым багом.

---

## 4. Почему это ломает UX и реальность проекта

### 4.1. Несовпадение с жизненным циклом проекта

| Стадия проекта | Реалистичный L1 | Модель v1 |
|----------------|-----------------|-----------|
| MVP / pilot | 4–5 блоков (core + domain) | forced padding до 7 «мусорных» demo/TBD |
| Один vertical (OneBase) | 6 charter layers + optional derived | 7 с `derived-projections` |
| Multi-domain (OneBase + Marketplace + …) | 8+ peers или hub + peers | нельзя без форка engine |
| Platform team (WG itself) | уже меняли 7↔8 | доказательство, что 7 — не закон природы |

### 4.2. Ложные affordances в UI

- Вкладка **«Архитектура»** выглядит как **редактируемая карта системы**.
- Starter-kit говорит «**замените** на свой canon» — подразумевается **ваша** топология.
- Нет сообщения «count зафиксирован в npm-пакете @ 7» — ошибка выглядит как «вы написали плохой BVC», а не «engine навязал решётку».

### 4.3. Конфликт с npm-first моделью

После `work-graph init` проект **владеет** `architecture/main.bvc`. Ожидание: canon — **данные проекта**. Факт: cardinality — **скрытый контракт бинарника**, как schema version без документации.

### 4.4. «Пустой 8-й блок» — симптом, не решение

Даже если бы count разрешили:

- блок **без containers** технически проходит часть валидации;
- но **edges**, classify, matrix и operator mental model требуют **смысловых** блоков, не padding.

Значит правильный fix — не «разрешить пустые 8–10», а **убрать фиксированный count** и валидировать **структуру**, а не магическое число.

---

## 5. Технический разбор текущей валидации

```307:309:src/architectureL1Canon.mjs
  if (canon.blocks.length !== ARCHITECTURE_L1_BLOCK_COUNT) {
    errors.push(`expected ${ARCHITECTURE_L1_BLOCK_COUNT} L1 blocks, got ${canon.blocks.length}`);
  }
```

Что **уже** проверяется без count (и этого достаточно для integrity):

- уникальные `architecture.block_id`;
- у каждого блока есть `title`;
- edges ссылаются только на существующие block ids;
- типы edges из whitelist;
- контейнеры (если есть) — paths, analysis/decision pipeline.

Что **не** нужно для integrity:

- ровно 7 атомов — **не следует** из graph model v1.

`classifyWorkItemBlock()` уже **не привязан** к count — он мапит на **известные id** (`domains`, `work-graph`, …). Новый L1-блок без обновления classifier просто **не получит задачи** — это soft gap (warn), не повод ломать весь UI.

---

## 6. Исторический evidence: count уже меняли

| Событие | L1 count | Механизм |
|---------|----------|----------|
| architecture-l1-blocks-v1 baseline | 7 | inline → main.bvc |
| ADR domains B+ | **8** | +`domain-marketplace`, константа 7→8 |
| ADR variant A hub | **7** | `domains` hub, 8→7 |

Если бы «ровно 7» было продуктовым инвариантом, ADR **не меняли бы count дважза за неделю**. Значит инвариант **ложный**; настоящий инвариант — **валидный граф L1 из `.bvc`**.

---

## 7. Варианты исправления

### 7.1. Status quo (оставить 7)

| + | − |
|---|---|
| Ноль работ | Противоречие протоколу и npm-first UX остаётся |
| | Каждый новый vertical — fork/хак «заменить один из семи» |

**Вердикт:** **отклонить** — накопленный UX-долг уже виден оператору.

---

### 7.2. Диапазон 6–8 из протокола (рекомендуемый минимум)

**Как:** заменить `!== 7` на:

```javascript
const min = canon.passport?.l1BlockMin ?? 6;
const max = canon.passport?.l1BlockMax ?? 12;
if (canon.blocks.length < min || canon.blocks.length > max) { ... }
```

Passport labels (optional override):

- `architecture.l1.block.min`
- `architecture.l1.block.max`

| + | − |
|---|---|
| Согласовано с protocol + AN-35 G1 | Всё ещё cap на 8 по умолчанию, если не расширить max |
| Малый diff | Нужно обновить starter-kit текст |

**Вердикт:** **Phase 1** — быстро снимает абсурд «8-й блок = crash».

---

### 7.3. Только структурная валидация (count ≥ 1, ≤ разумного ceiling)

**Как:** убрать equality; оставить `blocks.length >= 1 && blocks.length <= 24` (или без max); warn если блок без containers/edges orphan.

| + | − |
|---|---|
| Полная свобода данных проекта | Меньше guardrails для новичков |
| Согласовано с «canon in repo» | Нужны UX hints «добавьте edge к новому блоку» |

**Вердикт:** **Phase 2 target** для npm-проектов; WG production может держать **recommended** 7 в charter, не **enforced** в engine.

---

### 7.4. Count в passport как declared cardinality

**Как:** `architecture.canon.l1_block_count: N` — engine проверяет `blocks.length === N`, но **N задаёт проект**, не npm.

| + | − |
|---|---|
| Явный контракт в `.bvc` | Лишнее поле; легко забыть обновить при add/remove |
| Self-describing canon | Дублирует `blocks.length` |

**Вердикт:** **избыточно**, если есть диапазон или structural-only.

---

## 8. Целевая модель (принято)

```
architecture/main.bvc (project-owned, N ≥ 1 blocks, no engine max)
    → validate structure only (ids, edges, containers)
    → buildArchitectureSnapshot() — dynamic N
    → UI / MCP / mermaid — render what the project declared
```

**Принцип:** Work Graph **не диктует** архитектуру проекта. Семёрка в WG repo — **пример**, не закон.

~~Диапазон 6–8~~ — **отклонено** по feedback оператора: count **1…∞**, только structural integrity.

---

## 9. Риски и митигации (legacy section 9)

| Риск | Митигация |
|------|-----------|
| Golden mermaid fixture ломается при N≠7 | Fixture привязать к **digest canon файла**, не к magic 7 |
| Пустые/бессмысленные блоки | Warn: no containers, no incident edges, no classified tasks 90d |
| Classifier не знает новый block id | Fallback + lint `orphan block ids in tasks` |
| Старые npm `@work-graph/cli` с hard 7 | Minor release; migration note в changelog |

---

## 10. Предлагаемые work items

| ID (draft) | Заголовок | Scope |
|------------|-----------|-------|
| `fix-architecture-l1-block-count-validation` | Заменить `=== 7` на диапазон / structural | `architectureL1Canon.mjs`, tests, `architecture-l1-check.mjs` |
| `document-architecture-l1-cardinality-policy` | ADR: count — data, not engine constant | `docs/adr-architecture-l1-cardinality.md`, протокол |
| `lean-starter-architecture-canon` | Starter 3–5 blocks + README init | `templates/starter/architecture/main.bvc` |
| `architecture-canon-validation-ux` | Понятные ошибки в UI/doctor | backlog UI + `workgraph:doctor` |

**Epic feed:** `epic-architecture-main-bvc-canon` или новый `epic-architecture-l1-cardinality-v2`.

---

## 11. Вердict

Жёсткое «**ровно 7**» — **ошибка проектирования v1**, не feature:

- противоречит протоколу (6–8);
- противоречит собственной истории (7↔8↔7);
- ломает npm-first story («ваш canon в repo»);
- заставляет оператора **подменять** блоки вместо **добавлять/убирать** слои.

**Нужно чинить engine**, а не объяснять оператору, что «так задумано».

---

## Связанные артефакты

- `src/architectureL1Canon.mjs` — `ARCHITECTURE_L1_BLOCK_COUNT`
- `protocols/architecture-graph-model-v1.bvc` — «6–8 blocks»
- `work/analytics/architecture-l1-freshness-governance.md` (AN-35)
- `docs/adr-architecture-domains-l1-hierarchy.md` / `adr-architecture-domains-variant-a.md`
- `packages/work-graph-cli/templates/starter/architecture/main.bvc`
