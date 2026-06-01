# AN-13: Uncertainty Barrier + Shannon Information Gain — уникальная технология ioHasC

**Запрос:** «ищи ещё уникальные технологии в ioHasC».

## Кратко

Uncertainty Barrier — **runtime gate, который останавливает исполнение шага, если текст его формулировки эвристически «размыт»** (нет чисел, нет сравнений, расплывчатые формулировки). Метрика — `uncertainty_measure ∈ [0..1]`, порог настраивается `barrierPercent`. Плюс — **Shannon information gain по CFG-ветвлениям** (`log2(N)` бит на каждом decision-узле, сумма в execution log).

Это **не статический линтер**, **не code coverage**, **не SBT/AFL**: это **семантическая проверка читаемости рантайма** в момент исполнения рабочий процесс. В OSS рабочий процесс-движках (Camunda, n8n, Argo, Airflow, LangGraph) **никто** такого не делает.

## 1. Что есть сегодня

| Слой | Где |
|---|---|
| **`measureStepUncertainty(step, opts)`** | `src/hasc/executor.js` |
| **`inferBarrierPolicy(uncertainty, threshold)`** | там же |
| **Formulation clarity profile** | `src/hasc/formulationClarity.js` |
| **Charter mode** (relaxed для уставов) | `detectCharterFormulationFromText`, `resolveFormulationClarityProfile` |
| **`shannonCfgBranchBits(N)` = log2(N)** | `src/ir/shannonCfgBranchBits.js` |
| **Execution log** `shannonInformationGainBits` | per-step в `executeIrFlowCfg.js` |
| **Total** `shannon_information_gain_bits_total` | в `tur.*` и `exportSystem().execution.*` |
| **ADR на метрику** | `docs/adr-001-shannon-metrics.md` |
| **Тесты** | `tests/formulationClarity.test.js`, `tests/shannonCfgBranchBits.test.js`, `tests/engine-step-heuristic.test.js` |
| **UI** | в редакторе показывает «чёткость формулировки» (%) и подсветку барьерных шагов |

### Эвристика uncertainty (по комментариям и тестам)

- Штрафы за: отсутствие чисел и знаков сравнения, расплывчатые слова («может», «обычно», «иногда»), длинные предложения без конкретики.
- Профиль `charter`: для уставных текстов не штрафует за отсутствие цифр в базисе.
- Auto-detect режима по заголовку `#Устав…` или составному русскому ID (`#Труд_Результат_Доход`).
- Результат `uncertainty_measure ∈ [0..1]` — **доля размытости** (не энтропия Шеннона).

### Shannon CFG info gain

- При N>1 исходящих ветвях у Decision-узла: `log2(N)` бит «информации» на проход.
- Считается per-step и аггрегатно.
- **Барьер не зависит от Shannon** — барьер по uncertainty, Shannon только метрика.

## 2. Зачем стандарт — какую боль решает

| Боль | Кто страдает | Чем закрывают |
|---|---|---|
| LLM пишет расплывчатые формулировки правил | regulated industries | manual review |
| BPMN исполняется без проверки качества формулировок | бизнес-аналитики | dev/test cycle |
| Рабочий процесс с «может быть, иногда» прорывается в production | regtech, compliance | post-mortem |
| Нет метрики «насколько правило формализовано» | методологи | gut feeling |
| AI-агент исполняет vague инструкции пользователя | AI-runtime | extra clarification prompt |
| Нет способа объективно сравнить два варианта правила | enterprise rule-design | A/B test trial-and-error |
| Code coverage не покрывает «вес» каждой ветви | testers | uniform coverage |
| Нет «information density» метрики для рабочий процесс | data engineers | runtime metrics post-hoc |

**Уникальное обещание Uncertainty Barrier:** «измеряем читаемость каждого шага рабочий процесс в момент исполнения, барьер гасит размытые формулировки до того как они дадут плохой результат — runtime-grade lint для бизнес-правил».

**Уникальное обещание Shannon CFG:** «каждое ветвление измеряется в битах информационного содержания, total per execution — объективная метрика «сложности прохода» рабочий процесс».

## 3. Конкуренты

| Подход | Что делает | Чего нет vs ioHasC |
|---|---|---|
| **Hemingway editor / Grammarly** | readability score | не runtime, не для рабочий процесс |
| **Flesch-Kincaid / Coleman-Liau** | формулы читаемости | для текста, не для шагов |
| **Camunda decision tables** | формализуют решения | не проверяют качество формулировки |
| **DMN FEEL expressions** | type-safe expressions | не для basis-текста |
| **LangChain output parsers** | structured output | не для рантайм-барьера |
| **Guardrails / Pydantic / Zod** | validation | для данных, не для текстов рассуждения |
| **OpenAI function calling JSON Schema** | structured args | не для шагов в плане |
| **Code linters (eslint, ruff)** | static | не runtime, не для прозы |
| **SAST/DAST** | security | другая боль |
| **Coverage tools (istanbul, c8)** | code coverage | не семантическая |
| **Information theory libraries (scipy.stats.entropy)** | Shannon | низкоуровневые, не CFG-aware |
| **OpenTelemetry metrics** | runtime metrics | не для семантики |
| **Conformance metrics в RegTech (ISDA CDM)** | structured contracts | другая область |
| **Statistical Process Control** | quality control | для физических процессов |
| **DORA metrics** | DevOps perf | runtime stats, не семантика |

**Главный конкурент:** **никого** в OSS рабочий процесс или AI-agent stacks. Ближайший — Camunda с typed FEEL expressions, но это compile-time, не runtime барьер.

## 4. Что в Uncertainty Barrier + Shannon действительно уникально

Семь вещей:

1. **Runtime барьер для прозы** — рабочий процесс-движок останавливает исполнение шага, если **текст** правила «размыт». Не data validation, не type check — **readability gate**.
2. **Профиль `charter`** — separately tuned эвристика для уставных текстов (без штрафа за отсутствие чисел). Это понимание domain-specific семантики.
3. **Auto-detect режима** — по структуре заголовка определяется профиль. Magic-free, ясно.
4. **`uncertainty_measure` как ось барьера** — единая шкала [0..1] для всех профилей.
5. **Shannon info gain per branch** — `log2(N)` бит как объективная мера «выборности» CFG. Это **количественная метрика для бизнес-CFG**, которую можно сравнивать между планами.
6. **Total per execution** — `shannon_information_gain_bits_total` — агрегат за прогон. Можно тренировать в CI.
7. **Документированный отказ от Шеннона для барьера** — ADR-001 объясняет, что барьер по эвристике, не по Шеннону. Это редкая интеллектуальная честность.

## 5. Где обречён проиграть

1. **Заменить Hemingway/Grammarly** — невозможно, у них NLP-стек и UX.
2. **Стать стандартом для рабочий процесс без killer-app** — нужна интеграция с BPMN/n8n/LangGraph.
3. **Без `charter` / `.bvc` контекста** — universally эвристика «нет чисел = плохо» не работает.
4. **NLP-сложность** — серьёзная uncertainty эвристика требует современный NLP, не regex.

## 6. Что нужно сделать

**5 артефактов:**

1. **Спецификация Uncertainty Metric v1** — формальный контракт сигнатуры функции, профилей, шкалы.
2. **`@step-canon/uncertainty`** — npm пакет с эвристикой + профилями + RU/EN поддержкой.
3. **Shannon CFG plugin** — отдельный пакет `@step-canon/shannon-cfg` для метрики.
4. **CLI** `step uncertainty <file>` (отчёт), `step shannon <bundle>` (метрики).
5. **Integration adapters** — Camunda / n8n / LangGraph plugins, которые показывают метрику на их рабочий процесс.

## 7. Стратегические подварианты

| Под-вариант | Суть | Шанс |
|---|---|---|
| **A: автономный «runtime readability barrier» plugin** | для всех рабочий процесс engines | **средний** |
| **B: RegTech vertical** | для законов, контрактов, compliance — где формальность критична | средний-высокий |
| **C: AI-agent prompt quality gate** | барьер перед запуском tool с расплывчатой формулировкой | **средний-высокий** |
| **D: spec only + reference impl** | без integrations | средний (малый риск) |
| **E: внутренний компонент ioHasC** | не стандартизировать | разумная позиция |

**Моя ставка — C + B**. C — свежая боль AI-agent-эры, B — узкая платежеспособная ниша.

## 8. Решения **до** начала работ

- **Имя**: «Uncertainty Barrier» в EN норм. «Чёткость формулировки» — RU label для UI.
- **EN canon** обязателен.
- **Профили**: `default`, `charter`, **`prompt`** (новый — для AI-agent), `contract` (для RegTech), `code_comment` (опционально).
- **Эвристика open**: позволить плагины и custom правила.
- **Shannon — опциональный модуль**, не часть базового uncertainty.

## 9. Риски

- Эвристика слабая (regex) — нужно эволюционировать в современный NLP.
- RU-only эвристика — нужны параллельные правила для EN.
- Без интеграций мёртв.
- ADR-001 явно говорит «не Шеннон» — нужно сохранить эту честность в публичных коммуникациях.

## 10. Метрики через 6 месяцев

**Зелёные:** spec опубликован, ≥1 integration (n8n / LangGraph), bench показывает correlation с человеческими оценками readability ≥0.7.
**Жёлтые:** работает в ioHasC, но без external.
**Красные:** correlation <0.5 → эвристика бесполезна, разворот в современный NLP (transformers).

## 11. Что **не делать**

- Не путать публично «uncertainty» с энтропией Шеннона.
- Не оставлять RU-only.
- Не делать regex-only эвристику долго — эволюционировать в transformer-based.
- Не пытаться заменить grammar/style checkers.

## 12. Связь с другими аналитиками

- **AN-9 (IR)**: барьер — часть execution loop IR. Сейчас обязательная, нужно сделать опциональным плагином (так и рекомендовано в AN-9 §8).
- **AN-8 (`.bvc`)**: профиль `charter` тесно связан с `.bvc` структурой.
- **AN-7 / позиция D**: uncertainty — кандидат на стандартизировать под `step-canon`.
- **AN-7 / позиция C (1С vertical)**: 1С-правила (проводки, отчёты) — идеальный domain для барьера.

## 13. Roadmap (8 недель)

| Неделя | Артефакт |
|---|---|
| 1 | Решить §8, переименование к `step-canon/uncertainty-spec` |
| 2-3 | Spec + JSON Schema + EN/RU profile rules |
| 4-5 | `@step-canon/uncertainty` (TS, profiles, plugins) |
| 6 | `@step-canon/shannon-cfg` |
| 7 | n8n / LangGraph integration demo |
| 8 | Spec doc + bench на human-rated dataset + post |

## 14. Финальный вердикт

Uncertainty Barrier — **самая концептуально оригинальная** технология ioHasC из всех проанализированных. **Никто не делает runtime-readability-gate для рабочий процесс**. Уникальность не вызывает сомнений.

**Главная слабость:** эвристика сейчас простая (regex-based). Чтобы стать стандартом, нужен серьёзный NLP-стек (transformer-based readability scoring + RU/EN параллельно).

**Реалистично:** стандартизировать как **C (AI-agent prompt quality gate)** + **B (RegTech vertical)**. Эти ниши свежие, ioHasC может быть первым.

**Минимальная проверка через 4-6 недель:**
- bench на human-rated readability dataset (50-100 проз с оценками); correlation ≥0.7;
- если correlation <0.5 — эвристика бесполезна, переход на transformer-based;
- если correlation ≥0.7 — публикация + интеграция с n8n или LangGraph.

---

**См. также:** [AN-9 IR](ir-rich-ir-открытый канон.md) — барьер как часть execution; [AN-8 step](step-as-открытый канон-standard.md) — профиль `charter`; [AN-7 audit](product-self-audit-user.md) — позиционирование.
