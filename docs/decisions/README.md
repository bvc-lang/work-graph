# Architecture decisions (ADR index)

> **Product path:** analysis и решения по задачам — в **WorkItem atom** (секции «Анализ» / «Решение», pipeline в карточке). См. [`protocols/work-item-decision-pipeline-v1.bvc`](../protocols/work-item-decision-pipeline-v1.bvc). Эта папка — для cross-cutting ADR, не для task-level review.

Реестр архитектурных решений Work Graph rebuild. Формат — [MADR](https://adr.github.io/madr/) + статусы из PEP/KEP (`proposed`, `accepted`, `deferred`, `rejected`, `superseded`, `implemented`).

## Зачем отдельная папка

| Тип | Где | Роль |
|-----|-----|------|
| **Analysis (pre-decision)** | [`docs/analysis/`](../analysis/) | Длинный разбор «почему / какие options» |
| **Decision (commit)** | `docs/decisions/NNNN-*.md` | Что принято, won't do, последствия |
| **Protocol canon** | `protocols/*-decision.bvc` | Accepted инварианты для `.bvc` / intent tree |
| **Execution** | `intent/**/work.bvc`, `docs/plan-*.md` | Чеклисты и work items |
| **Roadmap fact** | `plan-iohasc-rebuild-audit-gap-matrix.md` | Одна строка + ссылка на ADR |

**Accepted ADR не переписывают** (кроме typo и broken links). Смена решения → новый номер + `supersedes` / `superseded by`.

## Как добавить решение

1. Скопировать [`0000-template.md`](0000-template.md) → `NNNN-short-slug.md` (следующий свободный номер).
2. Длинный анализ до выбора — в `docs/analysis/YYYY-MM-slug.md`, ссылка из ADR.
3. После `accepted` — при необходимости atom в `protocols/` (`decision.id`, `decision.status: accepted`).
4. Строка в [audit-gap matrix](../plan-iohasc-rebuild-audit-gap-matrix.md) и/или work item `document-*-scope`.
5. Обновить таблицу ниже.

## Timeline

| ID | Title | Status | Date | Analysis | Protocol / ADR legacy |
|----|-------|--------|------|----------|------------------------|
| [0001](0001-trace-linkage-scope.md) | Step↔code trace linkage scope (level 0) | accepted | 2026-05-30 | [analysis](../analysis/2026-05-trace-linkage-necessity.md) | `protocols/trace-linkage-scope-decision.bvc` |

## Связанные ADR в `docs/` (до реестра)

Старые решения лежат как `docs/adr-workgraph-*.md`. Постепенно переносим в `docs/decisions/` или оставляем с перекрёстной ссылкой:

| Document | Topic |
|----------|--------|
| [adr-workgraph-replace-ide-shell.md](../adr-workgraph-replace-ide-shell.md) | Replace full IDE shell |
| [adr-workgraph-headless-intent-backend.md](../adr-workgraph-headless-intent-backend.md) | MCP-first vs operator UI |
| [adr-workgraph-worker-orchestrator-boundary.md](../adr-workgraph-worker-orchestrator-boundary.md) | Worker vs ioHasC orchestrator |
| [adr-workgraph-semantic-search-ann-phase2.md](../adr-workgraph-semantic-search-ann-phase2.md) | ANN phase-2 defer |

## Статусы

| Status | Meaning |
|--------|---------|
| `proposed` | На review, не binding |
| `accepted` | Команда действует по решению |
| `deferred` | Осознанно отложено; критерии пересмотра в ADR |
| `rejected` | Не делаем; rationale сохранён |
| `superseded` | Заменено новым ADR |
| `implemented` | Решение отражено в коде/процессах; ADR остаётся историей |
