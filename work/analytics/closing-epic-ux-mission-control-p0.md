# Closing: UX Mission Control P0

Эпик: `ux-центр-управления-p0`  
Источник: [AN-20](ux-current-state-and-vector.md)  
Закрыт: 2026-05-31

## Outcomes

- Home (`/`) — стартовый экран по умолчанию: KPI tiles, Inbox preview, My queue, Active runs (`home.snapshot.v1`).
- `GET /api/home-snapshot`, `GET /api/inbox-events`, `POST /api/inbox-events/read`.
- Cmd+K palette (task / an / cmd / run scopes).
- Persistent Agent Run right dock (`#agent-run-dock`) + `operator-agent-run-panel-v2.bvc`.
- Unit tests: `homeSnapshotProjection`, `inboxEventStream`.

## Уроки

- Центр управления лучше агрегировать existing snapshots, чем вводить новый runtime contract.
- Default view `home` снижает клики до ready queue (B1 AN-20).

## feeds_epics

- ux-центр-управления-p0
