# ADR: reuse наследия ioHasC в Work Graph v1

**Status:** accepted  
**Date:** 2026-06-04  
**Context:** [AN-69](../work/analytics/pvrg-ir-semantic-plane-usage-audit.md), [plan-iohasc-heritage-reuse-v1.md](plan-iohasc-heritage-reuse-v1.md)

## Decision

Work Graph **сохраняет и переиспользует** наработки ioHasC через явные стратегии **port / embed / rebuild / defer**, ведя **живой port-registry**. Это **отдельный heritage-трек**, параллельный lite-треку semantic plane (AN-69 §7).

## Стратегии

| Strategy | Когда | Пример |
|----------|-------|--------|
| **port** | Модуль переносится с минимальной адаптацией | TurIr executor, bracket IR, compiler round-trip |
| **embed** | Остаётся в ioHasC shell, WG — sidecar | Orchestrator, Monaco chat, dashboard mount |
| **rebuild** | Поведение то же, реализация под WG OS | Graph RAG slice, daemon tick, operator UI |
| **replace** | Lite-проекция вместо full UI | PVRG-lite вместо React Flow semantic map |
| **defer** | R&D, не блокер | GVM verify, full Genesis IDE |

## Таблица подсистем (heritage scope)

| Подсистема ioHasC | Strategy | WG artifact / work item | Статус |
|-------------------|----------|-------------------------|--------|
| `.bvc` / WorkItem canon | rebuild | intent tree, MCP | done |
| Unified linkage | rebuild | `unifiedLinkageProjection.mjs` | done |
| PVRG task scope / Graph RAG | rebuild | `pvrgTaskScope`, `graphRagContextSlice` | done |
| PVRG-lite semantic search | rebuild | `semanticSearchWorkflow.mjs` | done |
| **pvrg-core AST scanner** | **port (adapter)** | `pvrgCoreScannerAdapter.mjs` | heritage P2 |
| Bracket IR trace | port | `bracketIrTraceSignal.mjs` | done |
| Compiler round-trip | port | `compilerRoundTripCli.mjs` | done |
| Code-gap analyzer | port | `implement-full-code-gap-analyzer-port` | done |
| **TurIr / IR Flow CFG** | **port** | `src/irFlow/*` | heritage P1 |
| **LLM IR normalizer** | **port** | `llmIrNormalizer.mjs` | heritage P1 |
| **Semantic runtime Stage 2** | **port** | `semanticRuntimeStage2.mjs` | heritage P3 |
| **Vector DSL codegen** | **port** | `port-vector-dsl-codegen-from-iohasc` | heritage P4 |
| Agent orchestrator | **embed** | ioHasC `orchestrator.js` | не port |
| WG dashboard in shell | **embed** | iframe/split :4177 | heritage P6 |
| GBC/GFS binary slice | port (MVP) | `gbcSliceMvp.mjs` | heritage P5 |
| GVM / Genesis IDE | defer | evaluate pilots | defer |

Источник истины для статусов: `docs/iohasc-heritage-port-registry.v1.json`.

## Anti-goals

1. **Не** port полный ioHasC IDE monolith в WG repo.
2. **Не** port orchestrator/chat — только embed + MCP.
3. **Не** дублировать done port-задачи вторым graph store.
4. **Не** блокировать lite semantic plane ожиданием TurIr.

## Связь с AN-9 defer

[adr-an9-rich-ir-deferred.md](adr-an9-rich-ir-deferred.md) остаётся valid для **lite-only** сценариев. Heritage epic **revisit** RichIR для pilot workflow (verify gate), см. [adr-rich-ir-heritage-port-v1.md](adr-rich-ir-heritage-port-v1.md).

## Consequences

- Новые port-задачи регистрируются в `iohasc-heritage-port-registry.v1.json`.
- `npm run check:iohasc-heritage-port-registry` — CI guard.
- Эпик `epic-iohasc-heritage-reuse-v1` — owner heritage-трека.
