# AN-56: Real-time UI updates — baseline, best practices, рекомендация

**Запрос:** анализ и лучшие практики для обновления UI в реальном времени — смена статуса карточек, переход между колонками kanban, появление новых work item и др.

**Статус:** принято (analysis), implementation — backlog (эпик seeded)  
**План:** [`docs/plan-work-graph-ui-realtime-v1.md`](../docs/plan-work-graph-ui-realtime-v1.md)  
**Эпик:** `epic-work-graph-ui-realtime-v1`

**Связи:** [AN-20](ux-current-state-and-vector.md) (HERMES event stream, poll vs WS), [AN-28](chat-work-graph-todo-sync.md) (read-only poll bridge), [AN-45](work-graph-sidebar-sections-guide.md), [AN-55](work-graph-ui-i18n-best-practices.md) (live strings).

---

## Кратко

| Вопрос | Ответ |
|--------|--------|
| Есть ли live UI сегодня? | **Частично** — poll только Home (30s), Agent dock (5s), scope panel (20s); **kanban/board не обновляется** |
| Почему карточка «застревает»? | Snapshot грузится один раз; MCP/agent пишет `.bvc` → UI не знает, пока нет F5 или POST-действия |
| Что рекомендуем v1? | **Revision + view-scoped poll + incremental kanban patch** |
| WebSocket? | **P2 optional SSE**; v1 — polling с ETag (согласовано с AN-20 §11 RAM) |
| Новый item? | Тот же revision diff → `item.added` → вставка карточки + flash highlight |

---

## 1. Baseline: как UI обновляется сейчас

### 1.1. Загрузка при старте

```
GET /api/snapshot
  → GET /api/dashboard-snapshot
    → GET /api/operator-shell-snapshot  (kanbanBoard внутри)
      → render()
```

Клиент держит `snapshot`, `dashboardSnapshot`, `operatorShellSnapshot` в памяти.

### 1.2. Повторная загрузка (точечно)

| Триггер | Что обновляется |
|---------|-----------------|
| `submitPromoteReady`, patch из drawer | `reloadOperatorSnapshots()` + полный `render()` |
| Home mission control | `refreshHomeSnapshot()` каждые **30s** |
| Agent dock open | journal poll **5s** + scope **20s** |
| Kanban / Доска / Задачи (list) | **нет фонового poll** |

### 1.3. Рендер kanban

`renderKanbanBoard()` делает **`kanbanBoard.innerHTML = …`** — полная перерисовка колонок из `operatorShellSnapshot.kanbanBoard`.

Колонки: `backlog | ready | in_progress | done` (`kanbanBoardProjection.mjs`).

### 1.4. Источник правды

Work items — **файлы** `intent/**/**/*.work.bvc`. Изменения приходят из:

- MCP (`claim_work_item`, `complete_work_item`, `create_work_item`, …)
- Agent в IDE (write file)
- Seed scripts / git pull

UI server **не подписан** на fs events.

### 1.5. Уже существующие «события»

`inboxEventStream.mjs` собирает inbox из worker runs, daemon audit, analytics, verify items — **не** из произвольных status patch backlog.

---

## 2. Продуктовая боль

| Сценарий | Сейчас | Ожидание оператора |
|----------|--------|-------------------|
| Agent перевёл задачу `doing → verify` | Карточка на kanban не двигается | Карточка переехала в «В работе» / verify column без F5 |
| Seed эпика (10 subtasks) | Не видно, пока не reload | Новые карточки появляются в Backlog |
| Два окна WG UI + Cursor agent | Рассинхрон | Оба окна сходятся за ≤N секунд |
| Открыт drawer задачи, статус сменился снаружи | Stale title/status в drawer | Drawer reconcile или badge «обновлено» |
| Home KPI tiles | 30s poll — ок | Kanban должен быть не хуже |

AN-28: scope panel **уже** poll snapshot — но **board view** out of scope того эпика.

---

## 3. Industry best practices (2025–2026)

| Практика | Зачем | Применимость WG |
|----------|-------|-----------------|
| **ETag / revision polling** | `If-None-Match` → 304, дешёвый heartbeat | ✅ v1 — один hash snapshot |
| **View-scoped subscriptions** | Poll только активная вкладка | ✅ board/workflow 3–5s; analytics 30s |
| **Incremental DOM patch** | Не `innerHTML` whole board — move node | ✅ kanban card `data-work-id` |
| **Optimistic UI** | Локальное действие → instant move, rollback on error | ✅ promote/claim из UI |
| **SSE server-push** | One-way, проще WS для Node http | ⚠️ P2 + fs watch |
| **WebSocket bidirectional** | Chat, cursors | ❌ overkill v1 |
| **CRDT / OT** | Multi-user edit same field | ❌ git files = serial writes |
| **Long poll / HTTP/2 push** | Альтернатива SSE | ⚠️ SSE достаточно |
| **FLIP animation** | Perceived performance при move | optional P2 polish |
| **Debounce fs watch** | chokidar burst на seed | 200–500ms debounce |

### Что берём у конкурентов

| Продукт | Паттерн | Для WG |
|---------|---------|--------|
| **Linear** | Realtime issue moves (WS) | Incremental card move + status badge |
| **Plane** | Live updates на board | Poll + patch v1 |
| **GitHub Projects** | Refresh on navigation | + active view poll |
| **Figma** | Presence (не наш кейс) | skip |
| **HERMES / Datadog** | Event stream + KPI refresh | Уже в AN-20 Home; расширить на board |

### Явный anti-pattern (из AN-28)

❌ **Cursor TodoWrite ↔ kanban sync** — dual backlog.  
✅ **Read-only/live mirror** Work Graph snapshot — тот же канал, что для realtime UI.

---

## 4. Рекомендуемая архитектура v1

### 4.1. Три слоя

```
┌─────────────────────────────────────────────────────────┐
│ L1  Backlog revision  (server)                          │
│     hash(intent work items + journals tail optional)    │
│     GET /api/backlog-revision  → { revision, at }     │
└───────────────────────────┬─────────────────────────────┘
                            │ changed?
┌───────────────────────────▼─────────────────────────────┐
│ L2  Live sync coordinator  (client)                     │
│     view-scoped poll; backoff when hidden tab           │
└───────────────────────────┬─────────────────────────────┘
                            │ fetch delta or full slice
┌───────────────────────────▼─────────────────────────────┐
│ L3  View patchers  (client)                             │
│     kanbanPatcher, workflowListPatcher, drawerReconcile │
└─────────────────────────────────────────────────────────┘
```

### 4.2. Revision API (P0)

```javascript
// GET /api/backlog-revision
{
  "schema": "workgraph.backlog-revision.v1",
  "revision": "sha256:abc…",   // stable sort work ids + status + updatedAt labels
  "itemCount": 412,
  "generatedAt": "2026-06-02T…"
}

// GET /api/snapshot?sinceRevision=sha256:abc…  → 304 or full
// GET /api/kanban-delta?sinceRevision=…        → { moves, adds, removes, counts }
```

**Правило:** revision считается из **parsed work items**, не mtime файлов — детерминизм для тестов.

### 4.3. Kanban delta (P1)

Сравнение двух `buildKanbanBoardProjection` snapshots:

| Event | DOM action |
|-------|------------|
| `status.changed` (same column) | Update badge on `[data-work-id]` |
| `column.move` | `appendChild` card to new column; optional FLIP |
| `item.added` | Insert card + `is-new` CSS 3s |
| `item.removed` | Remove card (rare: delete work item) |
| `count.changed` | Update column badge only |

Fallback: если patcher не справился → `reloadOperatorSnapshots()` + `render()` (как сейчас).

### 4.4. Poll intervals (рекомендация)

| View | Interval | Backoff hidden tab |
|------|----------|-------------------|
| `board`, `workflow` | **3s** | 30s |
| `verification` | 5s | 30s |
| `home` (KPI) | 30s | 60s |
| `analytics`, `architecture` | on-demand | — |
| Agent dock open | 5s (keep) | — |

Document in ADR — align with AN-20 «не WS по умолчанию».

### 4.5. Optimistic local writes

Уже есть: POST → `reloadOperatorSnapshots()`. Улучшение:

1. **До** fetch: move card locally (optimistic).
2. **После** revision match: noop.
3. **Conflict** (revision changed elsewhere): reconcile from server.

### 4.6. Drawer reconcile

Если `#detail-drawer` open для `workId` и delta содержит этот id:

- Refresh status badge + promote buttons.
- Optional toast: «Задача обновлена агентом».
- Не закрывать drawer.

### 4.7. SSE track (P2, optional)

```
GET /api/ui-events/stream   (text/event-stream)
event: backlog-revision
data: {"revision":"sha256:…"}
```

Server: `fs.watch` / chokidar на `intent/**/**/*.work.bvc` + debounce → recompute revision → push.

Клиент: SSE **или** poll — один coordinator, два transport adapter.

**Когда нужен SSE:** два оператора, daemon + UI, частые MCP writes без UI action.

---

## 5. Что ещё можно обновлять live (roadmap UI)

| Surface | Event source | Priority |
|---------|--------------|----------|
| **Kanban columns** | status / new item | P1 MVP |
| **Workflow epic tree** | child status rollup | P1 |
| **Home KPI tiles** | already 30s poll | unify coordinator |
| **Inbox stream** | daemon + worker + **work.status→verify** | P2 |
| **Verification matrix row** | evidence / tier status | P2 |
| **Agent scope panel** | child status (20s today) | unify |
| **Search / semantic index** | debounced re-fetch | P3 |
| **Architecture graph node badge** | work item status on node | P3 |
| **Analytics journal list** | new AN record appended | P3 (separate jsonl watch) |

**Не live v1:** graph canvas layout, markdown preview, prompts editor content.

---

## 6. Сравнение подходов

| # | Подход | Verdict |
|---|--------|---------|
| A | F5 / manual only | ❌ текущая боль |
| B | Full `render()` poll 3s | ⚠️ работает, но jank + теряет scroll/selection |
| C | Revision poll + incremental patch | ✅ **рекомендуется v1** |
| D | WebSocket everywhere | ❌ RAM/complexity (AN-20) |
| E | SSE + fs watch only (no poll) | ⚠️ P2 addon; нужен poll fallback |
| F | Service Worker push | ❌ overkill local dev tool |

---

## 7. Тестирование

| Test | Что |
|------|-----|
| `backlogRevision.test.mjs` | stable hash при том же corpus |
| `kanbanBoardDelta.test.mjs` | status change → move event list |
| `uiLiveSyncCoordinator.test.mjs` | backoff, view switch stops poll |
| UI smoke | simulate revision bump → card moves column without full reload |
| Deterministic | no wall-clock flake — inject clock |

---

## 8. Риски

| Риск | Митигация |
|------|-----------|
| Poll storm на большом backlog | revision endpoint лёгкий; full snapshot только on change |
| innerHTML vs patch drift | fallback to full render; feature flag `WG_UI_LIVE_PATCH=1` |
| fs watch на Windows | debounce + optional poll-only mode |
| Drawer edit conflict | operator edit wins until save; remote status → banner not overwrite form |
| Multi-tab duplicate poll | `localStorage` leader election or shared Worker (P3) |

---

## 9. Эпик

`npm run seed:epic-work-graph-ui-realtime-v1`

| P | work.id | Суть |
|---|---------|------|
| P0 | `decide-work-graph-ui-realtime-adr` | poll vs SSE, intervals, boundaries |
| P0 | `implement-backlog-snapshot-revision-api` | revision + 304 |
| P0 | `implement-ui-live-sync-coordinator` | client poll hub |
| P1 | `implement-kanban-incremental-patch` | delta → DOM move |
| P1 | `wire-board-workflow-live-refresh` | active view poll |
| P1 | `wire-new-work-item-live-appearance` | item.added highlight |
| P1 | `reconcile-detail-drawer-on-remote-patch` | open drawer stale fix |
| P2 | `implement-backlog-sse-push-optional` | fs watch + SSE |
| P2 | `unify-home-inbox-agent-live-poll` | one coordinator |
| — | `write-closing-epic-work-graph-ui-realtime-v1` | closing |

---

## 10. GTM

**«Board that breathes with the agent»** — оператор видит, как агент двигает work items, без dual backlog и без тяжёлого WS.

---

**См. также:** [AN-28](chat-work-graph-todo-sync.md), [AN-54](detail-drawer-stack-modal-queue.md) (drawer reconcile + stack depth), `src/kanbanBoardProjection.mjs`, `src/inboxEventStream.mjs`, `ui/operator-dashboard-v2.bvc`.
