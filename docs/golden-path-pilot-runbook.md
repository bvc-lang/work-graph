# Golden path pilot runbook (не-автор)

Для work item `run-first-non-author-golden-path` (AN-7).

## Предусловия

- `npm install`, `npm run backlog:ui` (Home открывается по умолчанию).
- OneBase fixture или тестовая конфигурация согласована с pilot.

## Шаги (≤ 2 часа)

1. Открыть Home — увидеть ready queue и inbox.
2. Выбрать ready Work Item с OneBase scope (или создать через MCP `create_work_item` — **не** править `.work.bvc` файлами).
3. Claim / `POST /api/agent-run` с `taskId` — Agent Run dock показывает journal.
4. Внести изменение в согласованный artifact (yaml/os/step).
5. Добавить evidence через MCP (`add_work_item_evidence`); перевести в verify → `complete_work_item`.
6. `npm run ci:mandatory` или согласованный verify gate — зафиксировать результат.

### MCP workflow (канон read-only)

- Читать scope: `get_work_item`, `get_pvrg_task_scope`, `get_graph_rag_context`.
- Писать канон **только MCP**: create → claim → evidence → complete.
- Прямые file edits work items запрещены; см. [ADR write-boundary](./adr-workgraph-canon-write-boundary-v1.md).

## Артеfact прогона

- Closing note: `work/analytics/pilot-run-<date>.md` с временем, блокерами, цитатой pilot.

---

## OneBase product pilot surface (AN-72)

Цель этого прогона — показать не внутреннюю архитектуру, а пользовательский flow:
**WG task → OneBase metadata/read/check → REST evidence → optional write prepare/confirm → evidence**.

### Предусловия

- OneBase лежит рядом с проектом или задан явно:
  - `ONEBASE_PROJECT_ROOT=../onebase/examples/trade`
  - `ONEBASE_CLI=../onebase/onebase.exe` (опционально; иначе `onebase` из PATH)
- Live REST runtime опционален:
  - `ONEBASE_API_BASE_URL=http://127.0.0.1:8081`
  - если runtime не поднят, REST шаги дают `blocked`/`failed evidence`, но pilot не считается сломанным.

### Проверяемый flow

1. Открыть/создать OneBase WorkItem в Work Graph.
2. Получить metadata:
   - MCP/tool: `onebase_list_metadata`
   - fallback: `src/onebaseWorkerTools.mjs` / `npm run test:deterministic`
3. Прочитать bounded artifact:
   - `onebase_read_config_file` для `documents/...`, `registers/...` или `src/*.os`
   - path traversal и arbitrary files должны блокироваться.
4. Запустить config gates:
   - `onebase_describe_config`
   - `onebase_check_config`
   - отсутствие CLI фиксируется как `blocked/skipped`, не как «код сломан».
5. Live read (если runtime поднят):
   - `onebase_rest_get` только для allowlist paths (`/catalogs/*`, `/documents/*`, `/registers/*`, `/health`, `/status`)
   - результат пишет `evidence-record.v1`.
6. Write-путь только через подтверждение:
   - `onebase_rest_write_prepare` возвращает `confirmToken`, не мутирует runtime.
   - `onebase_rest_write_execute` без совпадающего `confirmToken` блокируется.
   - execute разрешён только для узкого POST allowlist: `/documents/<document>/<id>/post` или `/documents/<document>/post`.

### Smoke-команда

```bash
node scripts/run-onebase-product-pilot-smoke.mjs
```

Команда проверяет локальную surface без обязательного live runtime:

- handlers доступны;
- metadata/read работают на временной fixture;
- REST GET без `ONEBASE_API_BASE_URL` даёт blocked evidence;
- write prepare/execute без confirm блокируется;
- mocked REST GET/POST возвращают evidence.

### Критерий ready-for-demo

- Smoke-команда проходит.
- `npm run test:deterministic` проходит.
- В WorkItem есть evidence lines с результатами MCP/REST/check.
- Никакой write не выполняется без явного confirm.
