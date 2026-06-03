# AN-58: Closing — epic-agent-session-warmup-v1 (agent session warm-up)

**Запрос:** итоговый разбор после реализации прогрева сессии WG (AN-57).

# Closing: epic-agent-session-warmup-v1

Эпик: `epic-agent-session-warmup-v1`  
Источник: [AN-57](agent-session-warmup-vs-enforcement.md)  
Закрыт: 2026-06-02

## Что сделано

- **docs/cursor-rules/** — 6 канонических `.mdc` в git; `npm run sync:cursor-rules` + `lint:cursor-rules-drift`.
- **docs/workgraph-session-primer-runbook.md** — чеклист старта сессии и шаблон первого сообщения.
- **docs/cursor-user-rule-wg-backlog.template.md** — страховка для workspace = ioHasC project.
- **ioHasC few-shot** — `workgraph_claim_execute`, `workgraph_no_todowrite`, task type `workgraph_execute` в `fewShotStrategy.js` (project).
- **Eval baseline** — fixture `cursor-mcp-primer-v1` в `PROMPT_EVAL_WORKGRAPH_FIXTURES_V1`.

## Что не сработало / deferrals

- Live Cursor E2E «с primer vs без» — только UAT; baseline через optional-llm fixture, не замена IDE eval.
- Embedded WG agent (AN-47) — few-shot в ioHasC project, не auto-inject в Cursor без MCP primer.
- `.cursor/mcp.json` по-прежнему локальный; rules sync не заменяет MCP path setup.

## Уроки

1. Enforcement (AN-26) без **прогрева** (rules в git + primer + few-shot) не останавливает TodoWrite/EN prose в реальных сессиях.
2. Multi-repo (project root) требует **user rule** или workspace = work graph — иначе WG `.mdc` не в контексте.
3. Few-shot per-turn эффективнее одного alwaysApply rule для паттерна claim→evidence.

## feeds_epics

- epic-agent-session-warmup-v1
