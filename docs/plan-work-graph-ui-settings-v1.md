# Plan: epic-work-graph-ui-settings-v1

## Цель

Пункт **Настройки** внизу sidebar, **иконка темы** справа в header, страница настроек (тема, язык, версия/обновление) + rollout мультиязычного UI (EN/RU).

## Связи

- [AN-55](../work/analytics/work-graph-ui-i18n-best-practices.md) — ICU catalogs, `wg_locale`
- Эпик `epic-work-graph-ui-i18n-v1` — инфраструктура перевода UI

## Треки

| # | work.id | P | Суть |
|---|---------|---|------|
| A | `wire-sidebar-settings-nav-bottom` | P0 | «Настройки» в footer sidebar |
| B | `wire-header-theme-toggle-icon` | P0 | иконка темы справа в page-header |
| C | `implement-settings-view-shell` | P0 | view `#settings-view` |
| D | `wire-settings-theme-and-locale-sections` | P1 | тема + выбор языка в настройках |
| E | `implement-app-version-check-update` | P1 | версия, проверка npm, обновление |
| F | `rollout-ui-multilingual-en-ru` | P1 | полный перевод chrome EN+RU (эпик i18n) |
| G | `write-closing-epic-work-graph-ui-settings-v1` | — | closing |

## Seed

```bash
npm run seed:epic-work-graph-ui-settings-v1
```

**Status:** done (2026-06-02) — см. `work/analytics/closing-epic-work-graph-ui-settings-v1.md`
