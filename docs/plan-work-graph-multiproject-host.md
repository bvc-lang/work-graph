# Plan: Work Graph multiproject host (AN-40)

## Цель

Гибрид **вариант C**: канон (`intent/`, `charter/`, `architecture/main.bvc`) живёт **в репозитории проекта**; одна **консоль-хост** монтирует N корней и переключается между ними без N UI на N портах.

## Источник

- [AN-40](../work/analytics/work-graph-project-deployment-model.md)
- Эпик: `epic-work-graph-multiproject-host`

## Треки

| # | work.id | Суть |
|---|---------|------|
| A | `decide-work-graph-multiproject-deployment-model` | ADR: вариант C, анти-цели |
| B | `implement-workspace-registry-multiproject` | `workspaceRegistry.mjs`, `~/.work-graph/workspaces.json` |
| C | `implement-backlog-ui-reporoot-multiproject` | `WG_PROJECT_ROOT`, порт из конфига, без неявного cwd |
| D | `implement-architecture-snapshot-reporoot-aware` | `buildArchitectureSnapshot({ repoRoot })` |
| E | `implement-work-graph-cli-multiproject` | CLI `init` / `register` / `ui` |
| F | `implement-ui-project-switcher-multiproject` | шапка UI + Cmd+K `project:` |
| G | `docs-runbook-deploy-work-graph-on-project` | runbook для оператора |
| H | `tests-work-graph-multiproject-host` | тесты реестра и переключения |
| I | `write-an40-closing-work-graph-multiproject-host` | closing AN-40 |

## Критерий завершения

- Два корня проектов зарегистрированы; переключение в UI без перезапуска сервера
- `npm test` green; runbook опубликован
- AN-40 closing + journal
