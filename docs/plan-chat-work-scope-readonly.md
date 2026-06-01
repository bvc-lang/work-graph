# План: epic-chat-work-scope-readonly (AN-28)

## Цель

Read-only мост «чат / agent session ↔ Work Graph»: оператор видит scope subtasks с реальными `work.status`, без синхронизации Cursor TodoWrite с канбаном.

## Почему

AN-28: TodoWrite sync вреден (dual backlog, зависшие T1–T10). Информативность нужна через MCP snapshot и UI poll.

## Todo

- [x] `epic-chat-work-scope-readonly` — эпик в бэклоге
- [x] `mcp-epic-rollup-scope-resource` — MCP/API compact scope JSON
- [x] `agent-behavior-chat-scope-block` — step + Scope block в ответах агента
- [x] `document-chat-scope-readonly-canon` — § в decision-pipeline-canon
- [x] `ui-agent-scope-panel-poll` — live panel в Agent dock (P2)
- [x] `write-an29-closing-chat-work-scope-readonly` — closing AN-29

## Критерий завершения

1. Scope subtasks читается из WG (MCP + опционально UI poll).
2. Нет двусторонней sync TodoWrite ↔ `work.status`.
3. AN-29 closing опубликован, эпик закрыт.
