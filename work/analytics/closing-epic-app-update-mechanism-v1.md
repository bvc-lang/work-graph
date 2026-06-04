# Closing: epic-app-update-mechanism-v1 (AN-66)

**Status:** closed  
**Date:** 2026-06-04

## Delivered

- **CLI version source:** `readLocalAppVersion` reads `@work-graph/cli` from `node_modules`, monorepo `packages/work-graph-cli`, or fallback (`fix-app-version-read-from-cli-package`).
- **npm cache:** in-memory 1h TTL on registry `/latest` (`implement-app-version-npm-cache`).
- **Background check:** liveSync scope `app-version` (6h) + initial check 5s after load (`wire-app-version-background-check`).
- **Notice stack:** `#wg-notice-stack` fixed bottom-left with dismiss + open settings (`implement-wg-notice-stack-bottom-left`, `wire-update-notice-from-app-version`).
- **i18n:** `notice.updateAvailable.*` EN/RU/PS.

## Evidence

- `tests/appVersionApi.test.mjs` — semver, npm-first layout, cache
- `tests/workGraphBacklogUiServer.test.mjs` — notice stack + app-version scope smoke
- `tests/uiCatalog.test.mjs` — key parity

## Dependencies

- Built on `epic-work-graph-ui-settings-v1` (settings «О приложении» shell).

## Operator UX

1. UI loads → after 5s checks npm (cached server-side).
2. If newer `@work-graph/cli` on npm → toast bottom-left.
3. Settings still shows version + manual «Проверить обновления» + `npm update @work-graph/cli @work-graph/mcp`.
