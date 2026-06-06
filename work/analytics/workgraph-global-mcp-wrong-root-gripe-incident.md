# AN-79: Задачи Gripe созданы в репозитории Work Graph Engine из‑за глобального MCP

**Запрос:** проанализировать и сохранить инцидент: агент создал 18 epic/задач для проекта Gripe не в `D:\Work\04 Gripe`, а в `D:\Work\IDE\work graph`; UI Gripe их не показывал.

**Дата:** 2026-06-06

---

## Краткий вывод

Инцидент — **рассинхрон корня канона**: MCP `create_work_item` писал в `WORKGRAPH_ROOT` движка, а UI Gripe читал `intent/` своего проекта. Это не баг формата `.work.bvc` и не сбой иерархии epic/subtask. Корневая причина — **глобальный MCP с жёстким `WORKGRAPH_ROOT: D:/Work/IDE/work graph`**, который перекрывает проектный `.cursor/mcp.json` в Gripe.

**Статус:** задачи пересозданы в Gripe (19 work items в `intent/index.bvc`). Дубликаты в движке можно оставить как бэклог WG или удалить вручную.

---

## Что произошло

| Где смотрите | Что читает | Что там было |
|--------------|------------|--------------|
| `npm run workgraph:ui` в Gripe | `D:\Work\04 Gripe\intent\` | только demo-задача |
| MCP `create_work_item` (агент) | `D:\Work\IDE\work graph\intent\` | все 18 epic/задач |
| Глобальный MCP `C:\Users\Admin\.cursor\mcp.json` | `cwd` + `WORKGRAPH_ROOT` → движок | жёсткий путь на WG Engine |

Агент шёл через штатный MCP tool (не обход file-patch, как в AN-77), но **в неправильный `repoRoot`**. Задачи технически валидны: есть `work.updated_by: workgraph-mcp`, `work.write.operation: create`, корректные `work.target_files` на файлы Gripe — но лежат в чужом git-репозитории.

### Ожидаемый результат после исправления

В Gripe UI (`npm run workgraph:ui` → http://localhost:4177/) должны отображаться 3 epic:

- `epic-catalog-facet-coverage-an3` (AN-3, 6 подзадач)
- `epic-catalog-hub-pages-an4` (AN-4, 5 подзадач)
- `epic-gripe-design-tokens-niches-an5` (AN-5, 4 подзадачи)

---

## Почему так вышло

### 1. Разрешение корня в MCP

`resolveWorkGraphRoot` в `packages/workgraph-mcp/src/handlers.mjs`:

1. сначала `WG_PROJECT_ROOT`;
2. иначе `WORKGRAPH_ROOT`;
3. иначе `process.cwd()`.

Глобальный `mcp.json` задаёт только `WORKGRAPH_ROOT` на путь движка. Проектный Gripe с `${workspaceFolder}` не применяется, если Cursor подключает **глобальный** сервер `workgraph` с тем же именем или он имеет приоритет.

### 2. UI и MCP используют разные источники истины

| Компонент | Откуда берёт корень |
|-----------|---------------------|
| `npm run workgraph:ui` в Gripe | корень проекта (`.work-graph/config.json` / cwd Gripe) |
| Глобальный MCP workgraph | `D:/Work/IDE/work graph` из env |
| Cursor workspace в момент инцидента | вероятно Gripe или WG — но MCP всё равно писал в движок |

Итог: оператор видел пустой/демо backlog в UI, а агент успешно создавал задачи «в никуда» с точки зрения Gripe.

### 3. Отличие от AN-77

| | AN-77 | AN-79 (этот инцидент) |
|---|-------|------------------------|
| Путь записи | file tools / ApplyPatch | MCP `create_work_item` |
| Проблема | обход write API | **верный API, неверный repoRoot** |
| Симптом | нет audit marker | audit marker есть, но файл в другом репо |
| Защита write-boundary | помогла бы частично | **не помогает** — MCP писал штатно |

---

## Что сделано (remediation)

1. Все 18 задач пересозданы в Gripe: `intent/domains/onebase/work/` и `intent/ui/dashboard/work/`.
2. В `intent/index.bvc` Gripe — 19 work items (18 + demo).
3. Дубликаты в `D:\Work\IDE\work graph\intent\` остаются; на Gripe UI не влияют.

---

## Как не повторить

### Оператор (сейчас)

В Gripe уже есть корректный `.cursor/mcp.json`:

```json
"WORKGRAPH_ROOT": "${workspaceFolder}",
"WG_PROJECT_ROOT": "${workspaceFolder}"
```

Действия:

1. **Cursor → MCP:** отключить глобальный `workgraph` или убедиться, что в workspace Gripe активен **проектный** MCP.
2. В глобальном `C:\Users\Admin\.cursor\mcp.json` убрать жёсткий `WORKGRAPH_ROOT` на `D:/Work/IDE/work graph`, если отдельный бэклог движка не нужен при работе в других проектах.
3. После смены MCP перезапустить MCP-серверы в Cursor.
4. Smoke-check: `create_work_item` с тестовой задачей → файл появляется в `<gripe>/intent/`, не в движке.

### Продукт (рекомендации для WG)

1. **MCP startup self-check:** при старте логировать resolved `repoRoot`, путь к `intent/index.bvc`, имя git remote; при несовпадении с `cwd` Cursor — warning в MCP list_tools / resource.
2. **Resource `workgraph://workspace/active`** (задача `wire-mcp-active-workspace-resource-v1`) — агент обязан читать active root перед `create_work_item`.
3. **Post-create hint в ответе `create_work_item`:** `repoRoot`, `relativePath`, `gitRemote` — чтобы оператор сразу видел, куда записали.
4. **Документация:** явное правило «один именованный MCP `workgraph` на workspace; глобальный с фиксированным ROOT опасен при multi-project».
5. **Host mode** (см. AN-77, `docs/plan-work-graph-multiproject-host.md`) — для нескольких проектов один UI с переключателем `repoRoot`, а не глобальный MCP на движок.

---

## Диагностическая схема

```text
Оператор в Gripe
    │
    ├─ npm run workgraph:ui ──► WORKGRAPH_ROOT = Gripe ──► intent/ Gripe (demo)
    │
    └─ Cursor Agent + MCP create_work_item
            │
            └─ global mcp.json WORKGRAPH_ROOT = WG Engine
                    │
                    └─ intent/ WG Engine (18 задач)  ✗ не видно в Gripe UI
```

---

## Вердикт

Инцидент подтверждает риск **multi-project setup без изоляции MCP root**: штатный MCP workflow работает, но пишет не в тот репозиторий. Write-boundary (AN-77) здесь не спасает.

Минимальная защита — **проектный MCP с `${workspaceFolder}`** и отключение глобального workgraph с фиксированным путём. Среднесрочно — self-check при старте MCP, active workspace resource и явный `repoRoot` в ответах write-tools.

Связанные разборы: AN-77 (обход MCP / install boundary), AN-75 (parent vs depends_on), план `wire-mcp-active-workspace-resource-v1`.
