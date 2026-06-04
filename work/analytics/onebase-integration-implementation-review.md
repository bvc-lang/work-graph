# AN-72: Разбор интеграции с OneBase (текущая реализация)

**Запрос:** сделай разбор, как реализована интеграция с OneBase — что можно делать, какая польза, какие задачи, как пользоваться; разбор запиши в аналитику.

**Область:** актуальная кодовая база Work Graph (`.mjs`-rebuild). Предыдущий разбор [onebase-integration-vertical-stack.md](onebase-integration-vertical-stack.md) описывал старый стек ioHasC (TypeScript-модули `src/iohasc/onebase/...`, пакет `packages/onebase-mcp`, `skills/onebase-config/SKILL.md`) — этих артефактов в текущем rebuild **нет**, они присутствуют только как исходники для миграции в parity-протоколе. Этот документ описывает то, что реально лежит в репозитории сейчас.

---

## 1. Что такое OneBase и как он подключён

OneBase — **внешний open-source проект на Go**, 1С-подобная платформа: декларативные YAML-метаданные (`catalogs/`, `documents/`, `registers/`, `reports/`, `widgets/`, …) + процедурный DSL `.os` (скрипты проведения) + Go-runtime. Reference-конфигурация — `examples/trade`.

OneBase **не входит** в этот репозиторий. Он подключается как **соседний каталог** `../onebase` (sibling рядом с `work graph`):

```68:71:work graph/src/onebaseCliRunner.mjs
  const portableWin = resolve(repoRoot, '../onebase/onebase.exe');
  const portableUnix = resolve(repoRoot, '../onebase/onebase');
```

Точки подключения (всё резолвится с приоритетом ENV → опции → дефолт `../onebase`):

| Что | Переменная | Дефолт |
|---|---|---|
| Бинарь CLI | `ONEBASE_CLI` | `../onebase/onebase(.exe)` или `onebase` в PATH |
| Корень проекта (для CLI) | `ONEBASE_PROJECT_ROOT` | `../onebase/examples/trade` |
| Корень метаданных (для worker tools) | `ONEBASE_PROJECT_ROOT` | `../onebase` |
| REST runtime | `ONEBASE_API_BASE_URL` | (упоминается в parity, REST-вызовы как gate не реализованы) |

Ключевой архитектурный принцип: **Work Graph не редактирует код OneBase напрямую** и **не запускает свой runtime**. Он выступает как слой управления/планирования/верификации поверх внешнего проекта (golden-path: «подготовить ревьюабельный PR-патч с ограниченным контекстом и детерминированными свидетельствами»).

---

## 2. Карта модулей (то, что реально есть)

### Исполняемый код (`src/`)

| Модуль | Назначение |
|---|---|
| `onebaseCliRunner.mjs` | Обёртка над `onebase` CLI: `describe --json`, `check`. Типизирует `failureClass` (`cli_missing`, `cli_command_unavailable`, `cli_error`). |
| `onebaseCliCapabilityProbe.mjs` | Пробинг `onebase --help`, разбор «Available Commands», определение доступности `init/check/describe/ai-guide`. Резолв корня сканирования метаданных. |
| `onebaseWorkerTools.mjs` | **6 worker-инструментов** + детект onebase-задачи + skill-gating + preflight. Ядро интеграции. |
| `onebaseRestEvidenceAdapter.mjs` | Преобразование результатов CLI `check`/`describe` в записи `evidence-record.v1` (+ per-document записи из describe JSON). |
| `onebaseGrossProfitStaticVerify.mjs` | Детерминированная статическая проверка артефактов «валовая прибыль по складам» без запуска Go. |
| `onebasePvrgGraphNodes.mjs` | Сканирование метаданных → PVRG-узлы/рёбра (`onebase:document:X` → `onebase:posting_script:X`), мерж в L2-граф. |
| `onebaseWorkItemTemplate.mjs` | Шаблон WorkItem-задачи для домена onebase + parity-матрица доступа. |
| `onebaseParityEvidenceSync.mjs` | Привязка probe-результата к parity-матрице, запись `work/onebase-cli-capabilities.v1.json`. |
| `onebaseVectorDslCodegenReadiness.mjs` | Оценка готовности «переоткрыть» отложенный кодоген VectorDSL → OneBase YAML (4 триггера). |
| `blockedOnebaseGoPreflightEval.mjs` | Детерминированный eval сценария «Go недоступен → blocked, а не failed». |
| `languageAdapters/onebaseOsAdapter.mjs` | Парсер `.os`: процедуры, движения регистров, поля документа, факты для PVRG/памяти. |
| `languageAdapters/jsonYamlAdapter.mjs` | Парсер YAML-метаданных (используется при сканировании). |

### Доменные `.bvc`-артефакты (`domains/onebase/`)

| Файл | Что описывает |
|---|---|
| `golden-path.bvc` | Эталонный путь: связывает сценарий, маппинг артефактов, вход для воркера, поток исполнения, модель свидетельств, DoD. |
| `workflows/change-posting-rule.bvc` | Бизнес-сценарий: добавить измерение «Склад» в проведение валовой прибыли `РеализацияТоваров`. |
| `artifact-mapping.bvc` | Протокол: как YAML/`.os`/Go-файлы превращаются в связанные доменные артефакты с метками `onebase.*`. |
| `verification-command.bvc` | Политика верификации: preflight `go version` → `go test ./...` в `../onebase`, таймаут 120с, blocked-модель. |
| `workitem-template.bvc` | Шаблон задачи домена. |
| `defer-vector-dsl-codegen.bvc` | Решение отложить кодоген. |
| `examples/realization-posting-step-atom-draft.example.json` | Пример StepAtomDraft. |

### Протоколы / план / интент

- `protocols/onebase-mcp-parity-v1.bvc` — матрица паритета доступа (built-in / MCP / CLI).
- `intent/domains/onebase/work/*.work.bvc` — ~26 рабочих элементов домена (фазы 6/7, golden path, CLI-паритет, OData-импорт, codegen-defer и т.д.).
- `intent/product/positioning/decision-position-c-onebase-vertical.bvc` — позиционирование «1С-вертикаль».

### Скрипты (`scripts/`) и npm-команды

| npm-скрипт | Файл | Что делает |
|---|---|---|
| `test:optional:onebase` | `run-onebase-verification.mjs` | Preflight `go version` (PATH / `../.tools/go` / `Program Files`), затем `go test ./...` в `../onebase`. Exit 2 = blocked, 124 = timeout. |
| `test:optional:onebase-check` | `run-onebase-config-check.mjs` | `onebase check`; при отсутствии CLI — статус `skipped`, exit 0. |
| `probe:onebase-cli` | `probe-onebase-cli.mjs` | Пробинг CLI, запись parity-evidence JSON. |
| `check:onebase-codegen-readiness` | `check-onebase-codegen-readiness.mjs` | Оценка готовности к кодогену. |
| `eval:optional:blocked-onebase-go` | `run-optional-blocked-onebase-go-eval.mjs` | Eval blocked-пути без живой LLM. |
| `seed:pivot-to-1c-onebase-vertical` | `seed-pivot-to-1c-onebase-vertical-tasks.mjs` | Засев задач эпика. |
| `close:pivot-1c-onebase-vertical` | `close-pivot-1c-onebase-vertical-epic.mjs` | Закрытие эпика. |

---

## 3. Архитектура: три пути доступа + единый gate

Интеграция построена вокруг принципа из parity-матрицы (`buildOneBaseMcpParityMatrix`):

> **CI/Done-гейт использует только Work Graph CLI (детерминированный). MCP и built-in tools — это пути discovery/агента. REST-свидетельства опциональны и могут быть blocked.**

```
        OneBase project (внешний, ../onebase, examples/trade)
        catalogs/ documents/ registers/ reports/ widgets/ src/*.os  +  Go runtime
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        ▼ (discovery/agent)        ▼ (discovery/agent)          ▼ (DONE-gate)
   Worker tools (6)          CLI runner + probe            Verification CLI
   onebase.listMetadata      onebase describe --json       npm run test:optional:onebase
   onebase.readConfigFile    onebase check                  → go version preflight
   onebase.staticVerify      onebase ai-guide                 → go test ./... (../onebase)
   onebase.describeCli       (--help capability probe)       npm run test:deterministic
   onebase.checkCli                                            → static gross-profit verify
   onebase.runVerification…
        │                          │                            │
        ▼                          ▼                            ▼
   evidence-record.v1   ◄──  onebaseRestEvidenceAdapter   verificationLoop матрица
   (worker evidence)         (check/describe → records)   (deterministic/optional-env/llm)
        │
        ▼
   PVRG graph nodes  ──►  мерж в L2 architecture graph
   onebase:document:X → onebase:posting_script:X
```

### 3.1 Worker tools и skill-gating

Шесть инструментов воркера:

```14:21:work graph/src/onebaseWorkerTools.mjs
export const ONEBASE_WORKER_TOOL_IDS = [
  'onebase.listMetadata',
  'onebase.readConfigFile',
  'onebase.staticVerify',
  'onebase.runVerificationCommand',
  'onebase.describeCli',
  'onebase.checkCli',
];
```

Доступ к ним **gated по домену задачи**: `resolveOnebaseAllowedTools(task)` возвращает инструменты только если `isOnebaseDomainTask(task)` — т.е. `domain.id == onebase`, `department == domain-onebase` или упоминание `onebase`/`test:optional:onebase` в checks/evidence/targetFiles. Это эквивалент прежнего `SKILL.md`-gating, но реализован через классификацию задачи (`resolveDomainWorkerCapabilities` в `workGraphWorkerProvider.mjs`), а не через отдельный навык.

Защита от выхода за границы: `onebase.readConfigFile` разрешает только пути внутри metadata-директорий, `src/*.os` и `examples/`, запрещает `..` и абсолютные пути (`normalizeBoundedRelativePath`).

`runOnebaseWorkerPreflight(task)` для onebase-задачи прогоняет связку: listMetadata + staticVerify + describeCli + checkCli + verificationCommand (по умолчанию `allowShell:false` → blocked) и собирает evidence.

### 3.2 Верификация: три яруса + blocked-модель

В `verificationLoop.mjs` зарегистрированы строки матрицы:

| id | tier | команда | смысл |
|---|---|---|---|
| `onebase-gross-profit-static` | deterministic | `npm run test:deterministic` | статическая проверка артефактов валовой прибыли (всегда исполнима, без Go) |
| `onebase-go-test` | optional-env | `npm run test:optional:onebase` | реальный `go test ./...` |
| `onebase-config-check` | optional-env | `npm run test:optional:onebase-check` | `onebase check` (CLI) |
| `onebase-llm-scenario` | optional-llm | вручную / будущий eval | сценарий с живой LLM |

Ключевая идея: **отсутствие Go в окружении — это «blocked», а не «failed»**. `run-onebase-verification.mjs` ищет Go в PATH / `../.tools/go` / `Program Files`; если не нашёл — печатает blocked-evidence и выходит с кодом 2. `blockedOnebaseGoPreflightEval.mjs` детерминированно проверяет, что система отличает блокировку окружения от провала кода.

### 3.3 Свидетельства (evidence-record.v1)

`onebaseRestEvidenceAdapter.mjs` превращает вывод CLI в типизированные записи:
- `check` → одна запись `command` со статусом succeeded/failed;
- `describe` → агрегат (counts по documents/catalogs/registers/…) **плюс** по записи на каждый документ с `restPath: /documents/<name>` и флагом `posting`.

Так результат CLI становится прослеживаемым свидетельством на WorkItem, а не «строкой в логе».

### 3.4 PVRG-граф

`onebasePvrgGraphNodes.mjs` сканирует YAML-метаданные (`parseOnebaseYamlSummary` берёт `name:` и `posting: true`), строит узлы `onebase:<kind>:<name>`, находит парный posting-скрипт `src/*.posting.os` по нормализованному имени документа и связывает ребром `onebase_posting`. Граф мержится в L2-граф архитектуры (`mergeOnebaseGraphIntoBlockL2Graph`) с контейнером `container:onebase-domain` и поддержкой капа по числу узлов.

### 3.5 Статический gate валовой прибыли

`onebaseGrossProfitStaticVerify.mjs` зеркалит Go-тест `trade_gross_profit_test.go` на уровне контента файлов: проверяет, что регистр содержит измерения `Номенклатура`/`Склад`, отчёт группирует и фильтрует по `Склад`, KPI остаётся итоговым (без `Склад`), а posting-скрипт пишет `ДвВП.Склад = this.Склад`. Это даёт **детерминированную проверку бизнес-правила даже без Go-тулчейна**.

---

## 4. Что можно делать (возможности)

1. **Сканировать метаданные** конфигурации OneBase в дерево объектов (`onebase.listMetadata`) — документы/справочники/регистры/отчёты/widgets с подсчётом по видам.
2. **Читать отдельные артефакты** в границах (`onebase.readConfigFile`) с извлечением фактов из YAML/`.os`.
3. **Описывать конфигурацию** через `onebase describe --json` и превращать в свидетельства (`onebase.describeCli`).
4. **Валидировать конфигурацию** через `onebase check` (`onebase.checkCli`, npm `test:optional:onebase-check`).
5. **Запускать верификацию OneBase** (`go test ./...`) с корректной blocked-моделью (npm `test:optional:onebase`).
6. **Статически проверять бизнес-правило** «валовая прибыль по складам» без Go (npm `test:deterministic`).
7. **Строить PVRG-граф** домена и вливать его в общий граф архитектуры.
8. **Пробить возможности CLI** и записать parity-evidence (`npm run probe:onebase-cli` → `work/onebase-cli-capabilities.v1.json`).
9. **Генерировать draft WorkItem-задачи** для доменных изменений (`buildOneBaseWorkItemDraft`) с готовыми checks и evidence-hints.
10. **Оценивать готовность к кодогену** VectorDSL → OneBase YAML (`check:onebase-codegen-readiness`).
11. **Планировать домен** через ~26 work-items и golden-path `.bvc`-артефакты.

---

## 5. Какая польза

| Эффект | За счёт чего |
|---|---|
| **Внешний носитель «1С-вертикали»** | OneBase — реальный сторонний продукт, а не проверка «на себе». Позиция C из позиционирования получает конкретный стек. |
| **Ограниченный контекст для агента** | golden-path + artifact-mapping дают воркеру узкий срез файлов вместо сканирования всего дерева → безопасный ревью. |
| **Детерминированные свидетельства** | CLI/Go результаты типизируются в `evidence-record.v1`; blocked ≠ failed → оператор отличает «сломан код» от «нет тулчейна». |
| **Защита от галлюцинаций** | реальный `describe`/scan метаданных вместо выдуманных имён объектов. |
| **Прослеживаемость** | стабильные id `onebase:document:X`, `onebase:posting_script:X` → graph-рёбра и записи памяти без зависимости от текста. |
| **Независимость путей доступа** | один gate (CLI/детерминированный) для CI, отдельные пути discovery (worker tools / probe) — нет single point of failure. |
| **Переносимость** | модель работы (preflight → primary, blocked-evidence, статический gate) переносится на 1С-Конфигуратор, если OneBase не взлетит. |

---

## 6. Какие задачи решает (use cases)

**Эталонная задача (golden path):** добавить измерение **«Склад»** в проведение валовой прибыли документа `РеализацияТоваров`, чтобы анализировать прибыль по складам, **сохранив** FIFO-логику, остатки и взаиморасчёты.

Из неё разворачиваются типовые задачи:
- **Изменение правила проведения** (`change-posting-rule.bvc`): ограниченный набор target-файлов (регистр + posting `.os` + отчёт), инварианты, rollback, DoD.
- **Валидация конфигурации** перед выкладкой (`onebase check` как опциональный gate).
- **Импорт каталога/фасетов** (`onebase-odata-catalog-*`, `catalog-facets-listing-form-bridge`).
- **Паритет CLI-инструментов** и синхронизация capability-evidence.
- **Подготовка к кодогену** VectorDSL → OneBase YAML (пока отложено по триггерам).
- **Project Memory**: доменные факты (связи артефактов, FIFO-правило, downstream-отчёты) с `relatedFiles`/`sourceWorkItem`.

---

## 7. Как пользоваться

### Предусловия
1. Клонировать OneBase рядом: `../onebase` (sibling к каталогу `work graph`).
2. Для реальной верификации — Go в PATH, или портативный Go в `../.tools/go`, или `C:\Program Files\Go`.
3. (Опционально) бинарь `onebase` в PATH или `../onebase/onebase.exe` для CLI-команд (`describe`/`check`/`ai-guide`).
4. (Опционально) переопределить `ONEBASE_CLI`, `ONEBASE_PROJECT_ROOT`, `ONEBASE_API_BASE_URL`.

### Базовые команды

```bash
# Детерминированная статическая проверка бизнес-правила (работает без Go)
npm run test:deterministic

# Реальная верификация OneBase (go test ./...), blocked если Go нет
npm run test:optional:onebase

# Валидация конфигурации через CLI (skipped если onebase CLI недоступен)
npm run test:optional:onebase-check

# Пробинг возможностей CLI + запись work/onebase-cli-capabilities.v1.json
npm run probe:onebase-cli

# Оценка готовности к кодогену VectorDSL → OneBase YAML
npm run check:onebase-codegen-readiness

# Eval blocked-пути без живой LLM
npm run eval:optional:blocked-onebase-go
```

### Рабочий процесс агента (golden path)
1. **Перед правками** — `onebase.listMetadata` / `onebase describe` или чтение готового artifact-mapping (не сканировать всё дерево).
2. **Открыть только срез** target-файлов из `golden-path.bvc` (документ YAML + posting `.os` + регистр/отчёт).
3. **Внести минимальный патч** в границах target-файлов.
4. **После правок** — `onebase check` (`onebase.checkCli`) + статический gate + (если есть Go) `go test ./...`.
5. **Записать свидетельства** (`evidence-record.v1`), при отсутствии Go — blocked-evidence, не помечать verify как passed/failed.
6. Runtime применяет статус-гейты; воркер **не** помечает задачу done сам.

> Программно черновик задачи: `buildOneBaseWorkItemDraft({ workId, document, rule, targetFiles })` → готовый StepAtomDraft с checks и evidence-hints.

---

## 8. Текущие ограничения и расхождения с прошлым разбором

| Что было в ioHasC (старый разбор) | Состояние в текущем rebuild |
|---|---|
| Пакет `packages/onebase-mcp` (stdio MCP с `list_metadata`/`describe_config`/…) | **Не портирован.** MCP-инструменты OneBase в `packages/workgraph-mcp` **не зарегистрированы** — есть только колонка в parity-матрице и migration-ссылки. |
| Built-in agent tools `onebaseRestCall`, `onebaseDevStatus` | **Не реализованы** как код; присутствуют только в parity-матрице как целевые. |
| `skills/onebase-config/SKILL.md` + тест gating | Заменено на доменный gating (`isOnebaseDomainTask` / `resolveDomainWorkerCapabilities`). |
| Обратный импорт `.bvc` из YAML (`extractOneBaseExportForStepLlm`) | Нет отдельного bulk-импортёра; есть scan + artifact-mapping + шаблон WorkItem. |
| REST write-операции с `confirm` | Не реализованы. REST-свидетельства — опциональны, как gate отсутствуют. |
| Codegen VectorDSL → OneBase YAML | **Отложен** (`defer-vector-dsl-codegen.bvc`); есть оценщик готовности по 4 триггерам. |

**Реальные пробелы к коммерческому MVP:** MCP-инструменты OneBase в работающем MCP-сервере; REST read/write путь; bulk-импорт всей `examples/trade`; OneBase runtime в CI; визуальный UI метаданных; публикация MCP-пакета.

---

## 9. Связь с другими аналитиками

- [onebase-integration-vertical-stack.md](onebase-integration-vertical-stack.md) — стратегический разбор (конкуренты, аудитория, риски, roadmap). **Этот документ обновляет его техническую часть** под текущий код.
- [closing-epic-pivot-to-1c-onebase-vertical.md](closing-epic-pivot-to-1c-onebase-vertical.md) — закрытие эпика разворота на 1С/OneBase.
- [iohasc-agent-stack-port-eval.md](iohasc-agent-stack-port-eval.md) — оценка переноса стека из ioHasC.

---

## 10. Вердикт

Интеграция в текущем rebuild — это **детерминированный слой управления поверх внешнего Go-проекта OneBase**, а не runtime и не редактор. Зрелые части: 6 worker-tools с доменным gating, типизированные свидетельства, статический gate бизнес-правила, PVRG-граф, blocked-модель окружения, golden-path с ограниченным контекстом. Главные незакрытые узлы: **рабочий MCP-сервер OneBase** и **REST/write-путь** — сейчас они существуют как намерения в parity-матрице, а не как код. Для пилота этого достаточно как «движка планирования и верификации»; для продукта нужно дотянуть MCP и REST.
