# Closing: epic-gripe-ds-visual-default-wave3

Эпик: `epic-gripe-ds-visual-default-wave3`  
Источник: [AN-33](gripe-ds-visual-default-wave3.md)  
Закрыт: 2026-05-31

## Outcomes

### Track A — Gripe default theme

- `packages/design-tokens/tokens/themes/gripe-dark-default.json` — amber brand (`245 158 11`) + WG dark shell
- `packages/design-tokens/generated/gripe-dark-default.css` — build via `npm run build:design-tokens`
- Backlog + ui-kit: default `<link href="/assets/design-tokens-gripe-dark-default.css">`
- `html[data-iohasc-theme="gripe-dark-default"]`; light/dark toggle меняет только luminance, brand Gripe фиксирован
- Legacy route `/assets/design-tokens-workgraph-dark.css` сохранён для совместимости

### Track B — Wave 3 atoms

- `src/ui/workItemStatusTone.mjs` — `statusLabel`, `statusToBadgeTone`
- `src/ui/atoms/badgeClient.mjs` — `renderClientUiBadge` (browser inline)
- Kanban/board column counts → `renderClientUiBadge` (tone muted)
- Task cards footer → status badge через `renderStatusBadge` → `renderClientUiBadge`
- Promote / detail toolbar / рабочий процесс epic toggle → `renderClientUiButton`
- `UI_BADGE_CSS` инжектирован в backlog shell

## Метрики

| Метрика | Цель | Итог |
|---------|------|------|
| Default theme accent | `245 158 11` | CSS + tests ✓ |
| Kanban badges | atoms | column count + card status ✓ |
| Detail toolbar | wg-btn | ✓ |
| Tests | theme + server | **25** pass (design-tokens, uiAtoms, workItemStatusTone, backlog server) |

## Уроки

1. Phase 2 (AN-32) дал контракт atoms; AN-33 — первый **видимый** Gripe skin через token swap + badge/button wave.
2. Client-side HTML generators требуют `*Client.mjs` + strip-for-browser, не только server `renderUi*`.
3. View toolbar filters оставлены native `<select>`/`<input>` — wave 3 сфокусирован на badges и action buttons.

## feeds_epics

- epic-gripe-ds-visual-default-wave3
