# ADR: распространение Work Graph — npm-first (user-first)

**Статус:** принято  
**Дата:** 2026-06-01  
**Эпик:** `epic-work-graph-npm-first-distribution`  
**Заменяет приоритет UX:** ручной `engineRoot` + clone движка как **основной** путь установки

## Контекст

Per-project install (ADR per-project install) убрал multiproject host из UX, но оставил **dev-first** модель: пользователь или агент должны знать путь к clone WG (`engineRoot`). Это ломает onboarding, CI/CD и pin версий — в отличие от Playwright, Prisma, shadcn.

## Решение

### User-first (default, ~90%)

```bash
npm install -D @work-graph/cli @work-graph/mcp
npx work-graph init .
npm run workgraph:ui
```

- Движок резолвится из `node_modules/@work-graph/*`
- Версия WG — в `devDependencies` проекта
- `.work-graph/config.json` **без** user-facing `engineRoot` (schema v2)
- MCP: `npx -y @work-graph/mcp` в `.cursor/mcp.json`

### Dev-first (contributors, ~10%)

```bash
git clone …/work-graph && cd work-graph && npm install
WORKGRAPH_ENGINE_ROOT=. npx work-graph ui /path/to/project
```

- `WORKGRAPH_ENGINE_ROOT` — override для разработки WG
- Legacy `engineRoot` в config — deprecated, warning, не удалять сразу

### Резолвер движка (приоритет)

1. `process.env.WORKGRAPH_ENGINE_ROOT` — contributors
2. Legacy `config.engineRoot` — deprecated warning
3. `node_modules` — `@work-graph/runtime` / bundled paths (default)

### Пакеты npm (целевые)

| Пакет | Роль |
|-------|------|
| `@work-graph/cli` | `init`, `ui`, `doctor`, `register` (optional) |
| `@work-graph/mcp` | MCP server (rename from `@iohasc/workgraph-mcp`) |
| `@work-graph/runtime` | snapshot, intent tree, handlers (MVP: bundled или отдельный) |
| `@work-graph/ui-server` | backlog UI (phase 2 split, если тяжело) |

Monorepo WG остаётся **источником**; npm publish из `packages/*`.

### Отклонено как default

- Ручной clone + прописать `engineRoot` в документации для новичков
- Один global engine без npm fallback для обычных проектов

### Optional (позже)

```bash
npm install -g @work-graph/engine
work-graph init --use-global-engine
```

## Последствия

- README / skill / runbook: `npx work-graph init`, не «найди соседний work graph»
- `engineRoot` только в CONTRIBUTING.md
- Эпик `epic-work-graph-multiproject-host`: `register`/API остаётся power-user, не onboarding
- Связь с AN-42: publish `@work-graph/cli` и `@work-graph/mcp` — часть open core

## См. также

- [plan-work-graph-npm-first-distribution.md](plan-work-graph-npm-first-distribution.md)
- [adr-work-graph-per-project-install.md](adr-work-graph-per-project-install.md)
- [AN-40](../work/analytics/work-graph-project-deployment-model.md)
