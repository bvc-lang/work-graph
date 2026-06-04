# ADR: embed Work Graph в ioHasC shell

**Status:** accepted  
**Date:** 2026-06-04  
**Context:** [iohasc-agent-stack-port-eval.md](../work/analytics/iohasc-agent-stack-port-eval.md)

## Decision

**Embed**, не port:

- ioHasC остаётся **одной оболочкой** (chat + orchestrator + Monaco).
- Work Graph UI (`backlog:ui`, :4177) — **split / iframe / sidebar mount**.
- MCP workgraph — канон для Cursor-пользователей без ioHasC.

## Contract (smoke checklist)

1. Theme sync: `data-iohasc-theme` ↔ WG CSS variables.
2. Deep link: `workId` / `analytics:…` открывает drawer в WG UI.
3. Single backlog source: intent tree WG repo, не дублировать в ioHasC JSON.
4. Orchestrator tools → MCP parity doc, не copy `tools.js`.

## Anti-goals

- Второй chat UI в WG repo.
- Port `orchestrator.js` в WG.

## Consequences

- Implementation lives primarily in `../project` (`workGraphDashboardMount.ts`).
- WG side: stable `/api/snapshot`, CORS/embed headers if needed.
