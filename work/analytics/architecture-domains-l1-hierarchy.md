# AN-39: Иерархия доменов в L1 architecture — «Домен OneBase» vs «Домены › OneBase / Marketplace»

**Запрос:** выровнять модель доменов между L1-картой (`architecture/main.bvc`), intent tree и UI backlog; убрать когнитивный разрыв «плоский L1-блок OneBase» при уже существующем `intent/domains/marketplace`.

**Короткий ответ:** intent tree **уже multi-domain** (`onebase`, `marketplace`), а L1 показывает **один peer-блок** `domain-onebase` без родителя «Домены». Marketplace попадает в `derived-projections` через эвристику `classifyWorkItemBlock`, не в отдельный domain L1. Рекомендуем **вариант B+**: сохранить отдельные L1 `domain-*` для трассируемости, добавить **`architecture.group: domains`** и UI-группировку «Домены › …»; для Marketplace — **новый L1 `domain-marketplace`** (симметрично OneBase) после ADR.

---

## 1. Проблема

| Слой | OneBase | Marketplace |
|------|---------|-------------|
| Intent tree | `intent/domains/onebase/` | `intent/domains/marketplace/` |
| Department / write policy | `domain-onebase` | `domain-marketplace` |
| L1 architecture block | `domain-onebase` (peer с work-graph, agent-runtime…) | **нет** — задачи в `derived-projections` |
| UI «Блоки архитектуры» | «Домен OneBase» (плоский список) | не виден как domain-блок |
| Charter MVP | vertical OneBase — да | multi-domain PM — **не в MVP** |

**Следствия:**

- Оператор видит Marketplace в roadmap (`intent/domains/marketplace/work/*.work.bvc`), но **не на L1-карте** рядом с OneBase.
- Подпись «Домен OneBase» создаёт впечатление единственного прикладного домена, хотя backlog уже второй.
- `classifyWorkItemBlock()` знает только `domain-onebase` по department/path; marketplace без симметричного L1.
- AN-35 уже предупреждал: «OneBase / Marketplace выходит за `domain-onebase` без maps_to» — ситуация наступила для Marketplace.

**Цель:** единая **ментальная модель** «прикладные домены — дети группы Домены» без ломки Work Graph как операционного ядра.

---

## 2. As-is (факты в репо)

### 2.1. L1 в `architecture/main.bvc`

Семь peer-блоков, включая `domain-onebase`:

- `architecture.block_id: domain-onebase`
- `architecture.intent_roots: intent/domains/onebase,domains/onebase`
- L2-контейнер `onebase-domain` → `domains/onebase/`
- Рёбра: `domain-onebase -> work-graph : maps_to`, `agent-runtime -> domain-onebase : uses`

**Marketplace в canon отсутствует.**

### 2.2. Intent tree и write policy

- `src/bvcNewWritePolicy.mjs`: `domain-onebase` → `intent/domains/onebase/work`; `domain-marketplace` → `intent/domains/marketplace/work`.
- `src/intentHierarchy.mjs`: label `domain/onebase` → «Домен OneBase»; marketplace path есть, отдельного L1-label в architecture list — нет.

### 2.3. Классификация задач

`src/architectureSnapshot.mjs` → `classifyWorkItemBlock()`:

- department/path onebase → `domain-onebase`
- marketplace tasks → **`derived-projections`** (эвристика по department/title), не `domain-marketplace`

### 2.4. Связанная аналитика

| ID | Тема |
|----|------|
| AN-17 | OneBase vertical stack |
| AN-21 / AN-MP-* | Marketplace integration + DS |
| AN-35 | L1 управление — пример «добавили marketplace-domain» |
| AN-36 | `architecture/main.bvc` hub (закрыт) |

---

## 3. Варианты

### 3.1. A — один L1 «Домены» + L2-контейнеры per domain

**Как:** заменить `domain-onebase` на L1 `domains-hub`; L2: `onebase-domain`, `marketplace-domain`.

| + | − |
|---|---|
| Один peer на L1 — чище карта | Breaking change id `domain-onebase` (edges, tests, MCP) |
| Явная иерархия в canon | Больше углубление для одной задачи OneBase |
| Симметрия доменов в L2 | Миграция classify + snapshot |

### 3.2. B — несколько L1 `domain-*` + группировка в UI (рекомендуемый)

**Как:** оставить `domain-onebase`, добавить `domain-marketplace`; поле **`architecture.group: domains`** (или `architecture.parent_group`) на обоих; UI list/graph: секция **«Домены › OneBase»**, **«Домены › Marketplace»**.

| + | − |
|---|---|
| Минимальный ломающее изменение edges | Два L1 peer вместо одного hub |
| Симметрия с intent paths | Нужно расширить schema + UI |
| `classifyWorkItemBlock` → прямой block id | Canon 7→8 blocks — minor версия digest |

### 3.3. C — только UI без смены canon

**Как:** breadcrumb «Домены ›» строится из `department` / intent path; L1 без marketplace.

| + | − |
|---|---|
| Быстро | L1-карта по-прежнему врёт про Marketplace |
| Нет миграции canon | Drift AN-35 не закрыт |
| | MCP snapshot / matrix incomplete |

**Вердикт по вариантам:** **B** для canon + classify; **C** недостаточен; **A** — запасной при желании ужать L1 до 7 блоков с hub вместо двух domain peers.

---

## 4. Рекомендуемое решение (B+)

1. **ADR / decision subtask:** зафиксировать B+ в `docs/adr-architecture-domains-l1-hierarchy.md` (или блок в `protocols/architecture-graph-model-v1.bvc` v2).
2. **Canon:** `architecture/main.bvc` — block `domain-marketplace`, group `domains`, intent roots `intent/domains/marketplace`, L2 `marketplace-domain`; у `domain-onebase` добавить `architecture.group: domains`.
3. **Runtime:** `classifyWorkItemBlock` — `domain-marketplace` department/path → `domain-marketplace`; optional scan L2 nodes для marketplace paths (по аналогии onebase).
4. **UI:** `workGraphBacklogUiServer.mjs` — группировка L1 list по `group`; subtitle «Домены › {title}».
5. **Charter footnote:** MVP vertical = OneBase **не отменяет** второй domain в architecture map; PM-слой multi-domain уже live (AN-21).
6. **Тесты + `architecture:l1-check`:** block count, edges `domain-marketplace -> work-graph : maps_to`, classify samples.

**Не в scope эпика:** полная OneBase codegen, Marketplace DS (эпики AN-21 / epic-marketplace-shared-design-system).

---

## 5. Риски и границы

| Риск | Митигация |
|------|-----------|
| L1 block count 7→8 ломает golden tests | Обновить digest + тесты в одном PR |
| Оператор путает «domain L1» и «charter Domain layer» | Явные labels в UI; cross-ref charter §Слои_Ядра |
| Преждевременный третий domain | `architecture.group` extensible; новый domain = новый block + intent root |

---

## 6. Связь с уставом

`charter/main.bvc`: MVP фокус — OneBase vertical. **Architecture map** описывает **структуру системы**, не roadmap приоритет. Marketplace уже в intent/backlog — **скрывать его с L1** хуже, чем показать как второй domain под группой «Домены».

---

## 7. feeds_epics

| Epic | Связь |
|------|-------|
| **`epic-architecture-domains-l1-hierarchy`** | основной исполнитель AN-39 |
| `epic-architecture-main-bvc-canon` | upstream (canon hub готов) |
| `epic-marketplace-shared-design-system` | зависимое содержимое в `domain-marketplace`, не блокирует |

**Seed:** `npm run seed:epic-architecture-domains-l1-hierarchy`  
**Plan:** `docs/plan-architecture-domains-l1-hierarchy.md`

---

## 8. Критерий «AN-39 закрыт»

- Оператор в Architecture list видит **группу Домены** с OneBase и Marketplace.
- `classifyWorkItemBlock` для marketplace work item → `domain-marketplace`.
- `architecture/main.bvc` + `architecture:l1-check` green.
- Closing: `work/analytics/closing-epic-architecture-domains-l1-hierarchy.md`.
