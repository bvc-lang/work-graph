# Getting Started With Work Graph

This guide is for installing Work Graph into an existing project.

## Requirements

- Node.js 20 or newer
- npm
- A Git repository where you want Work Graph work items to live
- Cursor, if you want agent access through MCP

## Install

Run this in the target project:

```bash
npx @work-graph/cli init .
npm install
npm run workgraph:ui
```

Open:

```text
http://127.0.0.1:4177/
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
- `.cursor/mcp.json`
- `.cursor/rules/work-graph-project.mdc`
- `package.json` scripts and devDependencies

Existing `intent/index.bvc` and `architecture/main.bvc` files are preserved.

## Cursor MCP

After install, reload MCP servers in Cursor. The generated MCP config runs:

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
- the Work Graph entries in `.cursor/mcp.json`
- `.cursor/rules/work-graph-project.mdc`
- Work Graph scripts and devDependencies from `package.json`

Keep or delete `intent/` depending on whether you want to preserve the project work history.
