# AN-54: Стек detail-drawer — очередь модальных панелей и типы контента

**Запрос:** в задаче есть «Родитель (эпик)» — при клике открывать поверх текущего drawer, как в Architecture L2; обобщить: **переиспользуемый каркас модального окна + очередь (stack)**, классификация по типам контента, единый паттерн на всех страницах.

**Статус:** принято, эпик в backlog  
**Эпик:** `epic-detail-drawer-stack-v1`  
**План:** [docs/plan-detail-drawer-stack-v1.md](../../docs/plan-detail-drawer-stack-v1.md)

**Связи:** [AN-45](work-graph-sidebar-sections-guide.md) (разделы UI), [AN-2](parent-subtask-hierarchy.md) (`work.parent_id`), [AN-51](analytics-record-lineage-flat-list-graph-storage.md) (lineage drill-down), interim fix `wire-analytics-related-task-sub-drawer` (done).

---

## Кратко

| Вопрос | Ответ |
|--------|--------|
| Проблема | Сейчас **два** физических слоя: L1 `#detail-drawer` + L2 `#detail-sub-drawer`. Каждый новый сценарий «поверх» — отдельный хак (`openAnalyticsRelatedTaskSubDrawer`, `openL2NodeDetails`). |
| Клик «Родитель (эпик)» | Из task drawer вызывает `openTaskDetails` → **заменяет** L1; из sub-drawer — тоже нет N-го уровня. |
| Решение | **Очередь фреймов** + **типизированный shell**; один каркас, рендереры по `frame.type`. |
| Не tree-view | Stack — навигация **вглубь контекста**, списки (задачи, аналитика) остаются flat. |

---

## 1. Baseline (как сейчас)

```
Список / канban / architecture list
        │
        ▼
   L1 detail-drawer  ← detailContext (один объект)
        │
        ├── replace content (openTaskDetails, openAnalyticsRecordDetails, openBlockDetails)
        │
        └── L2 detail-sub-drawer (Architecture L2, analytics related task — interim)
```

| Точка входа | Поведение при drill-down |
|-------------|-------------------------|
| Задача → родитель epic | L1 **replace** |
| Задача → подзадача | L1 **replace** |
| Analytics → related task | L2 **push** (interim, 2026-06) |
| Analytics → lineage parent | L1 **replace** (AN-51) |
| Architecture block → L2 node | L2 **push** |
| Architecture L2 → related task | L1 **replace** (regression risk) |
| Linkage ref → work | L1 **replace** |

**Разрыв:** нет единой семантики back/Esc; нельзя task → epic → subtask **без потери** промежуточных экранов.

---

## 2. Целевая модель

### 2.1. Два слоя абстракции

1. **Shell (каркас)** — overlay, drawer panel, header (title, id, close), back, resize, focus trap, z-index.
2. **Stack (очередь)** — упорядоченный массив фреймов; push/pop/replaceTop; Esc = pop.

```
detailStack = [ frame₀, frame₁, frame₂ ]
                 ▲       ▲       ▲
              analytics  task    epic-parent
              (list)    (sub)   (sub-sub)
```

UI показывает **верхний** фрейм; breadcrumb / back раскрывает `frame[n-1].title`.

### 2.2. Типы фреймов (`detail-stack.frame.v1`)

| `type` | Контент | Renderer (существующий) |
|--------|---------|-------------------------|
| `task` | WorkItem atom | `buildTaskDetailSections` + toolbars |
| `analytics` | AN record | `openAnalyticsRecordDetails` body |
| `architecture-block` | L1 block | `buildBlockDetailSections` |
| `architecture-l2` | L2 node | `buildL2NodeDetailSections` |
| `schematic-node` | Schematic | `openSchematicNodeDetails` body |
| `memory-record` | Memory journal row | memory detail sections |
| `intent-graph-node` | Intent branch summary | intent drilldown block |

Payload минимален — id/slug, остальное **resolve at render** из snapshot/projection (не дублировать BVC в stack).

```json
{
  "schema": "detail-stack.frame.v1",
  "type": "task",
  "key": "implement-foo",
  "title": "Implement foo",
  "payload": { "workId": "implement-foo" }
}
```

### 2.3. Правила push

| Источник клика | Действие |
|----------------|----------|
| List row (не из drawer) | `stack.reset()` + `push(frame)` — один корневой drawer |
| Drill-down внутри drawer | `stack.push(frame)` — сохранить нижние уровни |
| Back / «← …» | `stack.pop()` |
| Esc | `stack.pop()` или `stack.reset()` если depth=1 |
| Overlay click (вне panel) | `stack.reset()` (как сейчас close) |

---

## 3. Варианты реализации

### A. Множить DOM-drawer (L3, L4…)

| + | − |
|---|---|
| минимальный рефактор | не масштабируется, z-index/ad hoc |

**Вердict:** отвергнуть.

### B. Один shell + stack state (рекомендация)

Один `#detail-drawer` (L1 shell); L2 DOM **deprecate** после миграции. Stack depth ≥ 2 визуально: breadcrumb + slide transition optional.

| + | − |
|---|---|
| один каркас, N уровней | нужен refactor `detailContext` → `detailStack` |
| переиспользование на всех view | фазовая миграция |

**Вerdict:** канон.

### C. Полноэкранный modal center

| + | − |
|---|---|
| привычно для web | ломает текущий UX side panel WG |

**Вerdict:** не default; optional `presentation: 'center'` — defer.

---

## 4. Связь с interim fix (analytics task sub-drawer)

`wire-analytics-related-task-sub-drawer` (done) — **локальный патч**: analytics → task в `#detail-sub-drawer`.

В эпике:
- **P0:** stack core + **task → parent epic push**
- **P1:** перенести analytics-related-task и lineage nav на stack
- **P2:** Architecture L2, linkage, schematic

После миграции удалить `#detail-sub-drawer` или оставить как thin wrapper над `stack.push`.

---

## 5. Epic roadmap

| P | work.id | Суть |
|---|---------|------|
| P0 | `decide-detail-drawer-stack-adr` | ADR: frame types, push/pop, deprecate L2 |
| P0 | `implement-detail-drawer-stack-core` | `detailDrawerStack.mjs` + shell API |
| P0 | `wire-task-hierarchy-stack-navigation` | Родитель/подзадача → push, не replace |
| P1 | `migrate-analytics-drilldown-to-drawer-stack` | related task + lineage → stack |
| P1 | `migrate-architecture-l2-to-drawer-stack` | L2 node → stack frame type |
| P2 | `wire-drawer-stack-uniform-back-esc` | Esc/back/overlay единые правила |
| — | `write-closing-epic-detail-drawer-stack-v1` | closing |

Seed: `npm run seed:epic-detail-drawer-stack-v1`

---

## 6. Анти-goals

- Не заменять flat list/kanban navigation tree-view стеком.
- Не хранить полный HTML в stack — только typed payload + renderers.
- Не ломать MCP/agent paths (drawer — UI only).

---

## 7. GTM / UX

**«Контекст не теряется»:** разбор → задача → эпик → подзадача — цепочка с back на каждом шаге, как в mobile navigation stack, без возврата к списку.

---

**См. также:** [AN-54](detail-drawer-stack-modal-queue.md) (стек drawer / modal queue), `src/workGraphBacklogUiServer.mjs` (`detailContext`, `#detail-sub-drawer`), [AN-2](parent-subtask-hierarchy.md).
