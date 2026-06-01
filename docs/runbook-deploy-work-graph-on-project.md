# Work Graph в проекте

User-first установка через npm. Канон в git проекта; движок — пакеты `@work-graph/*` в `node_modules`.

## Для человека (одна фраза)

В Cursor в нужном репозитории:

> Установи Work Graph в этот проект

Агент выполняет:

```bash
npx @work-graph/cli init .
npm install
npm run workgraph:ui
```

→ http://127.0.0.1:4177/

## CLI

```bash
npx @work-graph/cli init /path/to/my-project --label "Мой проект"
cd /path/to/my-project && npm install
npm run workgraph:ui
npm run workgraph:doctor
```

| Команда | Действие |
|---------|----------|
| `npm run workgraph:ui` | Backlog UI |
| `npm run workgraph:doctor` | Проверка установки |
| `npm run workgraph:mcp` | MCP stdio (отладка) |

Создаётся:

- `intent/index.bvc`, `architecture/main.bvc`, `charter/`
- `.work-graph/config.json` — schema **v2** (`projectRoot`, `label`, без `engineRoot`)
- `.work-graph/run-ui.mjs`, `run-mcp.mjs`
- `package.json` — `devDependencies`: `@work-graph/cli`, `@work-graph/mcp`
- `.cursor/mcp.json` — `npx -y @work-graph/mcp`
- `.cursor/rules/work-graph-project.mdc`

Существующие `intent/index.bvc` и `architecture/main.bvc` **не перезаписываются**.

### Флаги init

| Флаг | Назначение |
|------|------------|
| `--label`, `--id` | имя в UI и id |
| `--no-mcp` | не менять `.cursor/mcp.json` |
| `--no-package` | не менять `package.json` |
| `--legacy-engine-config` | dev-only: записать `engineRoot` (deprecated) |
| `--register-host` | дополнительно записать проект в `~/.work-graph/workspaces.json` |

## Где что лежит

```
my-project/                         ← канон в git
  intent/
  package.json                      ← @work-graph/cli, @work-graph/mcp
  node_modules/@work-graph/cli/     ← UI runtime (vendor bundle)
  .work-graph/config.json           ← schema v2, без engineRoot
```

Обновление: `npm update @work-graph/cli @work-graph/mcp`.

## Dev-first (contributors Work Graph)

См. [CONTRIBUTING.md](../CONTRIBUTING.md):

```bash
WORKGRAPH_ENGINE_ROOT=. npx work-graph ui /path/to/project
```

## Опционально: реестр для CLI

Power-user: один процесс UI на N репозиториев — `work-graph register`, API `/api/workspace/*`.  
Не основной onboarding-путь.

## См. также

- [ADR npm-first](adr-work-graph-npm-first-distribution.md)
- [ADR per-project install](adr-work-graph-per-project-install.md)
- Skill: `skills/install-work-graph/SKILL.md`
