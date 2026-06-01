# Golden path pilot runbook (не-автор)

Для work item `run-first-non-author-golden-path` (AN-7).

## Предусловия

- `npm install`, `npm run backlog:ui` (Home открывается по умолчанию).
- OneBase fixture или тестовая конфигурация согласована с pilot.

## Шаги (≤ 2 часа)

1. Открыть Home — увидеть ready queue и inbox.
2. Выбрать ready Work Item с OneBase scope (или создать через MCP `create_work_item`).
3. Claim / `POST /api/agent-run` с `taskId` — Agent Run dock показывает journal.
4. Внести изменение в согласованный artifact (yaml/os/step).
5. Добавить evidence в work item; перевести в verify → done.
6. `npm run ci:mandatory` или согласованный verify gate — зафиксировать результат.

## Артеfact прогона

- Closing note: `work/analytics/pilot-run-<date>.md` с временем, блокерами, цитатой pilot.
