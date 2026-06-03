# Cursor rules Work Graph (канон)

Копия правил из `.cursor/rules/`, которые **не попадают в git** из‑за `.gitignore` на `.cursor/`.

## После clone

```bash
npm run sync:cursor-rules
```

Скрипт копирует все `*.mdc` из этого каталога в `.cursor/rules/` (создаёт каталог при необходимости).

## Локальные файлы

- `.cursor/mcp.json` — **не** синхронизируется (локальные пути, секреты). Используй `.iohasc/mcp.json.example` / `docs/workgraph-mcp-clients.md`.
- Правки правил: сначала правь **здесь**, затем `npm run sync:cursor-rules`.

## Состав (alwaysApply)

| Файл | Назначение |
|------|------------|
| `agent-workgraph-single-backlog.mdc` | Единый бэkлог, запрет TodoWrite для trackable work |
| `work-items-russian.mdc` | Русский prose в задачах |
| `work-item-claim-context.mdc` | MCP перед claim/execute |
| `work-item-bvc-quality.mdc` | Минимум длины BVC-секций |
| `architecture-l2-pipeline-quality.mdc` | Анализ/Решение в architecture canon |
| `iohasc-ui-components.mdc` | UI atoms и design tokens |
