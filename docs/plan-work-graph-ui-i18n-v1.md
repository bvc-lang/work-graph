# Plan: epic-work-graph-ui-i18n-v1 (AN-55) — draft

## Цель

Мультиязычный **UI chrome** (EN + RU v1) без смешения с BVC file dialect.

## Источник

[AN-55](../work/analytics/work-graph-ui-i18n-best-practices.md)

## ADR

[`docs/adr-work-graph-ui-i18n-v1.md`](../docs/adr-work-graph-ui-i18n-v1.md) — accepted

## Треки

| # | work.id | P | Суть |
|---|---------|---|------|
| A | `decide-work-graph-ui-i18n-adr` | P0 | locale policy, catalog format, BVC boundary |
| B | `implement-ui-locale-resolution` | P0 | cookie + Accept-Language |
| C | `implement-ui-message-catalog-v1` | P0 | ICU JSON + `t()` |
| D | `extract-backlog-shell-i18n` | P1 | nav, theme, locale switcher |
| E | `extract-kanban-workflow-i18n` | P1 | kanban columns, status labels |
| F | `wire-bvc-dialect-atom-inspector-b11` | P1 | AN-20 B11 via registry |
| G | `extract-detail-drawer-i18n` | P2 | drawer + verification + analytics chrome |
| H | `add-ui-i18n-pseudolocalization-ci` | P2 | ps locale + CI parity |
| I | `write-closing-epic-work-graph-ui-i18n-v1` | — | closing |

## MVP (P0–P1)

- Locale resolution (cookie + Accept-Language)
- ICU JSON catalogs `locales/{en,ru}/ui.json`
- `t()` helper wired into shell render path
- Nav + kanban columns translated; default policy per ADR
- Tests: key parity en/ru, locale negotiation

## Out of scope v1

- Auto-translate work item prose
- RTL layout
- ES/DE locales
- Full monolith string extraction (P2)

## Seed

```bash
npm run seed:epic-work-graph-ui-i18n-v1
```

Epic id: `epic-work-graph-ui-i18n-v1` — 9 subtasks + closing (10 work items total).

**Status:** done (2026-06-02) — см. `work/analytics/closing-epic-work-graph-ui-i18n-v1.md`
