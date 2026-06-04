# Release notes — v0.2.8 (copy for GitHub)

## Summary

- **Docs:** Public README, getting-started, MCP package README, and MCP tool prompts are **agent/IDE-neutral** (any MCP client — Cursor, Claude Code, etc.; `.cursor/*` files are optional convenience from `init`).
- **Includes:** v0.2.7 fix — backlog UI only on **http://127.0.0.1:4177/** (marketing site no longer served on the app port).

## Install / upgrade

```bash
npx @work-graph/cli@0.2.8 init .
npm install
npm update @work-graph/cli @work-graph/mcp
npm run workgraph:doctor
```

npm: `@work-graph/cli@0.2.8`, `@work-graph/mcp@0.2.5`.

## Test plan

- [ ] `npm run workgraph:ui` → http://127.0.0.1:4177/ (operator UI)
- [ ] MCP `list_work_items` after IDE reload
- [ ] New install docs do not say «For Cursor users only»
