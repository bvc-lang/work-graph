# Plan: epic-app-update-mechanism-v1

## Цель

Полноценный механизм обновлений Work Graph: корректная версия из `@work-graph/cli`, проверка npm registry с кэшем, фоновая проверка и toast-уведомление слева снизу.

## Связи

- [Analysis 2026-06](../analysis/2026-06-app-update-mechanism.md)
- Эпик `epic-work-graph-ui-settings-v1` — базовая секция «О приложении» (done)
- [ADR npm-first](../adr-work-graph-npm-first-distribution.md) — без auto-install из UI

## Треки

| # | work.id | P | Суть |
|---|---------|---|------|
| A | `fix-app-version-read-from-cli-package` | P0 | Версия из `@work-graph/cli`, не project package.json |
| B | `implement-app-version-npm-cache` | P1 | In-memory cache npm 1h |
| C | `wire-app-version-background-check` | P1 | liveSync scope + check on load |
| D | `implement-wg-notice-stack-bottom-left` | P1 | Toast UI слева снизу |
| E | `wire-update-notice-from-app-version` | P1 | Notice ↔ `/api/app-version?checkUpdate=1` |
| F | `test-app-version-npm-first-integration` | P1 | Unit/integration tests |
| G | `write-closing-epic-app-update-mechanism-v1` | — | closing |

## Seed

```bash
npm run seed:epic-app-update-mechanism-v1
```

**Status:** done (2026-06-04) — см. `work/analytics/closing-epic-app-update-mechanism-v1.md`
