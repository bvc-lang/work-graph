# Contributing

Thank you for contributing to Work Graph.

## Before you start

1. Read [ADR: open publication](docs/adr-work-graph-open-publication.md) — Apache-2.0 for code, CC BY 4.0 for format specs.
2. Check [publication inventory](docs/publication-inventory-an42.md) — do not add private eval fixtures to public packages.

## Development

```bash
npm install
npm run ci:mandatory
```

### Work Graph engine (dev-first)

When developing the WG monorepo itself, override the npm runtime:

```bash
WORKGRAPH_ENGINE_ROOT=. npm run backlog:ui
WORKGRAPH_ENGINE_ROOT=. npx work-graph ui /path/to/project
```

Per-project init with legacy `engineRoot` in config (deprecated):

```bash
npx work-graph init /path/to/project --legacy-engine-config --engine "$(pwd)"
```

User-facing docs must **not** mention manual `engineRoot` — use `npx @work-graph/cli init .` instead.

### npm publish (@work-graph/*)

```bash
npm run sync:work-graph-cli-vendor
npm run check:npm-pack-boundary
cd packages/work-graph-cli && npm pack --dry-run
cd packages/workgraph-mcp && npm pack --dry-run
```

## Pull requests

- One logical change per PR when possible
- Russian prose in work items (`.work.bvc`); code comments in English or Russian matching surrounding file
- Run tests locally before push

## Work items

New features should have a BVC work item in `intent/` when non-trivial. Use existing epic patterns.

## License

By contributing, you agree that your contributions are licensed under the Apache License 2.0.
