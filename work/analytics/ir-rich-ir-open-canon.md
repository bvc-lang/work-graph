# AN-9: IR и RichIR как открытый канон — что нужно для стандарта

**Запрос:** «сделай отдельно аналитику по IR и RichIR так же как со step».

## Кратко

IR в ioHasC — это **исполнимый CFG поверх `.bvc` BVC-канона**: текст шагов нормализуется в типизированный граф решений и действий, по которому работают барьер, метрика Шеннона, trace-связи. **RichIR** — это надстройка с доменами, версиями, ссылками `#`/`*` и L2-подъязыком, дающая инструментам гарантии, которых нет в строках.

В отличие от `.bvc` (см. AN-8), IR — это **уже зрелый артефакт**: 70+ модулей в `src/ir/`, формальная схема `TurIrBundle` / `TurIrStep`, валидатор `validateIrFlow`, два исполнителя (`executeTurIr`, `executeIrFlowCfg`), LLM-нормализатор. Но он:
- живёт **только в исходном `D:/Work/IDE/project`**, в Work Graph Rebuild ещё **не портирован**;
- не имеет публичной спецификации, npm-пакета, conformance suite;
- конкурирует с **BPMN, DMN, n8n JSON, LangGraph state** — каждый из которых имеет vendor.

Сделать стандарт — **сложнее, чем `.bvc`**, потому что исполнительные IR — занятая ниша. Но есть свободное окно: **AI-agent reasoning trace IR** — формат, в который LLM нормализует прозу в исполнимый граф **с BVC-семантикой**. Это никто не делает, и тут IR/RichIR действительно уникален.

## 1. Что есть сегодня (фактический срез из `D:/Work/IDE/project`)

### Структура IR

```
                   LLM normalizer
   .bvc text  ───────────────────►  IR JSON (CFG)
       │                                  │
       ▼                                  ▼
   HasC AST                         validateIrFlow
       │                                  │
       ▼                                  ▼
  normalizeHascAstToTurIr        executeIrFlowCfg
       │                                  │
       └──────►  TurIrBundle  ◄───────────┘
                       │
                       ▼
                  executeTurIr
                  (linear barrier)
                       │
                       ▼
                trace + Shannon metrics
```

### Слои

| Слой | Где | Назначение |
|---|---|---|
| **Core IR** — `TurIrStep` | `src/ir/turIr.ts` | id + basis/vector/goal — минимум для исполнителя |
| **RichIR** — `TurIrStep` Rich-поля | там же | domain, stepVersion, lexicalUid, references, basisL2 |
| **IR потока 1.0** — `Decision/Action/Merge` | `src/ir/validateIrFlow.js`, `executeIrFlowCfg.js` | CFG с явными рёбрами и условиями |
| **Bundle** — `TurIrBundle` | `src/ir/turIr.ts` | контейнер steps + terms + schemaVersion |
| **L1 онтология** — `TurIrOntologyTerm` | там же | input/process/output/proof |
| **Sidecar для генерации кода** | `schemas/turir-code-rich-sidecar.v1.json` | rich-поля для codegen |
| **LLM нормализатор** | `src/llm/irNormalizer.js` | прозу → JSON IR |
| **Trace links** | `docs/trace-links.md` | `.bvc ↔ шаг ↔ CFG ↔ код` без слияния графов |
| **Bracket IR cache** (Phase 11) | `src/parser/bracketIrVectorHash.ts` | vectorHash для bracket секций |

### Что зафиксировано

- **`TUR_IR_RICH_SCHEMA_VERSION = 2`** — версия Rich-DTO.
- **`iohasc.system.v1`** — схема снимка прогона для внешних интеграций.
- **IR потока 1.0** — спецификация в `docs/ir-flow-1.0-llm-normalizer.md`.
- **Nested array codec v1** — `nestedArrayTurIrCodec.ts` для минимального набора полей.
- **`turir-code-rich-sidecar.v1.json`** — JSON Schema для sidecar.

### Что **не** зафиксировано

- Единая публичная спека (есть документация, но не RFC-grade).
- Отдельный npm-пакет.
- Conformance test suite.
- Внешние адаптеры (BPMN/n8n/LangGraph).
- Английская версия.

## 2. Зачем стандарт — какую боль решает

| Боль | Кто страдает | Чем сейчас закрывают |
|---|---|---|
| LLM пишет прозу — нет проверяемого исполнения | AI-агенты | прямой code execution через function calling, нет проверки логики |
| BPMN тяжёлый, XML, enterprise-only | разработчики | n8n / Airflow / Argo / Temporal — каждый свой DSL |
| Decision tables не интегрируются с CFG | бизнес-аналитики | DMN отдельно, BPMN отдельно |
| Рабочий процесс-фреймворки несовместимы (LangGraph / CrewAI / AutoGen) | AI-разработчики | переписывать с нуля при смене фреймворка |
| Нет CFG-формата с **prior cause** (Базис) | методологи | в BPMN/DMN нет «обоснования», только action |
| Нет связи «текст устава ↔ исполняемый граф» | regulated industries | ручная трассировка в Excel |
| LLM трудно генерировать BPMN XML | AI | нет нативной поддержки моделями |

**Уникальное обещание IR/RichIR:** «один типизированный граф, в который LLM нормализует прозу, исполнитель проверяет барьер, RichIR даёт инструментам референс-целостность; меньше тяжести, чем BPMN, больше семантики, чем n8n JSON».

## 3. Конкуренты — что они умеют, чего не умеют

| Формат / runtime | Сильно | Слабо для AI-канона |
|---|---|---|
| **BPMN 2.0** (Camunda, Flowable, Zeebe) | enterprise зрелый, XML, графический редактор | XML, тяжёлый, плохо генерируется LLM, нет BVC |
| **DMN 1.4** (Camunda) | decision tables зрелые | только решения, нет CFG |
| **CMMN** | case management | мёртвый стандарт, мало tooling |
| **Petri nets** | формальная мощь | академично, нет мейнстрим tooling |
| **Argo Рабочие процессы** | k8s-native CFG | YAML, k8s lock-in, узко DevOps |
| **Airflow DAG (Python)** | de-facto data pipelines | Python-only, code-as-config |
| **Prefect / Dagster** | data orchestration | узко data |
| **Temporal Рабочий процесс** | durable execution | code-as-config (TS/Go/Java) |
| **n8n рабочий процесс JSON** | low-code, open, big сообщество | UI-coupled, нет формальной спеки |
| **Zapier zap JSON** | mass-market | proprietary, нет execution outside |
| **GitHub Actions YAML** | CI-узкий | только CI |
| **LangGraph state graph** | AI-agent CFG, де-факто стандарт | Python lock-in, нет независимой спеки |
| **CrewAI / AutoGen task graph** | мульти-агент | каждый свой формат, нет интеропа |
| **Microsoft Power Automate JSON** | enterprise scale | proprietary |
| **Drools DRL** | rule engine | Java, мёртв вне JVM |
| **LLVM IR / MLIR** | компиляторный IR, machine code | не для бизнес-процессов |
| **Cucumber Gherkin** | BDD граф | узко тесты |
| **PROV-O (W3C)** | provenance | RDF, нечитаемо |
| **OpenAI function spec / tools schema** | AI tool calls | один шаг, не граф |

**Главные конкуренты в реальности:**
- для **исполнительной ниши** — BPMN+DMN (enterprise), n8n (open low-code), LangGraph (AI agents);
- для **AI-context ниши** — LangGraph state, AGENTS.md (плоский), `.cursor/rules` (без CFG).

## 4. Что в IR/RichIR действительно уникально

Восемь вещей, которые **в одном формате** не покрывает никто:

1. **BVC на каждом узле CFG** — `basis/vector/goal` для шага в графе. У BPMN есть Task с name и documentation, но не типизированный prior cause.
2. **Бесшовный мост `.bvc` ↔ IR** — текст BVC автоматически нормализуется в IR через `mapStepFileTextToTurIrRichMvp`; обратно — генерация прозы из IR.
3. **LLM как first-class normalizer** — `buildIrFlowNormalizerPrompt` + JSON Schema → стабильная генерация. Никто из BPMN/n8n не строит LLM-friendly IR.
4. **RichIR поверх Core** — domain / stepVersion / references / basisL2 как опциональный слой, не ломающий минимальный исполнитель. Это аналог Rich AST в компиляторах, но для бизнес-правил.
5. **Барьер по uncertainty** — `measureStepUncertainty` гасит исполнение шагов с размытой формулировкой. У BPMN/n8n такой семантики нет.
6. **Метрика Шеннона по CFG** — `shannonInformationGainBits` на каждом ветвлении. R&D-feature, но уникальная.
7. **L1 онтология рядом с шагами** — `TurIrOntologyTerm` с input/process/output/proof. Это **семантический слой**, который в рабочий процесс-движках вынесен в отдельные системы (knowledge graph).
8. **Trace-links как first-class** — `.bvc ↔ IR node ↔ code file` через отдельный формат без слияния графов.

## 5. Где IR/RichIR обречён проиграть

1. **Заменить BPMN в enterprise** — невозможно (Camunda, IBM, Oracle, SAP). Регулируемые отрасли не возьмут «yet another IR».
2. **Заменить LangGraph для AI-агентов** — Python lock-in выиграл, у Anthropic и OpenAI свои direction.
3. **Победить n8n в low-code automation** — UI-network effect, marketplace, integrations.
4. **Стать execution runtime** — это soaked рынок, требует SDK на 5+ языках, durable execution, observability.
5. **Стать стандартом без английского** — `Базис/Вектор/Цель` нечитаемо глобально; нужен EN-canon.
6. **Конкурировать с MLIR** — другая ниша (compiler), но имя «IR» создаёт путаницу.

## 6. Что нужно сделать (минимальный артефактный набор)

**8 артефактов**, без которых разговора о «стандарте» нет:

### Артефакт 1: Формальная спецификация v1 (англоязычная)

- JSON Schema для:
  - **Core IR**: `TurIrStep` (id, basis/vector/goal, edges)
  - **RichIR**: те же поля + domain, stepVersion, references, basisL2
  - **IR Flow 1.0**: Decision/Action/Merge с edges и conditions
  - **Bundle**: контейнер steps + terms + schemaVersion
  - **TraceLinks**: `.bvc ↔ node ↔ code`
- EBNF для линейной формы IR (опционально).
- **Conformance levels:** Minimal / Core / Rich / Flow / Trace.
- **Билингва:** EN-canon + RU-aliases (как в AN-8 для `.bvc`).
- Лицензия: **CC BY 4.0** для спеки, **Apache 2.0** для кода.

### Артефакт 2: Reference parser/validator (npm `@step-canon/ir`)

- `parseIr(json) → IrBundle` с типизацией.
- `validateIr(bundle) → Diagnostic[]` (порт `validateIrFlow.js`).
- `richify(bundle) → RichBundle` (валидация Rich-полей отдельно).
- Zero deps, browser+node, MIT.

### Артефакт 3: Reference executor (npm `@step-canon/ir-runtime`)

- `executeLinear(bundle, facts) → Trace` (порт `executeTurIr`).
- `executeCfg(bundle, evaluateCondition) → Trace` (порт `executeIrFlowCfg`).
- **Чистые функции**, никакой завязки на UI / Node-only API.
- Барьер `measureStepUncertainty` — отдельный плагин, не ядро (это R&D feature).

### Артефакт 4: CLI

`npx @step-canon/ir-cli`:
- `ir validate <files>`
- `ir run <bundle.json> --facts facts.json`
- `ir trace <bundle.json>` — выгрузка execution log
- `ir from-step <text.bvc>` — нормализация
- `ir to-bpmn <bundle.json>` — экспорт в BPMN (опционально)

### Артефакт 5: Adapters

Минимум **3 адаптера**, чтобы доказать интероп:
- `step ↔ ir` (уже есть, выделить).
- `ir ↔ bpmn` (минимальное подмножество).
- `ir ↔ langgraph` (через Python interop или JSON intermediate).
- Опционально: `ir ↔ n8n`, `ir ↔ mermaid flowchart`.

### Артефакт 6: LLM normalizer как отдельный пакет

`@step-canon/ir-llm`:
- `buildPrompt(text, schema) → string` (порт `buildIrFlowNormalizerPrompt`).
- `parseResponse(text) → IrBundle | Error`.
- **Bench suite**: 50 эталонных проз → ожидаемый IR. Запуск на разных моделях (Claude/GPT/Llama) → отчёт **точность нормализации**.
- Это даёт **измеримый PR-материал**: «`.bvc` нормализуется в IR на 94% точности на gpt-4».

### Артефакт 7: Conformance test suite

- Папка `tests/conformance/`:
  - `core/` — минимум для линейного executor.
  - `rich/` — Rich-поля и их семантика.
  - `flow/` — CFG валидация.
  - `trace/` — trace-links формат.
- CI badge «Conformance: Core ✓ Rich ✓ Flow ✓ Trace ✗».
- Блокирует диалект-расщепление между реализациями.

### Артефакт 8: Документация + примеры

- Spec doc: «What is IR / RichIR / IR Flow 1.0».
- Gallery:
  - простой линейный pipeline;
  - decision tree (банк выдаёт кредит);
  - multi-domain рабочий процесс (billing + audit);
  - AI agent reasoning trace;
  - 1С/OneBase бизнес-правило.
- Сравнительная таблица с BPMN / n8n / LangGraph.
- Один пост на HN/Lobsters/dev.to: **«IR with Basis/Vector/Goal: an LLM-friendly рабочий процесс format»**.

## 7. Пять стратегических подвариантов внутри IR-направления

| Под-IR | Суть | Срок | Шанс | Конкуренция |
|---|---|---|---|---|
| **IR-A: Enterprise BPMN-killer** | Лёгкая альтернатива Camunda с BVC и LLM-normalizer | 6-12 мес | низкий | BPMN экосистема убийственна |
| **IR-B: AI-agent reasoning trace IR** | Формат, в который LLM нормализует прозу в исполнимый граф; интероп между фреймворками | 3-4 мес | **средний-высокий** | LangGraph (Python lock-in), AGENTS.md (плоский) |
| **IR-C: Low-code рабочий процесс IR** | Open n8n-like, но с CFG и BVC | 6-9 мес | низкий-средний | n8n network effect |
| **IR-D: Spec & lib only** | Просто `@step-canon/ir` пакет + spec, без runtime ambition | 2-3 мес | средний (малый риск) | конкурирует с типовыми JSON Schema |
| **IR-E: Compiler-IR-style для бизнес-правил** | Аналог MLIR для domain rules, dialects | 12+ мес | низкий | MLIR концептуально захватил термин |

**Лично моя ставка внутри IR — IR-B** (AI-agent reasoning trace). Причина:
- LangGraph закрепил Python lock-in, JS/TS-вселенная пустая.
- AGENTS.md / `.cursor/rules` плоские, без CFG.
- IR с BVC даёт **обоснование** действий агента (basis = prior context), это новый primitive.
- MCP как канал дистрибуции.

## 8. Что нужно решить **до** начала работ

| Решение | Варианты | Моя рекомендация |
|---|---|---|
| Имя | IR / TurIR / RichIR / **новое** | **новое**: «IR» путается с MLIR/LLVM. Например `BVC-IR` или `StepFlow IR` |
| Линейный + CFG в одном пакете? | объединить / разделить | **разделить**: `@bvc/ir-linear` + `@bvc/ir-flow` |
| Английский canon | EN-only / RU-only / bilingual inline | **EN canonical + registered dialects** ([AN-19](bvc-multilingual-keys-design.md), [ADR](../docs/adr-bvc-multilingual-keys.md)) |
| Где живёт спека | в Work Graph / в `D:/Work/IDE/project` / **отдельный репо** | **отдельный** `bvc-lang/ir-spec` |
| Лицензия | MIT / Apache / CC | **CC BY 4.0** для спеки, **Apache 2.0** для кода |
| Барьер и Шеннон — часть стандарта? | да / нет / опционально | **опциональный плагин** (R&D feature, не блокирует базу) |
| L1 онтология — часть IR? | да / нет / отдельная спека | **отдельная** `bvc-lang/ontology` (см. §12) |
| LLM-нормализатор — часть стандарта? | да / нет | **референсная реализация в стандарте**, обязательный bench |
| Coupling с .bvc | tight / loose / none | **loose** — IR консьюмер `.bvc`, не часть его |
| Связь с MCP | да / нет | **да** — IR как payload для tool-calls и agent context |

## 9. Риски — что убивает IR/RichIR

| Риск | Вероятность | Митигация |
|---|---|---|
| Имя «IR» создаёт путаницу с LLVM/MLIR | **высокая** | переименовать (BVC-IR, StepFlow, …) |
| LangGraph закрепится как де-факто AI-agent CFG | высокая | быть первым в JS/TS-вселенной + MCP-integration |
| LLM-нормализатор не достигнет 90%+ точности | средняя | Bench-suite с первого дня + JSON Schema constrained generation |
| BPMN-сообщество отвергнет «yet another» | высокая | не конкурировать с enterprise BPMN, позиционировать иначе |
| Coupling с `.bvc` блокирует распространение | высокая | разделить репо, спецификации, npm-пакеты |
| Trace-links не приживутся без vendor IDE | средняя | минимальный LSP plugin для VS Code/Cursor |
| Бус-фактор 1 | высокая | сообщество RFC process сразу |
| Без killer-app — мёртв | высокая | связать с AN-8 (`.bvc` spec) и AI-agent context |
| Patent landscape (BPMN, DMN) | низкая | избегать прямых заимствований нотации |

## 10. Метрики успеха через 6 месяцев

**Зелёные:**
- Спека на GitHub, ≥150 stars, ≥5 external contributors.
- npm `@step-canon/ir` опубликован, ≥1K weekly downloads.
- LLM normalizer bench: ≥90% точность на gpt-4, ≥80% на claude-3.5.
- 2+ адаптера: `ir ↔ bpmn`, `ir ↔ langgraph`.
- 1 внешний проект использует IR в production.

**Жёлтые:**
- Спека зафиксирована, парсер опубликован, но <500 stars и <3 contributors.
- Bench работает, но без публичных бенчмарков других моделей.

**Красные (= IR-направление не работает, разворот):**
- LLM normalizer не достигает 80% даже на лучших моделях → IR не для LLM, разворот в IR-A (BPMN-killer) или IR-D (lib only).
- Никто кроме автора не открыл PR за 3 месяца.

## 11. Что **не делать**

- Не строить execution runtime для всех языков (только TS, опционально WASM).
- Не пытаться заменить BPMN или LangGraph целиком.
- Не привязывать IR к `.bvc` единственным источником — IR должен принимать и BPMN-импорт, и ручной JSON.
- Не делать барьер / Шеннон-метрику обязательной частью ядра.
- Не оставлять RU-only.
- Не публиковать без bench LLM-нормализатора — это **главный публичный аргумент**.
- Не делать «всё в одном репо».

## 12. Связь с другими позициями и аналитиками

### С AN-8 (`.bvc` как открытый канон)

IR — **естественное продолжение** `.bvc`. Если `.bvc` это «канон смысла», то IR это «канон исполнения». Они работают парой:

```
.bvc (BVC text, AN-8)  ──parse──►  HasC AST  ──normalize──►  IR (CFG, AN-9)  ──execute──►  Trace
                ▲                                                                              │
                └──────────────────────  generate prose  ◄──────────────────────────────────────┘
```

**Совместная стратегия:** один зонтичный бренд `step-canon` с двумя стандартами:
- `step-canon/spec` — формат канона (AN-8)
- `step-canon/ir-spec` — формат исполнения (AN-9)
- `step-canon/ontology` — L1 термины (опционально)
- `step-canon/trace-links` — связи с кодом

### С AN-7 / позицией C (1С vertical)

IR — **критическая часть vertical 1С**. Бизнес-правила 1С (проводки, отчёты, бюджеты) **по структуре** — это CFG с BVC: «если остаток > 0 → провести → отразить в учёте». IR с домен-полем (`domain: 'accounting'`) и Rich-references — естественная модель.

Это даёт **двойную игру**:
- Open spec IR — для сообщество.
- 1С-vertical использует IR как исполнитель бизнес-правил — для денег.

### С AN-7 / позицией D (открытый канон)

Если идти в D, IR/RichIR — **второй артефакт после `.bvc` spec**. Без IR `.bvc` — просто документ; с IR — исполнимый стандарт. Это резко повышает ценность D.

### С AN-6 (технический аудит)

IR-направление **блокировано тем же**: всё в одном репо, нет отделения от UI-сервера. Перед стартом IR-spec нужно:
1. Портировать `src/ir/*` из `D:/Work/IDE/project` в Work Graph Rebuild или отдельный репо.
2. Decoupling от исполнителя барьера / Шеннон-метрики (опциональные плагины).

## 13. Минимальный roadmap (12 недель)

| Неделя | Артефакт |
|---|---|
| 1 | Решить §8 (имя, EN-canon, репо), создать `step-canon/ir-spec` |
| 2 | JSON Schema v1 для Core / RichIR / Flow / Bundle |
| 3 | EBNF + spec.md v0.1, conformance test seed |
| 4-5 | `@step-canon/ir` (parser + validator), порт из `src/ir/turIr.ts` |
| 6-7 | `@step-canon/ir-runtime` (linear + CFG executor), порт из `executeTurIr.js` и `executeIrFlowCfg.js` |
| 8 | `@step-canon/ir-cli` |
| 9 | `@step-canon/ir-llm` + bench (50 fixture проз, 3 модели) |
| 10 | Адаптеры: `step ↔ ir`, `ir → mermaid` (минимум) |
| 11 | Conformance test suite + CI badge |
| 12 | Spec doc, examples gallery, HN/Lobsters post |

После 12 недель — checkpoint по метрикам §10.

## 14. Финальный вердикт

IR/RichIR — **более зрелый и более ценный артефакт**, чем `.bvc` отдельно, но и **рискованнее** для standardization, потому что упирается в занятую нишу рабочий процесс IR.

**Реалистично:**
1. Стандартизировать в позиции **IR-B (AI-agent reasoning IR)** — свободная ниша.
2. Связкой с **AN-8** под зонтиком `step-canon` — это даёт complete story: canon + execution.
3. С **первоочередным bench LLM-нормализатора** — это единственный измеримый PR-материал.

**Минимальный шаг для проверки гипотезы IR через 6 недель:**
- Имя зафиксировано (новое, не «IR»).
- `@step-canon/ir` опубликован с типами и валидатором.
- LLM bench показывает ≥85% точности нормализации на gpt-4.
- ≥10 stars на репо.

Если за 6 недель LLM bench <80% — гипотеза IR-B мертва, разворот в IR-D (lib only) или отказ от standardization.

---

**См. также:**
- **[AN-7: продуктовый аудит и 4 позиции](product-self-audit-user.md)** — общая рамка позиционирования.
- **[AN-8: `.bvc` как открытый канон](step-as-открытый канон-standard.md)** — парная аналитика по канон-формату.
- **[AN-6: технический аудит](product-self-audit-tech.md)** — почему текущая упаковка блокирует IR-направление.
