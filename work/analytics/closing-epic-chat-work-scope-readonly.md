# Closing: epic-chat-work-scope-readonly

Эпик: `epic-chat-work-scope-readonly`  
Источник: [AN-28](chat-work-graph-todo-sync.md)  
Закрыт: 2026-05-31

## Outcomes

- MCP `get_epic_work_scope` + resource `workgraph://epic/{id}/scope` — compact rollup direct children (`workgraph.epic-work-scope.v1`).
- `GET /api/epic-scope?epicId=…` в backlog UI server.
- Agent-behavior rule `chat-work-scope-readonly` в bundle — markdown блок «Scope (read-only, Work Graph)» вместо TodoWrite для эпика (>3 subtasks с `work.id`).
- Canon § **Chat read-only scope** в `docs/decision-pipeline-canon.md` + vector в `protocols/decision-pipeline-canon-v1.bvc`.
- Agent Run dock: `#agent-scope-panel` (`data-testid=agent-scope-panel`) — poll `/api/epic-scope` каждые 20s; клик → task drawer; `sessionEpicId` в `home.snapshot.v1`.
- Tests: `tests/mcp-epic-scope.test.mjs`, `tests/missionControlUiClient.test.mjs` (agent scope panel).

## Инцидент chat todo после scope panel

**Вопрос AN-29:** воспроизводится ли «зависший» chat todo (T1–T10) после внедрения read-only scope?

**Ответ:** scope panel **не синхронизирует** Cursor TodoWrite — это by design. Инцидент AN-28 (todo «1/10 in progress» при done эпике в WG) **не устраняется автоматически** panel poll: Cursor todo остаётся эфемерным shadow backlog. Оператор должен:

1. Смотреть прогресс в Agent Run dock scope или на Доске (канон).
2. Не доверять TodoWrite для учётная `work.id` (AN-25 / `agent-workgraph-single-backlog`).

Scope panel **закрывает информативность** без dual writer: live статусы из WG, без ложного «pending» после reload UI.

## Уроки

1. Read-only projection (MCP + API + UI poll) — правильный мост chat↔kanban; TodoWrite sync — anti-pattern.
2. Ephemeral micro-todo (1–3 шага без `work.id`) допустим на один turn; списки subtasks эпика — только из snapshot.
3. `sessionEpicId` в home snapshot снижает guesswork, какой эпик показывать в dock.

## feeds_epics

- epic-chat-work-scope-readonly
