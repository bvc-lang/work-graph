# AN-51: Lineage аналитики — граф в хранении, плоский список в UI

**Запрос:** стоит ли из плоского списка анализов сделать дерево для углубления (AN-50 → AN-50.1); хранить деревом/графом, а выводить плоским списком с вложениями в drawer?

**Статус:** закрыт (эпик done, 2026-06-02)  
**Closing:** [closing-epic-analytics-record-lineage-v1.md](closing-epic-analytics-record-lineage-v1.md)  
**ADR:** [docs/adr-analytics-record-lineage-v1.md](../../docs/adr-analytics-record-lineage-v1.md)
**Эпик:** `epic-analytics-record-lineage-v1`  
**План:** [docs/plan-analytics-record-lineage-v1.md](../../docs/plan-analytics-record-lineage-v1.md)

**Связи:** [AN-3](intent-graph-storage-roadmap.md) (граф намерений question→decision→work), [AN-50](verification-panel-tests-evidence-intent.md), [AN-50.1](work-graph-bvc-contract-verification.md) (пример углубления), [AN-2](parent-subtask-hierarchy.md) (parent в данных, не tree в списке).

---

## Кратко

| Вопрос | Ответ |
|--------|--------|
| Дерево вместо плоского списка? | **Нет** как default — ломает recency, поиск, closing/intake tabs |
| Углубления нужны? | **Да** — AN-50 → AN-50.1 уже вручную через «Связи» |
| Как хранить? | **Граф рёбер** (`deepens`, `related`, `feeds`, `closes`); дерево = projection |
| Как показывать? | **Плоский список** + badge в строке + блоки lineage в drawer |

---

## 1. Проблема

Сейчас ~57 записей AN-n:

- список сортирован **по дате** (`sortAnalyticsRecordsByRecencyDesc`);
- связи **AN-50 → AN-50.1** — только markdown («Связи», «См. также»);
- drawer показывает intent graph (question→options→decision) из **AN-3**, но **не** «родительский / дочерние разборы»;
- агент не может вызвать «дай continuations для AN-50» без парсинга body.

**Разрыв:** AN-3 закрыл lineage **question → work**; не закрыт lineage **analysis → deeper analysis**.

---

## 2. Варианты

### A. Дерево в списке

Collapse/expand по `parentKey`; AN-50.1 вложен под AN-50.

| + | − |
|---|---|
| иерархия видна сразу | теряется лента «что нового» |
| | один AN с несколькими родителями не ложится |
| | хуже пагинация и поиск |

**Вердикт:** не default.

### B. Плоский список + lineage только в drawer

Без полей в journal — парсить markdown «Связи».

| + | − |
|---|---|
| нулевая миграция | ненадёжно, не для MCP |
| | нет badge в списке |

**Вердict:** временный костыль, не канон.

### C. Граф в данных, плоский список в UI (**рекомендация**)

Journal + projection:

```yaml
# analytics-record.v1 (optional)
lineage:
  parentKey: AN-50
  parentId: analytics:verification-panel-tests-evidence-intent
  relation: deepens   # deepens | related | supersedes | closes
  childKeys: []       # derived at projection time
```

Edges (graph):

| relation | from → to | Пример |
|----------|-----------|--------|
| `deepens` | parent AN → child AN | AN-50 → AN-50.1 |
| `related` | peer | AN-50 ↔ AN-45 |
| `feeds` | AN → epic (work) | уже `feeds_epics` + work items |
| `closes` | closing AN → epic | closing-* |

**UI:**

- **Список:** recency-first, badge `↳ AN-50` или «2 продолжения»;
- **Drawer:** секции «Родитель», «Продолжения», «Связанные», «Задачи из разбора» (related work items уже есть).

**Вердикт:** канон.

### D. Только IntentNode (AN-3 C)

Каждый AN — узел `intent_node` с `analytics_ref`.

| + | − |
|---|---|
| единый intent graph | тяжёлый onboarding для «просто углубления» |
| | AN-50.1 не всегда имеет question/options |

**Вердict:** фаза 2 — bridge `lineage.parentKey` ↔ intent_node, не замена.

---

## 3. Связь с AN-3

| Слой | AN-3 | AN-51 |
|------|------|-------|
| Вопрос → варианты → решение → work | ✅ intent graph | не дублировать |
| Разбор → более детальный разбор | — | ✅ `deepens` |
| UI drilldown question→evidence | ✅ done | расширить drawer секцией «Lineage разборов» |
| Дорожная карта | view выбранной ветки | без изменений |

AN-51 — **узкий эпик** поверх существующего `analyticsPanelProjection` и drawer, не второй intent graph.

---

## 4. Схема projection v1

```json
{
  "schema": "analytics-lineage.projection.v1",
  "recordId": "analytics:work-graph-bvc-contract-verification",
  "key": "AN-50.1",
  "parent": { "key": "AN-50", "id": "analytics:verification-panel-tests-evidence-intent", "relation": "deepens" },
  "continuations": [],
  "related": [],
  "feedsWorkItems": ["epic-work-graph-bvc-contract-verification-v1"]
}
```

Builder: `buildAnalyticsLineageProjection(records)` — индекс по `lineage.parentKey` / explicit edges.

---

## 5. Ключи AN-n vs AN-n.m

- **Ordinal** `AN-51` — порядок в журнале (не менять).
- **Sub-key** `AN-50.1` — явный lineage в title/key; optional `lineage.parentKey: AN-50`.
- Не требовать sub-key для всех углублений — достаточно `parentKey` + обычный AN-57.

---

## 6. Roadmap (эпик)

| P | work.id | Суть |
|---|---------|------|
| P0 | `decide-analytics-lineage-storage-adr` | ADR: graph storage, flat UI |
| P0 | `extend-analytics-record-schema-lineage-v1` | поля lineage в record + journal lint |
| P0 | `implement-analytics-lineage-projection` | builder + attach к panel projection |
| P0 | `wire-analytics-drawer-lineage-sections` | родитель / продолжения / related |
| P1 | `wire-analytics-list-lineage-badges` | badge в list-row |
| P1 | `migrate-analytics-lineage-seed-examples` | AN-50↔AN-50.1 в journal |
| P2 | `implement-mcp-get-analytics-lineage` | MCP для агента |
| — | `write-closing-epic-analytics-record-lineage-v1` | closing |

Seed: `npm run seed:epic-analytics-record-lineage-v1`

---

## 7. Анти-goals

- Не tree-view как единственная навигация по аналитике.
- Не обязательный `parentKey` для каждого AN (closing, standalone).
- Не дублировать intent graph question/options для простых углублений.
- Не парсить lineage из markdown как primary source.

---

## 8. GTM

**«Аналитика с памятью решений»:** от обзора (AN-50) к детализации (AN-50.1) к эпику — **прослеживаемая цепочка** в UI и MCP, без потери ленты новых разборов.

---

**См. также:** [AN-45](work-graph-sidebar-sections-guide.md) (вкладка «Аналитика»), `src/analyticsPanelProjection.mjs`, `src/intentGraphProjection.mjs`.
