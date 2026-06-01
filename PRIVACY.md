# Privacy

Work Graph is a **local-first** developer tool.

## What we collect

**Nothing by default.** The backlog UI, MCP server, and CLI operate on files in your workspace. No telemetry is sent to Work Graph maintainers unless you explicitly configure external services (LLM providers, hosted MCP, etc.).

## Third-party services

When you use agent features with OpenAI or other providers, their privacy policies apply to prompts and responses you send through those integrations.

## Data stored locally

- Work items in `intent/**/*.work.bvc`
- Analytics records in `work/analytics-records.jsonl`
- Optional registry at `~/.work-graph/workspaces.json` (paths only, no cloud sync)

## Your responsibility

Do not commit secrets, customer PII, or proprietary eval fixtures marked **private** in [publication-inventory-an42.md](docs/publication-inventory-an42.md).
