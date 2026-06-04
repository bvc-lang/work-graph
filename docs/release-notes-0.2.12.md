# Release notes — v0.2.12

## Summary

- Fix **Settings → About → Check for updates**: npm registry check uses canonical scoped URL, timeout, and `npm view` fallback (works behind proxy when raw `fetch` fails).
- Homepage: [workgraph.ru/en](https://workgraph.ru/en/).

## Install

```bash
npx @work-graph/cli@0.2.12 init .
npm install
npm run workgraph:ui
```

## npm

`@work-graph/cli@0.2.12`, `@work-graph/mcp@0.2.9`.
