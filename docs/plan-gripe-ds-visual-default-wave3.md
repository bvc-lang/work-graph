# Plan: Gripe visual default + UI wave 3

## Цель

Сделать **Gripe Marketplace** визуально default для Work Graph backlog UI (amber brand на тёмном shell) и завершить atomify **wave 3**: kanban, toolbar, badges.

## Почему

Phase 2 дала архитектуру DS без смены палитры; оператор ожидает узнаваемый Gripe-стиль на http://127.0.0.1:4177/.

## Что делать

### Track A — Gripe default theme

1. Theme JSON `gripe-dark-default` (marketplace brand + workgraph dark surfaces).
2. Build script + npm `build:design-tokens` включает новый CSS.
3. Backlog + ui-kit: default link на `gripe-dark-default.css`.
4. Legacy `--accent` bridge; theme toggle только light/dark luminance, brand фиксирован.

### Track B — Wave 3 atoms

1. `renderStatusBadge` → `renderUiBadge` (+ client `renderClientUiBadge` if needed).
2. Kanban column cards — badge + button patterns.
3. `#view-toolbar` — filter/clear on wg-btn.
4. Detail drawer toolbar — wg-btn.
5. UI_BADGE_CSS в backlog page head.

## Todo

- [ ] `seed-epic-gripe-ds-visual-default-wave3`
- [ ] `gripe-dark-default-theme-json-and-css`
- [ ] `backlog-default-gripe-theme-wireup`
- [ ] `wg-ui-wave3-status-badges-atoms`
- [ ] `wg-ui-wave3-kanban-cards-atoms`
- [ ] `wg-ui-wave3-view-toolbar-atoms`
- [ ] `wg-ui-wave3-detail-toolbar-atoms`
- [ ] `wg-ui-wave3-client-badge-button-helpers`
- [ ] `tests-gripe-visual-default-wave3`
- [ ] `write-an33-closing-gripe-ds-visual-default-wave3`

## Критерий завершения

- Default backlog accent = Gripe amber (245 158 11) без ручного переключения.
- Kanban + toolbar + status pills используют atoms; tests green.
- AN-33 closing + эпик done.
