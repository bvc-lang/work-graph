# AN-15: Обзор остальных уникальных технологий ioHasC (краткие пред-аналитики)

**Запрос:** «ищи ещё уникальные технологии в ioHasC, делай по ним отдельную аналитику».

После полных AN-8…AN-14 (`.bvc`, IR/RichIR, PVRG, GBC/GFS, GVM/SBG, Uncertainty Barrier, Round-Trip) остаются ещё **8 уникальных треков**, заслуживающих рассмотрения. Здесь — **краткие пред-аналитики** (boundary, уникальность, конкуренты, рекомендация) для каждого. Любой можно развернуть в полную AN-NN по запросу.

---

## 15.1. HasC parser + Step Atom Draft + Deterministic Formatter

### Что это
- HasC — основной парсер `#Имя<[...]>` блоков (~`src/hasc/`).
- Step Atom Draft — JSON-схема (`schemas/step-atom-draft.v1.json`), которую LLM заполняет вместо raw `.bvc`.
- Deterministic formatter — `JSON draft → канонический #Имя<[...]>` блок, описанный в `protocols/llm-step-atom-writer.bvc`.

### Уникальность
1. **Двухступенчатый канон**: human writes `.bvc`, LLM writes JSON, formatter превращает в канон. Это решает «LLM портит синтаксис» **без** constrained generation.
2. **Метки как машинный конверт внутри человекочитаемого блока** — не frontmatter.
3. **Auto-detect charter режима по заголовку** (`#Устав…`).

### Конкуренты
- TypeScript Compiler API (для типов), tree-sitter (для парсинга) — низкоуровневые.
- Constrained generation (JSON Schema mode у OpenAI) — даёт data, не текст.
- Prettier / dprint — formatters для кода, не для канона.

### Рекомендация
**Standardize как часть AN-8** (это его core implementation). Отдельный стандарт не нужен — это reference impl.

---

## 15.2. Trace-Links v1

### Что это
- Отдельный формат `trace-links.v1.json` (`docs/trace-links.md`, `docs/trace-links-identifiers.md`).
- Произвольные связи «устав ↔ шаг ↔ узел CFG ↔ файл кода» без слияния графов.
- Каноническая trace `traceLinksCanonicalImplements.ts`, scanner `iohascTraceLinksFromScan.ts`, расхождение comparator `compareTraceLinksSnapshots.ts`.
- GBC слайс `TraceLinkSliceV1` для бинарного хранения.
- SARIF-вывод `semanticDriftSarif.ts` для IDE annotations.

### Уникальность
1. **Loose coupling**: связи живут отдельно от каждой стороны (не как foreign keys, а как third-party reference).
2. **SARIF integration** — расхождение сразу в IDE как warning.
3. **Multi-source**: scan кода + scan `.bvc` + ручные links.

### Конкуренты
- **OpenAPI links** — узко API.
- **JIRA матрица прослеживаемости** — manual.
- **DOORS / IBM Rational** — enterprise прослеживаемость требований.
- **Reqif / SysML** — formal, академично.
- **Backstage TechDocs** — для документации, не для links.

### Рекомендация
**Standardize как 4-й артефакт под `step-canon`** (`step-canon/trace-links-spec`). Сильная связка с AN-10 (PVRG) и AN-14 (round-trip). Низкая сложность, высокая ценность. **Полная AN — рекомендую сделать в следующий заход.**

---

## 15.3. Audit Gap Matrix + Code Gap Analyzer

### Что это
- `src/auditGapMatrixRefresh.mjs` (Work Graph) и `npm run check:audit-gap-matrix`.
- Code-gap analyzer (`src/scanner/codeGapAnalyzer.ts`) — обнаруживает пробелы между планом и кодом.
- Drift между задачей backlog и реальным состоянием реализации.

### Уникальность
1. **Inverted Gherkin**: не «что должно работать», а **«что не покрыто планом / тестами / evidence»**.
2. **Matrix-form report** — `M×N` ячеек: задача × проверка.
3. **CI mandatory gate**.

### Конкуренты
- **Coverage tools** — code coverage, не плановое покрытие.
- **Jira coverage plugins** — manual links.
- **SonarQube** — code quality, не plan coverage.
- **Compliance scanners (OpenSCAP, Chef InSpec)** — для security.

### Рекомендация
**Сильный кандидат для отдельной аналитики.** Уникален как «coverage-аудит на уровне плана задач». **Полная AN желательна.**

---

## 15.4. Vector DSL + Semantic Map taxonomy

### Что это
- Vector DSL (`docs/architecture-v2/vector-dsl-v1-spec-skeleton.md`, `iohasc-vector-dsl-ast-implementation.md`) — DSL для описания векторных pipelines в семантической карте.
- Semantic Map (`docs/architecture-v2/iohasc-semantic-map-step-paradigm.md`, `iohasc-semantic-map-react-flow-implementation.md`).
- Taxonomy engine (`adr-iohasc-phase12-semantic-map-taxonomy-engine.md`) + auto-fill daemon (`adr-iohasc-phase12-5-taxonomy-daemon-autofill.md`).
- Chess-taxonomy reference (`semantic-map-chess-taxonomy.md`).
- CI команда `npm run iohasc -- vector-preview`, `semantic-map`.

### Уникальность
1. **DSL для semantic projection** — не RDF query, не SPARQL, не Cypher — DSL для проекции векторов в карту.
2. **Auto-fill taxonomy** — фоновый daemon заполняет таксономию по данным.
3. **Chess как reference taxonomy** — необычный выбор для test.

### Конкуренты
- **RDF/OWL** — академично, тяжёлое tooling.
- **Cypher / Neo4j Bloom** — graph query.
- **Apache Atlas** — enterprise data catalog.
- **OpenMetadata / DataHub** — modern data catalogs.
- **AWS Glue Data Catalog** — managed.

### Рекомендация
**Сложный, узко-нишевой R&D трек.** Standardize не приоритет. Лучше — пред-аналитика с честной оценкой: «это R&D, не для MVP», как сделал charter с GVM.

---

## 15.5. Multi-Model Agent Roles + LiteLLM Router

### Что это
- `.iohasc/multi-model-roles.v1.json` — конфигурация ролей агента под разные модели.
- ADR `adr-iohasc-multi-model-roles-deferred.md`, `adr-iohasc-multi-model-explore-execute-phases.md`, `adr-iohasc-multi-model-roles-chains-appendix.md`.
- RFC `rfc-iohasc-internal-llm-round-router.md`.
- Router policy + телеметрия `agent_multi_model_route`.

### Уникальность
1. **Роли агента** (planner, executor, reviewer, …) **с разной моделью каждая**. Это model-routing на уровне фазы цикла агента, не на уровне tool.
2. **Через LiteLLM прокси** — один OpenAI-compatible URL, маршрутизация на стороне прокси.
3. **Multi-phase рабочий процесс** (explore vs execute) с разными моделями.

### Конкуренты
- **LangChain RouterChain** — primitive routing.
- **LiteLLM router** — это и есть основа.
- **Mixture-of-Experts** (Mistral, DeepSeek) — другой уровень.
- **OpenAI Assistants v2** — single model per assistant.
- **CrewAI / AutoGen** — multi-agent, не multi-model на одного агента.

### Рекомендация
**Pattern не уникален сам по себе** (LiteLLM router), но **роли-привязанная** policy — оригинальная. Standardize не нужен; **publish as best-practice pattern** с примером конфига.

---

## 15.6. Daemon Suggestion Journal (NDJSON)

### Что это
- Фоновый демон (`src/agent/workGraphDaemonTick.mjs`, `daemonAuditJournal`).
- `npm run daemon:once`, `daemon:watch`.
- Конфиг `.iohasc/daemon.config.json` + schema `docs/schemas/iohasc-daemon-config.v1.schema.json`.
- NDJSON suggestion journal — фоновый агент пишет suggestions для backlog без auto-apply.
- В Work Graph Rebuild — `workGraphDaemonWatch.mjs`.

### Уникальность
1. **Human-in-the-loop suggestion stream** — daemon не меняет состояние, а **предлагает** изменения.
2. **NDJSON append-only** — иммутабельный аудит-журнал.
3. **Self-improving system**: фоновый цикл анализа без блокировки операторской работы.

### Конкуренты
- **GitHub Dependabot** — узко dependencies.
- **Renovate Bot** — узко dependencies.
- **CodeRabbit / Greptile** — PR review.
- **Bugbot (Cursor)** — близко по идее.

### Рекомендация
**Pattern переносим и полезен.** Standardize не нужен, но **publish as architecture pattern** «human-in-the-loop daemon for self-improving systems». Сильная связь с AN-10 / AN-14.

---

## 15.7. GraphRAG bundle v1

### Что это
- `docs/architecture-v2/adr-iohasc-graph-rag-bundle-v1.md`.
- `src/agent/graphRagContextSlice.mjs`.
- Graph-aware RAG: контекст для LLM собирается из проекта по PVRG-графу, не по линейному similarity-search.

### Уникальность
1. **Структурный RAG** — graph traversal вместо плоского top-K cosine.
2. **PVRG-aware**: контекст «соседей» по графу проекта.
3. **Bundle as canonical artifact**: типизированный контекст-bundle, не свободный prompt.

### Конкуренты
- **GraphRAG (Microsoft)** — то же название, разный backend (LLM-derived knowledge graph).
- **LightRAG** — лёгкий GraphRAG.
- **LlamaIndex KnowledgeGraphIndex** — близко.
- **Neo4j + LangChain** — manual.
- **HippoRAG** — гипптокамп-вдохновлённый.

### Рекомендация
**Сильный кандидат для отдельной AN.** Конкурирует с Microsoft GraphRAG напрямую — нужен честный compare. **Полная AN рекомендована.**

---

## 15.8. Charter / Устав as Executable Law (lawtech)

### Что это
- `docs/architecture-v2/lawtech-charter-executable-law.md`.
- Charter profile (`detectCharterFormulationFromText`) — отдельный режим для уставов.
- L1 онтология (input/process/output/proof) как formal semantics для нормативных текстов.
- Composite Russian IDs (`#Труд_Результат_Доход<[`) как formal anchors.

### Уникальность
1. **Lawtech через `.bvc` BVC**: норматив — это шаг с Базисом (закон/обоснование), Вектором (предписанное действие), Целью (результат).
2. **Charter profile** ослабляет uncertainty barrier — уставы не штрафуются за отсутствие чисел.
3. **Executable charter**: норматив запускается через executor — провал = нарушение.

### Конкуренты
- **Catala** (INRIA) — DSL для исполняемого права. Близко.
- **OpenFisca** — для tax/benefits. Узко.
- **CCLAW (Computational Law)** — академично.
- **RuleEngine / Drools DRL** — generic.
- **Stanford CodeX** — legal informatics.

### Рекомендация
**Реальная ниша, но узкая.** RegTech RU — платёжеспособный сегмент. **Сильный кандидат для отдельной AN** при выборе позиции C (1С/lawtech vertical). **Полная AN рекомендована.**

---

## Сводная таблица: что делать дальше

| Тема | Уникальность | Standardize-готовность | Рекомендация |
|---|---|---|---|
| 15.1 HasC parser + Draft + Formatter | средняя | как часть AN-8 | reference impl в AN-8 |
| **15.2 Trace-Links v1** | высокая | высокая | **Полная AN-16** |
| **15.3 Audit Gap Matrix** | высокая | средняя | **Полная AN-17** |
| 15.4 Vector DSL + Taxonomy | средняя | низкая (R&D) | заметка в charter «experimental» |
| 15.5 Multi-Model Agent Roles | средняя | низкая | best-practice post |
| 15.6 Daemon Suggestion Journal | средняя | средняя | architecture pattern doc |
| **15.7 GraphRAG bundle v1** | высокая | средняя | **Полная AN-18** |
| **15.8 Charter as Executable Law** | высокая | средняя | **Полная AN-19** при выборе C |

## Что **не разбирать** дальше (явные R&D / тупики)

- **Genesis 2022 FFI / GxByteArray** — legacy, исторический интерес. Charter уже отложил.
- **Mermaid runtime UI** — не уникально, рудимент.
- **Drawio MMRA spec** — узкое applied tooling.
- **Genesis voice transcripts** — R&D, не уникально.

## Что ещё могло быть пропущено

- **Step Catalog v1** (`iohasc-step-catalog-v1-spec.md`) — каталог типов `.bvc`. Часть AN-8.
- **Composite ID + Anchor preservation** (`iohasc-composite-id-trace-links.md`) — часть AN-8 / 15.2.
- **Prompt Evaluation Framework** (`adr-iohasc-prompt-evaluation-v1.md`) — общая практика, не уникально.
- **Agent Thinking Mode v1** (`adr-iohasc-agent-thinking-mode-v1.md`) — близко к OpenAI o1/Claude extended thinking, не уникально.
- **MCP integration** — стандарт, не уникально.
- **Semantic search ANN HNSW + BM25 fusion** — хорошая инженерия, но не уникальная архитектура.
- **Genesis security system SBG** — связано с AN-12 GVM.

---

## Финальный вердикт по AN-15

**Из 8 кандидатов** 4 заслуживают полной AN:

| # | Кандидат | Приоритет |
|---|---|---|
| AN-16 | **Trace-Links v1** | высокий (низкая сложность × высокая ценность) |
| AN-17 | **Audit Gap Matrix** | средний (уникально, но узко) |
| AN-18 | **GraphRAG bundle v1** | высокий (актуальная тема × конкурент Microsoft) |
| AN-19 | **Charter as Executable Law** | средний-высокий (узкая, но платёжеспособная ниша) |

**Скажи, если делать полные AN-16…AN-19**, и я разверну каждую в формате AN-8…AN-14. Также готов сделать любую другую из «частичных» (15.1, 15.4, 15.5, 15.6) при необходимости.

---

**См. также:**
- **Полные аналитики:** [AN-8 step](step-as-открытый канон-standard.md), [AN-9 IR](ir-rich-ir-открытый канон.md), [AN-10 PVRG](pvrg-verified-reference-graph.md), [AN-11 GBC/GFS](gbc-gfs-binary-slice-overlay.md), [AN-12 GVM](gvm-sbg-мандат-wasm-runtime.md), [AN-13 Uncertainty](uncertainty-barrier-shannon-metric.md), [AN-14 Round-Trip](compiler-round-trip-low-code-каркас.md).
- **Позиционирование:** [AN-7 product audit](product-self-audit-user.md).
