# Getting Started With Work Graph

This guide is for installing Work Graph into an existing project.

## Requirements

- Node.js 20 or newer
- npm
- A Git repository where you want Work Graph work items to live
- An MCP-capable agent client (Cursor, Claude Code, or another IDE that supports MCP), if you want agent access through tools

## Install

Run this in the target project:

```bash
npx @work-graph/cli init .
npm install
npm run workgraph:ui
```

Open:

```text
http://localhost:4177/
```

## Verify

```bash
npm run workgraph:doctor
```

The doctor command checks that project config, npm dependencies, and runtime resolution are healthy.

## What Changed In The Project

Work Graph creates or updates:

- `.work-graph/config.json`
- `intent/`
- `intent/index.bvc`
- `.cursor/mcp.json` (optional; Cursor and other clients that read this path)
- `.cursor/rules/work-graph-project.mdc` (optional; agent guidance when using Cursor)
- `package.json` scripts and devDependencies

Existing `intent/index.bvc` and `architecture/main.bvc` files are preserved.

## Agent MCP

After install, reload MCP servers in your IDE. If you use Cursor, the generated `.cursor/mcp.json` runs:

```bash
npx -y @work-graph/mcp
```

Agents can then list work items, read work contracts, add evidence, and complete tasks through Work Graph tools.

## Update

```bash
npm update @work-graph/cli @work-graph/mcp
```

Then run:

```bash
npm run workgraph:doctor
```

## Remove

Work Graph is local to the project. To remove it, delete:

- `.work-graph/`
- Work Graph entries in `.cursor/mcp.json` (if you added them)
- `.cursor/rules/work-graph-project.mdc` (if created)
- Work Graph scripts and devDependencies from `package.json`

Keep or delete `intent/` depending on whether you want to preserve the project work history.
