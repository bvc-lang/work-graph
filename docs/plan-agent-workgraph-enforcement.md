# Agent Work Graph enforcement (AN-25)

**Статус:** done (2026-05-31)  
**Эпик:** `epic-agent-workgraph-enforcement`  
**Аналитика:** [AN-25](../work/analytics/agent-bypass-work-graph-dual-backlog.md)

## Цель

Закрыть обход Work Graph через chat TodoWrite, seed→`doing` и код без claim/evidence. Единый бэклог = `intent/**/work/*.work.bvc`.

## Почему

AN-25 зафиксировал dual backlog: work items в git + параллельный todo в чате Cursor. Канон AN-22 покрывает MCP, но не IDE-агента.

## Todo

- [x] `add-cursor-rule-single-backlog` — `.cursor/rules/agent-workgraph-single-backlog.mdc` (alwaysApply)
- [x] `add-cursor-ide-workgraph-parity-step` — `rules/agent-behavior/cursor-ide-workgraph-parity.bvc`
- [x] `fix-seed-default-status-backlog` — seed scripts default `backlog`, не `doing`
- [x] `lint-plan-work-id-mirror` — `scripts/lint-plan-work-alignment.mjs`
- [x] `document-agent-intake-vs-execute-policy` — canon § intake-only vs execute
- [x] `write-an26-closing-agent-workgraph-enforcement` — closing AN-26 после закрытия эпика

## Критерий завершения

1. Cursor rule + parity step в bundle; seed defaults исправлены.
2. Lint plan↔work без drift на `docs/plan-*.md`.
3. Canon описывает «что дальше?» → только AN, без автoseed.
4. Эпик `epic-agent-workgraph-enforcement` → done + AN-26.
