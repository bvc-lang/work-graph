# ТЗ: публичный сайт Work Graph v1

Источник: `AN-64` — конкурентный разбор и ТЗ реализации сайта.  
Связанные разборы: `AN-44`, `AN-45`, `AN-63`.

## 1. Цель

Сделать публичный сайт Work Graph, который одновременно работает:

- как лендинг для человека;
- как machine-readable entrypoint для агентов Cursor, Claude Code и MCP-клиентов.

Главное сообщение:

```txt
Work Graph is the local evidence ledger for AI-driven development.
```

Русская версия:

```txt
Work Graph — локальный журнал обязательств и доказательств для разработки с агентами.
```

Сайт не должен позиционировать WG как IDE, автономного инженера, SaaS PM-трекер или memory layer.

## 2. Обязательные маршруты

| Route | Назначение |
|-------|------------|
| `/` | Главная: позиционирование, схема, CTA |
| `/product` | Work Graph workflow по AN-45 |
| `/evidence-ledger` | Доказательства, verification, ready-for-done |
| `/onebase` | Вертикаль 1C/OneBase |
| `/compare` | Сравнение с Cursor, Claude Code, Linear, Devin, Mem0 |
| `/docs` | Индекс документации |
| `/docs/bvc-spec` | Спецификация BVC atom |
| `/docs/mcp-tools` | MCP tools, input/output/errors/examples |
| `/docs/verification-matrix` | Tier A/B/C проверки |
| `/docs/errors` | Ошибки и recovery |
| `/changelog` | Изменения schema/docs |

## 3. Agent-facing артефакты

| Artifact | Must |
|----------|------|
| `/llms.txt` | Key pages, preferred interactions, data accuracy |
| `/docs/*.md` | Markdown projection для всех P0 docs |
| `/docs/*.bvc.example` | Canonical examples for BVC authoring |
| `/.well-known/mcp.json` | MCP discovery for Work Graph tools |
| `/api/docs/bvc-authoring-context` | JSON контекст для написания BVC |
| `/api/docs/mcp-tools-context` | JSON контекст tools + examples |
| `/api/docs/errors-context` | JSON контекст ошибок и recovery |

## 4. Главная страница

### Must

- Hero one-liner: `Local evidence ledger for AI-driven development`.
- Схема: `Decision (AN) → Work contract (.bvc) → Agent claim → Evidence → Verified memory`.
- Primary CTA: `Start locally`.
- Secondary CTA: `Connect MCP` или `Read llms.txt`.
- Comparison teaser: WG vs Cursor/Claude, Linear/Jira, Mem0, Devin.
- OneBase teaser: `from domain metadata to verified work item`.

### Must Not

- Не обещать “AI engineer”.
- Не писать, что WG заменяет Cursor/Claude Code.
- Не продавать сайт как обычную Kanban/PM-систему.

## 5. Product page

Страница `/product` должна объяснять workflow из AN-45:

```txt
Аналитика → Задачи → Доска → Проверки → Память
              + Архитектура / Промпты
```

Для каждого блока:

- боль;
- что делает раздел;
- какой артефакт пишет в repo;
- как это связано с agent work.

## 6. Compare page

Обязательная таблица:

| Capability | Cursor/Claude | Linear/Jira | Mem0 | Devin | WG |
|------------|---------------|-------------|------|-------|----|
| Writes code | yes | no | no | yes | via connected agent |
| Official backlog | soft | yes | no | ticket/session | local/git |
| Evidence per task | partial | no | no | partial | yes |
| BVC intent contract | no | no | no | no | yes |
| MCP/tool layer | yes | API | yes | API | yes |
| Local source of truth | partial | no | partial | no | yes |

Вывод страницы: конкуренты исполняют, планируют или запоминают; WG доказывает выполнение обязательств.

## 7. Docs requirements

Каждая P0 docs page должна иметь:

- HTML route;
- markdown route;
- title/description/updatedAt;
- JSON-LD;
- related MCP tools;
- explicit errors;
- минимум 3 examples: minimal, realistic, error/anti-example.

P0 docs:

- BVC Atom Specification;
- Work Item Lifecycle;
- Evidence and Verification;
- MCP Tools;
- OneBase Integration;
- Errors and Recovery.

## 8. Technical requirements

P0:

- static site shell with semantic HTML;
- light and dark theme with persisted user choice;
- Russian and English locale for human-facing pages and navigation;
- `/llms.txt`;
- markdown docs projection;
- `/.well-known/mcp.json`;
- JSON-LD on home and docs;
- tests for route rendering and machine-readable artifacts.

P1:

- `Accept: text/markdown` or `?format=markdown`;
- docs context API endpoints;
- copyable MCP configs for Cursor and Claude Code;
- accessibility/lighthouse pass.

P2:

- interactive evidence-flow demo;
- public sample repository;
- versioned schema docs;
- hosted docs search.

## 9. Acceptance criteria

- Human visitor can state WG in one sentence: local evidence ledger for AI agents.
- Agent can discover docs through `/llms.txt` without executing JS.
- MCP discovery exists at `/.well-known/mcp.json`.
- Home page visibly contains `AN → .work.bvc → evidence → verification → memory`.
- Compare page explicitly says WG is not IDE, not PM SaaS, not memory layer.
- Light/dark theme toggle works and keeps content readable in both themes.
- RU/EN locale switch covers navigation, hero, product pages, docs index and key CTA labels.
- OneBase page contains a concrete vertical scenario.
- Tests cover routes and generated artifacts.
