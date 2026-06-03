# Прогрев сессии агента WG (AN-57)

**Статус:** done  
**Эпик:** `epic-agent-session-warmup-v1`  
**Аналитика:** [AN-57](../work/analytics/agent-session-warmup-vs-enforcement.md)

## Цель

Дополнить declarative enforcement (AN-25/26) слоем **прогрева**: воспроизводимые Cursor rules, session primer, few-shot Work Graph в ioHasC — чтобы агент не уходил в TodoWrite, английский prose и код без смены `work.status`.

## Почему

AN-57: rules и MCP prompts есть, но Cursor IDE их **мягко** соблюдает; `.cursor/rules` gitignored; workspace `project` не загружает WG rules; few-shot ioHasC не показывает claim→evidence.

## Todo

- [x] `sync-cursor-wg-rules-to-repo` — `docs/cursor-rules/` + `npm run sync:cursor-rules`
- [x] `document-session-primer-runbook` — runbook + § в workgraph-mcp-clients
- [x] `add-workgraph-few-shot-examples` — fewShotLibrary + strategy в project
- [x] `document-cursor-user-rule-wg-template` — шаблон user rule для multi-repo
- [x] `eval-cursor-mcp-usefulness-fixture` — optional eval fixture (P2)
- [x] `write-an58-closing-agent-session-warmup-v1` — closing AN-58

## Критерий завершения

1. Clone + `npm run sync:cursor-rules` → те же WG `.mdc`, что в каноне.
2. Runbook primer опубликован; оператор может стартовать сессию по чеклисту.
3. Few-shot `workgraph_execute` в project с тестами.
4. Эпик → done + AN-58 closing.

## Зависимости

- `epic-agent-workgraph-enforcement` — done (AN-26)
