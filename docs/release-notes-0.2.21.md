# Release notes — v0.2.21

## Summary

- **Wave 4 shell controls:** backlog shell renders inputs, selects, tabs, filter chips, toggles, and textareas via shared Gripe DS atoms (`wg-input`, `wg-filter-chip`, `wg-toggle`, `wg-textarea`).
- Settings theme/locale, Git Snapshot toggles, Cmd+K search, intent composer, and atom inspector use unified control classes.
- Less inline HTML/CSS in `workGraphBacklogUiServer.mjs`.
- Homepage: [workgraph.ru/en](https://workgraph.ru/en/).

## Install

```bash
npx @work-graph/cli@0.2.21 init .
npm install
npm run workgraph:ui
```

## npm

`@work-graph/cli@0.2.21`, `@work-graph/mcp@0.2.17`.
