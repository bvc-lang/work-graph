# AN-63: Сайт как инструмент для агентов: llms.txt, markdown, MCP discovery

**Запрос:** добавить в аналитику разбор: готовить сайт не для «поиска», а для «инструмента»; агенты (Cursor, Claude Code, MCP-клиенты) извлекают структурированные данные, чтобы вызвать функции.

**Статус:** опубликовано  
**Фокус:** agent-readable docs, machine-readable contracts, MCP discovery  
**Связи:** `docs/`, `packages/workgraph-mcp/`, `src/workGraphBacklogUiServer.mjs`, BVC contracts

---

## Кратко

Главный вывод: сайт Work Graph должен быть оптимизирован не под SEO-поиск и человеческое чтение HTML, а под инструментальный доступ агентов. Агенту нужны контракты, структурированные примеры, markdown-проекции и явные endpoint hints, чтобы он мог выбрать правильное действие без скрейпинга и догадок.

| Приоритет | Что сделать | Почему важно |
|-----------|-------------|--------------|
| P0 | `llms.txt` в корне | Быстрый entrypoint для агентов: что есть на сайте и как этим пользоваться |
| P0 | Markdown-версии страниц | Меньше токенов, лучше RAG, меньше зависимости от JS/HTML |
| P0 | Семантический HTML | Агенты лучше извлекают структуру без выполнения JS |
| P0 | Самодостаточные секции | Retrieval chunks должны работать без «см. выше» |
| P1 | Schema.org JSON-LD | Универсальная смысловая разметка для docs/API/software artifacts |
| P1 | Контрактные блоки API/tools | Явные `input`, `output`, `errors`, `examples` вместо прозы |
| P1 | Единые context endpoints | Сокращают количество вызовов и токенов |
| P2 | `/.well-known/mcp.json` | Discovery доступных MCP-серверов и инструментов |

---

## 1. Приоритет 1: минимум усилий, максимум отдачи

### 1.1. `llms.txt`

Создать `/llms.txt` как agent-facing карту сайта. Это аналог `robots.txt`, но с инструкциями для LLM-агентов.

Минимальный пример для Work Graph:

```txt
# Work Graph
# Purpose: Contract platform for AI-driven development with BVC atoms and MCP

## Key pages
- /docs/bvc-spec - BVC atom specification (machine-readable contract)
- /docs/mcp-tools - List of available MCP tools with schemas
- /docs/verification-matrix - Tier A/B/C verification rules
- /api/workgraph/mcp - MCP server endpoint (stdio/SSE)

## Preferred interactions
- Use MCP for programmatic access (not scraping HTML)
- For BVC validation: call `bvc lint` via CLI or MCP `validate_bvc`
- Evidence submission: use `add_work_item_evidence` with structured JSON

## Data accuracy
- BVC schema version: draft.v1 (see /docs/bvc-spec)
- Verification matrix is updated per release; check /docs/changelog
- MCP tools require local git workspace for write operations
```

### 1.2. Markdown-версии страниц

Для каждой критичной страницы нужна markdown-проекция:

- `/docs/bvc-spec` + `/docs/bvc-spec.md`
- `/docs/mcp-tools` + `/docs/mcp-tools.md`
- `/docs/verification-matrix` + `/docs/verification-matrix.md`

Допустимые варианты реализации:

- `Accept: text/markdown` возвращает markdown.
- `?format=markdown` возвращает markdown.
- Рядом лежит статический `page.md`.

Для WG полезное расширение: рядом с каждой док-страницей держать `page.bvc.example`, где человекочитаемая страница связана с машинным BVC-контрактом.

### 1.3. Семантический HTML

HTML должен быть понятен без JS:

- `<article>` для самостоятельной страницы.
- `<section>` для смыслового блока.
- Строгая иерархия `<h1>` → `<h2>` → `<h3>`.
- `<nav>` для навигации.
- Осмысленные `alt` и `aria-label`.

Это не заменяет markdown, но снижает риск, что агент увидит только shell без контента.

### 1.4. Самодостаточные секции

Retrieval часто достаёт один chunk. Поэтому разделы не должны полагаться на предыдущий контекст:

- Не писать «как описано выше» без краткого повтора.
- Дублировать ключевые определения в каждой важной секции.
- Начинать раздел с invariant/summary, затем давать детали.

---

## 2. Приоритет 2: структура и машиночитаемость

### 2.1. Schema.org JSON-LD

Для главной и docs-страниц добавить JSON-LD. Для BVC-спецификации:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  "name": "BVC Atom Specification",
  "description": "Structured intent atom format: Basis · Vector · Goal",
  "programmingLanguage": "YAML",
  "codeSampleType": "schema",
  "codeRepository": "https://github.com/bvc-lang/spec",
  "license": "https://creativecommons.org/licenses/by/4.0/"
}
```

Для API/tool docs подойдут `TechArticle`, `SoftwareApplication`, `APIReference`-подобные структуры (если применяется локальная convention).

### 2.2. Контрактные блоки в доках

Каждый API/CLI/MCP tool должен иметь машинно извлекаемый контракт:

```yaml
tool: create_work_item
input:
  workId: string
  title: string
  basis: string
  vector: string
  goal: string
output:
  workId: string
  path: string
errors:
  - code: duplicate_work_id
    meaning: Work item already exists.
examples:
  - name: create backlog task
    input:
      workId: add-llms-txt
      title: Add llms.txt
```

Это снижает импровизацию агента и делает docs ближе к MCP schema.

### 2.3. Примеры важнее прозы

Критичные страницы должны содержать 3-5 разнообразных примеров:

- happy path;
- минимальный пример;
- пример с ошибкой;
- пример миграции;
- «почти правильный» негативный пример с объяснением.

Для BVC это особенно важно: агентам проще повторить структуру хорошего atom/example, чем реконструировать её из описания.

### 2.4. Единые context endpoints

Для агентского потребления лучше один endpoint, который отдаёт полный контекст действия, чем цепочка мелких запросов.

Пример для будущего WG docs/API:

```txt
GET /api/docs/bvc-authoring-context
```

Ответ может включать:

- текущую версию BVC schema;
- обязательные секции;
- примеры;
- частые ошибки;
- ссылки на MCP tools;
- verification rules.

---

## 3. Приоритет 3: оптимизация под агентов

### 3.1. Документировать ошибки и edge-cases

Нужна страница `/errors` или `/docs/errors.md`:

| Код | Когда возникает | Что делать |
|-----|-----------------|------------|
| `duplicate_work_id` | Work item уже существует | Выбрать новый id или обновить существующий |
| `invalid_bvc_section` | BVC atom без обязательной секции | Добавить Basis/Vector/Goal |
| `missing_evidence` | Task нельзя закрыть без evidence | Добавить проверку или ссылку на тест |

Ошибки нужно цитировать дословно, чтобы агент мог match-ить runtime output.

### 3.2. Rate limiting для агентов

Легитимные агенты не должны падать под generic bot-blocking. Можно выделить отдельный лимит по `User-Agent`:

- `Claude-Code`
- `Cursor/*`
- MCP clients

Важно: не давать агентам HTML-only fallback, если есть MCP/API путь.

### 3.3. `/.well-known/mcp.json`

Добавить discovery-файл:

```json
{
  "servers": [
    {
      "name": "workgraph-mcp",
      "description": "Work Graph MCP server: backlog, evidence, verification",
      "transport": { "type": "stdio" },
      "tools": [
        { "name": "create_work_item", "description": "Create a BVC-backed work item" },
        { "name": "get_work_contract", "description": "Read the BVC contract for a work item" },
        { "name": "assert_task_ready_for_done", "description": "Check done-readiness and evidence" }
      ]
    }
  ]
}
```

### 3.4. Контент-компрессия

Длинные страницы нужно проектировать под extraction:

- `must` для обязательных правил;
- `should` для рекомендаций;
- `key` для критичных терминов;
- таблицы для ограничений;
- короткие named sections вместо длинного эссе.

---

## 4. Специфика Work Graph / BVC / MCP

Work Graph уже мыслит контрактами. Следующий шаг — применить эту философию к публичной документации:

1. `docs` становятся projection layer, а не вторым источником правды.
2. BVC examples становятся canonical samples для агента.
3. MCP tools становятся preferred path для write operations.
4. Markdown + JSON-LD + `llms.txt` становятся discovery layer.

Целевой набор артефактов:

| Артефакт | Роль |
|----------|------|
| `/llms.txt` | Agent entrypoint |
| `/docs/*.md` | Token-efficient docs projection |
| `/docs/*.bvc.example` | Machine-readable examples |
| `/.well-known/mcp.json` | MCP discovery |
| `/docs/errors.md` | Runtime error contract |
| `/api/*/context` | Unified context endpoints |

---

## 5. Чего не делать

| Ошибка | Почему плохо |
|--------|--------------|
| Прятать контент за интерактивным JS | Агенты могут не выполнить JS, контент станет невидимым |
| Оптимизировать под позицию в контексте | Агент может получить chunk на любом шаге диалога |
| Требовать JSON Schema на каждый atom сразу | Миграция должна идти prose → optional structured → required for Tier A |
| Делать второй источник правды | Нужен projection-layer, а не дублирование YAML + JSON + prose |

---

## 6. Чеклист на 1 час

1. Создать `/llms.txt`.
2. Настроить `.md` projection для ключевых docs.
3. Добавить Schema.org JSON-LD на главную и docs.
4. Проверить, что критичные code examples имеют комментарии внутри блока.
5. Добавить `/.well-known/mcp.json`.

---

## Решение

Принять как продуктовый guideline для WG docs/publication: не «оптимизируем сайт под поиск», а делаем сайт инструментом для агентов. Минимальный P0 backlog: `llms.txt`, markdown docs projection, semantic HTML pass, self-contained sections. P1/P2: Schema.org, MCP discovery, error contracts, context endpoints.
