# @work-graph/cli

Install [Work Graph](https://github.com/bvc-lang/work-graph) in any project via npm — no engine clone, no manual `engineRoot`.

## Quick start

```bash
npx @work-graph/cli init .
npm install
npm run workgraph:ui
```

→ http://127.0.0.1:4177/

## Commands

| Command | Description |
|---------|-------------|
| `init [path]` | Scaffold `intent/`, add devDependencies, MCP config, Cursor rule |
| `ui [path]` | Start backlog UI for the project |
| `doctor [path]` | Verify installation |
| `register [path]` | Optional: multiproject registry (power users) |

## Flags (`init`)

| Flag | Purpose |
|------|---------|
| `--label`, `--id` | Display name and project id |
| `--no-mcp` | Do not update `.cursor/mcp.json` |
| `--no-package` | Do not update `package.json` |
| `--legacy-engine-config` | Dev only: write deprecated `engineRoot` to config |

## Contributors (monorepo dev)

```bash
git clone …/work-graph && cd work-graph && npm install
WORKGRAPH_ENGINE_ROOT=. npx work-graph ui /path/to/project
```

See [CONTRIBUTING.md](https://github.com/bvc-lang/work-graph/blob/main/CONTRIBUTING.md) in the Work Graph repository.
