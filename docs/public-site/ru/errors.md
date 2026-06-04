## Как читать ошибки

Ошибки Work Graph возвращаются MCP-инструментами и локальными проверками (`workgraph:doctor`, lint backlog). Код стабилен: его можно положить в runbook и автоматизировать recovery.

JSON для агентов: `/api/docs/errors-context`.

## Коды P0

| Код | Что означает | Что делать |
|-----|--------------|------------|
| `duplicate_work_id` | Задача с таким `work.id` уже в intent/ | Выберите новый id или обновите существующий `.bvc` |
| `invalid_bvc_section` | В атоме нет Базиса, Вектора или Цели | Дополните секции; см. [BVC-спецификация](/docs/bvc-spec) |
| `missing_evidence` | Задачу нельзя закрыть без proof | Запустите checks из контракта, приложите логи, повторите `assert_task_ready_for_done` |

## Типичные ситуации

**Агент создал задачу дважды** — второй вызов `create_work_item` с тем же id → `duplicate_work_id`. Исправление: merge в один атом или новый suffix в id.

**«Готово», но доска в verify** — агент не вызвал `assert_task_ready_for_done` или получил `ok: false`. Читайте `missing[]`: там id проверки и недостающее поле evidence.

**Линтер backlog падает в CI** — часто `invalid_bvc_section` или битая иерархия intent/. Запустите `npm run lint:backlog` локально до push.

## Политика восстановления

1. Не меняйте `work.status` на `done` вручную, обходя гейт — иначе память проекта и audit расходятся с контрактом.
2. Все исправления evidence и контракта — через git (как код).
3. При неясности откройте drawer задачи в UI и сравните с выводом `get_work_contract`.

## Связанные инструменты

- `create_work_item`, `get_work_contract`, `assert_task_ready_for_done` — см. [MCP-инструменты](/docs/mcp-tools)
- Матрица tier — [Матрица проверок](/docs/verification-matrix)
