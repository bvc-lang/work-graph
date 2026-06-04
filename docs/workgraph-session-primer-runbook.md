# Session primer — старт сессии агента Work Graph

**AN-57** · эпик `epic-agent-session-warmup-v1`

## Когда использовать

Перед первым «делай эпики / следующие задачи» в любом MCP-клиенте (Cursor, Claude Code, Claude Desktop, …) с сервером `workgraph`. Без primer модель часто уходит в **TodoWrite**, английский prose и код без `claim_work_item`.

## Чеклист оператора

1. **Workspace** — корень репозитория Work Graph (`intent/**/work/*.work.bvc` в дереве) **или** ioHasC project с настроенным MCP и `WORKGRAPH_ROOT`.
2. **MCP** — сервер `workgraph` включён; `WORKGRAPH_ROOT` указывает на clone Work Graph. См. [workgraph-mcp-clients.md](./workgraph-mcp-clients.md).
3. **Agent rules (Cursor)** — после clone WG: `npm run sync:cursor-rules` (канон в `docs/cursor-rules/`).
4. **Multi-repo (project + WG)** — опционально [user rule](./cursor-user-rule-wg-backlog.template.md) в Cursor Settings (только для Cursor).
5. **Первое сообщение** — скопируй шаблон ниже или отправь эквивалент.

## Шаблон первого сообщения

```text
Работаем через Work Graph MCP. Trackable work — только work.id в intent/**/work/*.work.bvc.
Не используй TodoWrite для эпиков и подзадач.

1) get_current_cycle или get_promote_ready_queue
2) claim_work_item для выбранной ready-задачи
3) get_pvrg_task_scope + get_graph_rag_context для scope
4) Код + evidence; статус через update_work_item_status / complete_work_item
5) Новые задачи — create_work_item / seed с русским Базис/Вектор/Цель

Начни: возьми следующую ready-задачу из бэклога и claim.
```

## Чего не делать

- TodoWrite T1/T2 для эпиков и `work.id`
- Код до `claim_work_item` для trackable work
- Английские telegraphic bullets в `create_work_item`
- Игнорировать `.cursor/rules` / user rule при workspace = project

## Связанные документы

- [workgraph-mcp-clients.md](./workgraph-mcp-clients.md) — конфиг MCP
- [cursor-user-rule-wg-backlog.template.md](./cursor-user-rule-wg-backlog.template.md) — страховка для multi-repo
- [plan-agent-session-warmup-v1.md](./plan-agent-session-warmup-v1.md) — todo эпика
- [AN-57](../work/analytics/agent-session-warmup-vs-enforcement.md) — разбор
