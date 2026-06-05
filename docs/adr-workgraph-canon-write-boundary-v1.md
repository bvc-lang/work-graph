# ADR: граница записи канона Work Graph (write-boundary v1)

**Статус:** принято  
**Дата:** 2026-06-05  
**Контекст:** [AN-77](../work/analytics/workgraph-agent-mcp-bypass-install-boundary-incident.md)  
**Связанные ADR:** [per-project install](adr-work-graph-per-project-install.md), [multiproject host](adr-work-graph-multiproject-host.md)  
**Эпик:** `epic-workgraph-canon-write-boundary-v1`

## Проблема

Work Graph хранит управляющий канон (`intent/**/work/*.work.bvc`, evidence, status) как обычные файлы в git-репозитории. Cursor-агент имеет файловые инструменты (`ApplyPatch`, `Write`) и может создавать или менять work items напрямую, минуя MCP/CLI.

Инцидент AN-77: агент сначала изменил код, затем создал `.work.bvc` через file patch, и только после замечания оператора пересоздал задачу через `create_work_item`. Правила процесса (single backlog, analysis/decision, evidence) не сработали, потому что **не было архитектурной границы записи** — только мягкие инструкции.

Перенос канона в `.work-graph/canon/` или скрытую `.workgraph/` **не решает** проблему без отдельной политики write-boundary: агент технически может править любой путь в workspace.

## Контекст

| Режим | Риск |
|-------|------|
| Per-project install (AN-8, ADR per-project) | Канон рядом с кодом; агент видит `intent/` как обычные файлы |
| Self-hosted WG repo | **Максимальный:** движок, UI, MCP и backlog в одном дереве |
| Multiproject host (AN-40) | Снижает смешение движка и канона проекта, но не запрещает patch в активном `repoRoot` |

Текущая защита — lint backlog, Cursor rules, MCP prompts — работает на уровне **процесса**. Нужен явный контракт: какие операции считаются штатными, что запрещено, какие исключения допустимы.

## Решение

### 1. Read-many / write-through-API

| Операция | Допустимый путь | Запрещено для агента |
|----------|-----------------|----------------------|
| Чтение work items, snapshot, graph RAG | Файлы канона, MCP read tools, resources | — |
| Создание work item | `create_work_item` (MCP) или эквивалент CLI | Прямое создание/правка `intent/**/work/*.work.bvc` |
| Статус, claim, evidence, complete | `update_work_item_status`, `claim_work_item`, `add_work_item_evidence`, `complete_work_item` | Прямая правка `work.status`, `Свидетельства`, claim labels |
| Analysis / decision pipeline | `record_work_item_analysis`, `record_work_item_decision` | Прямая правка секций «Анализ»/«Решение» без MCP |
| Analytics journal | Штатный intake flow + MCP где доступен | Ad-hoc правка `work/analytics-records.jsonl` без evidence |

**Принцип:** канон **read-only для file-write tools агента**; все мутации управляющих атомов — только через Work Graph write API (MCP/CLI), кроме контролируемых миграций (см. ниже).

### 2. Исключение: controlled migration

Допускаются **явные migration scripts** в `scripts/` (или одноразовые операторские процедуры), если:

- скрипт назван и задокументирован (`migrate-*.mjs`, `seed-epic-*.mjs`);
- изменение сопровождается evidence в work item или analytics;
- после миграции lint backlog зелёный;
- агент **не** использует ad-hoc `ApplyPatch` для тех же путей в рамках обычной задачи.

Seed-скрипты эпиков — штатный способ bulk-создания backlog, не замена MCP в runtime workflow агента.

### 3. Audit marker (следующий шаг реализации)

Штатные write API должны оставлять машинный след отличимый от ручного patch, например:

- label `work.updated_by: workgraph-mcp` / `workgraph-cli`;
- structured audit в evidence или sidecar log.

Цель — lint/hook может отличить «запись через API» от «файл изменён мимо API».

### 4. Self-hosted WG repo = high-risk mode

При разработке самого Work Graph в одном workspace с `intent/`:

- считать канон **control-plane**, не часть прикладного кода;
- агент обязан использовать MCP для всех work-item операций;
- рекомендуется отдельный WG host workspace (AN-40) для операторского UI и переключения проектов;
- Cursor rules (`docs/cursor-rules/`, `.cursor/rules/`) должны явно запрещать file edits канона.

### 5. Установка движка vs граница записи

Разделены **две независимые границы** (AN-77):

1. **Engine boundary** — движок через npm / host, не копировать репозиторий WG в проект ([npm-first ADR](adr-work-graph-npm-first-distribution.md)).
2. **Canon write boundary** — канон в git проекта, но мутации только через API (этот ADR).

Перенос канона в `.work-graph/canon/` — **отдельное решение** (design task), не замена write-boundary. Миграция корневого `intent/` только после plan + lint + UI/MCP path updates.

## Последствия

### Положительные

- Единая точка для lint, hooks, Cursor rules и regression tests (AN-77 epic).
- MCP `create_work_item` с `parentId` / `itemKind` восстанавливает иерархию без file patch.
- Оператор может проверять compliance: audit marker + lint direct canon edits.

### Отрицательные / ограничения

- File tools остаются доступны технически — enforcement через rules + lint + CI, не OS-level sandbox.
- Migration scripts требуют дисциплины; злоупотребление «migration» ослабляет границу.
- Self-hosted режим требует сознательного поведения агента и оператора.

### План реализации (эпик AN-77)

| Задача | Назначение |
|--------|------------|
| `implement-workgraph-write-audit-marker` | Машинный след штатных записей |
| `lint-direct-canon-file-edits` | CI/lint против bypass |
| `document-cursor-canon-readonly-policy` | Cursor/project rules |
| `design-workgraph-canon-folder-layout-v1` | Опциональный `.work-graph/canon/` |
| `design-workgraph-host-workspace-switcher-v1` | Self-hosting + AN-40 |
| `add-bypass-incident-regression-tests` | Закрепить сценарий AN-77 |

## Анти-цели

- Не полагаться только на «спрятать файлы в dot-folder».
- Не запрещать чтение канона файлами — агенту нужен контекст.
- Не ломать текущий root `intent/` без отдельного ADR/plan на layout migration.

## См. также

- [AN-77 — инцидент bypass](../work/analytics/workgraph-agent-mcp-bypass-install-boundary-incident.md)
- [AN-40 — модель развёртывания](../work/analytics/work-graph-project-deployment-model.md)
- [docs/cursor-rules/agent-workgraph-single-backlog.mdc](cursor-rules/agent-workgraph-single-backlog.mdc)
- Plan (будет создан): `docs/plan-workgraph-canon-write-boundary-v1.md`
- [Plan canon folder layout](./plan-workgraph-canon-folder-layout-v1.md)
- [Plan multiproject host (AN-77 section)](./plan-work-graph-multiproject-host.md)
