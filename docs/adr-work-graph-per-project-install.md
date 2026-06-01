# ADR: установка Work Graph в проект (основной путь)

**Статус:** принято  
**Дата:** 2026-06-01  
**Заменяет приоритет:** [ADR multiproject host](adr-work-graph-multiproject-host.md) как **основной UX** (хост остаётся опцией)

## Контекст

AN-40 рекомендовал гибрид C: канон в репо + один хост с переключателем. На практике регистрация в `~/.work-graph/` и CLI-пути оказались неприемлемы для оператора. Типичный сценарий — **Cursor + один репозиторий + агент**, который по запросу «установи WG» настраивает проект.

## Решение

**Основной путь — per-project install:**

1. **Канон** (`intent/`, `charter/`, `architecture/`, `.work-graph/config.json`) — в git проекта.
2. **Движок** — один на машине (`engineRoot` в config), **не коммитится** в проект.
3. **Запуск** — `npm run workgraph:ui` из проекта; runner импортирует UI из `@work-graph/cli` в `node_modules`.

**Обновление (2026-06):** user-facing `engineRoot` заменён npm-first моделью — см. [adr-work-graph-npm-first-distribution.md](adr-work-graph-npm-first-distribution.md). Legacy `engineRoot` в config v1 поддерживается с warning.
4. **MCP** — `.work-graph/run-mcp.mjs` + запись в `.cursor/mcp.json`.
5. **Агент** — skill `skills/install-work-graph/SKILL.md` выполняет `work-graph init`.

## Что не копируем

| В проект (git) | Не в проект |
|----------------|-------------|
| intent/, charter/, architecture/ | исходники WG |
| `.work-graph/config.json`, run-*.mjs | node_modules движка |
| cursor rule + mcp config | полный fork репо WG |

## Отклонённый основной путь: только multiproject host

`register` + реестр `~/.work-graph/` — **опционально** для оператора с N проектами в одном окне. Не документируем как первый шаг.

## CLI

```bash
work-graph init [path] --engine <wg-repo> [--label "..."]
work-graph ui [path]          # из проекта с config
work-graph register [path]    # optional power-user
```

## Последствия

- Runbook и README описывают init-first.
- Эпик multiproject host не отменён, но понижен в приоритете UX.
- Публикация `@work-graph/cli` на npm — следующий шаг; пока путь к `engineRoot` в config.

## См. также

- [Runbook](runbook-deploy-work-graph-on-project.md)
- [AN-40](../work/analytics/work-graph-project-deployment-model.md)
