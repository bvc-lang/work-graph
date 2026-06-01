# UX Mission Control — Phase P0

**Аналитика-источник:** [AN-20: UX Work Graph — текущее состояние, боли, вектор и mission-control](../work/analytics/ux-current-state-and-vector.md)
**Эпик:** `ux-mission-control-p0`
**Статус:** done (2026-05-31)

## Цель

Сдвинуть Work Graph UI из «9 равноправных вкладок VS Code-style editor» в **operator mission-control над agent workflow**. P0 закрывает четыре боли: B1 (нет домашнего экрана), B2 (Agent Run panel невидим), B3 (нет cmd+k), B4 (нет inbox).

Метрика успеха: **кликов до запуска worker = 1** (cmd+k → run), **кликов до «My ready next task» = 0** (Home — стартовый экран).

## Почему именно сейчас

- AN-20 P0 — самый острый блок UX (выявлен в полном аудите, есть конкретные паттерны от Linear / Cursor / HERMES).
- База уже есть: `operatorShellProjection.mjs` (`buildOperatorShellSnapshotV2`), `/api/operator-shell-snapshot`, `/api/agent-run*`, `protocols/operator-agent-run-panel-v1.bvc`, `ui/operator-dashboard-v2.bvc`.
- BVC tooling трек закрыт (`@bvc-lang/cli@0.1.3` published) — есть свободный bandwidth для UX.
- Новые `.work.bvc` создаются автоматически (фаза 2 канонизирована).

## Что делать

### 1. Home (mission control) — стартовый view

`HERMES-pattern`: top-row KPI tiles + Inbox + My queue + Active runs.

Доменные блоки:
- **KPI tiles**: cycle progress, ready count, blocked count, verify pass rate, throughput/day, daemon uptime, agent runs today.
- **Inbox**: AN published, WorkItem moved to verify, code-gap detected, daemon recovered, evidence added.
- **My queue**: top 5 ready items по owner_role.
- **Active runs**: claimed/doing/verify с прогрессом, link → right dock.

API: новый `/api/home-snapshot` агрегирует данные из existing snapshots; clients опрашивают раз в 30s (KPI) / 5s (runs).

### 2. Right dock — Agent Run panel

Persistent right-side dock (Cursor-style), всегда виден после первого включения:
- Заголовок: текущий run (workId, provider, status, step k/n).
- Body: live log + tool calls + (опционально) diff evidence.
- Footer: retry / cancel / open task / scroll-to-bottom toggle.
- Width: resizable, 320–640px; collapse в иконку.

Использует существующий `/api/agent-run/journal` (poll 5s) + `/api/agent-run` POST.

### 3. Cmd+K палитра

Глобальный keybinding `Ctrl+K` / `Cmd+K`. Скоупы: `task:`, `an:`, `mem:`, `evidence:`, `run:`, `cmd:`. Fuzzy match по локальному индексу + опциональный semantic-search через `/api/semantic-search`. Top-N результатов, action на Enter.

### 4. Inbox events stream

Backend producer: подписка на journal sources (daemon audit tail, agent runs, analytics writes). Read model: ordered list событий с тегом (severity, kind, link). Badge unread count на сайдбаре.

### 5. Closing analysis (AN-24)

После закрытия эпика — closing analysis post-mortem по правилу `epic_closed_without_closing_analysis` (lint warning превратится в ok).

## Todo

- [x] `design-home-mission-control-view` — `ui/home-mission-control-v1.bvc`
- [x] `implement-home-snapshot-api` — `src/homeSnapshotProjection.mjs` + GET `/api/home-snapshot`
- [x] `implement-home-page-mount` — Home default landing + sidebar 🏠
- [x] `implement-inbox-event-stream` — `src/inboxEventStream.mjs` + GET `/api/inbox-events`
- [x] `implement-sidebar-inbox-badge` — unread badge на Home tab
- [x] `implement-cmd-k-palette` — Ctrl/Cmd+K palette
- [x] `implement-right-dock-agent-run-panel` — `#agent-run-dock`
- [x] `update-protocols-operator-agent-run-panel-v2` — `protocols/operator-agent-run-panel-v2.bvc`
- [x] `add-home-mission-control-tests` — unit tests home + inbox
- [x] `write-an24-closing-ux-mission-control-p0` — AN-24 closing

## Критерий завершения

1. `/` открывает Home по умолчанию (KPI + Inbox + My queue + Active runs).
2. `Cmd+K` открывает палитру и за 1 Enter переходит к task или запускает run.
3. Right dock виден всегда (после toggle) и показывает live log активного run.
4. Inbox badge показывает unread count, источники = daemon journal + agent runs + analytics writes.
5. `npm run lint:backlog` без новых errors.
6. AN-24 closing analysis опубликован, эпик закрыт через `close-ux-mission-control-p0-epic.mjs`.

## Out of scope (P1/P2)

- Split view (заменить detail-drawer overlay) — P1.
- Saved views / bulk actions / persona presets — P1.
- Insights view (burndown, throughput chart) — P2.
- Graph node action menu (run, evidence, focus) — P2.
- BVC dialect-aware atom inspector — P2.
