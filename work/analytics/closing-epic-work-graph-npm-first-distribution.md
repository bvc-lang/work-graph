# Closing: epic-work-graph-npm-first-distribution (AN-43)

**Дата:** 2026-06-01  
**Эпик:** `epic-work-graph-npm-first-distribution`

## Итог

User-first установка: `npx @work-graph/cli init .` → devDependencies → `node_modules/@work-graph/*`.  
Dev-first: `WORKGRAPH_ENGINE_ROOT` + `--legacy-engine-config` для contributors.

## Deliverables

| Трек | Артефакт |
|------|----------|
| ADR | `docs/adr-work-graph-npm-first-distribution.md` |
| Plan | `docs/plan-work-graph-npm-first-distribution.md` |
| Resolver | `src/workGraphEngineRoot.mjs`, `src/workGraphInstallLayout.mjs` |
| Init v2 | `src/workGraphProjectInit.mjs` — config без engineRoot, devDeps |
| CLI | `@work-graph/cli@0.2.0` — init, ui, doctor; vendor prepack |
| MCP | `@work-graph/mcp@0.2.0` — rename с `@iohasc/workgraph-mcp` |
| Docs | README, runbook, skill, CONTRIBUTING |
| Tests | `tests/workGraphEngineRoot.test.mjs`, обновлён init test |

## Проверки

```bash
npm run sync:work-graph-cli-vendor
npm run check:npm-pack-boundary
npm run test:deterministic
```

## npm publish (ручной шаг)

```bash
cd packages/work-graph-cli && npm publish --access public
cd packages/workgraph-mcp && npm publish --access public
```

## Отложено

- `implement-optional-global-engine-npm-first` — `--use-global-engine` / `npm install -g` (phase 2, не блокер MVP)
- Полный split `@work-graph/runtime` / `@work-graph/ui-server` — vendor bundle в CLI достаточен для v0.2

## Связь

- [AN-43](work-graph-npm-first-distribution.md)
- [AN-40](work-graph-project-deployment-model.md) — per-project UX сохранён, изменилась модель движка
