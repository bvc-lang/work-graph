# Closing: epic-work-graph-multiproject-host

Эпик: `epic-work-graph-multiproject-host`  
Источник: [AN-40](work-graph-project-deployment-model.md)  
Закрыт: 2026-06-01

## Outcomes

### Decision & canon

- [docs/adr-work-graph-multiproject-host.md](../docs/adr-work-graph-multiproject-host.md) — гибрид C: канон в git проекта, консоль монтирует корни
- [docs/adr-work-graph-per-project-install.md](../docs/adr-work-graph-per-project-install.md) — **основной UX**: WG в проект, не central host; UI switcher не нужен
- [docs/runbook-deploy-work-graph-on-project.md](../docs/runbook-deploy-work-graph-on-project.md) — init / ui / опциональный register

### Runtime

- `src/workspaceRegistry.mjs` — реестр `workspaces.v1`, register/resolve/setActive
- `src/workGraphProjectHost.mjs` — resolve active repoRoot для UI
- `src/workGraphBacklogUiServer.mjs` — `GET /api/workspaces`, `POST /api/workspace/switch`, `POST /api/workspace/register`; `WG_PROJECT_ROOT`
- `src/architectureSnapshot.mjs` — `buildArchitectureSnapshot({ repoRoot })` для foreign root
- `src/workGraphProjectInit.mjs` — per-project init (канон + runner + MCP + rule)
- `packages/work-graph-cli/bin/work-graph.mjs` — `init`, `register`, `ui`, `--register-host`

### UX pivot

- Переключатель «Проект» в sidebar **удалён** — один UI на один репо; multiproject switch только через CLI/API (power-user)

### Tests

- `tests/workspaceRegistry.test.mjs`
- `tests/workGraphProjectInit.test.mjs`
- `tests/workGraphBacklogUiServer.test.mjs` — integration: два корня, switch без restart
- `tests/architectureSnapshot.test.mjs` — foreign `repoRoot`

## Метрики

| Метрика | Итог |
|---------|------|
| npm test (backlog UI + registry) | pass |
| Per-project init | `.work-graph/config.json` + runner |
| UI switcher | removed (by design) |

## feeds_epics

- epic-work-graph-multiproject-host
