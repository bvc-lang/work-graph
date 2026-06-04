---
name: install-work-graph
description: >-
  Установить Work Graph в текущий git-проект: канон intent/, UI, MCP для агентов (любой MCP-клиент).
  Использовать когда пользователь просит «подключи WG», «установи Work Graph»,
  «настрой бэклог в этом репо» или проект ещё без .work-graph/config.json.
version: "2.0.0"
---

# Установить Work Graph в проект

**User-first:** одна команда, всё из npm. Никакого clone движка и ручных путей.

## Алгоритм

```bash
npx @work-graph/cli init .
npm install
```

Скажи пользователю:

> Work Graph готов. `npm run workgraph:ui` → http://localhost:4177/  
> MCP: сервер `workgraph` — перезагрузить MCP в вашем IDE после init (см. docs/workgraph-mcp-clients.md).

## Что создаёт init

| Артеfact | Назначение |
|----------|------------|
| `intent/index.bvc` | индекс work items |
| `architecture/main.bvc` | каркас архитектуры |
| `charter/` | каталог устава |
| `.work-graph/config.json` | schema v2 — **без** engineRoot |
| `.work-graph/run-ui.mjs`, `run-mcp.mjs` | runners |
| `package.json` | devDependencies `@work-graph/cli`, `@work-graph/mcp` + scripts |
| `.cursor/mcp.json` | `npx -y @work-graph/mcp` (опционально; Cursor и др.) |
| `.cursor/rules/work-graph-project.mdc` | правила агента (опционально; Cursor) |

Флаги при необходимости: `--label`, `--no-mcp`, `--no-package`.

## Не делать

- **Не искать** соседний clone Work Graph и **не просить** engineRoot у пользователя.
- **Не копировать** исходники WG в проект.
- `work-graph register` — только если явно нужен multiproject power-user режим.

## Проверка

```bash
npm run workgraph:doctor
npm run workgraph:ui
```

- [ ] `.work-graph/config.json` schema v2
- [ ] `@work-graph/cli` в `node_modules`
- [ ] MCP `list_work_items` видит `intent/**/work/*.work.bvc`

## Обновление

```bash
npm update @work-graph/cli @work-graph/mcp
```

Версия WG — в `devDependencies` проекта, не в config.

## Dev-only (contributors WG)

Не для обычных пользователей:

```bash
WORKGRAPH_ENGINE_ROOT=/path/to/work-graph clone npx work-graph init . --legacy-engine-config --engine ...
```

## См. также

- `docs/runbook-deploy-work-graph-on-project.md`
- `docs/adr-work-graph-npm-first-distribution.md`
