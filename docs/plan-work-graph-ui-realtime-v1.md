# Plan: epic-work-graph-ui-realtime-v1 (AN-56)

## Цель

Live-обновление UI Work Graph при изменении backlog **без F5**: kanban card moves, новые work item, reconcile drawer.

## Источник

[AN-56](../work/analytics/work-graph-ui-realtime-updates-best-practices.md)

## ADR (planned)

`docs/adr-work-graph-ui-realtime-v1.md`

## Треки

| # | work.id | P | Суть |
|---|---------|---|------|
| A | `decide-work-graph-ui-realtime-adr` | P0 | revision + poll policy; SSE optional P2 |
| B | `implement-backlog-snapshot-revision-api` | P0 | `/api/backlog-revision`, 304 |
| C | `implement-ui-live-sync-coordinator` | P0 | view-scoped client poll hub |
| D | `implement-kanban-incremental-patch` | P1 | delta → DOM move, not innerHTML |
| E | `wire-board-workflow-live-refresh` | P1 | poll when board/workflow active |
| F | `wire-new-work-item-live-appearance` | P1 | item.added + highlight |
| G | `reconcile-detail-drawer-on-remote-patch` | P1 | stale drawer fix |
| H | `implement-backlog-sse-push-optional` | P2 | chokidar + SSE |
| I | `unify-home-inbox-agent-live-poll` | P2 | replace scattered setIntervals |
| J | `write-closing-epic-work-graph-ui-realtime-v1` | — | closing |

## MVP (P0–P1)

- Revision changes when MCP/agent updates `.work.bvc`
- Board view: card moves column within ~3s without full page reload
- New seeded item appears in backlog column with visual cue
- Open drawer shows updated status after external change
- Deterministic tests for revision + kanban delta

## Out of scope v1

- WebSocket bidirectional
- Live analytics jsonl / architecture graph
- Multi-user presence cursors
- Auto-sync Cursor TodoWrite

## Non-goals

- Replace git/files as source of truth
- Sub-second HFT latency (3s poll target is OK)

## Seed

```bash
npm run seed:epic-work-graph-ui-realtime-v1
```

Epic id: `epic-work-graph-ui-realtime-v1`

**Status:** done (2026-06-02) — SSE P2 included; см. `work/analytics/closing-epic-work-graph-ui-realtime-v1.md`
