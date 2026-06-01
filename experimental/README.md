# Experimental / R&D (вне 1С-vertical MVP)

Каталог и инвентарь **не относящихся к primary scope** (1С / OneBase) треков. Код пока остаётся в `src/` — перенос файлов отложен; граница зафиксирована документально (AN-7, epic `pivot-to-1c-onebase-vertical`).

## Вне vertical (R&D)

| Область | Пути | Статус |
|---------|------|--------|
| Genesis / GVM / Wasm mandate | ioHasC bridge docs, deferral protocols | R&D |
| Multi-domain PM (Marketplace, generic IDE) | analytics AN-21 | отложено |
| Graph canvas n8n parity (lit-flow) | `src/graphCanvasLitFlow/` | UI infra, не 1С core |
| BVC open canon / npm publish | `@bvc-lang/*` | platform, не vertical feature |

## Core vertical (1С / OneBase)

| Область | Пути |
|---------|------|
| OneBase YAML/OS parse, CLI runner | `src/iohasc/onebase/` (mirror), tests `onebase-*` |
| Work Graph MCP + agent behavior | `packages/workgraph-mcp/`, `rules/agent-behavior/` |
| Mission control UI | `src/homeSnapshotApi.mjs`, backlog UI server |

## npm scripts

- **Core CI:** `npm run ci:mandatory` — без experimental optional suites.
- **Optional:** `npm run test:optional:onebase`, eval optional — не блокируют vertical MVP.
