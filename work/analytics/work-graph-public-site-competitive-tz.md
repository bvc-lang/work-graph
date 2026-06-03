# AN-64: Публичный сайт Work Graph — конкурентный разбор и ТЗ реализации

**Запрос:** изучи сайты конкурентов, разборы 44, 45 и 63; запиши в аналитику ТЗ для сайта и создай эпик для его реализации.

**Статус:** опубликовано  
**Фокус:** public site, positioning, agent-readable docs, MCP discovery  
**Основа:** [AN-44](competitor-analysis-vs-work-graph.md), [AN-45](work-graph-sidebar-sections-guide.md), [AN-63](agent-readable-site-instrumentation.md)

---

## Кратко

Сайт Work Graph должен быть не «маркетинговой витриной трекера задач», а **двухслойным продуктовым инструментом**:

1. Для человека: быстро объяснить, почему WG не Cursor/Linear/Devin/mem0, а локальный слой **обязательств, доказательств и трассировки AI-разработки**.
2. Для агента: дать `llms.txt`, markdown-версии, MCP discovery, контрактные примеры и context endpoints, чтобы Cursor/Claude Code/MCP-клиенты могли не скрейпить HTML, а сразу использовать WG как tool layer.

Главная позиция сайта: **Work Graph is the local evidence ledger for AI-driven development**. В русской формулировке: **локальный журнал обязательств и доказательств для разработки с агентами**.

---

## 1. Что показали конкуренты

| Конкурент | Что продаёт на сайте | Что взять для WG | Где WG должен отличаться |
|-----------|----------------------|------------------|--------------------------|
| Cursor | “Build software with AI agents”, IDE + agents everywhere, MCP, lifecycle | Hero “agent workflow”, docs for MCP/tools, surfaces | Не IDE и не агент; WG — источник правды поверх Cursor |
| Claude Code | Terminal/IDE agent, tool loop, docs index через `llms.txt`, MCP | Agent-readable docs, clear workflows, CLI-first examples | WG не исполняет код сам; WG фиксирует обязательства и evidence |
| Windsurf | Agentic IDE, Cascade, Agent Command Center, Spaces | Визуальная метафора “agent command center” | WG command center не для сессий, а для `AN → work.id → evidence` |
| Devin | Autonomous engineer, API sessions, sandbox, PR review | API quickstart, bounded task framing, “delegate a ticket” CTA | WG не заменяет инженера; WG даёт acceptance/evidence contract |
| Linear | Product system for teams and agents, accountability remains human | Human+agent collaboration language, issue delegation, analytics | WG сильнее там, где нужен local/git trace and proof, а не SaaS PM |
| Mem0 | Memory layer, `llms.txt`, MCP, tools list | Docs index, MCP setup, tool table, quickstart snippets | WG — не память предпочтений, а ledger решений и задач |

Вывод: рынок уже говорит языком “agents + tools + MCP + docs index”. Поэтому WG-сайт не должен объяснять “что такое AI agent” с нуля. Он должен показать **пустое место между агентом, PM-трекером и памятью**: где хранится доказуемое обязательство.

---

## 2. Уроки AN-44 / AN-45 / AN-63

### AN-44: позиционирование

WG не конкурирует напрямую с Cursor/Claude Code/Windsurf/Devin. Они пишут код и запускают процессы. WG держит слой:

```txt
AN → epic → .work.bvc → claim → evidence → verification → memory
```

Сайт обязан повторять это как центральную схему. Если посетитель запомнил только одно: **WG делает “готово” доказуемым**.

### AN-45: продуктовая карта

Разделы UI уже являются готовой информационной архитектурой сайта:

```txt
Аналитика → Задачи → Доска → Проверки → Память
              + Архитектура / Промпты как supporting tools
```

Сайт должен объяснять не меню, а процесс: вопрос становится разбором, разбор становится задачей, задача получает доказательства, доказательства становятся памятью.

### AN-63: сайт как инструмент

Нужны обязательные agent-facing артефакты:

- `/llms.txt`
- markdown projection для ключевых страниц
- semantic HTML
- JSON-LD
- `/.well-known/mcp.json`
- контрактные блоки tool/API docs
- examples-first docs

---

## 3. Целевая аудитория

| Аудитория | Что ей нужно понять за 30 секунд | CTA |
|-----------|----------------------------------|-----|
| Solo developer using Cursor/Claude | Почему чатовый TODO не равен настоящему backlog | “Run local Work Graph” |
| Team lead | Как проверять работу агента не по словам, а по evidence | “See evidence workflow” |
| 1C/OneBase developer | Как WG связывает metadata/runtime context with work contracts | “Open OneBase scenario” |
| AI agent / MCP client | Где tools, schemas, markdown docs, examples | `llms.txt`, MCP discovery |
| Reviewer / auditor | Где trace from decision to code to verification | “View trace example” |

---

## 4. Информационная архитектура сайта

### 4.1. Human-facing routes

| Route | Назначение | Must-have content |
|-------|------------|-------------------|
| `/` | Главная | hero, схема `AN→work→evidence`, CTA, comparison |
| `/product` | Что такое WG | разделы из AN-45 как workflow |
| `/evidence-ledger` | Дифференциатор | task ready-for-done, evidence, verification |
| `/onebase` | Вертикаль 1С/OneBase | metadata/context + WG work contracts |
| `/compare` | Сравнение | Cursor, Claude Code, Linear, Devin, Mem0 |
| `/docs` | Документация | BVC, MCP, verification, errors |
| `/docs/bvc-spec` | BVC atom | schema, examples, anti-examples |
| `/docs/mcp-tools` | MCP tools | input/output/errors/examples |
| `/docs/verification-matrix` | Готовность | Tier A/B/C checks |
| `/changelog` | История | releases and schema changes |

### 4.2. Agent-facing routes

| Route | Формат | Назначение |
|-------|--------|------------|
| `/llms.txt` | text | Entry point для agents |
| `/docs/*.md` | markdown | Token-efficient docs |
| `/docs/*.bvc.example` | text/yaml | Canonical BVC examples |
| `/.well-known/mcp.json` | json | MCP discovery |
| `/api/docs/bvc-authoring-context` | json | Unified authoring context |
| `/api/docs/mcp-tools-context` | json | Tool schemas + examples |
| `/api/docs/errors-context` | json | Error codes and recovery |

---

## 5. Главная страница: ТЗ

### Hero

Must:

- One-liner: **Local evidence ledger for AI-driven development**.
- Supporting line: “Turn agent work from chat promises into versioned work contracts, evidence, verification, and project memory.”
- Primary CTA: “Start locally”.
- Secondary CTA: “Read `llms.txt`” / “Connect MCP”.

Should:

- 5-step flow visual:

```txt
Decision (AN) → Work contract (.bvc) → Agent claim → Evidence → Verified memory
```

Must not:

- Не обещать “AI engineer” или “IDE replacement”.
- Не продавать WG как обычный Kanban/Jira clone.

### Problem Section

Проблема:

- Agent says “done”, but no one knows what was tested.
- Chat TODO diverges from repo backlog.
- Cursor/Claude memory is useful but not an accountable record.
- Linear/Jira track tasks but not code evidence and BVC contracts.

### Product Section

Основа AN-45:

- Analytics: why and decisions.
- Work items: what must be done.
- Board: what is moving now.
- Verification: what proves it.
- Memory: what the project remembers.
- Architecture/Prompts: supporting context.

### Differentiation Section

Comparison table:

| Capability | Cursor/Claude | Linear/Jira | Mem0 | WG |
|------------|---------------|-------------|------|----|
| Writes code | yes | no | no | via connected agent |
| Official backlog | soft | yes | no | yes, local/git |
| Evidence per task | partial | no | no | yes |
| BVC intent contract | no | no | no | yes |
| MCP tool layer | yes | API | yes | yes |
| Local source of truth | partial | no | partial | yes |

### OneBase Section

Must explain:

- WG consumes 1C/OneBase metadata/context as evidence and constraints.
- WG does not need to replace 1C-MCP tools.
- Value: “from domain metadata to verified work item”.

---

## 6. Docs: ТЗ

Docs must be **examples-first**:

1. Minimal working example.
2. Realistic example.
3. Error example.
4. Migration/update example.
5. Tool/API contract block.

Each docs page must expose:

- HTML route.
- Markdown route.
- `title`, `description`, `updatedAt`.
- JSON-LD.
- Related MCP tools.
- Error codes.
- Copyable examples.

Required initial docs:

- `BVC Atom Specification`
- `Work Item Lifecycle`
- `Evidence and Verification`
- `MCP Tools`
- `OneBase Integration`
- `Errors and Recovery`

---

## 7. Technical Requirements

### P0

- Static public site shell with semantic HTML.
- Light and dark theme with persisted user choice.
- Russian and English locale for human-facing pages and navigation.
- `/llms.txt`.
- `/docs/*.md` projection for initial docs.
- `/.well-known/mcp.json`.
- JSON-LD for home and docs.
- Comparison page.
- OneBase scenario page.
- Tests that assert critical routes and machine-readable files exist.

### P1

- `Accept: text/markdown` or `?format=markdown`.
- `/api/docs/*-context` endpoints.
- Structured examples extracted from source docs.
- “Copy MCP config” snippets for Cursor and Claude Code.
- Lighthouse/accessibility pass.

### P2

- Interactive evidence-flow demo.
- Public sample repository.
- Hosted docs search.
- Versioned schema docs.

---

## 8. Acceptance Criteria

The website is ready when:

- A human can explain WG in one sentence: “local evidence ledger for AI agents”.
- An agent can discover `llms.txt`, docs markdown, MCP tools, and examples without reading JS-rendered content.
- The home page clearly says WG is not IDE, not PM SaaS, not memory layer.
- `AN → .work.bvc → evidence → verification → memory` is visible on the home page.
- Light/dark theme toggle works and does not hide content from agents.
- RU/EN locale switch works for navigation, hero, product pages and docs index.
- There is a concrete OneBase vertical scenario.
- Tests cover routes and generated artifacts.

---

## 9. Implementation Epic

Создать эпик `epic-work-graph-public-site-v1`:

1. `write-public-site-tz-and-information-architecture`
2. `implement-public-site-static-shell`
3. `add-public-site-theme-and-locale`
4. `add-llms-markdown-docs-projections`
5. `add-mcp-discovery-and-doc-context-endpoints`
6. `add-schema-org-jsonld-and-semantic-html`
7. `add-public-site-verification-tests`

---

## Решение

Делаем сайт WG как **agent-readable product site**. Не копируем визуальный стиль Cursor/Linear; берём их приём: короткое позиционирование, lifecycle diagram, quickstarts, MCP/docs index. Дифференциатор WG — не “ещё один агент”, а **локальный доказуемый контур работы агента**.
