# ADR: Work Graph UI realtime v1

**Status:** accepted  
**Date:** 2026-06-02  
**Related:** AN-56, `epic-work-graph-ui-realtime-v1`

## Context

Operators stay on Board/Workflow while agents mutate `.work.bvc` via MCP. Full-page reload or `innerHTML` board repaint every 3s causes flicker and loses scroll. AN-56 recommends revision-based sync with incremental DOM patch.

## Decision

1. **Source of truth:** git/files remain canonical; UI reads snapshots only.
2. **Change detection:** `GET /api/backlog-revision` returns stable hash (`workgraph.backlog-revision.v1`) over work item id+status+labels corpus.
3. **Transport v1:** view-scoped **poll** every **3s** when `board` or `workflow` is active; no WebSocket.
4. **On revision change:** reload operator snapshots; try **kanban incremental patch** on board view; fallback to full `render()` when patch fails or projection missing.
5. **Kanban delta:** `computeKanbanBoardDelta(prev, next)` → moves/adds/removes; `applyKanbanBoardPatch` moves `[data-work-id]` cards between `[data-kanban-column]` columns.
6. **New items:** `adds` entries get `.is-new` highlight animation (~1.2s).
7. **Open drawer:** if remote patch touches open `workId`, refresh view-mode body and optional banner — do not close drawer or overwrite edit form.
8. **SSE (P2):** optional `GET /api/ui-events/stream`; same coordinator, second transport adapter; poll remains fallback.
9. **Inter-tab / home / inbox polls (P2):** unify under one coordinator; do not duplicate intervals.

## Consequences

- Target latency ~3s (poll interval), not sub-second.
- Patch drift mitigated by full-render fallback.
- Deterministic tests: `backlogRevision.test.mjs`, `kanbanBoardDelta.test.mjs`.

## Out of scope

- WebSocket bidirectional sync
- Live analytics jsonl / architecture graph canvas
- Auto-sync Cursor TodoWrite
- Multi-user presence
