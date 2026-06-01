# AN-33: Gripe visual default + WG UI wave 3 (kanban, toolbar, badges)

**Запрос:** после phase 2 пользователь не видит смены дизайна — завести задачи: **Gripe как default** (без preview-переключателя) + **wave 3**: kanban cards, toolbar, badges на atoms.

**Контекст:** [AN-32-C](closing-epic-gripe-ds-adoption-phase2.md) дал **контракт** DS (atoms/molecules, renderers), но WG оставил **Cursor blue** (`workgraph-dark`) и **unstyled** nav — визуально как раньше. Gripe Marketplace = amber brand (`marketplace-default`, `245 158 11`).

## Кратко

| Track | Что делаем |
|-------|------------|
| **A — Gripe default** | Тема backlog UI по умолчанию = Gripe brand на тёмном shell (amber primary/CTA); один CSS asset, без «preview mode» |
| **B — Wave 3 atoms** | Kanban cards, view toolbar, status badges, detail toolbar → `renderUiBadge` / `renderUiButton` |

**Эпик:** `epic-gripe-ds-visual-default-wave3`  
**План:** [docs/plan-gripe-ds-visual-default-wave3.md](../docs/plan-gripe-ds-visual-default-wave3.md)

---

## 1. Почему сейчас «не видно Gripe»

1. Backlog грузит `design-tokens-workgraph-dark.css` — primary **`0 102 255`** (Cursor).
2. Wave 1–2 мигрировали разметку с **`unstyled: true`** — классы `.nav-tab` / `.toolbar` не изменились.
3. Kanban/toolbar/badges — **inline HTML + CSS**, не atoms.

---

## 2. Решение: Gripe default (не toggle)

### D1 — Гибридная тема `gripe-dark-default`

- JSON: `packages/design-tokens/tokens/themes/gripe-dark-default.json`
- **Brand** из `marketplace-default` (amber primary, Gripe identity)
- **Surfaces** из `workgraph-dark` (тёмный IDE shell `#1e1e1e`)
- Generated: `packages/design-tokens/generated/gripe-dark-default.css`
- Backlog + ui-kit: `<link href="/assets/design-tokens-gripe-dark-default.css">` **единственный** brand CSS по умолчанию

### D2 — Legacy bridge

- `:root` / `body[data-theme="dark"]` — `--accent` ← `--ui-accent-rgb` amber
- Убрать/переименовать переключатель «Тёмная тема» → light/dark **режим**, brand Gripe не переключается

### D3 — Не путать с OneBase

- OneBase — 1С runtime; визуал Gripe — из Marketplace tokens only

---

## 3. Wave 3 scope

| Область | Сейчас | Цель |
|---------|--------|------|
| **Kanban cards** | `renderTaskAtomCard`, `.task-atom.kanban-card` inline | Badge status + card shell через atoms/molecules |
| **View toolbar** | `#view-toolbar` raw inputs + board-tab | wg-btn flat/secondary для filters; badge counts |
| **Status badges** | `renderStatusBadge()` inline `<span class="pill">` | `renderUiBadge` + tone map (ready/doing/done/blocked) |
| **Detail toolbar** | `.detail-toolbar-btn` raw | `renderUiButton` variant secondary/flat |

Out of scope wave 3: полный rewrite 9000-line CSS, Filament, Marketplace Blade.

---

## 4. Критерии приёмки эпика

- Backlog UI default: amber accent visible on nav active, primary buttons, kanban accents (screenshot или ui-kit parity)
- `grep renderUiBadge` в server/client kanban path
- Tests: theme CSS 200, accent rgb contains `245 158 11` or theme id gripe-dark-default
- AN-33 closing опубликован

---

## 5. Связи

| AN | Связь |
|----|-------|
| AN-21 | Shared tokens source |
| AN-32 | Atoms/molecules foundation |
| AN-32-C | Closing — structural, not visual |
