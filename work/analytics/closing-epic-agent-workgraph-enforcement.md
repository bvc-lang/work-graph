# Closing: epic-agent-workgraph-enforcement

Эпик: `epic-agent-workgraph-enforcement`  
Источник: [AN-25](agent-bypass-work-graph-dual-backlog.md)  
Закрыт: 2026-05-31

## Что сработало

- Cursor rule `.cursor/rules/agent-workgraph-single-backlog.mdc` (`alwaysApply`) — жёсткий запрет dual backlog через TodoWrite для учётная работа.
- `rules/agent-behavior/cursor-ide-workgraph-parity.bvc` в bundle (`cursor-ide-workgraph-parity`) — parity IDE ↔ MCP для claim/evidence.
- Seed scripts `seed-ux-центр-управления-p0`, `seed-bvc-tooling-external`, `seed-bvc-phase2-new-write`: default `backlog`, не `doing`.
- `npm run lint:plan-work-alignment` — warning на plan todo без `` `work.id` `` и на `doing` до `ready`.
- Canon § **Agent intake vs execute** в `docs/decision-pipeline-canon.md` + протокол `decision-pipeline-canon-v1.bvc`.

## Что не сработало / осталось

- Enforcement только declarative (rule + step + lint warnings); нет CI error на chat TodoWrite (невозможно lint-ить сессию Cursor).
- Существующие work items, созданные seed со `doing`, не мигрированы автоматически — только новые seed defaults.
- `docs/plan-*.md` без `work.id` в старых строках дают warnings до ручной правки планов.

## Уроки

1. IDE-path и MCP-path нужно закрывать парой: `.cursor/rules` + `agent-behavior` step, не только MCP prompts.
2. Seed `doing` — anti-pattern; default `backlog` + operator promote снижает fake progress на доске.
3. «Что дальше?» = intake-only (AN only) должно быть в canon, не только в analytics.

## feeds_epics

- epic-agent-workgraph-enforcement
