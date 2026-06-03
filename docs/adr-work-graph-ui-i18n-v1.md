# ADR: Work Graph UI i18n v1

**Status:** accepted  
**Date:** 2026-06-02  
**Related:** AN-55, `epic-work-graph-ui-i18n-v1`, `epic-work-graph-ui-settings-v1`

## Context

Operator UI chrome was hardcoded Russian. BVC file dialect (AN-19) is a separate layer. Open/npm operators need EN path without auto-translating work item prose.

## Decision

1. **UI locale** stored in cookie `wg_locale` (`en` | `ru`); overrides `Accept-Language`; default **`ru`** for legacy corpus operators.
2. **Message catalog:** JSON per locale at `locales/{locale}/ui.json`; stable dot keys (`nav.tasks`, `kanban.col.ready`).
3. **SSR embed:** `window.__WG_I18N__` + `window.__WG_LOCALE__` in backlog HTML; client `t(key, params)` for dynamic strings.
4. **Settings surface:** sidebar footer «Настройки» + language select; header icon for theme (not locale).
5. **BVC boundary:** do not put UI strings in `packages/bvc-dialects/`; atom inspector section titles use `bvcDialectRegistry` (AN-20 B11).
6. **Migration:** strangler — nav/settings → kanban/workflow → drawer/verification; no big-bang.
7. **v1 stack:** no i18next; optional `@formatjs/intl-messageformat` later for plurals.

## Consequences

- Language change requires page reload (acceptable v1).
- Test gate: `tests/uiCatalog.test.mjs` key parity en/ru.
- Pseudolocalization (`locale=ps`) deferred to P2 subtask.

## Out of scope

- Auto-translate basis/vector/goal
- RTL layout
- ES/DE locales
