# AN-22: Пайплайн «Анализ → Эпик → Задачи → Беклог → Доска» — канонизация и обратный контур

**Запрос:** «Что думаешь про пайплайн `Анализ → создание Эпика в Дорожную карту → детализация в Задачи внутри эпика → Беклог → Доска`?»

**Короткий ответ:** в основе правильно, но как **строго линейный** flow он создаёт три провала: исчезает обратный контур (learning), нет bypass для не-эпичных работ, и связь Analysis↔Epic подаётся как 1:1 вместо N:M. Большая часть «прямой» цепочки **уже реализована в Work Graph** (`PIPELINE_STAGES`, `work.parent_id`, `work.item_kind`, Intent Roadmap Canvas, intake AN→work), но она нигде не описана как **единый канон с переходами**. AN-22 фиксирует канон, обозначает что осталось доделать и связывает разбросанные части в одну карту.

---

## 1. Что уже работает в Work Graph (карта артефактов)

Ниже — реальные ссылки на код, а не пожелания.

| Этап пайплайна | Артефакт сегодня | Подтверждение |
|---|---|---|
| **Анализ** | `work/analytics/<slug>.md` + строка в `work/analytics-records.jsonl` (журнал `analytics-record.journal.v1`) | этот AN — 22-я запись |
| **Intake AN → Work** | метки `intake.analytics_key`, `intake.source_kind`, `intake.source_ref`, `work.analysis.source: analytics-record` на work item; модуль `src/analyticsRecordWorkItems.mjs`, `src/workItemCreateAnalysis.mjs` | напр. `intent/system/runtime/work/sync-an14-ir-открытый канон-multilingual.work.bvc` с `intake.analytics_key: AN-19` |
| **Разбор** | блок `Анализ:` в work-item: «Целесообразность», «Контекст и границы», «Зависимости и готовность», «Риски и альтернативы», «Критерии успеха», «Рекомендация для решения» | формат уже используется во всех `*.work.bvc` под `intent/` |
| **Решение / вердикт** | блок `Решение:` + метки `work.decision.verdict` ∈ {`useful`, `harmful`, `defer`}, `work.decision.at` | константа `PIPELINE_VERDICTS` в `src/workItemDecisionPipeline.mjs` |
| **Стадия пайплайна** | `work.pipeline_stage` ∈ {`intake`, `analyzed`, `decided`, `ready`, `executing`, `closed`} | константа `PIPELINE_STAGES` там же, фоновая функция `inferPipelineStage(item)` |
| **Эпик → подзадачи** | `work.parent_id`, `work.item_kind: epic|task|subtask`; lint orphan / cycle / self-parent; rollup детей; MCP `create_work_item.parentId` | `src/workItemHierarchy.mjs`, `src/backlogSchemaLint.mjs`; задача-ист`{}`орик `intent/system/runtime/work/implement-work-item-parent-id-runtime.work.bvc` (`status: done`); AN-2 `parent-subtask-hierarchy.md` |
| **Беклог / гейты исполнения** | `work.status` (kanban) + `work.depends_on`; promote/claim gate; `src/workItemExecutionGate.mjs` | те же файлы |
| **Дорожная карта (UI)** | интерактивный dagre-canvas `src/intentRoadmapCanvas.mjs` + `src/intentRoadmapProjection.mjs`, сервер `src/workGraphBacklogUiServer.mjs` | задача `intent/ui/dashboard/work/implement-intent-roadmap-canvas-view.work.bvc` (`status: done`) |
| **Доска** | kanban-проекция `src/...kanban...`, evidence timeline, audit journal | задачи `intent/ui/dashboard/work/implement-kanban-board-projection-ui.work.bvc`, `implement-evidence-timeline-operator-view.work.bvc` |

**Вывод:** «Анализ → Эпик → Задачи → Беклог → Доска» — это **переименование** того, что уже есть. Новая работа — не построить пайплайн с нуля, а **(а) явно его задокументировать как canon, (б) закрыть три провала, описанные ниже, (в) поднять видимость для оператора**.

---

## 2. Карта пайплайна в текущих терминах Work Graph

```
analytics-record (AN-XX, work/analytics/<slug>.md, analytics-records.jsonl)
        │  intake.analytics_key, intake.source_ref
        ▼
work item: intake          ← создаётся скриптом / MCP create_work_item
        │  блок Анализ: заполнен → work.pipeline_stage = analyzed
        ▼
work item: analyzed
        │  блок Решение:, work.decision.verdict = useful|defer|harmful
        ▼
work item: decided
        │  depends_on закрыты, owner назначен, DoR пройден
        ▼
work item: ready (work.status = ready, viден на доске)
        │  claim → doing → verify
        ▼
work item: executing (kanban)
        │  DoD: evidence записан, тесты/артефакты подтверждают
        ▼
work item: closed (status = done|blocked)
        │  ↓ если closed принадлежит эпику с rollup ≥ порога — closing-анализ
        ▼
closing-analysis (новый AN-XX, work/analytics/closing-<slug>.md)
        │  feeds_epics → новые эпики / charter updates
        └────────── обратно в analytics ──────────►
```

Эпик и подзадача — это **тот же work item**, отличающийся `work.item_kind` и наличием/отсутствием `work.parent_id`. Эпик визуализируется в Intent Roadmap Canvas; подзадачи — внутри drawer эпика и на kanban-доске.

---

## 3. Три провала, которые закрываем

### Провал 1: нет обратного контура (closing → analytics)

Сегодня после `status: done` цикл обрывается. Что сработало / не сработало уходит только в `Свидетельства:` атома, и нет привычки превращать урок в **новую AN-запись** или правку charter. Это противоречит AN-20 (UX vector: «нет цикла обучения») и делает analytics-журнал односторонним — только проспективным.

**Канон:** на закрытии эпика (а не каждой подзадачи) предлагать оператору создать `work/analytics/closing-<epic-slug>.md`; добавить метку `analytics.feeds_epics: [<epic-slug>, ...]` в AN-запись; завести задачу T2 (см. ниже).

### Провал 2: нет bypass для operational и charter-результата

Не каждая работа стартует с анализа и эпика:

- **Operational / рутина / мелкий багфикс** — должна идти прямо в `ready` без AN-XX и без `parent_id`. Сейчас runtime это позволяет (`inferPipelineStage` фолбэк на `intake`), но **canon не описан**, и появляется риск, что люди будут плодить fake-эпики «Багфиксы недели» только чтобы вписаться в флоу.
- **Анализ → правило (charter)** — иногда вывод анализа не эпик, а правило (`charter/main.bvc` или ADR). Нужно явно указать, что это валидный финал AN-XX без перехода в work item.

**Канон:** ввести метку `work.intake.bypass: operational` (или `work.item_kind: operational`), плюс в шаблоне AN-XX поле «вывод: эпик(и) / charter / operational note». Задача T4.

### Провал 3: связь Analysis ↔ Epic — N:M, не 1:1

Уже сегодня:
- один анализ (AN-20 «UX боли») рождает **несколько** будущих эпиков (`центр-управления`, `command-palette`, …);
- один эпик (`onebase-integration`) опирается на **несколько** анализов (AN-17, AN-21 и ещё неприсвоенные).

Метка `intake.analytics_key` сейчас одна на work item, и в AN-XX нет обратной ссылки на эпики. Это работает для маленьких анализов, но при росте теряется навигация.

**Канон:** разрешить `intake.analytics_keys` (множественное) на work item; в AN-XX ввести поле `feeds_epics: [<slug>, ...]`. Никаких runtime изменений не обязательно — это конвенция + lint warning. Задача T1 (формализация в protocol).

---

## 4. Definition of Ready / Definition of Done на переходах

Переходы должны быть проверяемыми, иначе пайплайн быстро превратится в формальность.

| Переход (`pipeline_stage`) | Готово к переходу, если… | Где проверяется |
|---|---|---|
| `intake → analyzed` | блок `Анализ:` заполнен, все 6 разделов непустые | сегодня — глазами; нужен lint, T3 |
| `analyzed → decided` | блок `Решение:` есть, `work.decision.verdict` ∈ {`useful`, `harmful`, `defer`}, `work.decision.at` непустой | частично есть в `backlogSchemaLint`; нужно усилить, T3 |
| `decided → ready` | `work.depends_on` либо пустой, либо все depends закрыты; назначен `work.owner_role`; `work.target_files` непустой | gate существует в `workItemExecutionGate.mjs`; нужно явно описать как DoR |
| `ready → executing` | claim записан в journal; нет конфликтующего claim другого worker | есть в `implement-worker-claim-idempotency-guard.work.bvc` (если уже done) |
| `executing → closed` | блок `Свидетельства:` непустой ИЛИ запись в evidence timeline; `trace.status: verified` для затронутых `target_files` | есть частично; формализовать как DoD, T3 |
| `closed → closing-analysis` | эпик закрыт (или ≥ X% подзадач эпика closed); промпт оператору | нет, T2 |

«Жёсткие» переходы (без `verdict` нельзя в `ready`) уже выполняет `workItemExecutionGate.mjs`. «Мягкие» (рекомендация заполнить evidence) пока висят на дисциплине оператора — это закрывается T3 как lint warning, а не error, чтобы не блокировать operational bypass.

---

## 5. Чего НЕ делать

- **Не вводить отдельную модель «Epic».** Эпик — это work item с `work.item_kind: epic` без `work.parent_id`. Сегодня уже так. Любая попытка завести параллельную таблицу `Epics` создаст второй источник правды и сломает Intent Roadmap Canvas, который читает один и тот же work-item store.
- **Не делать новую UI-вкладку «Дорожная карта».** Она уже есть как dagre-canvas (`implement-intent-roadmap-canvas-view` done). Улучшения — внутри неё (epic grouping + rollup, T5).
- **Не делать `parent_id` обязательным.** Operational задачи живут без родителя; принуждение к эпику ведёт к fake-эпикам (см. провал 2).
- **Не переписывать `parseWorkItems` под новый формат.** Все нужные метки уже парсятся; добавления — только новые опциональные ключи (`intake.analytics_keys`, `work.intake.bypass`, `analytics.feeds_epics`).

---

## 6. Что предлагаю сделать (эпик + 5 задач, см. файлы work.bvc рядом)

| ID | Цель | Слой |
|---|---|---|
| `epic-decision-pipeline-canonization` | объединить разбросанные части пайплайна в единый canon, закрыть три провала | `intent/system/runtime/work/` |
| T1: `document-decision-pipeline-canon` | новый `protocols/decision-pipeline-canon-v1.bvc` + страница в `docs/`, ссылающаяся на `workItemDecisionPipeline.mjs` | `intent/system/runtime/work/` |
| T2: `implement-closing-analysis-after-epic-done` | rollup hook: при `epic.status=done` предложить создать `work/analytics/closing-<epic-slug>.md` и записать `analytics.feeds_epics` в новый AN | `intent/system/runtime/work/` |
| T3: `implement-pipeline-stage-dor-dod-gates` | в `backlogSchemaLint` добавить DoR/DoD проверки по таблице из §4 (errors для жёстких, warnings для мягких) | `intent/system/runtime/work/` |
| T4: `document-operational-bypass-and-epic-policy` | в protocol из T1 описать `work.intake.bypass: operational`, charter-выход AN-XX, и явный «no fake-epic» rule | `intent/system/runtime/work/` |
| T5: `wire-roadmap-canvas-epic-grouping-rollup` | в `intentRoadmapCanvas` сгруппировать work items по `work.item_kind: epic` + rollup `N/M детей closed` на узле эпика | `intent/ui/dashboard/work/` |

Зависимости: T1 — корневая (canon). T2, T3, T4 — параллельные, depends_on T1. T5 — depends_on T1 + T3 (для отображения статусов гейтов).

---

## 7. Definition of «зелёного» эпика

`epic-decision-pipeline-canonization` считается closed, когда:

1. Protocol `decision-pipeline-canon-v1.bvc` опубликован и проходит проверку устава.
2. `backlogSchemaLint` ловит ≥ 1 каждого класса DoR/DoD-нарушения из §4 в фикстурах.
3. Один полный проход «AN → эпик → 2+ подзадач → доска → closed → closing-AN» отработан на живом примере (хороший кандидат — `центр-управления` из AN-20).
4. Intent Roadmap Canvas показывает эпик `epic-decision-pipeline-canonization` как узел с прогрессом подзадач.
5. AN-22 (этот документ) добавлен в `analytics-records.jsonl` и помечен `analytics.feeds_epics: [epic-decision-pipeline-canonization]` после правки protocol-схемы.

---

## 8. Связи с другими анализами

| AN | Связь |
|---|---|
| **AN-2** `parent-subtask-hierarchy` | базовое решение `work.parent_id`/`work.item_kind`, на которое опирается весь верхний слой эпиков |
| **AN-20** `ux-current-state-and-vector` | требование центр-управления и обратного контура обучения; T5 закрывает «эпик-узел в дорожной карте» как часть UX vector |
| **AN-21** `marketplace-integration-and-shared-design-system` | Work Graph как PM-инструмент для нескольких продуктов — без canon-пайплайна это не масштабируется |
| **AN-17** `onebase-integration-vertical-stack` | onebase-эпик — естественный второй пример (после центр-управления) для обкатки полного цикла |
| **`intent-graph-storage-roadmap`** | согласованность с длинной дорожной картой intent graph |

---

## 9. Кратко

- Пайплайн **правильный**, и большая его часть **уже работает в Work Graph** (`PIPELINE_STAGES`, `work.parent_id`, Intent Roadmap Canvas, intake AN→work).
- Что осталось — **назвать его каноном** (T1), закрыть **обратный контур learning** (T2), сделать **переходы проверяемыми** (T3), разрешить **bypass для operational/charter** (T4) и **поднять видимость эпиков на доске** (T5).
- Дополнительная UI-вкладка не нужна: epic-видимость встраивается в существующий Intent Roadmap Canvas.
- N:M между AN и эпиками — конвенция (`intake.analytics_keys`, `analytics.feeds_epics`), не миграция схемы.
- Все 5 задач лежат в `intent/<area>/work/` с `intake.analytics_key: AN-22` и `work.parent_id: epic-decision-pipeline-canonization`, чтобы пайплайн обкатался на собственном эпике.
