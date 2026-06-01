# Closing: epic-marketplace-shared-design-system

Эпик: `epic-marketplace-shared-design-system`  
Источник: [AN-21](marketplace-integration-and-shared-design-system.md)  
Закрыт: 2026-05-31

## Outcomes

- **`@iohasc/design-tokens`** — JSON themes (`marketplace-default`, `workgraph-dark`), builders `tokens-to-css`, `applyTheme`; generated CSS; tests green.
- **Marketplace** — `brand-tokens.css` synced via `npm run sync:design-tokens:marketplace`; rule `marketplace-uses-shared-tokens.mdc`.
- **Work Graph UI** — dual-layer semantic tokens in dark theme; `src/ui/atoms/*` (5 atoms); **`GET /dev/ui-kit`**; `docs/ui/components.md` generator.
- **`@iohasc/atomic-spec`** — 5 BVC atoms (button, badge, text-input, icon, modal).
- **Cursor rule** — `.cursor/rules/iohasc-ui-components.mdc` (alwaysApply).
- **AN-MP-1 / AN-MP-2** — hub-spoke + atomic dual-location analytics published.
- **PM layer** — `intent/domains/marketplace/` + migrated plan work items; epic subtasks on roadmap.
- **P2 MVP** — `OneBaseCatalogTreeImporter` stub + PHPUnit test; `src/pvrg/bladeAdapter.mjs`; `IohascThemeResolver` via `applyTheme`.

## Метрики (AN-21 §8)

| Метрика | Было | Стало |
|---------|------|-------|
| Единый источник правды палитры | 2 ручных CSS | **1 JSON** + generated CSS |
| WG UI kit | 0 | **`/dev/ui-kit`** + catalog |
| BVC atom specs | 0 | **5** |
| Marketplace AN records | 0 | **AN-MP-1, AN-MP-2** |
| WG Marketplace work items | 0 | **epic + 14 subtasks + 2 plans** |

## Уроки

1. Marketplace DS — reference; контракт (tokens + BVC), не общий Blade↔Web код.
2. Sync script с `MARKETPLACE_ROOT` решает path-with-spaces на Windows.
3. Semantic `--ui-*` мост сохраняет legacy `--bg`/`--accent` vars в backlog UI.

## feeds_epics

- epic-marketplace-shared-design-system
