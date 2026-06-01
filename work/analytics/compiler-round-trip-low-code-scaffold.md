# AN-14: Compiler Round-Trip + Low-Code Scaffold — уникальная технология ioHasC

**Запрос:** «ищи ещё уникальные технологии в ioHasC».

## Кратко

Compiler Round-Trip — **двусторонняя верификация `.bvc ↔ code`**: из `.bvc` генерируется TS-каркас, который проходит `tsc + eslint`, обратно из кода восстанавливается семантика `.bvc`-блоков. Plus — Low-Code Scaffold: генерация типизированных модулей по архитектурным правилам с пост-генерационной проверкой компилятора.

Это **не code generation** (как Yeoman/Plop), **не contract testing** (как Pact), **не type-driven dev** (как Rust/TS) в чистом виде — это **trace-driven codegen с автоматической верификацией контракта канон ↔ код**.

## 1. Что есть сегодня

| Слой | Где |
|---|---|
| **Compiler round-trip CLI** | `pvrg-core/` + tests `tests/turIrCodeRichSidecar.test.ts`, `tests/turIrToCodeSkeleton.test.ts` |
| **TurIR → code skeleton** | `src/ir/turIrToCodeSkeleton.ts` |
| **TurIR → Vitest skeleton** | `src/ir/turIrToVitestSkeleton.ts` |
| **txt → code pipeline** | `src/ir/txtPlainToCodePipeline.ts` |
| **Code rich sidecar** | `src/ir/turIrCodeRichSidecar.ts` + `schemas/turir-code-rich-sidecar.v1.json` |
| **Document-to-IR spike** | `src/ir/documentToIrSpikeHeuristic.ts`, `docs/architecture-v2/document-to-ir-spike.md` |
| **Low-code charter** | `docs/architecture-v2/low-code-engineering-software-domain.md` |
| **Arch каркас from step** | `src/ir/archScaffoldFromStep.ts` |
| **Arch import guard** | `src/ir/archImportGuard.ts` |
| **Arch каркас tsc verify** | `src/ir/archScaffoldTscVerify.ts` |
| **Arch каркас eslint verify** | `src/ir/archScaffoldEslintVerify.ts` |
| **Render arch low-code template** | `src/ir/renderArchLowCodeTemplate.ts` |
| **Generated protected zones** | `src/ir/generatedCodeProtectedZones.ts` |
| **Merge generated protected zones** | `src/ir/mergeGeneratedProtectedZones.ts` |
| **Protected logic zone lines** | `src/ir/protectedLogicZoneLines.ts` |
| **Architecture v2 stack** | `docs/architecture-v2/iohasc-stage1-code-generator-implementation.md`, `stage2-tur-scanner-implementation.md`, `stage3-git-integrity-hook-implementation.md` |
| **Round-trip ADR** | `docs/architecture-v2/architectural-manifest-ordinary-code-and-round-trip.md` |
| **Verify-lowcode npm script** | в исходном `package.json` |

### Архитектура

```
                              ┌──────────────────┐
   .bvc (BVC + Метки) ────►  │  parser + IR     │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  Rich sidecar    │  ──► JSON Schema validated
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  archScaffold    │  ──► TS files + protected zones
                              │  FromStep        │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  tsc + eslint    │  ──► compile errors / lint errors
                              │  verify          │      → блокируют PR
                              └──────────────────┘
                                        │
                                        ▼ (round-trip)
                              ┌──────────────────┐
                              │  code → IR       │  ──► extract .bvc-блок из кода
                              │  reverse engine  │      (Phase 8 reverse-engineering)
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  compare с canon │  ──► расхождение detected → diagnostic
                              └──────────────────┘
```

### Protected zones

`generatedCodeProtectedZones.ts`: разделяет генерируемые блоки и пользовательскую логику. При regenerate **сохраняются** пользовательские правки в защищённых зонах. Merge через `mergeGeneratedProtectedZones.ts`.

## 2. Зачем стандарт — какую боль решает

| Боль | Кто страдает | Чем закрывают |
|---|---|---|
| Code generator перетирает ручные правки | каркас-using devs | git-конфликты, custom blocks via comments |
| Yeoman/Plop генерируют, но не верифицируют tsc | каркас-using devs | дев потом руками `tsc` |
| OpenAPI codegen — но контракт оторван от runtime | API-разработчики | mock-сервер |
| Контракт спецификации ↔ код часто рассинхронизирован | архитекторы | manual sync |
| BPMN-execution movers без code-gen | рабочий процесс-eng | BPMN-в-исполнении только |
| LLM генерирует код, но не check семантики | AI-agents | execute and pray |
| ADR / Architecture diagrams не enforce'ятся в коде | архитекторы | ArchUnit (только Java) |
| Round-trip между спецификацией и кодом — редкость | формальные методы | rare, academic |

**Уникальное обещание Compiler Round-Trip:** «`.bvc` — единственный источник правды для архитектуры, каркасer генерирует TS-каркас, tsc+eslint обязательны до merge, обратное извлечение проверяет расхождение. Канон и код не могут разойтись».

## 3. Конкуренты

| Технология | Что делает | Чего нет vs ioHasC |
|---|---|---|
| **Yeoman / Plop / Nx generators** | каркас | без round-trip, без verify |
| **OpenAPI generator** | API codegen | контракт ↔ runtime разойдётся |
| **Smithy / TypeSpec** | API IDL | API only |
| **Cap'n Proto / FlatBuffers schemas** | data IDL | data only |
| **GraphQL codegen** | typed clients | GraphQL only |
| **Buf / Connect** | proto codegen | proto only |
| **Prisma schema → client** | DB ORM | DB only |
| **dbt** | SQL DAG | data transforms |
| **Cookiecutter** | template каркас | no verify |
| **Hygen** | template каркас | no verify |
| **ArchUnit (Java)** | architecture tests | Java only, тесты, не codegen |
| **Structurizr DSL → diagrams** | docs | не codegen |
| **Bicep / Terraform** | IaC, типизация | infra only |
| **Pulumi** | typed IaC | code-as-config |
| **Eve / Vue Storefront codegen** | UI каркасs | UI only |
| **OpenAPI-zod-router** | typed routes | API only |
| **Acceleo / EMF (Eclipse)** | model-driven dev | enterprise, мёртвый |
| **MPS (JetBrains)** | DSL workbench | meta-tooling |
| **ChatGPT / Copilot каркас** | LLM generation | без verify контракта |

**Главный конкурент:** OpenAPI/Smithy/TypeSpec + кастомные post-gen verify. Полностью same-domain аналога **нет**.

## 4. Что в Compiler Round-Trip + Scaffold действительно уникально

Восемь вещей:

1. **`.bvc` BVC как canonical source** — генерируется не из YAML/JSON, а из человекочитаемого канона с обоснованием (Базис).
2. **Post-gen tsc + eslint обязательны** — codegen считается завершённым только если компилируется и линтуется. Это **integration-grade gate**.
3. **Reverse round-trip** — `Phase 8 reverse-engineering` извлекает `.bvc`-блоки из кода (Документация: `adr-iohasc-phase8-reverse-engineering.md`).
4. **Protected zones** — пользовательская логика **сохраняется** при re-generation. Это убирает «Yeoman trauma».
5. **Rich sidecar** — JSON Schema validated typed metadata для codegen (`turir-code-rich-sidecar.v1.json`).
6. **Arch import guard** — `archImportGuard.ts` проверяет что сгенерированный код **не импортирует** запрещённые слои. Это «архитектурный линтер».
7. **Низкокодовая charter** — `low-code-engineering-software-domain.md` фиксирует, что низкокодовый каркас — не «упрощение», а **enforce-механизм** канона.
8. **CI gate `verify:lowcode`** — это **обязательная** часть мandatory CI, не optional. Это значит расхождение между каноном и кодом ловится в PR.

## 5. Где обречён проиграть

1. **Конкурировать с OpenAPI** — невозможно для API-only сценариев.
2. **Конкурировать с Yeoman/Nx каркасs** — экосистема vs специфика.
3. **Без `.bvc` adoption** — round-trip нужен только в `.bvc` мире.
4. **Только TS/JS** — другие языки не поддержаны.
5. **Сложность входа** — нужно понимать .bvc + IR + tsc + eslint + arch rules.

## 6. Что нужно сделать

**6 артефактов:**

1. **Спецификация Round-Trip Contract v1** — формальное описание двусторонней верификации.
2. **`@step-canon/каркас`** — codegen из `.bvc` (TS) с tsc/eslint verify.
3. **`@step-canon/protected-zones`** — merge utility, отдельный пакет (полезен и вне `.bvc`).
4. **`@step-canon/arch-guard`** — import/dependency rules из `.bvc`.
5. **CLI** `step каркас <file>`, `step verify-lowcode`, `step reverse <code-dir>`.
6. **Templates gallery** — стартовые `.bvc` для типовых задач (REST endpoint, CRUD, 1С-обработка, AI-agent tool).

## 7. Стратегические подварианты

| Под-вариант | Суть | Шанс |
|---|---|---|
| **A: open low-code framework** | конкурент Yeoman + tsc verify | средний |
| **B: AI-agent codegen verifier** | агент генерирует код, каркас проверяет канон ↔ code | **средний-высокий** |
| **C: 1С vertical low-code** | каркас для 1С-конфигураций | **высокий** (нет конкуренции) |
| **D: spec only** | round-trip contract без runtime | средний |
| **E: ADR/Architecture enforce tool** | конкурент ArchUnit для JS-мира | средний |

**Моя ставка — B + C**. Для AI это свежая боль (codegen без verify ненадёжен), для 1С — занятая ниша.

## 8. Решения **до** начала работ

- **Имя**: «Compiler Round-Trip» норм, но громоздко. Можно `step-canon/каркас` или `step-canon/round-trip`.
- **EN-canon** обязателен.
- **Языки**: старт — TS/JS, добавление Python/Go через adapter pattern.
- **Protected zones формат**: единый comment-marker (`// step-canon:protected:start`).
- **Reverse round-trip**: heuristic (Phase 8) или structured? Структурированный требует annotations в коде.

## 9. Риски

- Поддержка multiple языков дорого.
- Reverse round-trip без annotations heuristic, точность <100%.
- Protected zones конфликтуют с code formatters (prettier меняет comments).
- TS-only ниша узкая.

## 10. Метрики через 6 месяцев

**Зелёные:** `@step-canon/каркас` ≥500 weekly downloads, ≥3 templates в gallery, 1 внешний проект с CI gate.
**Жёлтые:** работает в ioHasC, без внешнего интереса.
**Красные:** никто не использует — закрытие.

## 11. Что **не делать**

- Не пытаться поддерживать все языки сразу.
- Не делать reverse round-trip обязательной (опциональный плагин).
- Не делать protected zones формат проприетарным.
- Не привязывать к `.bvc` единственным источником — допускать YAML/JSON как input.

## 12. Связь с другими аналитиками

- **AN-8 (`.bvc` canon)**: round-trip — главный потребитель `.bvc`. Связь сильная.
- **AN-9 (IR)**: IR — промежуточное представление для codegen. Tight coupling сейчас.
- **AN-10 (PVRG)**: round-trip создаёт PVRG-узлы как побочный артефакт.
- **AN-7 / позиция C (1С vertical)**: каркас для 1С — самая практичная ниша. **Сильная связка с C.**
- **AN-7 / позиция D**: round-trip как 5-й стандарт под `step-canon`.

## 13. Roadmap (10 недель)

| Неделя | Артефакт |
|---|---|
| 1 | Решить §8, репо |
| 2 | Round-trip contract spec v0.1 |
| 3-4 | `@step-canon/каркас` (TS template engine + tsc verify) |
| 5 | `@step-canon/protected-zones` (отдельно) |
| 6 | `@step-canon/arch-guard` |
| 7 | CLI |
| 8 | Templates gallery (REST endpoint, CRUD, 1С-обработка) |
| 9 | Reverse round-trip MVP (heuristic) |
| 10 | Spec doc + post |

## 14. Финальный вердикт

Compiler Round-Trip + Low-Code Scaffold — **самая практически полезная** из 5 уникальных технологий. Близко к проблеме, которую решают все («codegen + verify»), но **в комбинации** с `.bvc` каноном и round-trip — уникально.

**Реалистично:**
- Standardize как **B (AI-agent codegen verifier)** — свежая ниша.
- В связке с **C (1С vertical)** — двойная игра: open spec + commercial vertical.
- Сильная связь с AN-8/9 — round-trip без `.bvc`/IR пустой.

**Минимальная проверка через 6 недель:**
- `@step-canon/каркас` опубликован, генерирует один типовой template (REST handler с tsc-pass);
- AI-agent integration: пишет код, каркас проверяет, ≥80% генераций проходят tsc+eslint;
- 1 публичный demo на templates gallery.

Если за месяц ни одного внешнего использования — D (spec only) или внутренний компонент.

---

**См. также:** [AN-8 step](step-as-открытый канон-standard.md), [AN-9 IR](ir-rich-ir-открытый канон.md), [AN-10 PVRG](pvrg-verified-reference-graph.md), [AN-7 позиция C](product-self-audit-user.md).
