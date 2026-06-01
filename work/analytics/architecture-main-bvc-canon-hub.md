# AN-36: Architecture main.bvc — связующий канон L1 между уставом и snapshot

**Запрос:** нужен ли связанный файл архитектуры `.bvc`, от которого идёт связь на всё остальное; устав ≠ вкладка «Архитектура», но они должны быть связаны.

**Короткий ответ:** **да** — отдельный **architecture canon** (рекомендуем `architecture/main.bvc` в Work Graph repo) — второй опорный артефакт после `charter/main.bvc`. Устав задаёт *зачем* и *рамку слоёв*; architecture file — *структурную карту* (L1 BVC на блок, edges, intent roots, L2 containers). `architecture.snapshot.v1`, UI и MCP — **derived**, не SSoT.

**Связанные разборы:** [AN-35](architecture-l1-freshness-governance.md) (управление L1), [AN-34](architecture-visualization-patterns-comparison.md) (views UX).

---

## 1. Проблема as-is

| Симптом | Причина |
|---------|---------|
| В drawer L1 нет BVC (Базис / Вектор / Цель) | Блоки в `ARCHITECTURE_L1_BLOCKS` имеют только `summary`; UI рендерит «Сводку» |
| Оператор спрашивает «устав = архитектура?» | Нет явного второго артефакта; канон «застрял» в JS |
| Charter §Слои_Ядра — один BVC на все слои | Per-block BVC не выделены в уставе |
| 6 слоёв в charter vs 7 блоков в runtime | `derived-projections` — ADR-блок, не строка в §Слои_Ядра |
| Нет trace «откуда блок» | Snapshot без `l1CanonId`, `charterRef`, `canonDigest` |

**Вывод:** связь задумана в протоколе (`design.input: charter/main.bvc`), но **не материализована** как читаемый hub-файл с BVC.

---

## 2. Роли артеfact stack (целевая модель)

```
charter/main.bvc (.bvc)
  │  product constitution, anti-goals, §Слои_Ядра (aggregate BVC)
  │  charter.ref
  ▼
architecture/main.bvc                    ← SSoT L1 (+ L2 container refs)
  │  per-block: Базис / Вектор / Цель
  │  L1 edges, canon.id, canon.version
  │  protocol.ref → architecture-graph-model-v1
  ▼
buildArchitectureSnapshot()
  │  + workgraph.snapshot.v1 (task classify, artifactPaths)
  │  + optional filesystem / OneBase scan (L2 enrich)
  ▼
architecture.snapshot.v1 → UI «Архитектура», MCP, mermaid export
  ▼
intent/*, protocols/*, src/*, work items (implementation)
```

### Что НЕ смешивать

| Артефакт | Не является |
|----------|-------------|
| Устав | L1-графом, списком файлов, очередью задач |
| architecture/main.bvc | Work Graph backlog, `depends_on` DAG |
| snapshot | местом правки канона (read-only derived) |

---

## 3. Почему `.bvc`, а не только `.bvc` или только JS

| Формат | Роль |
|--------|------|
| **`architecture/main.bvc`** | Human + agent readable; BVC-native; diff в Git; публичный canon (как charter) |
| `protocols/architecture-graph-model-v1.bvc` | Контракт edge types, L2/L3 rules — **остаётся**; canon ссылается на него |
| `src/architectureSnapshot.mjs` | **Loader + builder**, не массив блоков inline |

Work Graph уже использует BVC в charter (`canon.public_format: bvc`). ioHasC project в `charter/main.bvc` явно отделяет `architecture/project-map.bvc` — тот же паттерн, unified именем `architecture/main.bvc` для WG rebuild.

---

## 4. Содержимое `architecture/main.bvc` (контракт v1)

### 4.1. Корневой атом

```text
#Architecture_Main<[
Паспорт:
  canon.id: architecture-l1-blocks-v1
  canon.version: 1
  charter.ref: charter/main.bvc#Слои_Ядра
  protocol.ref: protocols/architecture-graph-model-v1.bvc
  design.output: architecture.snapshot.v1

Базис: …зачем отдельная architecture map…
Вектор: …L1 blocks as system design, not UI layout…
Цель: …единый hub для L1/L2 projection…
]>
```

### 4.2. Per-block atoms (7 штук)

Каждый L1 block — **отдельный BVC-атом** с метками:

- `architecture.block_id: step-canon`
- `architecture.layer: L1`
- `intent.roots: charter/, schemas/step-atom, …`
- `containers: …` (id + paths — или ссылка на L2 section)

Источник текста для v1: перенос из `ARCHITECTURE_L1_BLOCKS` + расширение из `#L1_System_Blocks` протокола (one-liner → triplet BVC по шаблону).

### 4.3. Edges section

Отдельный atom `#Architecture_L1_Edges` или YAML-like list в метках — **не** `work.depends_on`.

---

## 5. Связи «на всё остальное»

| Из canon | Куда trace |
|----------|------------|
| `charter.ref` | `charter/main.bvc#Слои_Ядра` |
| `protocol.ref` | edge types, L2 cap, углубление UX |
| `intent.roots` | `intent/index.bvc`, subtree paths |
| `container.paths` | L2 nodes, code-gap, `target_files` |
| `canon.id` + digest | CI golden, UI badge «L1 canon v1» |
| `intake.analytics_key: AN-36` | эпик `epic-architecture-main-bvc-canon` |

**Derived (не в canon):** `taskIds`, `taskCounts`, `artifactPaths` from classify, layout x/y L2.

---

## 6. UI / snapshot changes

1. **`architecture.snapshot.v1`:** добавить `l1Canon: { id, version, digest, sourcePath }`; у block — `basis`, `vector`, `goal` (optional strings).
2. **Drawer L1:** после заголовка — `renderDetailText('Базис'|'Вектор'|'Цель')` как у задач; `summary` → запасной вариант или merge в Vector preview.
3. **List row:** optional one-line из Vector (как `renderSemanticCore` для tasks).
4. **Badge:** «Канон L1 v1 · ab12cd34» в header Architecture list.

---

## 7. Управление (продолжение AN-35)

| Gate | Проверка |
|------|----------|
| `architecture:l1-check` | canon parse OK; block ids stable; edges valid |
| charter расхождение | mapping table §Слои_Ядра ↔ block ids (+ derived-projections footnote) |
| golden mermaid | from loaded canon, not from task counts |
| PR rule | изменение L1 только с diff `architecture/main.bvc` + test update |

---

## 8. Charter ↔ L1 (явная таблица для canon file)

| Charter §Слои_Ядра | L1 `block_id` |
|--------------------|---------------|
| Step Canon | `step-canon` |
| Work Graph | `work-graph` |
| Project Memory | `project-memory` |
| Trace/Evidence | `trace-evidence` |
| Agent Runtime | `agent-runtime` |
| Domain Vertical | `domain-onebase` |
| *(ADR: derived layer)* | `derived-projections` |

Рекомендация: **одна строка в charter** про derived projections (см. subtask эпика) — снимает «6 vs 7» confusion.

---

## 9. Альтернативы (отвергнуты)

| Вариант | Почему нет |
|---------|------------|
| Весь L1 только в charter | Устав перегружен; нет edges/L2/containers; смешение product pivot и system map |
| LLM генерирует L1 из repo | Недетерминизм; нет human gate |
| Auto L1 из intent folders | 1 folder ≠ 1 block; нестабильный UI |
| Оставить JS array | Drift; нет BVC в drawer; агент правит без ADR |

---

## 10. Эпик и фазы

**Epic:** `epic-architecture-main-bvc-canon`  
**Seed:** `npm run seed:epic-architecture-main-bvc-canon`  
**Plan:** `docs/plan-architecture-main-bvc-canon.md`

| Phase | Результат |
|-------|-------------|
| A | `architecture/main.bvc` v1 (7 blocks + edges) + charter footnote |
| B | `loadArchitectureL1Canon()`; snapshot fields; remove inline `ARCHITECTURE_L1_*` |
| C | UI BVC in drawer + canon badge |
| D | `architecture:l1-check` + tests + AN-36 closing |

**Depends on (soft):** AN-35 insights; **extends** `epic-architecture-views-v1` (UI surface уже есть).

---

## 11. Рекомендация

1. Принять **`architecture/main.bvc`** как SSoT L1 для Work Graph rebuild.
2. Устав **не заменяет** architecture file; устав **ссылается** на него из §Слои_Ядра (`architecture.ref`).
3. Snapshot и UI — **только проекция**; BVC в drawer обязателен для паритета с work items.
4. Эпик AN-36 — implementation track; closing фиксирует hub model в протоколе v2.

---

## Todo (исполнение AN-36)

- [x] Phase A: `architecture/main.bvc` + charter `architecture.ref`
- [x] Phase B: loader + migrate `architectureSnapshot.mjs`
- [x] Phase C: schema + drawer BVC + list semantic line + canon badge
- [x] Phase D: `architecture:l1-check` + tests
- [x] Phase D (deferred): bulk `.bvc`→`.bvc` — applied 337 renames + index path sync + `resolveBvcReadablePath`

**feeds_epics:** `epic-architecture-main-bvc-canon`

---

## 12. Closing (2026-05-31)

Реализовано:

| Результат | Path |
|-------------|------|
| L1 canon SSoT | `architecture/main.bvc` (7 blocks + 8 edges + passport) |
| Loader | `src/architectureL1Canon.mjs` |
| Snapshot | `l1Canon` metadata + block `basis`/`vector`/`goal` |
| Schema | `schemas/architecture-snapshot.v1.json` |
| UI | drawer BVC triplet, canon badge, source link |
| CLI | `npm run architecture:l1-check` |
| Charter link | `charter/main.bvc` §Слои_Ядра — `architecture.ref` + derived-projections footnote |

Digest v1 (canon body): см. вывод `npm run architecture:l1-check` (`8a76a3ef` на момент closing).
