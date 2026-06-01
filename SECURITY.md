# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| main branch | yes |

## Reporting a vulnerability

Email maintainers privately (do not open a public issue for exploitable findings).

Include: description, reproduction steps, impact, suggested fix if any.

We aim to acknowledge within 5 business days.

## Scope

- Work Graph backlog UI server (`src/workGraphBacklogUiServer.mjs`)
- MCP server (`packages/workgraph-mcp/`)
- CLI (`packages/work-graph-cli/`)

Out of scope: third-party MCP servers configured in user `.cursor/mcp.json`.

## Safe defaults

- Backlog UI binds `127.0.0.1` by default
- No authentication on local dev server — do not expose to untrusted networks without a reverse proxy and auth
