# AN-81: Универсальный канон-осознанный классификатор задач по L1-блокам

**Запрос:** оценить доработку универсального классификатора, покрывающего любой проект; сохранить разбор и создать epic.

**Дата:** 2026-06-06

**Epic:** `epic-canon-aware-work-item-block-classifier-v1`

---

## Краткий вывод

**Да, универсальный классификатор нужен** для npm-first per-project WG. Текущий `classifyWorkItemBlock()` — хардкод id starter-kit движка (`domains`, `derived-projections`, `work-graph`). Канон проекта (`architecture/main.bvc`) уже парсится, но **не участвует** в раскладке `taskIds` на вкладке «Архитектура» (см. AN-80).

Рекомендация: **канон-осознанный резолвер** с явным override, матчем путей и legacy-fallback для `architecture.starter: true`.

---

## Проблема

| Слой | Читает канон? |
|------|---------------|
| `loadArchitectureL1Canon()` | ✅ |
| `buildArchitectureSnapshot()` → `tasksByBlock` | ❌ только `classifyWorkItemBlock(item)` |
| `resolveWorkItemClassifierBadge()` | частично; словарь бейджей захардкожен |

Gripe: 7 L1 (`catalog-pipeline`, `presentation`, …) — задачи уходят в `domains` / `derived-projections`, которых в каноне нет → `taskIds` пустые.

---

## Целевая модель (универсальный резолвер)

Приоритеты:

1. **`architecture.block_id`** на задаче, если id ∈ `canon.blocks`
2. **Longest-prefix match** `work.target_files` ↔ `architecture.intent_roots` + `architecture.container.*.paths`
3. **Путь atom задачи** `intent/**/work/*.work.bvc` ↔ `intent_roots`
4. **Fallback:** если `architecture.starter: true` в каноне → текущий legacy-хардкод
5. **Иначе:** `unclassified` (не подставлять чужой `work-graph` / `domains`)

```text
explicit block_id → path index из canon → starter legacy → unclassified
```

---

## Оценка трудозатрат

### MVP (Gripe + любой проект с заполненным каноном) — ~3–5 дней

- `classifyWorkItemForCanon(item, canon)`
- Индекс путей L1/L2 из канона
- Интеграция в `buildArchitectureSnapshot`
- Динамические бейджи из `canon.blocks[].title`
- Legacy fallback для starter-kit
- Тесты: fixture WG-engine + fixture Gripe-like

### v1 production — +1–1,5 недели

- scoring / confidence / `classification.source`
- lint / doctor: unclassified + path вне всех блоков
- MCP hint при `create_work_item`
- UI: счётчик неклассифицированных

---

## Риски и митигация

| Риск | Митигация |
|------|-----------|
| Ломаются тесты WG на `domains` | `architecture.starter: true` + repo WG сохраняет legacy |
| Ложные матчи по тексту department | Матчить **пути**, не substring в title |
| Двусмысленные пути | scoring + явный `architecture.block_id` |
| Meta-задачи WG в продуктовом репо | Остаются unclassified — по дизайну Gripe |

---

## Связь с эпиком

**`epic-canon-aware-work-item-block-classifier-v1`** — 6 подзадач:

1. `build-canon-block-path-index` — индекс intent_roots + container.paths
2. `implement-classify-work-item-for-canon` — резолвер с приоритетами
3. `wire-snapshot-canon-aware-classifier` — snapshot + unclassified bucket
4. `dynamic-classifier-badges-from-l1-canon` — бейджи из канона, не хардкод
5. `preserve-starter-kit-legacy-classifier` — fallback при `architecture.starter: true`
6. `tests-canon-aware-classifier-fixtures` — WG + Gripe fixtures, deterministic

Зависимости: `extract-work-item-block-classifier` (done), `epic-architecture-main-bvc-canon` (done).

Связанные разборы: AN-80 (инцидент Gripe), AN-78 (L1 канон), AN-61 (classifier badges v1 — хардкодный слой UI).

---

## Вердикт

Универсальный классификатор — **правильный следующий шаг** после L1-can loader. Это не перепись продукта, а перенос источника id с хардкода на уже существующий парсер `architecture/main.bvc`. Оператору в Gripe параллельно можно проставлять `architecture.block_id` на спорных задачах — MVP подхватит override сразу.
