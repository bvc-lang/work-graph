# Closing: epic-work-graph-ui-i18n-v1 (AN-55)

**Status:** closed  
**Date:** 2026-06-02

## Delivered

- **ADR:** `docs/adr-work-graph-ui-i18n-v1.md` — UI chrome vs BVC dialect boundary.
- **Locale resolution:** `src/ui/i18n/resolveUiLocale.mjs` — cookie `wg_locale`, Accept-Language, query override.
- **Catalog + t():** `locales/en/ui.json`, `locales/ru/ui.json`, `src/ui/i18n/uiCatalog.mjs`, client bootstrap in monolith.
- **Shell i18n:** nav, theme, settings labels via `src/ui/backlogShellButtons.mjs`.
- **Kanban/workflow:** column titles, status labels, pagination, empty states.
- **Detail drawer + verification:** drawer sections, verification matrix chrome via `t()`.
- **B11 atom inspector:** section titles from `bvcDialectRegistry`, lang badge, mixed-key warnings.
- **Pseudolocale:** `locales/ps/ui.json` + key parity tests for CI overflow guard.

## Evidence

- `tests/uiCatalog.test.mjs` — en/ru/ps key parity, locale negotiation
- `tests/workGraphBacklogUiServer.test.mjs` — EN verification header, `BVC_DIALECT_SECTION_TITLES`, pseudolocale smoke
- `npm run test:deterministic` — green

## Out of scope (deferred)

- Auto-translate work item prose
- RTL, ES/DE locales
- Full monolith string extraction (~300+ RU strings remain in non-chrome paths)
