# Plan: наследие ioHasC — сохранить и переиспользовать v1

**Связи:** [AN-69](../work/analytics/pvrg-ir-semantic-plane-usage-audit.md), [plan-iohasc-full-rebuild-backlog.md](plan-iohasc-full-rebuild-backlog.md), [iohasc-agent-stack-port-eval.md](../work/analytics/iohasc-agent-stack-port-eval.md)

## Цель

Не потерять наработки ioHasC (`../project`, `pvrg-core/`): системный **port / embed / rebuild** с реестром подсистем, а не замена всего lite-проекциями WG.

## Два параллельных трека (не «или-или»)

| Трек | Эпик | Когда |
|------|------|-------|
| **Lite / быстрый эффект** | `epic-intent-information-semantic-planes-v1` | Сейчас — PVRG-lite, BVC, lexical |
| **Heritage / полнота** | `epic-iohasc-heritage-reuse-v1` | Параллельно волнами — TurIr, pvrg-core, semantic runtime, GBC/GFS |

Ждать полного port **перед** semantic plane **не обязательно**; heritage закрывает глубину, lite — операционную пользу.

## Волны

| Волна | Слой ioHasC | Стратегия |
|-------|-------------|-----------|
| P0 | ADR + реестр port | rebuild |
| P1 | RichIR / TurIr executor + LLM normalizer | port |
| P2 | pvrg-core scanner adapter | port (sidecar) |
| P3 | semantic runtime Stage 2 | port |
| P4 | Vector DSL codegen | port |
| P5 | GBC/GFS slice MVP | port + evaluate |
| P6 | ioHasC shell embed WG | embed (не port orchestrator) |

## ADR и артефакты

| Doc | Назначение |
|-----|------------|
| [adr-iohasc-heritage-reuse-v1.md](adr-iohasc-heritage-reuse-v1.md) | Стратегии port/embed/rebuild/defer |
| [adr-rich-ir-heritage-port-v1.md](adr-rich-ir-heritage-port-v1.md) | TurIr MVP scope |
| [adr-iohasc-workgraph-embed-v1.md](adr-iohasc-workgraph-embed-v1.md) | Embed contract |
| [adr-dual-track-lite-heritage-v1.md](adr-dual-track-lite-heritage-v1.md) | Lite vs heritage |
| [iohasc-heritage-port-registry.v1.json](iohasc-heritage-port-registry.v1.json) | Machine registry |

CI: `npm run check:iohasc-heritage-port-registry`

## Волны → подзадачи

| Волна | Work items | Owner role | Критерий приёмки |
|-------|------------|------------|------------------|
| P0 | `decide-iohasc-heritage-reuse-adr`, `author-plan-iohasc-heritage-reuse-v1`, `maintain-iohasc-heritage-port-registry-v1` | product_architect / PM | ADR + registry check green |
| P1 | `decide-rich-ir-heritage-port-adr`, `port-tur-ir-flow-executor-mvp-v1`, `port-iohasc-llm-ir-normalizer-v1` | compiler_engineer | `tests/irFlow*.test.mjs` pass |
| P2 | `integrate-pvrg-core-scanner-adapter-v1` | integration_architect | adapter fixture test |
| P3 | `port-iohasc-semantic-runtime-stage2-v1` | compiler_engineer | stage2 barrier test |
| P4 | `port-vector-dsl-codegen-from-iohasc-v1` | compiler_engineer | roundtrip bridge |
| P5 | `implement-gbc-gfs-heritage-slice-mvp-v1` | system_architect | GBC slice round-trip |
| P6 | `wire-iohasc-shell-workgraph-embed-v1` | feature_engineer | embed ADR + smoke checklist |
| Align | `align-heritage-track-with-semantic-plane-epic-v1` | system_architect | dual-track ADR |
| Close | `write-closing-epic-iohasc-heritage-reuse-v1` | PM | closing doc + registry 100% |

## Embed smoke checklist (P6)

1. ioHasC mount WG UI on `:4177` without second chat surface
2. Theme sync via CSS variables / `data-iohasc-theme`
3. Deep link `workId` opens backlog drawer
4. MCP workgraph remains canonical for Cursor-only users

## Anti-goals

- Wholesale монолит WG = копия ioHasC IDE
- Port orchestrator/chat в WG (оставить embed в ioHasC)
- Дублировать уже done port-задачи (compiler round-trip, bracket IR signal, code-gap MVP)
