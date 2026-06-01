# Closing: канонизация пайплайна Анализ → Эпик → Задачи → Беклог → Доска

Эпик: `epic-decision-pipeline-canonization`  
Источник: [AN-22](pipeline-analysis-to-board.md)  
Закрыт: 2026-05-31

## Что сработало

- Декомпозиция на 5 подзадач (canon, closing hook, DoR/DoD lint, operational bypass, epic rollup UI) позволила закрывать провалы AN-22 по одному, без новой вкладки «Дорожная карта».
- Канон в `protocols/decision-pipeline-canon-v1.bvc` + `docs/decision-pipeline-canon.md` стал единой точкой для intake, lint и UI.
- `pipelineStageLint` и `closingAnalysisSuggest` встроены в существующие контуры (`backlogSchemaLint`, atom inspector) без новых runtime-моделей.
- Epic rollup в Intent Roadmap Canvas (`/api/roadmap/epics`, `work_epic` nodes, badge N/M, collapse) обкатан на этом же эпике (4/5 closed на момент закрытия T5).

## Что не сработало / осталось

- UI-banner closing suggestion в drawer atom inspector — только API-поле `closingAnalysisSuggestion`, без видимого баннера.
- E2E `intent-roadmap-epic-grouping.spec.mjs` не добавлен (unit-тесты покрывают rollup).
- Жёсткий gate «эпик done только когда все дети done» сознательно не включён — только display rollup и warning lint.

## Уроки для следующих эпиков

1. Сначала canon/protocol, затем lint gates, затем UI visibility — порядок T1→T3→T5 снижает расхождение трактовок.
2. Closing-анализ писать сразу при переводе эпика в `done`, с `analytics.feeds_epics`.
3. Epic grouping лучше держать в существующем Intent Roadmap Canvas, а не в отдельной вкладке.

## feeds_epics

- epic-decision-pipeline-canonization
