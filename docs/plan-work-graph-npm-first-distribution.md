# Plan: Work Graph npm-first distribution

## Цель

User-first установка: `npx @work-graph/cli init .` → всё из `node_modules`, версия в `package.json`, CI из коробки. Dev-first (`WORKGRAPH_ENGINE_ROOT`) — только для контрибьютеров.

## Эпик

`epic-work-graph-npm-first-distribution`

## ADR

[adr-work-graph-npm-first-distribution.md](adr-work-graph-npm-first-distribution.md)

## Треки

| # | work.id | Суть |
|---|---------|------|
| A | `decide-work-graph-npm-first-distribution-adr` | ADR принят (этот документ) |
| B | `implement-engine-root-resolver-npm-first` | резолвер: ENV → legacy → node_modules |
| C | `refactor-init-npm-devdependencies` | init без user-facing engineRoot, devDeps |
| D | `publish-work-graph-cli-npm` | `@work-graph/cli` на npm |
| E | `publish-work-graph-mcp-npm` | `@work-graph/mcp`, rename с iohasc |
| F | `refactor-run-ui-mcp-from-node-modules` | run-ui/run-mcp из packages |
| G | `update-docs-skill-npm-first` | README, runbook, skill install-work-graph |
| H | `tests-work-graph-npm-first-distribution` | init + resolve + smoke без clone |
| I | `implement-optional-global-engine-npm-first` | `--use-global-engine` (optional) |
| J | `write-closing-work-graph-npm-first-distribution` | closing doc |

## Критерий завершения

- Новый разработчик: `git clone project && npm install && npm run workgraph:ui` — без внешнего clone WG
- `@work-graph/cli` и `@work-graph/mcp` на npm, Apache-2.0
- Документация и skill не упоминают ручной engineRoot
- `WORKGRAPH_ENGINE_ROOT` работает для contributors
- Тесты зелёные

## Seed

```bash
npm run seed:epic-work-graph-npm-first-distribution
```
