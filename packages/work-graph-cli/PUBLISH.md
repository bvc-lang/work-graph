# Publish @work-graph/cli and @work-graph/mcp

## Prerequisite: npm org `@work-graph`

Scoped packages require an npm **organization** (or user) named `work-graph`.

```text
https://www.npmjs.com/org/create
  Name: work-graph
  Plan: Unlimited public packages (free)
```

Account: `diflux` (same as `@bvc-lang`).

## One-command publish

```bash
npm run publish:work-graph-npm
```

This runs `sync:work-graph-cli-vendor`, then publishes CLI then MCP.

## Manual

```bash
npm run sync:work-graph-cli-vendor
cd packages/work-graph-cli && npm publish --access public
cd ../workgraph-mcp && npm publish --access public
npm view @work-graph/cli version
npm view @work-graph/mcp version
```

## Smoke test (clean dir)

```bash
mkdir /tmp/wg-smoke && cd /tmp/wg-smoke
npx @work-graph/cli init . --label smoke
npm install
npm run workgraph:doctor
```

## Errors

| Error | Fix |
|-------|-----|
| `Scope not found` | Create org `work-graph` on npm |
| `403 org` | Login: `npm login` as org owner |
| MCP publish before CLI | Publish CLI first (MCP depends on `@work-graph/cli`) |
