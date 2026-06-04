# Release notes — v0.2.7 (copy for GitHub)

Use this body when editing the [v0.2.7](https://github.com/bvc-lang/work-graph/releases) release. Do **not** promote the optional marketing static site here.

## Summary

- **Fix:** Local backlog UI (`npm run workgraph:ui`) serves only the operator app on **http://127.0.0.1:4177/**. v0.2.6 incorrectly served the marketing site on the same port.
- **Install:** `npx @work-graph/cli@0.2.7 init .` — works with any MCP-capable agent IDE, not only Cursor.
- **npm:** `@work-graph/cli@0.2.7` is current; `@work-graph/cli@0.2.6` is deprecated (npm unpublish policy).

## Upgrade

```bash
npm update @work-graph/cli @work-graph/mcp
npm run workgraph:doctor
```

## Test plan

- [ ] `npm run workgraph:ui` → http://127.0.0.1:4177/ shows kanban/backlog, not marketing HTML
- [ ] MCP `list_work_items` after reload in your IDE
- [ ] `npm run workgraph:doctor` passes
