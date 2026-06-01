# AN-43: npm-first distribution — user-first vs dev-first

**Дата:** 2026-06-01  
**Статус:** принято, в работе (эпик)  
**Связь:** [AN-40](work-graph-project-deployment-model.md), [ADR npm-first](../docs/adr-work-graph-npm-first-distribution.md)

## Проблема

Per-project install (после AN-40) убрал multiproject host из UX, но оставил **dev-first** onboarding: clone WG + `engineRoot`. Обычный разработчик не должен знать путь к соседнему репо — как Playwright/Prisma/shadcn.

## Решение

| Модель | Кто | Как |
|--------|-----|-----|
| **User-first** | 90% | `npx @work-graph/cli init .` → `node_modules` |
| **Dev-first** | contributors | `WORKGRAPH_ENGINE_ROOT=.` override |
| **Legacy** | migration | `engineRoot` в config — deprecated warning |

## Эпик

`epic-work-graph-npm-first-distribution` — seed: `npm run seed:epic-work-graph-npm-first-distribution`

## Критерий успеха

Новый проект: `npm install && npm run workgraph:ui` без внешнего clone WG; `@work-graph/cli` и `@work-graph/mcp` на npm.
