# Work Graph

Work Graph is a local, Git-friendly work system for AI-assisted software development.

It gives a project its own durable backlog, BVC work-item files, Cursor MCP tools, and a local operator UI. The goal is to make agent work reviewable: every task can carry context, checks, evidence, and status in files that live next to the code.

## Send This To A Teammate

If someone wants to try Work Graph in an existing repository, send them this:

```bash
cd /path/to/your-project
npx @work-graph/cli init .
npm install
npm run workgraph:ui
```

Then open:

```text
http://127.0.0.1:4177/
```

For Cursor users, the same setup can be phrased as:

> Install Work Graph in this project and open the local UI.

The CLI writes the project config, npm scripts, Cursor MCP configuration, and a project rule. Existing `intent/index.bvc` and `architecture/main.bvc` files are preserved.

Detailed install guide: [docs/getting-started.md](docs/getting-started.md).

## Why Work Graph

AI coding agents are powerful, but their work often disappears into chat history. Work Graph keeps the work itself in the repository:

- **Local-first:** files in your repo, local UI on `127.0.0.1`.
- **Git-friendly:** work items are BVC text files that can be reviewed and diffed.
- **Agent-ready:** Cursor MCP tools let agents list, claim, update, and complete work items.
- **Evidence-oriented:** checks, command results, and implementation evidence stay attached to the task.
- **No hosted dependency:** npm packages install the runtime; no SaaS account is required.

Work Graph is not a Jira clone and not a chat UI. It is an operational layer for keeping human and agent work aligned with the codebase.

## What Gets Installed

`npx @work-graph/cli init .` updates the target repository:

| Path | Purpose |
|---|---|
| `.work-graph/config.json` | Project id, label, and UI settings |
| `intent/` | BVC intent tree and work items |
| `intent/index.bvc` | Index of work item files |
| `.cursor/mcp.json` | Cursor MCP server entry for Work Graph |
| `.cursor/rules/work-graph-project.mdc` | Agent guidance for using Work Graph in this repo |
| `package.json` | `workgraph:*` scripts and `@work-graph/*` devDependencies |

Useful scripts after install:

```bash
npm run workgraph:ui      # start the local backlog UI
npm run workgraph:doctor  # verify the installation
npm run workgraph:mcp     # run the MCP server directly for debugging
```

## Packages

| Package | Purpose |
|---|---|
| [`@work-graph/cli`](https://www.npmjs.com/package/@work-graph/cli) | Project setup, doctor, and local UI launcher |
| [`@work-graph/mcp`](https://www.npmjs.com/package/@work-graph/mcp) | MCP server for agent access to Work Graph |
| [`@bvc-lang/spec`](https://www.npmjs.com/package/@bvc-lang/spec) | BVC format, schemas, and dialect metadata |
| [`@bvc-lang/cli`](https://www.npmjs.com/package/@bvc-lang/cli) | BVC formatting and linting tools |

## BVC Work Items

Work Graph uses [BVC](https://github.com/bvc-lang/spec) files for durable work contracts. A work item is more than a card title: it can hold Basis, Vector, Goal, labels, checks, evidence, and decision notes.

That makes it suitable for agent workflows where a reviewer needs to know:

- what context the agent was given;
- what files or contracts the work touched;
- which checks were expected;
- what evidence was produced before the item was marked done.

## Cursor And MCP

After `init`, Cursor can use the generated `.cursor/mcp.json` entry:

```json
{
  "mcpServers": {
    "workgraph": {
      "command": "npx",
      "args": ["-y", "@work-graph/mcp"],
      "env": {
        "WORKGRAPH_ROOT": "${workspaceFolder}",
        "WG_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

Reload MCP servers in Cursor after installation. Agents can then read the backlog, inspect work contracts, append evidence, and complete work items through the Work Graph MCP tools.

## Contributing To Work Graph

Clone this repository only if you want to develop Work Graph itself:

```bash
git clone https://github.com/bvc-lang/work-graph.git
cd work-graph
npm install
npm run backlog:ui
npm run ci:mandatory
```

When developing the engine against another project:

```bash
WORKGRAPH_ENGINE_ROOT=. npx work-graph ui /path/to/project
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [PUBLIC_API.md](PUBLIC_API.md), and [SECURITY.md](SECURITY.md).

## Links

- CLI mirror: https://github.com/bvc-lang/work-graph-cli
- MCP mirror: https://github.com/bvc-lang/work-graph-mcp
- BVC spec: https://github.com/bvc-lang/spec
- npm packages: https://www.npmjs.com/org/work-graph and https://www.npmjs.com/~diflux
