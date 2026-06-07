# Release notes — v0.2.24

## Summary

- **Git snapshot on done (AN-84):** closing a task commits `work.target_files` code paths together with the `.bvc` persist — scoped `git add`, expanded allowlist (`src/`, `tests/`, `docs/`, …), denylist for secrets and build artifacts.
- **Git snapshot UX (AN-83):** enabled by default (auto-off outside a git repo); settings UI toggles removed; snapshots only on **`done`** and **analytics record** — not on status changes or claim.
- Homepage: [workgraph.ru/en](https://workgraph.ru/en/).

## Install

```bash
npx @work-graph/cli@0.2.24 init .
npm install
npm run workgraph:ui
```

## npm

`@work-graph/cli@0.2.24`, `@work-graph/mcp@0.2.20`.
