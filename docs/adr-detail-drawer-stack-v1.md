# ADR: Detail drawer stack v1

**Status:** accepted  
**Date:** 2026-06-02  
**Related:** AN-54, `epic-detail-drawer-stack-v1`

## Context

Work Graph uses L1 `#detail-drawer` plus interim L2 `#detail-sub-drawer`. Each drill-down scenario (analytics related task, architecture L2) was wired ad hoc. Clicking «Родитель» in a task drawer **replaced** L1 content, losing the current task context.

## Decision

1. **Stack model:** ordered frames `{ schema: detail-stack.frame.v1, type, key, title, payload }`; `push` / `pop` / `reset` / `peek` / `peekBelow`.
2. **Shell:** L1 remains primary shell; L2 sub-drawer shows stack depth ≥ 2 until L2 is fully migrated away (P1).
3. **Navigation rules:**
   - List/kanban click (outside drawer): `reset()` + `push(task)` + open L1.
   - Hierarchy drill-down inside drawer: `push(task)` + open L2 with back label `← {previous.title}`.
   - Back / sub-drawer back: `pop()` + close L2.
   - Overlay close / Esc on L1: `reset()` + close all.
4. **Frame types v1:** `task` (P0); `analytics`, `architecture-block`, `architecture-l2` migrate in P1.
5. **Renderer registry:** `type → async render(frame, ctx)`; unknown type throws clear error.
6. **Resolve at render:** payload holds ids only; titles/status loaded from snapshot at render time.

## Consequences

- Parent epic / child navigation preserves underlying task in stack.
- Analytics-related-task and architecture L2 remain on interim L2 until P1 migration subtasks.
- Unit tests: `tests/detailDrawerStack.test.mjs`; smoke in `workGraphBacklogUiServer.test.mjs`.

## Out of scope v1

- Center modal presentation
- Breadcrumb UI for depth > 2 (back button sufficient for P0)
- Removing `#detail-sub-drawer` DOM (P1)
