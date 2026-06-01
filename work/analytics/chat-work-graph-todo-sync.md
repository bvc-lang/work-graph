# AN-28: Todo в чате Cursor vs Work Graph — стоит ли синхронизировать с канбан?

**Запрос:** «Стоит ли в чат выводить задачи из Work Graph списком todo и синхронизировать статус с канбан-доской, чтобы улучшить информативность и UX?»

**Короткий ответ:** **информативность — да, синхронизация через Cursor TodoWrite — нет.** Chat-todo и канбан должны иметь **один источник правды** (`intent/**/work/*.work.bvc` + MCP mutate). TodoWrite — **эфемерный shadow backlog** (AN-25); двусторонняя «синхронизация» воспроизведёт dual backlog и снова даст «зависшие T1–T10» после summary сессии. Правильный UX: **read-only проекция** scope чата (эпик / claimed `work.id` / My queue) рядом с чатом или в Agent Run dock, с **pull** статусов из snapshot, без записи прогресса через todo в чате.

---

## 1. Контекст: что пользователь видит сегодня

| Поверхность | Что показывает | Персистентность | Связь с канбан |
|---|---|---|---|
| **Cursor chat TodoWrite** | T1…Tn, 1/10, in_progress | Только сессия; ломается при summary | ❌ нет |
| **Work Graph → Доска / Задачи** | `work.status`, rollup эпика | Git + audit journal | ✅ канон |
| **Home / Agent Run dock** (AN-20 P0) | My queue, active runs, inbox | API snapshot | ✅ read WG |
| **MCP `list_work_items`** | ready/doing/verify | On demand | ✅ канон |

**Инцидент (2026-05-31):** после закрытия эпика `ux-центр-управления-p0` в Work Graph chat-todo T1–T10 остались «1/10 in progress» — оператор воспринял это как невыполненную работу. Это не баг WG, а **рассинхрон двух UI-слоёв**.

---

## 2. Зачем вообще хочется todo в чате

Легитимные боли:

1. **Контекст сессии** — в длинном чате не видно «над чем агент работает сейчас».
2. **Прогресс** — пользователь хочет чеклист как в Linear/Cursor без переключения на вкладку Доска.
3. **План эпика** — 10 подзадач удобнее читать списком, чем открывать drawer по одной.
4. **Доверие** — если агент говорит «делаю T3», хочется сверить с реальным статусом.

Все четыре боли **реальны**. Вопрос — **какой механизм** их закрывает, не ломая канон.

---

## 3. Варианты (разбор)

### V1. Cursor TodoWrite ↔ kanban (двусторонняя синхронизация)

**Идея:** агент создаёт TodoWrite из `list_work_items`; отметка todo → `complete_work_item`; доска обновляется.

| За | Против |
|---|---|
| Привычный UI Cursor | **Два writer** на один work.id |
| Быстро для модели | TodoWrite **не API** для внешней синхронизации |
| | После summary todo **замирает**, kanban живёт |
| | Нет `evidence`, `pipeline_stage`, DoR/DoD |
| | Прямо запрещено каноном AN-25 / rule `agent-workgraph-single-backlog` |

**Вердикт:** ❌ **не делать.** Это усиленная версия dual backlog, которую эпик `epic-agent-workgraph-enforcement` только что закрывал.

### V2. TodoWrite как одноразовый план без sync (как сейчас)

**Идея:** агент ведёт todo «для себя», оператор не доверяет ему.

| За | Против |
|---|---|
| Нулевая интеграция | Плохой UX (ложные «невыполненные») |
| | Оператор не видит связь с `work.id` |

**Вердict:** ❌ для учётная работа; ⚠️ только micro-steps внутри **claimed** `work.id` (канон).

### V3. Read-only markdown-чеклист в ответе агента (без TodoWrite)

**Идея:** в начале execute-фазы агент один раз выводит:

```markdown
## Scope (read-only, Work Graph)
- [x] `design-home-центр-управления-v1` — done
- [~] `implement-home-snapshot-api` — doing (claimed)
- [ ] `wire-home-default-landing` — ready
```

Статусы — из `get_backlog_snapshot` / `list_work_items` **на этот turn**, не обновляются автоматически в старых сообщениях.

| За | Против |
|---|---|
| Нет второго backlog | Статичен в истории чата |
| Явные `work.id` | Нужна дисциплина агента |
| Не требует Cursor API | Не «живой» виджет |

**Вердикт:** ✅ **P1, low cost** — дополнение к agent-behavior step, не замена доски.

### V4. Read-only виджет «Session scope» (Cursor-side или ioHasC panel)

**Идея:** панель рядом с чатом: подписка на `GET /api/snapshot` или MCP poll; список детей эпика / claimed item; клик → drawer WG UI.

| За | Против |
|---|---|
| Живой статус | Нужен UI-контур (extension / встроенный webview) |
| Один единый источник правды | Cursor не даёт hook в TodoWrite UI |
| Как Linear sub-issues sidebar | Engineering P2 |

**Вердикт:** ✅ **P2 — целевой UX**, если invest в agent-OS shell.

### V5. Расширить Home + Agent Run dock (уже в AN-20)

**Идея:** «что делать сейчас» — на **Home**, не в чате; run привязан к `work.id`; чат — для диалога, dock — для статуса.

| За | Против |
|---|---|
| Уже частично shipped | Чат и dock — разные окна |
| Соответствует центр-управления vector | Не решает «хочу видеть в чате» |

**Вердикт:** ✅ **продолжать**; это правильный home для queue, не дублировать в todo.

### V6. MCP resource `workgraph://session-scope/{epicId}`

**Идея:** стандартный JSON для агента и любого UI: `{ epicId, children: [{ id, status, title }] }`; Cursor chat рендерит как custom block (если когда-нибудь поддержит).

**Вердикт:** ✅ **P1 backend**, независимо от Cursor todo UI.

---

## 4. Сравнение с аналогами

| Продукт | Где живёт task list | Sync с backlog |
|---|---|---|
| **Linear + Cursor** | Linear — единый источник правды; чат ссылается на issue id | Issue API |
| **Devin / factory agents** | Run panel + log; не параллельный todo | Run state machine |
| **GitHub Copilot workspace** | Issue/PR linkage | GitHub |
| **Cursor native TodoWrite** | In-session planner | **Нет внешнего sync** |

Вывод: зрелые agent-OS **не синхронизируют** proprietary chat-todo с PM-системой — они **линкуют** run/issue id и показывают **read-only progress** из внешнего store.

---

## 5. Рекомендация (канон)

### Делать

| # | Что | Приоритет |
|---|---|---|
| R1 | **Запрет** TodoWrite для списков subtasks эпика (уже в rule AN-25) | ✅ done |
| R2 | **Agent-behavior:** при execute эпика — один блок «Scope» с `work.id` + status из MCP (V3) | P1 |
| R3 | **MCP `get_epic_rollup` / resource** — compact JSON для scope (V6) | P1 |
| R4 | **Chat-adjacent panel** или ioHasC Agent dock: poll snapshot по `activeWorkId` (V4) | P2 |
| R5 | **Home My queue** как primary «что дальше» (V5) | ✅ P0 shipped |

### Не делать

- ❌ Двусторонняя sync TodoWrite ↔ `work.status`
- ❌ Отдельные T1/T2 без `work.id` в чате
- ❌ «Зелёная галочка» в todo как замена `Свидетельства:` / evidence timeline

### Допустимый компромисс

**Ephemeral micro-todo** (1–3 пункта, <1 turn): «прочитать atom», «прогнать test» — **без** `work.id`, **без** persistence между сообщениями. Учётная work — только через atom + kanban.

---

## 6. Архитектура целевого UX (read-only bridge)

```
Work Graph (git atoms, kanban)
        │  mutate: claim / complete / evidence
        ▼
  snapshot API / MCP list_work_items
        │  read-only poll (5–30s или on patch)
        ▼
┌───────────────────┬─────────────────────┐
│ Home / My queue   │ Agent Run dock      │
│ (operator)        │ (current work.id)   │
└───────────────────┴─────────────────────┘
        │ optional P2
        ▼
  Session scope panel (epic children statuses)
        ✕ NOT Cursor TodoWrite write path
```

**Принцип:** чат **не пишет** статус задач; чат **может показывать** снимок, если оператор явно закрепил scope (`work.id` эпика или claimed item).

---

## 7. Критерии успеха (если делать эпик)

1. Оператор в чате видит список subtasks **с реальными** `work.status` (не T1/T2).
2. Перевод карточки на доске в `done` отражается в scope panel **без** участия TodoWrite.
3. После summary/reload чата **нет** ложных «pending» — scope берётся из WG, не из истории сообщений.
4. Lint/rule: агент не вызывает TodoWrite для списка >3 пунктов с тем же смыслом, что `intent/**/work`.

---

## 8. Предлагаемый эпик (опционально)

| work.id | Суть |
|---|---|
| `epic-chat-work-scope-readonly` | read-only мост чат ↔ WG |
| `mcp-epic-rollup-scope-resource` | R3 JSON для epic children |
| `agent-behavior-chat-scope-block` | R2 markdown block в step |
| `ui-agent-scope-panel-poll` | R4 panel poll snapshot (P2) |

Intake: `intake.analytics_key: AN-28`. Зависит от AN-25 (enforcement), AN-20 (dock/home).

---

## 9. Кратко для оператора

**Вопрос:** стоит ли todo в чате с sync на доску?

**Ответ:**  
- **Список задач в чате — полезен**, если это **окно в Work Graph**, а не второй бэклог.  
- **Sync через Cursor TodoWrite — вреден** — уже обжёгся на T1–T10.  
- **UX улучшать:** Home queue + Agent dock + (P2) live scope panel + одноразовый Scope block с `work.id` в ответах агента.

---

## 10. Связи

| AN | Связь |
|---|---|
| **AN-25** | Запрет dual backlog; инцидент chat todo |
| **AN-20** | Центр управления — правильное место для queue |
| **AN-22** | Пайплайн status transitions — только через atoms |
| **AN-26** | Closing enforcement epic |
