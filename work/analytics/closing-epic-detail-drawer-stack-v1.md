# Closing: epic-detail-drawer-stack-v1 (AN-54)

**Status:** closed  
**Date:** 2026-06-02

## Delivered

- **Stack core:** `src/detailDrawerStack.mjs` — push/pop/reset/peek + renderer registry; browser bundle in monolith.
- **Task hierarchy:** parent/child drill-down via `openTaskHierarchyStackDrawer`.
- **Analytics migration:** related task + lineage nav → `detailStack` frames (`analytics`, `task`); L2 via `renderTopDetailStackFrame`.
- **Architecture L2 migration:** `architecture-block` + `architecture-l2` frames; node drill-down on stack.
- **Uniform Esc/overlay:** `popDetailStackNavigation`, `closeDetailStackFully`, breadcrumb `detail-stack-breadcrumb` when depth > 1.

## Evidence

- `tests/detailDrawerStack.test.mjs`
- `tests/workGraphBacklogUiServer.test.mjs` — stack, breadcrumb, analytics stack, architecture L2 testids
- `npm run test:deterministic` — 748/748 green

## Out of scope (deferred)

- Remove `#detail-sub-drawer` DOM (interim L2 shell retained)
- Center modal presentation
