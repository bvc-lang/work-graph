# Publish @work-graph/cli and @work-graph/mcp

## Prerequisite: npm org `@work-graph`

Scoped packages require an npm **organization** (or user) named `work-graph`.

```text
https://www.npmjs.com/org/create
  Name: work-graph
  Plan: Unlimited public packages (free)
```

Account: `diflux` (same as `@bvc-lang`).

## Before Publishing

`@work-graph/cli` vendors runtime files from the monorepo during `prepack`.

Before a code/runtime release, check that these sources are clean or intentionally changed:

```bash
git status --short -- src public architecture locales packages/workgraph-mcp packages/bvc-dialects packages/design-tokens/generated packages/work-graph-cli
```

If runtime files are dirty and the release is docs/metadata-only, do **not** run the vendor sync; publish from the current package contents with `--ignore-scripts` after checking `npm pack --dry-run --ignore-scripts`.

## One-command runtime publish

```bash
npm run publish:work-graph-npm
```

This runs `sync:work-graph-cli-vendor`, then publishes CLI then MCP.

## Manual runtime publish

```bash
npm run sync:work-graph-cli-vendor
cd packages/work-graph-cli && npm publish --access public
cd ../workgraph-mcp && npm publish --access public
npm view @work-graph/cli version
npm view @work-graph/mcp version
```

## Docs/metadata-only CLI patch

Use this only when package metadata or README changes and vendored runtime should remain unchanged:

```bash
cd packages/work-graph-cli
npm pack --dry-run --ignore-scripts
npm publish --access public --ignore-scripts
npm view @work-graph/cli version
```

Then mirror to GitHub:

```bash
npm run export:work-graph-cli-github
# copy package.json, README.md, README.github-root.md into github.com/bvc-lang/work-graph-cli
# do not replace vendor/ for a docs-only patch
git tag -a vX.Y.Z -m "@work-graph/cli vX.Y.Z"
git push origin main vX.Y.Z
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
| Unexpected files in npm tarball | Use `npm pack --dry-run` and inspect the file list before publishing |
