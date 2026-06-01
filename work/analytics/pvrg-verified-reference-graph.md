# AN-10: PVRG (Project Verified Reference Graph) — уникальная технология ioHasC

**Запрос:** «ищи ещё уникальные технологии в ioHasC, делай по ним отдельную аналитику».

## Кратко

PVRG — **детерминированный (без LLM) семантический граф проекта**, где код, `.bvc` и trace-связи становятся типизированными узлами/рёбрами одного графа. Это не «code search» (как Sourcegraph), не «AST graph» (как Treesitter), и не «knowledge graph» (как RDF) — это **код-aware project graph для AI-агентов с явной верификацией ссылок**.

В ioHasC уже есть: 40+ модулей в `src/pvrg-ui/` и `src/pvrg/`, отдельный `pvrg-core/` server, кэш с метриками (`PvrgCacheMetricsSliceV1` в GBC), GFS overlay, UI-карта, sidecar протокол. **Никто в OSS этого не делает в комбинации.** Уникальность достойна отдельного открытого стандарта.

## 1. Что есть сегодня

| Слой | Где | Назначение |
|---|---|---|
| **Парсер кода → PVRG узлы** | `pvrg-core/`, документация `docs/pvrg/pvrg.md` | детерминированно (без LLM): AST → `(#PVG<#process>)<...>` |
| **Логический индекс компонентов** | `src/pvrg-ui/logicalComponentIndex.js` | группировка путей в «логические компоненты» (A: одинаковая база; B: папка с index.*) |
| **UI architecture graph** | `src/pvrg-ui/buildUiArchitectureGraph.js` | агрегат по группам для карты |
| **PVRG cache + scan** | `src/pvrg/pvrgIohascScanCache.js`, `tests/pvrg-iohasc-scan-cache-and-implements.test.js` | кэширование результата сканирования |
| **Извлечение подграфа для агента** | `src/agent/pvrgSubgraphExtract.js` | срез графа в контексте задачи |
| **Plan-step PVRG enrich** | `src/agent/pvrgPlanStepEnrich.js`, `pvrgPreflightValidator.js` | префлайт «построил граф…» для агента |
| **Edge weights** | `src/ir/pvrgEdgeWeightsFile.js` | веса для приоритизации |
| **Overview metrics → GBC slice** | `src/iohascGbc/pvrgOverviewMetrics.ts`, `pvrgCacheMetricsSliceV1.ts` | метрики (nodes/edges, file/folder edges) в FlatBuffers |
| **GFS overlay** | `tests/pvrg-gfs-overlay-merge.test.js` | merge PVRG из GFS поверх дискового |
| **MCP/sidecar PVRG скилл** | `src/agent/pvrgProjectGraphSkill.js` | агент видит карту, может фокусироваться на узлах |
| **UI карта** | `src/panels/pvrgPanel.js`, `pvrgMapNodeCardHtml.js`, `pvrgToolbarIcons.js` | визуальный граф проекта |
| **Node description prompts** | `src/pvrg/pvrgMapNodeDescriptionPrompts.js` | LLM генерит описания узлов *после* детерминированного скана |
| **Project root query** | `src/pvrg/pvrgProjectRootQuery.js` | устойчивое определение корня для multi-root workspaces |

### Архитектурное обоснование (из `docs/pvrg/pvrg.md`)

Цитата: «Вместо LLM.generate(...) — `AST.parse() → Transform.rules.apply() → Validated.PVRG // 100% корректно`». Это **сознательный отказ** от LLM-генерации структуры графа в пользу детерминированного парсера. LLM используется только для **описания узлов**, не для извлечения структуры.

## 2. Зачем стандарт — какую боль решает

| Боль | Кто страдает | Чем сейчас закрывают |
|---|---|---|
| Sourcegraph code-graph — proprietary / enterprise | команды | используют grep / locate |
| Treesitter — только AST, нет project-level семантики | tooling-разработчики | пишут свой агрегатор поверх |
| AI-агенты получают «плоский RAG», теряют структуру | AI-агенты | возврат больших кусков кода |
| `.bvc` ↔ код связь поддерживается вручную (комментарии, GREP) | методологи | trace-links.json (см. AN-9) |
| LLM-генерация графов нестабильна и непроверяема | разработчики | детерминированный парсер (как делает PVRG) |
| Нет project-wide инвариантов: «есть step без implementation» | архитекторы | ручной аудит |
| Cursor / Cody / Augment видят только синтаксис, не «логические компоненты» | пользователи AI-IDE | догадываются по структуре файлов |

**Уникальное обещание PVRG:** «один граф проекта, в котором код, `.bvc`-канон, тесты, evidence — типизированные узлы с верифицированными рёбрами; агент видит структуру, человек видит карту, компилятор может валидировать инварианты».

## 3. Конкуренты — кто это умеет

| Инструмент | Сильно | Слабо по сравнению с PVRG |
|---|---|---|
| **Sourcegraph code-graph** | enterprise scale, SCIP индекс, навигация | proprietary, нет связи с канон-форматом, нет проверки инвариантов между документом и кодом |
| **Treesitter** | парсер для 50+ языков | только AST одного файла, не проектный граф |
| **GitHub code-search (Blackbird)** | глобальный поиск | без типизации, без графа |
| **LSP semantic tokens** | стандартизированы | в пределах файла, без проектного агрегата |
| **Cody / Cursor codebase indexing** | embeddings + symbol map | без явной типизации связей, без верификации |
| **Augment / Phind / Continue** | RAG по коду | плоский векторный, нет структуры |
| **Mind-map graph DBs (Neo4j, Memgraph)** | гибкость | требуют ручного импорта, нет парсера кода |
| **PROV-O (W3C)** | provenance | RDF, не для кода |
| **Bazel query / Buck targets** | build graph | про сборку, не про семантику |
| **CodeQL** | code queries | для security, не для агента |
| **ArchUnit / Structurizr DSL** | архитектурные правила | only Java / DSL, не проектная карта |
| **Mermaid / d2 / PlantUML** | диаграммы | без runtime-связи с кодом |
| **OpenTelemetry trace** | runtime trace | runtime, не статический граф |

**Главный конкурент в реальности:** Sourcegraph (proprietary) + Cursor codebase indexing (встроенный в IDE, неоткрытый формат). Открытого, переносимого, ориентированного на AI-агента code-aware project graph **нет**.

## 4. Что в PVRG действительно уникально

Семь вещей, которые **в одном пакете** не покрывает никто:

1. **Детерминированная (не-LLM) генерация** структуры графа из AST. LLM только описывает узлы (опционально). Гарантирует корректность.
2. **Логические компоненты A+B** (одинаковая база / папка с `index.*`) как primitive — никто не делает это как часть стандарта project graph.
3. **`.bvc` канон ↔ код через единый граф** — узел PVRG может быть и `.bvc`-атомом, и функцией. Это **первоклассная** двусторонняя связь.
4. **GFS overlay** — PVRG из бинарных срезов (`pvrg-cache-metrics.gbc`) накладывается на дисковый, агент видит «канонический» граф независимо от файловой системы.
5. **Извлечение подграфа для агента** — срез графа в контексте конкретной задачи, не «весь проект разом» (важно для tool-context budget).
6. **Preflight для plan-step** — агент **обязан** сначала «построить граф» в `pvrgPlanStepEnrich.js`. Это процедурный gate, а не optional оптимизация.
7. **Edge weights для приоритизации** — рёбра имеют веса, граф ранжируется. Это даёт RAG-like fusion без потери структуры.

## 5. Где PVRG обречён проиграть

1. **Заменить Sourcegraph в enterprise** — невозможно, у Sourcegraph SCIP-стандарт и большие интеграции.
2. **Конкурировать с Cursor indexing UX** — Cursor embedded, без шагов установки.
3. **Стать универсальным parser для 50 языков** — это работа на годы.
4. **Заменить Bazel/Buck/Nx build graphs** — другая ниша.
5. **Победить без английского** — `(#PVG<#process>)` нестандартный синтаксис.

## 6. Что нужно сделать (минимальный артефактный набор)

**6 артефактов**, без которых разговора о «стандарте» нет:

1. **Спецификация PVRG v1** (англоязычная, отдельный репо `step-canon/pvrg-spec`)
   - JSON Schema узлов и рёбер.
   - Типизация узлов: `step_atom`, `function`, `class`, `file`, `logical_component`, `test`, `trace_link`.
   - Типизация рёбер: `defines`, `references`, `implements`, `tests`, `imports`, `parent_of`.
   - Conformance levels: Core / WithComponents / WithTraceLinks.
2. **Reference parser** `@step-canon/pvrg-parser` — TypeScript adapters для JS/TS/Python (Babel + Treesitter), без LLM.
3. **`@step-canon/pvrg-format`** — типы графа + JSON Schema + serializer.
4. **CLI** `pvrg scan` / `pvrg query "kind=function AND has implements"` / `pvrg subgraph <node>` / `pvrg verify` (инварианты).
5. **GFS-format spec** (см. AN-11) — `pvrg-cache-metrics.gbc` как канон бинарного слайса.
6. **VS Code / Cursor extension** — карта проекта + clickable связи (как мини-Sourcegraph локально).

## 7. Пять стратегических подвариантов

| Под-PVRG | Суть | Срок | Шанс |
|---|---|---|---|
| **A: open code-graph standard** | Конкурент SCIP с типизированными уровнями | 6-12 мес | низкий (SCIP захватил нишу) |
| **B: AI-agent code map** | Standardize «subgraph for agent context» как часть MCP | 4-6 мес | **средний-высокий** |
| **C: `.bvc`-only project graph** | Узко: только связь канон ↔ код | 2-3 мес | средний |
| **D: spec & lib only** | Парсер + типы, без runtime ambition | 3 мес | средний (малый риск) |
| **E: 1С-vertical project graph** | для 1С: конфигурации, обработки, отчёты как узлы | 4-6 мес | средний (узкая ниша) |

**Моя ставка — B + E** (двойная игра, как и в AN-7/8/9).

## 8. Решения **до** начала работ

- **Имя**: «PVRG» расшифровка англоязычная (Project Verified Reference Graph). Сохранить.
- **EN-canon**: типы узлов и рёбер по-английски.
- **Coupling с `.bvc`**: PVRG — консьюмер `.bvc`, может работать без него.
- **SCIP-compat**: подумать о двусторонней конвертации с SCIP — это даёт «вход в Sourcegraph».
- **Лицензия**: CC BY 4.0 спека, Apache 2.0 код.

## 9. Риски

- SCIP закрепился в open code-graph (низкая вероятность бить лоб в лоб).
- Cursor выкатит свой «codebase API» через 6-12 мес (mitigate: быть первыми с MCP).
- Без killer-app мёртв.
- Coupling с Genesis/GVM/GFS блокирует распространение (см. AN-11/12).

## 10. Метрики через 6 месяцев

**Зелёные:**
- npm `@step-canon/pvrg-parser` ≥1K weekly downloads.
- Конвертер `pvrg ↔ scip` опубликован.
- VS Code extension ≥300 установок.
- 1 внешний проект использует PVRG в production.

**Красные:** никто не использует кроме автора → разворот в C/D (узкое applied use).

## 11. Что **не делать**

- Не пытаться поддерживать 50 языков сразу (TS/JS + Python — старт).
- Не привязывать к GBC/GVM (опциональный backend, не обязательный).
- Не делать LLM-генерацию структуры — это потеря определяющего преимущества.
- Не пытаться конкурировать с Sourcegraph по UX/scale.

## 12. Связь с другими аналитиками

- **AN-8 (`.bvc` canon)**: PVRG — natural consumer `.bvc`. Связка «канон смысла + граф проекта» — мощная.
- **AN-9 (IR/RichIR)**: PVRG включает trace-links к IR-узлам.
- **AN-11 (GBC/GFS)**: `pvrg-cache-metrics.gbc` — пример GBC-слайса. Loose coupling рекомендован.
- **AN-7 / позиция C (1С vertical)**: PVRG для 1С-конфигураций — практичная ниша.
- **AN-7 / позиция D (открытый канон)**: PVRG — третий стандарт под зонтиком `step-canon`.

## 13. Минимальный roadmap (10 недель)

| Неделя | Артефакт |
|---|---|
| 1 | Имя зафиксировано, репо `step-canon/pvrg-spec` создан |
| 2-3 | JSON Schema v1 + EBNF |
| 4-5 | `@step-canon/pvrg-format` (типы + serializer) |
| 6-7 | `@step-canon/pvrg-parser` (TS, через Babel) |
| 8 | CLI |
| 9 | VS Code extension с картой |
| 10 | Spec doc, examples, HN post |

## 14. Финальный вердикт

PVRG — **самая зрелая уникальная технология** ioHasC после `.bvc` и IR. Готова к стандартизировать. **Совместима** с AN-8/9 под зонтиком `step-canon`. Самый перспективный угол — **AI-agent code map для MCP**, не «убийца Sourcegraph».

---

**См. также:** [AN-7](product-self-audit-user.md), [AN-8](step-as-открытый канон-standard.md), [AN-9](ir-rich-ir-открытый канон.md), [AN-11 GBC/GFS](gbc-gfs-binary-slice-overlay.md), [AN-12 GVM](gvm-sbg-мандат-wasm-runtime.md).
