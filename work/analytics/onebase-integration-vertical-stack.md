# AN-17: OneBase Integration — мост к управлению 1С/OneBase (vertical stack)

**Запрос:** «сделай отдельный обзор на OneBase».

## Кратко

OneBase — с открытым исходным кодом 1С-подобная платформа (YAML + `.os` + REST runtime), `github.com/ivanarama/onebase`. В ioHasC уже построен **полноценная интеграция** на уровне MVP: metadata scan, PVRG-парсер YAML/`.os`, обратный импорт `.bvc` из конфигурации, MCP-сервер, agent skill, trace-links, sidecar-интеграция, тесты.

Это **самая зрелая внешняя интеграция** в ioHasC и **единственный реальный носитель позиции C (1С vertical)** из AN-7. Без OneBase — позиция C это слова. С OneBase — это пилотный стек с одним конкретным внешним продуктом-носителем.

## 1. Что такое OneBase

| Аспект | Значение |
|---|---|
| Источник | `github.com/ivanarama/onebase` (внешний с открытым исходным кодом) |
| Автор | Иван Арама (внешний для ioHasC) |
| Идея | с открытым исходным кодом альтернатива 1С: декларативная YAML-конфигурация + DSL `.os` для процедурного кода + REST runtime + PostgreSQL/SQLite |
| Зрелость | early stage, активная разработка |
| Структура конфигурации | `catalogs/`, `documents/`, `registers/`, `src/*.os`, `examples/trade/` как reference |
| Runtime | `onebase dev --project ./examples/trade --port 8081 --db postgres://...` |
| REST | `GET/POST /catalogs/X`, `/documents/X`, `/documents/X/{id}/post` |
| CLI | `onebase describe --json`, `check`, `ai-guide` |
| Похоже на | 1С:Конфигурация, но открытый исходный код, без проприетарного конфигуратора |

### Пример YAML документа

```yaml
name: РеализацияТоваров
posting: true
numerator: НумераторПродаж
fields:
  - { name: Номер, type: string }
  - { name: Дата, type: date }
  - { name: Покупатель, type: reference:Контрагент }
tableparts:
  - name: Товары
    fields:
      - { name: Номенклатура, type: reference:Номенклатура }
      - { name: Количество, type: number }
      - { name: Сумма, type: number }
```

Это **знакомая** для 1С-разработчика модель: документ с реквизитами, табличной частью, проведением через `.posting.os`.

## 2. Что построено в ioHasC

### Module map

| Слой | Где | Назначение |
|---|---|---|
| **Metadata scan (disk)** | `src/iohasc/onebase/onebaseMetadataScan.ts` | дерево объектов с дискового OneBase-проекта |
| **Metadata scan (file map)** | `src/iohasc/onebase/onebaseMetadataScanCore.ts` | для виртуальных файлов / тестов |
| **YAML parser** | `src/iohasc/onebase/onebaseYamlParse.ts` | typed parse OneBase YAML |
| **CLI runner** | `src/iohasc/onebase/onebaseCliRunner.ts` | wraps `onebase describe --json` / `check` / `ai-guide` с typed failureClass |
| **PVRG OneBase YAML** | `pvrg-core/src/onebaseYamlPvrg.ts` | YAML → PVRG nodes/edges |
| **PVRG OneBase `.os`** | `pvrg-core/src/onebaseOsPvrg.ts` | `.os` → PVRG (procedural границы + регистры) |
| **Обратный импорт** | `src/iohasc/codeIngest/extractOneBaseExportForStepLlm.ts` | draft `.bvc` из YAML + posting |
| **Agent tools** | `src/agent/onebaseAgentTools.ts` | `onebaseListMetadata`, `onebaseRestCall`, `onebaseDevStatus`, `onebaseDescribeConfig`, `onebaseCheckConfig` |
| **Skill** | `skills/onebase-config/SKILL.md`, `SKILL.bvc` | с ограничением по навыку tool exposure для агента |
| **Тесты ограничения по навыку** | `tests/onebase-config-skill-gating.test.js` | гарантия, что инструменты не доступны без выбранного навыка |
| **MCP server** | `packages/onebase-mcp/src/index.ts`, `onebaseMcpHandlers.ts` | stdio MCP с tools `list_metadata`, `describe_config`, `check_config`, `ai_guide`, `read_config_file`, `rest_get` |
| **Trace links** | `docs/onebase-trace-links.md` | typed IDs `onebase:document:X`, `onebase:catalog:X`, `onebase:posting:path` |
| **ADR** | `docs/architecture-v2/adr-iohasc-onebase-bridge.md` | формальный ADR Phase 8.6 |
| **Setup doc** | `docs/onebase-integration-setup.md` | runbook для разработчика |
| **Plan** | `plans/onebase-integration-plan.bvc` | исполняемый план интеграции |
| **E2E** | `e2e/agent-scenarios/a13-onebase-skill.spec.js` | сценарий A13 (с ограничением по навыку tools на mock LLM) |
| **Fixtures** | `tests/fixtures/onebase/{catalogs,documents,src}/` | реальные примеры из конфигурации `trade` |

### Архитектура

```
   ┌─────────────────────────────────────────────────────────────────┐
   │  OneBase project (external git: examples/trade)                 │
   │                                                                 │
   │   catalogs/Номенклатура.yaml                                    │
   │   documents/РеализацияТоваров.yaml + src/...posting.os          │
   │   registers/ОстаткиТоваров.yaml                                 │
   └────────────────┬────────────────────────────────────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  ioHasC sidecar (Node, :8788)                                   │
   │   projectCwd → examples/trade                                   │
   │   IOHASC_DB_PROFILES → read-only PG profile                     │
   │   ONEBASE_API_BASE_URL → http://127.0.0.1:8081                  │
   └────────────────┬────────────────────────────────────────────────┘
                    │
        ┌───────────┼────────────┬─────────────────┐
        ▼           ▼            ▼                 ▼
   ┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌─────────────────┐
   │ PVRG    │ │ Reverse │ │ Agent tools  │ │ MCP server      │
   │ YAML/os │ │ ingest  │ │ (с ограничением по навыку)│ │ (onebase-mcp)   │
   └─────────┘ └─────────┘ └──────────────┘ └─────────────────┘
        │           │            │                 │
        ▼           ▼            ▼                 ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  ioHasC управление (.bvc + IR + trace-links + audit)           │
   │                                                                 │
   │  draft .bvc:                                                   │
   │    source.onebaseObject: document:РеализацияТоваров             │
   │    evidence.restEndpoint: POST /documents/X/{id}/post           │
   └─────────────────────────────────────────────────────────────────┘
```

### Skill рабочий процесс (из `SKILL.md`)

1. **Перед правками:** `describe_config` или запасной вариант `onebaseListMetadata`.
2. **После правок:** `check_config`.
3. **Чтение:** `rest_get` (GET only, мутации через `confirm`).
4. **Изменения YAML/.os:** через `writeFile` / `applyPatch`, intent фиксируется в `.bvc`.
5. **Гайд:** `ai_guide` пишет AGENTS.md **внутри** OneBase-проекта (отдельно от ioHasC AGENTS.md).

## 3. Что это даёт ioHasC

| Эффект | Объяснение |
|---|---|
| **Первый внешний продукт-носитель** | OneBase — не проверка «на себе», а **внешний** runtime. ioHasC через него получает реальный сценарий применения. |
| **Конкретизация позиции C (AN-7)** | «1С vertical» из абстракции превращается в «OneBase + ioHasC управление». |
| **Тест Step-Canon Stack** | PVRG, Trace-Links, Обратный импорт применены к реальной (не игрушечной) семантике. |
| **Готовая инфраструктура для 1С-аудитории** | OneBase напоминает 1С, целевая аудитория знакома. |
| **Ограничение по навыку проверено** | A13 E2E доказывает, что инструменты появляются **только** при выбранном навыке. |
| **Доступ через MCP** | другие AI-IDE (Cursor, Cody, Continue) могут подключить OneBase через MCP без ioHasC UI. |

## 4. Что **не сделано** (gaps к коммерческому MVP)

| Gap | Критичность | Усилие |
|---|---|---|
| **OneBase runtime не поднят в CI** | средняя | 1-2 дня (docker compose с pg + onebase) |
| **Codegen из VectorDSL в OneBase YAML** | отложен ADR-ом | 4-6 недель |
| **Write-операции через REST с confirm** | средняя | 1 неделя (есть схема в SKILL.md) |
| **Bulk обратный импорт всей конфигурации `trade`** | высокая для пилота | 1-2 недели |
| **Visual UI** для OneBase metadata в ioHasC | средняя | 2-3 недели |
| **Готовые `.bvc`-шаблоны** для document/catalog/register | низкая, но важная для DX | 1-2 недели |
| **Аудит правил проведения** через uncertainty barrier | низкая | 2-3 недели |
| **MCP server опубликован в npm** | низкая | 1-2 дня |
| **Документация для OneBase team** | высокая, для продвижения в сообществе | 1 неделя |
| **Live demo с реальной 1С-командой** | максимальная | месяц подготовки + пилот |
| **Перевод документации на английский** | низкая (русско-говорящая аудитория) | 1-2 недели |
| **OneBase write-back: .bvc → OneBase YAML PR в репо OneBase-проекта** | средняя | 2-3 недели |

## 5. Конкуренты

| Подход | Сильно | Слабо vs OneBase+ioHasC |
|---|---|---|
| **1С:Конфигуратор** | массовое распространение в РФ/СНГ | проприетарный, нет AI-агента, нет открытый канон |
| **1С:Cognitive Architect / 1С:GPT** | встроенный в 1С, поддержка поставщика | проприетарный, без прослеживаемости, без открытого канона |
| **Cursor + 1С/OneBase** | массово используемая IDE | Cursor не понимает YAML/`.os` семантику, нет skill |
| **Continue / Cody / Aider + 1C** | открытые IDE-агенты | то же — нет специализации |
| **Postman + 1С REST** | удобно для REST | нет codegen, нет прослеживаемости |
| **n8n + OneBase** | рабочие процессы | среда рабочих процессов, не управление |
| **Внутренние шаблоны конфигураций** | бесплатно | без agent, без управление |
| **DevExpress 1С Tools** | UI tools | без AI |
| **Стандартный VCS (git) + ADR конвенции** | мейнстрим | ручная связь, расхождение |

**Ключевое уникальное:** **никто** не делает открытый канон + AI-agent + 1С-подобная семантика в одном пакете.

## 6. Целевая аудитория

| Сегмент | Потенциал | Барьер входа |
|---|---|---|
| **OneBase ранние пользователи** | 10-50 команд (грубая оценка) | низкий — они уже выбрали open альтернативу |
| **1С-команды, готовые мигрировать** | 100-500 команд (РФ+СНГ) | средний — пилотный проект |
| **1С-консалтинг, ищущий differentiator** | 20-100 фирм | средний — нужен «продаваемый» аспект |
| **RegTech / lawtech на базе 1С учётной политики** | узкая, но платёжеспособная | высокий — нужно lawtech-эвиденс |
| **Universities, преподающие 1С** | 50+ | низкий, но мало денег |
| **Зарубежные команды на OneBase** | <10 | очень низкий |

**Реалистичный пилот:** 1-2 OneBase команды ранних пользователей + 1 средняя 1С-команда, рассматривающая переход.

## 7. Боли, которые закрывает OneBase + мост ioHasC

1. **«AI-agent галлюцинирует имена объектов 1С/OneBase»** → metadata describe + с ограничением по навыку tools закрывают.
2. **«Конфигурация в YAML растёт, расхождение не отслеживается»** → PVRG + trace-links + audit gap matrix.
3. **«Нет ADR-like документации для 1С-конфигурации»** → обратный импорт `.bvc` из YAML + `evidence.restEndpoint`.
4. **«Правки в YAML не валидируются до выкладки»** → `check_config` через MCP + CI gate.
5. **«REST endpoint без spec»** → MCP-handler фиксирует endpoint в trace-link.
6. **«Учётная политика — текст, не код»** → Charter Executable Law (15.8) для уставных нормативов 1С.
7. **«Подключение нового разработчика на конфигурацию занимает недели»** → AI-агент с PVRG-картой + skill рабочий процесс.

## 8. Стратегические подварианты

| Под-вариант | Суть | Шанс |
|---|---|---|
| **A: OneBase консоль управления** | набор инструментов с открытым кодом + платная корпоративная консоль | **средний-высокий** |
| **B: OneBase MCP server only** | публикация `@step-canon/onebase-mcp` npm + spec | средний (низкий риск) |
| **C: 1С-vertical с OneBase как пилот** | OneBase = первый сценарий применения, далее «1С Конфигуратор — мост» | средний (большой scope) |
| **D: внутренний компонент** | не публиковать, использовать только «на себе» | **слабая позиция** |
| **E: lawtech-1С** | узкий пилот для учётной политики через Charter | средний |

**Моя ставка — A + B параллельно.** B — низкий риск, поставит флаг в open MCP экосистеме. A — реальный продукт.

## 9. Решения **до** начала работ

- **Имя продукта**: «1C/OneBase консоль управления» громоздко. Кандидаты: `step-canon for OneBase`, `OneBase Governor`, `OneBase Guard`.
- **Лицензия**: ядро с открытым кодом (Apache 2.0), коммерческие корпоративные дополнения.
- **EN translation**: для с открытым исходным кодом — обязательна.
- **OneBase сотрудничество с авторами проекта**: контакт с автором OneBase, координация на уровне API/CLI.
- **MCP server**: опубликовать `@step-canon/onebase-mcp` в npm как первый шаг.

## 10. Риски

| Риск | Вероятность | Воздействие | Митигация |
|---|---|---|---|
| OneBase сам по себе не получит распространение | средняя | высокое (теряется целевой рынок) | подготовить «1С Конфигуратор — мост» как запасной план |
| OneBase API меняется быстро | высокая | среднее | versioned MCP, integration tests на nightly OneBase |
| 1С-команды не готовы платить за управление | средняя | высокое | пилот free, затем оплата за каждое рабочее место |
| Конкурент 1С выпустит свой AI с прослеживаемостью | средняя | высокое | скорость + с открытым исходным кодом конкурентное преимущество |
| Author OneBase без согласования | низкая | среднее | PR в основной репозиторий, открытое общение |

## 11. Метрики через 6 месяцев

**Зелёные:**
- `@step-canon/onebase-mcp` опубликован в npm, ≥50 weekly downloads.
- 1 платящий пилот (или free но с подписанным письмо о намерениях).
- 5+ `.bvc`-шаблонов для типовых OneBase-задач.
- Vitest + E2E A13 в CI nightly, проходит.
- 1 публичный demo (видео/blog post с реальным OneBase-проектом).

**Жёлтые:**
- Только использование «на себе», без внешнего применения.

**Красные:**
- OneBase не набирает интерес, ни одного пилота → **разворот к 1С Конфигуратор — мост** (большее усилие, но больший рынок) или отказ от позиции C.

## 12. Что **не делать**

- Не пытаться построить **свой** runtime, конкурируя с OneBase или 1С.
- Не делать write-операции без `confirm`-гейта.
- Не объединять `iohascAGENTS.md` и OneBase AGENTS.md.
- Не лезть в авторы OneBase без координации.
- Не строить visual UI до того, как 1 пилот не покажет реальную потребность.

## 13. Связь с другими аналитиками

- **AN-7 (product audit)**: OneBase — **единственный реальный носитель** позиции C (1С vertical).
- **AN-8 (`.bvc`)**: `.bvc` — формат draft из обратный импорт. Прямая связь.
- **AN-9 (IR)**: IR пока не используется для OneBase posting, но возможно — `.os` → IR через LLM normalizer (см. AN-9).
- **AN-10 (PVRG)**: `onebaseYamlPvrg`/`onebaseOsPvrg` — прямые консьюмеры PVRG-инфраструктуры.
- **AN-13 (Uncertainty)**: правила проведения 1С — идеальный domain для барьера.
- **AN-14 (Round-Trip)**: codegen OneBase YAML из `.bvc` — естественное продолжение.
- **AN-15.2 (Trace-Links)**: `onebase:document:X` идентификаторы — пример canonical trace-link.
- **AN-15.8 (Lawtech)**: учётная политика 1С как charter-executable law.
- **AN-16 (мета-обзор)**: OneBase — критический элемент Stack 2.

## 14. Roadmap (12 недель к пилоту)

| Неделя | Артефакт |
|---|---|
| 1 | Имя продукта, лицензия, OneBase контакт с авторами проекта |
| 2 | `@step-canon/onebase-mcp` опубликован в npm |
| 3-4 | Bulk обратный импорт всей `examples/trade` → draft `.bvc` для каждого объекта |
| 5 | Готовые `.bvc`-шаблоны (document, catalog, register, posting) |
| 6 | Write-через-REST с confirm, audit log |
| 7 | OneBase runtime в CI (docker compose) |
| 8 | Visual UI MVP в ioHasC: metadata tree + trace-links overlay |
| 9 | Документация для OneBase team (RU+EN) |
| 10 | Контакт с 1-2 OneBase ранние пользователи |
| 11 | Free пилот с одним из них |
| 12 | Public demo + blog post |

## 15. Финальный вердикт

OneBase integration — **самый зрелый и продуктово реалистичный** трек ioHasC. Это **не R&D**, не «надо подумать», это **готовая интеграция с тестами**, которому нужен **пилотный клиент**.

**Главный риск:** OneBase сам по себе ранний, распространение неизвестно. Но даже если OneBase не взлетит — интеграция переносима на 1С Конфигуратор (тот же модель работы). Не самый эффективный, но рабочий запасной план.

**Рекомендация:** немедленно (1-2 недели) опубликовать `@step-canon/onebase-mcp` в npm и связаться с автором OneBase. Это **низкий риск, высокая видимость**, открывает дверь к согласование и потенциальному совместному маркетингу.

**Метрика 30 дней:**
- npm пакет опубликован.
- 1 разговор с автором OneBase состоялся.
- 1 OneBase команда раннего пользователя — связь установлена.

Если за месяц ничего из этого — позиция C из AN-7 нереализуема, нужно возвращаться к выбору другой позиции (A/B/D).

---

**См. также:** [AN-7 product audit](product-self-audit-user.md), [AN-16 stack meta-review](unique-tech-stack-meta-review.md), [AN-10 PVRG](pvrg-verified-reference-graph.md), [AN-14 Round-Trip](compiler-round-trip-low-code-каркас.md), [AN-15 overview](other-unique-technologies-overview.md).
