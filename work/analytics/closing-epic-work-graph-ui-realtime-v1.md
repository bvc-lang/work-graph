# Closing: epic-work-graph-ui-realtime-v1 (AN-56)

**Status:** closed (P0–P1 + P2 poll unify; SSE deferred)  
**Date:** 2026-06-02

## Delivered

- **Revision API:** `/api/backlog-revision` + client `pollBacklogRevision`.
- **Live sync hub:** `src/ui/liveSyncCoordinator.mjs` — scopes `backlog-revision`, `home`, `agent-dock`, `agent-scope`; hidden-tab backoff.
- **Kanban incremental patch:** `kanbanBoardDelta.mjs`, `ui/kanbanBoardPatcher.mjs`, `patchKanbanBoardIncremental`.
- **Board/workflow poll:** `syncLivePollInterval` when active view is board/workflow (~3s).
- **New item appearance:** highlight CSS + delta `item.added` handling.
- **Drawer reconcile:** `reconcileDetailDrawerOnRemotePatch` on revision change.
- **Poll unify:** replaced scattered `setInterval` for home/agent dock/scope.
- **SSE push (P2):** `GET /api/ui-events/stream`, `backlogFileWatch.mjs`, `connectLiveSyncRevisionSse` — poll remains fallback.

## Evidence

- `tests/uiLiveSyncCoordinator.test.mjs`
- `tests/backlogUiEventsHub.test.mjs`, `tests/liveSyncSseAdapter.test.mjs`
- `tests/workGraphBacklogUiServer.test.mjs` revision + SSE hooks
- `npm run test:deterministic` — green

## Deferred (explicit)

- _(none — SSE P2 delivered)_

## Out of scope v1

- WebSocket bidirectional, multi-user presence, live analytics jsonl stream
