## Зачем MCP в Work Graph

MCP — основной способ, которым IDE-агенты читают бэклог, контракты и доказательства. HTML-сайт для людей; **инструменты MCP** — для программного доступа к тем же данным в git.

Перед созданием задач используйте `/api/docs/bvc-authoring-context`. Полная схема инструментов: `/api/docs/mcp-tools-context`.

## Инструменты P0

| Инструмент | Вход | Выход | Когда вызывать |
|------------|------|-------|----------------|
| `create_work_item` | `workId`, `title`, `basis`, `vector`, `goal` | `workId`, `path` | Новая задача с BVC-контрактом |
| `get_work_contract` | `workId` | `workId`, `contract` | Перед правками и для scope |
| `assert_task_ready_for_done` | `workId` | `ok`, `missing[]` | Перед переводом в done |

## Типовой сценарий агента

1. **Прочитать контракт** — `get_work_contract(workId)` → Базис, Вектор, Цель, `target_files`, checks.
2. **Захватить задачу** — `claim_work_item` (если политика проекта требует явного claim).
3. **Исполнить** — правки только в allowlist; команды только из разрешённого списка.
4. **Прикрепить evidence** — вывод тестов, трассы, structured records (`submit_evidence` и связанные пути по версии MCP).
5. **Проверить готовность** — `assert_task_ready_for_done`; при `ok: false` закрывать задачу нельзя.

## Ошибки инструментов

| Код | Смысл | Действие |
|-----|-------|----------|
| `duplicate_work_id` | `work.id` уже есть | Новый id или обновление существующего атома |
| `invalid_bvc_section` | Нет Базиса, Вектора или Цели | Дополнить контракт |
| `missing_evidence` | Нет proof для Tier A | Запустить checks, приложить логи |

Подробнее: статья [Ошибки и восстановление](/docs/errors).

## Подключение

В проекте после `npx @work-graph/cli init .` появляется `.cursor/mcp.json` (или аналог) с `npx -y @work-graph/mcp` и `WORKGRAPH_ROOT`. Перезагрузите MCP в IDE после `npm install`.

Discovery для клиентов: `/.well-known/mcp.json`.
