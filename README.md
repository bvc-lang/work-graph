# Work Graph Rebuild — 1С / OneBase vertical

Платформа для разработки конфигураций **1С / OneBase** через LLM с **верификацией и evidence**, а не свободный чат.

**Позиция продукта:** C из [AN-7](work/analytics/product-self-audit-user.md) — vertical для 1С-разработчиков и внедренцев (RU/CIS).  
**Decision record:** `intent/product/positioning/decision-position-c-onebase-vertical.bvc`

## Golden path (1С-сценарий)

`charter.bvc → Work Graph task (OneBase metadata / .yaml / .os) → agent claim → изменение → trace/evidence → verification → memory`

Примеры артеfactов: документ/справочник OneBase, обработка проведения, отчёт, интеграция с MCP `onebase`.

## Принцип

- `.bvc` / `.bvc` — канон намерений, правил, задач и trace.
- Work Graph — операционная очередь; не Jira и не chat-todo.
- **OneBase vertical — primary scope**, не «один из доменов».
- IDE shell, LLM adapters, board UI — готовые решения где возможно.
- Genesis/GVM/Zig и прочий R&D — см. [`experimental/README.md`](experimental/README.md).

## Быстрый старт

**Work Graph в вашем проекте (user-first):**

```bash
npx @work-graph/cli init .
npm install
npm run workgraph:ui    # http://127.0.0.1:4177
```

**Разработка движка Work Graph (contributors):**

```bash
npm install
npm run backlog:ui    # http://127.0.0.1:4177 — Home mission control
npm run ci:mandatory  # lint + deterministic tests
npm run mcp:workgraph # MCP для агента
```

В Cursor в другом репо: «установи Work Graph в этот проект» (skill `install-work-graph`) или [runbook](docs/runbook-deploy-work-graph-on-project.md).

Contributors: `WORKGRAPH_ENGINE_ROOT=.` — см. [CONTRIBUTING.md](CONTRIBUTING.md).

## Анти-цели (явно)

- Не конкурировать с Cursor / Devin / Linear как general-purpose agent IDE.
- Не обещать «agentic OS для всех языков» в MVP.
- Не требовать Genesis/GVM для acceptance 1С golden path.

## Связанные документы

- [`charter/main.bvc`](charter/main.bvc) — устав (версия post-AN-7)
- [`charter/legacy/main-pre-an7.bvc`](charter/legacy/main-pre-an7.bvc) — устав до pivot
- [`docs/pilot-1c-user-checklist.md`](docs/pilot-1c-user-checklist.md) — профиль pilot-пользователя
- [`docs/golden-path-pilot-runbook.md`](docs/golden-path-pilot-runbook.md) — прогон golden path не-автором
