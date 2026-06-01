# AN-16: Мета-обзор уникальных технологий ioHasC — соберётся ли из них продукт

**Запрос:** «нужна обзорная аналитика на все уникальные технологии вместе взятые, стоит ли из них что-то собирать цельное или можно чем-то заменить, какие продукты, какие боли».

## Кратко

В ioHasC есть **12-14 действительно уникальных технологий**. Технически они **складываются** в три когерентных продуктовых стека:

1. **Step-Canon Stack** (`.bvc` + IR + PVRG + Round-Trip + Trace-Links + Uncertainty) → открытый канон для AI-эпохи.
2. **OneBase Vertical Stack** (Step-Canon + мост OneBase + 1С-семантика + lawtech) → коммерческое управление конфигурациями 1С/OneBase.
3. **Genesis R&D Stack** (GBC + GFS + GVM + SBG мандат) → амбициозный R&D трек **с самой слабой продуктовой перспективой**.

**Главный риск:** все три стека сейчас в одном репо, не разделены, конкурируют за внимание автора. Стандартная картина «технического чуда без продукта». Без жёсткой деления и пивота за 6 мес — каждая отдельная технология заменимая, **связка** — нет.

## 1. Полный реестр уникальных технологий (AN-8…AN-15)

| AN | Технология | Уникальность сама по себе | Заменимо чем |
|---|---|---|---|
| AN-8 | **`.bvc` canon (BVC + named atom + labels)** | высокая | YAML+ADR conventions (теряется BVC) |
| AN-9 | **IR / RichIR (CFG + LLM normalizer)** | высокая | BPMN / LangGraph DAG (теряется trace-first) |
| AN-10 | **PVRG (Project Verified Reference Graph)** | высокая | SCIP / Sourcegraph (теряется типизация шагов) |
| AN-11 | **GBC / GFS (binary slices + overlay-VFS)** | средняя-высокая | FlatBuffers + custom glue (теряется `.b64`-twin) |
| AN-12 | **GVM + SBG Mandate (Wasm + policy)** | средняя | Wasmtime + OPA (close enough в 12 мес) |
| AN-13 | **Uncertainty Barrier + Shannon CFG bits** | **очень высокая** | ничем (нет аналога) |
| AN-14 | **Compiler Round-Trip + Low-Code Scaffold** | высокая | OpenAPI codegen + post-gen verify scripts (теряется reverse + protected zones) |
| 15.1 | HasC parser + Step Atom Draft formatter | средняя | tree-sitter custom grammar |
| 15.2 | **Trace-Links v1** | высокая | OpenAPI links / DOORS / manual (теряется loose-coupling SARIF) |
| 15.3 | **Audit Gap Matrix** | высокая | coverage + manual matrix (теряется inverted gherkin) |
| 15.4 | Vector DSL + Semantic Map taxonomy | средняя | DataHub / OpenMetadata |
| 15.5 | Multi-Model Agent Roles + LiteLLM router | средняя | прямо LiteLLM + AutoGen patterns |
| 15.6 | Daemon Suggestion Journal (NDJSON) | средняя | Dependabot / Renovate / Bugbot pattern |
| 15.7 | **GraphRAG bundle v1** | средняя-высокая | Microsoft GraphRAG / LightRAG (но без PVRG-aware) |
| 15.8 | **Charter as Executable Law (lawtech)** | высокая | Catala / OpenFisca (теряется BVC + RU canon) |

**Жёлтым** (★) — то, где замена *теряет суть*; не просто другой инструмент, а другая ментальная модель.

★ AN-8, AN-9, AN-10, AN-13, AN-14, 15.2, 15.3, 15.7, 15.8 — **9 из 14** действительно уникальны в комбинации. Остальные — хорошая инженерия, но заменима.

## 2. Три цельных стека — как они складываются

### Стек 1: **Step-Canon Stack** (открытый канон для AI-эпохи)

```
                       ┌────────────────────┐
                       │   .bvc canon      │  AN-8  ─── reference impl: HasC parser + Step Atom Draft formatter (15.1)
                       │   (BVC + Метки)    │
                       └─────────┬──────────┘
                                 ▼
                       ┌────────────────────┐
                       │   IR / RichIR      │  AN-9  ─── CFG + LLM normalizer + bracket-ir-trace envelope
                       │   (CFG + Rich)     │
                       └─────────┬──────────┘
                                 ▼
                       ┌────────────────────┐
                       │   PVRG project     │  AN-10 ─── scan + subgraph + overlay
                       │   graph (typed)    │
                       └─────────┬──────────┘
                                 ▼
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
     │ Round-Trip  │   │ Trace-Links │   │ Uncertainty     │
     │ Scaffold    │   │ v1          │   │ Barrier         │
     │ AN-14       │   │ 15.2        │   │ AN-13           │
     └─────────────┘   └─────────────┘   └─────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
     ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
     │ Audit Gap   │   │ SARIF расхождение │   │ Charter-as-     │
     │ Matrix      │   │ comparator  │   │ Executable Law  │
     │ 15.3        │   │ (часть 15.2)│   │ 15.8            │
     └─────────────┘   └─────────────┘   └─────────────────┘
```

**Цельность:** все ★-технологии вяжутся в один стек. `.bvc` — корень, IR — runtime, PVRG — статика, Round-Trip — codegen, Trace-Links — клей, Uncertainty — quality gate, Audit Matrix — измеритель, Charter — domain profile.

**Зонтик:** `step-canon` org на GitHub. Под зонтиком — отдельные npm-пакеты:
- `@step-canon/spec` (AN-8)
- `@step-canon/parser` (HasC + formatter)
- `@step-canon/ir` (AN-9)
- `@step-canon/pvrg` (AN-10)
- `@step-canon/каркас` (AN-14)
- `@step-canon/trace-links` (15.2)
- `@step-canon/uncertainty` (AN-13)
- `@step-canon/audit-gap` (15.3)
- `@step-canon/charter-law` (15.8)

**Продукт:** «**Compose of typed AI-context primitives**» — набор инструментов с открытым кодом, который позволяет любой команде ввести `.bvc` канон как управление layer над AI-агентами.

**Конкуренты на этом уровне:** нет когерентных. LangChain Hub, OpenAI Assistants v2, Cursor rules — у каждого один аспект, не вертикаль.

### Стек 2: **OneBase Vertical Stack** (управление 1С)

```
   Step-Canon Stack (стек 1)
              │
              ▼
   ┌──────────────────────┐
   │  OneBase Bridge      │  AN-17 (этот заход)
   │  (YAML + .os + REST) │   — metadata scan, PVRG, draft .bvc, MCP, skill
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │  1С semantic profile │  — uncertainty profile «1c-document-posting»
   │  + composite IDs     │  — Trace-Links: onebase:document:X, onebase:posting:Y
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Charter Executable  │  15.8 — нормативы 1С (учётная политика, регистры)
   │  Law (1С regtech)    │
   └──────────────────────┘
```

**Цельность:** OneBase даёт **первого внешнего пользователя** для всего Step-Canon Stack. Без OneBase это «канон без потребителя». С OneBase — это «канон 1С-конфигурации с AI-агентом, прослеживаемости и regtech».

**Конкуренты:**
- 1С Cognitive Architect / Конфигуратор — нет AI-агента, нет canon.
- Cursor + 1С — Cursor не понимает YAML/`.os` семантику.
- StarUML / Eraser / Whimsical — диаграммы, не runtime.
- Внутренние ITIL / ITSM — не для 1С-разработки.

**Продукт:**
- **«1C/OneBase консоль управления»** — SaaS / on-prem для команд, которые разрабатывают на 1С/OneBase и хотят AI-агента с прослеживаемостью.
- Цена: за seat + за пилотный проект внедрения.
- Заказчик: средний бизнес РФ/СНГ с большой 1С-конфигурацией, либо OneBase ранние пользователи.

### Стек 3: **Genesis R&D Stack** (бинарные слои)

```
   ┌──────────────────────┐
   │  GBC / GFS           │  AN-11 — FlatBuffers slices + overlay-VFS
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │  GVM + SBG мандат   │  AN-12 — Wasm capability runtime
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Genesis 2022 FFI    │  legacy (charter уже исключил из MVP)
   └──────────────────────┘
```

**Цельность:** только внутренняя. **Никаких** внешних потребителей. Charter явно отложил.

**Конкуренты сильны:** WASI 0.2 + wasmtime, дальше — sqlite-в репозитории, OCI manifests, git LFS.

**Продукт:** **нет**. Это R&D трек. Лучшее, что можно с этим сделать — **зафиксировать как experimental** в charter, написать blog post «pattern of binary slice + b64 twin», следить за WASI 0.2.

## 3. Боли, которые закрывает связка (по реальному рынку)

| Целевая боль | Кто болеет | Закрывает связка |
|---|---|---|
| **«Agent теряет контекст между задачами»** | команды с AI-coding-agents | Stack 1: PVRG + Trace-Links + `.bvc` memory |
| **«LLM генерирует код, не уверен в качестве»** | те же | Round-Trip + tsc/eslint verify + Audit Gap |
| **«ADR / устав документации устарели против кода»** | архитекторы | Trace-Links + расхождение SARIF |
| **«Рабочий процесс с расплывчатыми правилами в production»** | RegTech, compliance | Uncertainty Barrier + Charter Executable Law |
| **«1С/OneBase конфигурация не отслеживается между релизами»** | 1С/OneBase team | Stack 2: мост OneBase + Trace-Links + .bvc |
| **«AI-agent для 1С галлюцинирует имена объектов»** | те же | Stack 2: metadata describe + с ограничением по навыку tools |
| **«Нормативный акт не запускается»** | lawtech / regtech | Charter Executable Law + Uncertainty profile |
| **«PR review без проверки соответствия плану»** | engineering | Audit Gap Matrix + CI gate |
| **«RAG плоский, теряется структура»** | enterprise RAG users | GraphRAG bundle + PVRG-aware retrieval |

**Главная боль 2026:** **agent управление** — как держать AI-агента ответственным за изменения в кодовой базе. Cursor/Devin/Aider дают мощь, но **никто** не даёт **аудируемую** мощь. Step-Canon Stack — именно про это.

## 4. Что заменимо, что — нет

### Заменимо (если убрать — потеря средняя)

- **HasC parser** → tree-sitter custom grammar.
- **Step Atom Draft formatter** → constrained generation у OpenAI / JSON Schema mode.
- **Daemon Suggestion Journal** → паттерн, реализуется поверх любого scheduler.
- **Multi-Model Agent Roles** → LiteLLM router + конфиг.
- **Vector DSL + Semantic Map** → DataHub / OpenMetadata + custom pipelines.
- **GBC/GFS как формат** → FlatBuffers + git-LFS + ручной glue (потеряем `.b64`-twin elegance).
- **GVM/SBG** → WASI 0.2 + OPA в 12 месяцев.

### Незаменимо (если убрать — теряется суть)

- **`.bvc` BVC триада** — никто не делает Basis+Vector+Goal как первоклассную структуру.
- **`.bvc` Метки внутри блока** — машинный конверт **без** frontmatter, нигде нет.
- **`.bvc ↔ IR ↔ PVRG ↔ Code` round-trip** — комбинация уникальна.
- **Uncertainty Barrier для прозы** — runtime readability gate **никто** не делает.
- **Charter profile + lawtech** — `.bvc` уставы как первоклассный режим — нигде.
- **Trace-Links SARIF расхождение** — отдельный формат + IDE annotations — нигде в одном пакете.
- **Audit Gap Matrix как inverted-coverage** — нигде.
- **PVRG GFS overlay + извлечение подграфа для агента** — нигде.

**Вывод:** **связка** уникальна и незаменима, **отдельные части** имеют альтернативы.

## 5. Что собирается в продукт vs что **никогда** не соберётся

### Собирается в продукт ✅

| Продукт | Из чего собирается | Killer feature | Срок MVP |
|---|---|---|---|
| **`step-canon` open toolkit** | Стек 1 (AN-8/9/10/13/14, 15.2/15.3) | `.bvc` + Round-Trip + Uncertainty | 4-6 мес |
| **«1С/OneBase консоль управления»** | Стек 2 (Стек 1 + OneBase + lawtech) | AI-agent для 1С с прослеживаемостью | 6-9 мес |
| **«RegTech `.bvc` для нормативов»** | подмножество (AN-8, AN-13, 15.8) | charter profile + uncertainty barrier | 6-9 мес |
| **«AI-agent code управление»** | Стек 1 + MCP integration | PVRG subgraph + Audit Gap CI gate | 4-6 мес |

### Никогда не соберётся в самостоятельный продукт ❌

| Кандидат | Почему |
|---|---|
| **GVM/SBG как Wasm runtime** | WASI 0.2 догонит |
| **GBC/GFS как формат** | внутренний artifact, не продукт |
| **Vector DSL отдельно** | конкуренция с DataHub слишком сильная |
| **Multi-Model Roles** | конфиг-pattern, не продукт |
| **HasC parser отдельно** | tooling, не продукт |

## 6. Сравнительный анализ против больших конкурентов

| Конкурент | Что у него сильнее ioHasC | Что **у ioHasC** сильнее |
|---|---|---|
| **Cursor** | UX, встроенный в IDE, массовое распространение | управление, `.bvc` canon, audit, lawtech |
| **Devin / Cognition** | autonomous coding на длинных задачах | с открытым исходным кодом, прослеживаемости, без привязка к поставщику |
| **GitHub Copilot Workspace** | масштаб, scale-out | locality, открытая канон-семантика |
| **LangChain / LangGraph** | экосистема цепочек | IR с CFG + Uncertainty + Trace-first |
| **n8n / Airflow / Camunda** | mature рабочие процессы | `.bvc` canon + LLM normalizer + RegTech |
| **Sourcegraph / Cody** | code-graph at scale | `.bvc` ↔ code round-trip + открытый канон |
| **Microsoft GraphRAG** | LLM-derived knowledge graph | детерминированный PVRG + project-aware |
| **OpenAI Assistants v2 / GPTs** | distribution | open, self-hosted, auditable |
| **Cursor Rules / Cursor Memory** | embedded | exportable canon, не lock-in |
| **Catala / OpenFisca** | lawtech academic | `.bvc` BVC для RU нормативов + executor |
| **1С Конфигуратор** | массовое распространение в РФ | AI-агент с управлением и прослеживаемостью + lawtech |

**Главный угол:** **никто** не закрывает `управление + canon + AI-agent + 1С vertical` в одном пакете.

## 7. Стратегия «как собирать»

### Вариант A: **Three-Stack split** (рекомендуемый)

1. **Месяцы 0-2:** жёсткий split репозиториев:
   - `step-canon/*` — публичный, MIT/Apache.
   - `iohasc/onebase-управление` — privately-developed, public после MVP.
   - `iohasc/experimental` (GBC/GFS/GVM/Genesis) — отдельный репо, статус «R&D, not for production».
2. **Месяцы 2-4:** `@step-canon/spec` + `@step-canon/parser` + `@step-canon/uncertainty` + `@step-canon/round-trip` + `@step-canon/trace-links` MVP-пакеты. Один HN/Reddit/Lobste.rs post.
3. **Месяцы 4-9:** OneBase консоль управления MVP. **Один** пилот с реальным OneBase-проектом. Платный.
4. **Месяцы 9-12:** в зависимости от интереса к OneBase MVP — либо удваиваем Stack 2, либо переключаемся на RegTech.
5. **Genesis R&D Stack замораживается** до 2027.

### Вариант B: **Только открытый канон** (минимальный риск)

Только Stack 1, без коммерческого продукта. Заработок — позже, на консультациях.

### Вариант C: **1С Vertical Only** (максимальный риск)

Сразу Stack 2, без открытого канона публикаций. Все ресурсы — на одного пилотного клиента. Если пилот сорвётся — катастрофа.

### Вариант D: **Status quo** (худший)

Продолжать развивать всё параллельно, без split. Через 12 мес — bus factor 1, никаких внешних пользователей, выгорание.

**Моя ставка: A.** Конкретный, разделённый, проверяемый.

## 8. Можно ли заменить каждый из стеков «снаружи»?

| Стек | Замена снаружи существует? | Что теряется |
|---|---|---|
| **Step-Canon Stack** | Нет (целиком). Частично — LangChain Hub + ADR conventions + Cursor rules + SARIF. | BVC семантика, Uncertainty Barrier, Round-Trip, единая канон-точка |
| **OneBase Vertical Stack** | Нет. 1С Конфигуратор + ручные ADR — близко, но без AI-агента. | AI-агент с управлением и прослеживаемостью, lawtech-режим |
| **Genesis R&D Stack** | Да. WASI 0.2 + wasmtime + OPA + sqlite/CRDT. | Только `.b64`-twin elegance |

## 9. Главный риск для всех трёх стеков

**Распыление автора и отсутствие пилота.** Все стеки одного автора, без внешних committed contributors. Через 6 мес без внешних пользователей мотивация падает, проект становится «вечным R&D». Это **повторяет** болезнь из AN-6 (технический долг и отсутствие внешнего value).

## 10. Финальный вердикт

**Технически:** из 14 уникальных технологий легко собираются 3 когерентных стека. Из них 2 (Step-Canon + OneBase Vertical) — потенциально продуктовые. 1 (Genesis R&D) — внутренний эксперимент.

**Продуктово:** без жёсткого split и одного пилотного клиента OneBase к концу 2026 — проект застрянет в режиме «технического чуда без продукта». Это **тот же диагноз**, что и в AN-7, но теперь — с инвентарём, который **обосновывает** существование продукта.

**Что делать сейчас:**

1. **Зафиксировать split** в charter/main.bvc (Stack 1 = public, Stack 2 = vertical, Stack 3 = experimental).
2. **Семинать задачи** под `step-canon` MVP (5-7 пакетов, 4-6 мес).
3. **Найти OneBase пилота** (1 команда, 1 живая 1С/OneBase конфигурация, 1 живой `.bvc` эталонный сценарий).
4. **Genesis R&D — заморозить** на 6 мес, периодически проверять WASI 0.2.
5. **Audit Gap Matrix включить в CI** — это даёт измеримое признание движения.

**Метрики через 6 месяцев:**

- ≥3 npm-пакета `@step-canon/*` опубликованы, ≥500 weekly downloads на любой из них.
- ≥1 платящий пилот OneBase.
- ≥1 ADR от внешнего автора в `step-canon/spec`.
- Genesis R&D зафиксирован как experimental, **не доразвивается**.

Если ничего из этого не случилось — пересмотр стратегии, возможно переход к Варианту B.

---

**См. также:** [AN-7 product audit](product-self-audit-user.md), [AN-8](step-as-открытый канон-standard.md), [AN-9](ir-rich-ir-открытый канон.md), [AN-10](pvrg-verified-reference-graph.md), [AN-11](gbc-gfs-binary-slice-overlay.md), [AN-12](gvm-sbg-мандат-wasm-runtime.md), [AN-13](uncertainty-barrier-shannon-metric.md), [AN-14](compiler-round-trip-low-code-каркас.md), [AN-15 overview](other-unique-technologies-overview.md), [AN-17 OneBase](onebase-integration-vertical-stack.md).
