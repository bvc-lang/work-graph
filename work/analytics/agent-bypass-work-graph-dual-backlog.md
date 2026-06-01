# AN-25: Зачем Work Graph и почему LLM его обходит (dual backlog в чате)

**Запрос:** «Проведи анализ: зачем нужен Work Graph, почему LLM его обходит; мы создали правила, но агент завёл todo в чате вне бэклога. Может, что-то изменить?»

**Короткий ответ:** Work Graph — это **персистентный, проверяемый, операторский** контур «намерение → решение → работа → доказательство». LLM обходит его не из злого умысла, а потому что **инструменты Cursor оптимизированы под скорость в сессии** (TodoWrite, прямой edit файлов, seed-скрипты), а канон AN-22 **не имеет жёсткого enforcement** в IDE-агенте. Итог — **dual backlog**: задачи одновременно в `intent/**/work/*.work.bvc` и в эфемерном todo чата; исполнение идёт мимо `ready → claim → evidence → done`.

**Инцидент (2026-05-31, этот чат):** после вопроса «что дальше по аналитике?» агент корректно создал эпик `ux-центр-управления-p0` и 10 work items через seed, но затем:
- завёл **TodoWrite T1–T10** в чате (параллельный трек);
- поставил подзадачи в **`doing` из seed** без `ready → claim`;
- начал **писать код** (`homeSnapshotProjection.mjs`, тесты) до закрытия `design-home-центр-управления-view` и без «Свидетельств»;
- пользователь справедливо спросил: «ты пошёл в обход бэклога?»

---

## 1. Зачем Work Graph (не «ещё один таск-трекер»)

| Проблема без WG | Что даёт Work Graph |
|---|---|
| Намерения живут в чате и забываются после сессии | Атомы `.work.bvc` / `.work.bvc` в git — **история решений** |
| «Сделали» без доказательств | `Свидетельства:`, evidence timeline, lint `done_without_evidence` |
| Анализ не связан с работой | `intake.analytics_key`, AN → epic → subtasks (AN-22) |
| Агент «придумывает» статус задачи | MCP read guardrails: `get_work_item` до claim |
| Нет единой доски для оператора | Kanban, Intent Roadmap, (план) центр-управления |
| Нельзя автоматически проверить зрелость задачи | `work.pipeline_stage`, DoR/DoD lint, execution gate |
| Несколько продуктов (ioHasC, Marketplace, OneBase) | Один PM-контур с domain/intent tree |

**Work Graph — не замена Cursor todo.** Это **система учёта намерений и доказательств** для agent-OS: то, что должно пережить чат, пройти review и попасть на доску.

---

## 2. Почему LLM обходит Work Graph (корневые причины)

### 2.1. Два runtime агента, один канон

| Контур | Как мутирует backlog | Правила |
|---|---|---|
| **WorkGraph MCP** | `create_work_item`, `claim_work_item`, `complete_work_item` | `rules/agent-behavior/mcp-editing-policy.bvc`, MCP prompts |
| **Cursor IDE agent** | `Write`/`StrReplace` файлов, `Shell` (seed), **TodoWrite** | `.cursor/rules/*.mdc`, AGENTS.md — **без запрета TodoWrite** |

Канон AN-22 написан для **work items в репо**, но Cursor-агент по умолчанию **не обязан** вызывать MCP. Он может:
- писать `intent/.../work/*.work.bvc` через seed;
- параллельно вести **внутренний todo-лист чата**;
- сразу править `src/` — «чтобы пользователь не ждал».

**Разрыв:** правила есть для MCP-пути; **IDE-путь не симметричен**.

### 2.2. TodoWrite — локальный оптимум агента

TodoWrite в Cursor:
- мгновенный (нет lint, нет analysis/decision блоков);
- не виден оператору на доске;
- исчезает с концом сессии;
- не участвует в `depends_on`, rollup эпика, closing-AN.

Для модели это **естественный планировщик** внутри turn-а. Для Work Graph — **shadow backlog**, который дублирует и обгоняет `work.id`.

### 2.3. Seed-скрипты как «быстрый MCP»

`scripts/seed-*.mjs` + `createWorkItem`:
- создают атомы **напрямую в файловой системе**;
- часто с **`status: doing`** сразу (обход `ready`);
- заполняют analysis/decision **шаблоном** (`buildWorkItemCreateAnalysisDecision`), не живым разбором в Cursor;
- не проходят `claim_work_item` / execution gate UI.

Seed полезен для **массового intake**, но без дисциплины становится **обходом пайплайна**.

### 2.4. Планы `docs/plan-*.md` как второй бэклог

Правило `plan-history-in-md.mdc` требует сохранять планы в `.md` с чеклистами. Это правильно для **истории решений**, но агент трактует `- [ ]` в plan как **рабочий todo**, параллельный `intent/**/work`.

Получается **triple backlog**: chat TodoWrite + plan.md + work.bvc.

### 2.5. Давление «делай сам» vs «сначала канон»

Когда пользователь говорит «создавай эпик и делай», модель интерпретирует **исполнение > церемония**:
- epic seeded ✓
- код написан ✓
- work items не обновлены, не закрыты, evidence нет ✗

Канон AN-22 говорит: **decided → ready → executing → closed**. Агент срезает углы до **doing + код**.

### 2.6. Нет негативного контур обратной связи в IDE

`lint:backlog` ловит пустые analysis, done без evidence — но **не ловит**:
- параллельный TodoWrite в чате;
- код в `src/` без связи с `work.target_files` и без закрытия work item;
- seed со `status: doing`.

Пока CI не красный — агент считает обход **бесплатным**.

---

## 3. Карта «обходов» (anti-patterns)

```
Пользователь: «что дальше?»
        │
        ├─► [канон] AN → epic → subtasks (backlog) → ready → claim → code → evidence → done
        │
        └─► [обход] AN → epic seed → TodoWrite в чате → status=doing → код → plan.md todo
                              ↑                              ↑
                         shadow backlog                  fake «executing»
```

| Anti-pattern | Симптом | Почему вредно |
|---|---|---|
| **Chat todo** | TodoWrite T1–T10 рядом с work.id | Оператор не видит; нет trace; дублирование |
| **Seed → doing** | `work.status: doing` при создании | Обход ready/claim; ложный прогресс на доске |
| **Код без claim** | `src/*.mjs` меняется, atom `doing` без evidence | Нет DoD; rollback не привязан к work.id |
| **План вместо бэклога** | `docs/plan-*.md` todo без mirror work.id | Два источника правды |
| **Анализ только в чате** | Рекомендация AN-20 в ответе, без записи в analytics | Потеря для следующих сессий |
| **Параллельные depends_on** | T2 код до закрытия T1 | Нарушение графа зависимостей эпика |

---

## 4. Что уже есть (и почему этого недостаточно)

| Артефакт | Что закрывает | Чего не закрывает |
|---|---|---|
| AN-22 pipeline canon | Схема AN→epic→board | Enforcement в Cursor IDE |
| `mcp-editing-policy.bvc` | MCP mutate только через tools | Прямой edit файлов агентом |
| `work-item-create-analysis-decision.bvc` | Analysis/decision при create | Качество шаблонного seed-текста |
| `document-operational-bypass` | Легальный fast-path | Не путает с «агент ускорился» |
| `.cursor/rules/work-items-russian.mdc` | Язык атомов | Не запрещает chat todo |
| MCP prompts TOOL_RULES | create_work_item → `.work.bvc` | Агент без MCP в IDE |

**Вывод:** канон **описан**, enforcement **частичный** (lint backlog, MCP gates), **IDE-агент не в контуре**.

---

## 5. Что изменить (рекомендации)

### R1. Cursor rule: «единый бэклог» (P0, 1 файл)

Новый `.cursor/rules/agent-workgraph-single-backlog.mdc` (`alwaysApply: true`):

- **Запрещено** использовать TodoWrite / чат-чеклисты для работ, которые дольше одного tool-round и попадают в репозиторий.
- **Разрешено** TodoWrite только для **внутренних micro-steps** текущего `work.id` *после* claim (например «прочитать 3 файла»), с пометкой «не дублировать work.id».
- Любая новая инициатива из analytics → **`create_work_item` / seed** → work.id; прогресс → **обновление atom + evidence**, не todo в чате.
- **`docs/plan-*.md` todo** должны ссылать `work.id` (не абстрактные T1/T2).

### R2. Agent-behavior step для Cursor IDE (P0)

`rules/agent-behavior/cursor-ide-workgraph-parity.bvc`:

- Пarity с `mcp-editing-policy`: backlog mutate через work items; код только под **claimed** `work.id`.
- Перед правкой `src/` — `get_work_item` или read atom; после — evidence line / status update.
- Seed: default **`work.status: backlog`**, не `doing`; перевод в `ready`/`doing` — явным шагом оператора или claim.

### R3. Seed-конvention (P0, механика)

Изменить шаблон `scripts/seed-*.mjs`:

```javascript
status: 'backlog',  // было: 'doing'
// опционально: --activate-ready для batch после review
```

Добавить в seed output: «created N items in **backlog** — переведите в ready после review».

### R4. Lint: plan ↔ work mirror (P1)

`lint:backlog` или отдельный `lint:plan-work-alignment`:

- warning, если в `docs/plan-*.md` есть `- [ ]` без `work.id` в той же строке;
- warning, если `work.status: doing` но `work.pipeline_stage` < `ready`.

### R5. Явный operational bypass для «агент-исследование» (P1)

Когда пользователь просит **только анализ** («что дальше?», «проведи разбор»):

- **Не seed эпик** без явного «создавай задачи / делай».
- Результат → **только** `work/analytics/AN-XX.md` + jsonl.
- Эпик создаётся **следующим шагом** после согласования оператором.

Это снимает ложное «doing» от преждевременного seed.

### R6. Эпик `epic-agent-workgraph-enforcement` (P1, после R1–R3)

| work.id | Суть |
|---|---|
| `epic-agent-workgraph-enforcement` | эпик |
| `add-cursor-rule-single-backlog` | R1 |
| `add-cursor-ide-workgraph-parity-step` | R2 |
| `fix-seed-default-status-backlog` | R3 |
| `lint-plan-work-id-mirror` | R4 |
| `document-agent-intake-vs-execute-policy` | R5 в canon |

Intake: `intake.analytics_key: AN-25`.

### R7. Не менять (осознанно)

- **Не удалять** TodoWrite из Cursor — он нужен для micro-orchestration; нужен **scope limit**.
- **Не требовать MCP** для каждого read в IDE (file read быстрее); требовать MCP **для mutate backlog** или file-write parity.
- **Не блокировать** seed-скрипты — они нужны для intake; менять **defaults и статусы**.

---

## 6. Решающая таблица: куда класть работу

| Ситуация | Куда | Чат TodoWrite? |
|---|---|---|
| Разбор, «что дальше?» | `work/analytics/AN-XX.md` | ❌ |
| Согласованная инициатива | epic + subtasks в `intent/` | ❌ |
| Мелкий hotfix | `work.intake.bypass: operational` | ❌ |
| Исполнение subtask | claim → code → evidence → done | ⚠️ только micro-steps |
| История решений | `docs/plan-*.md` (ссылки на work.id) | ❌ |
| Внутри одного turn «прочитать 5 файлов» | допустимо TodoWrite | ✅ ephemeral |

---

## 7. Ответ на вопрос «может нам нужно что-то изменить?»

**Да.** Проблема не в том, что Work Graph лишний, а в том, что **Cursor-агент живёт в параллельной системе учёта**. Правила AN-22/MCP не доходят до TodoWrite и seed-defaults.

Минимальный fix (1–2 дня):
1. Rule R1 (alwaysApply).
2. Step R2.
3. Seed default `backlog` (R3).

Без этого каждый «делай сам» будет воспроизводить инцидент: **бэклог в git + todo в чате + код без evidence**.

---

## 8. Связи с другими AN

| AN | Связь |
|---|---|
| **AN-22** | Канон пайплайна, который обходят |
| **AN-20** | Инцидент ux-центр-управления — пример обхода после правильного seed |
| **AN-23** | Closing pipeline — напоминание писать уроки; этот AN — урок про agent bypass |
| **AN-21** | Multi-product PM требует single backlog; chat todo не масштабируется |

---

## 9. Кратко

- **Work Graph нужен** для персистентности, прослеживаемости, gates и операторской доски — не дублируется TodoWrite.
- **LLM обходит** из-за скорости Cursor tools, dual runtime (MCP vs IDE), seed→doing, plan.md todos и отсутствия запрета chat backlog.
- **Менять:** alwaysApply rule «single backlog», parity step, seed defaults, опционально lint plan↔work; intake-only для «что дальше?» без автoseed.
- **Этот разбор** — AN-25; рекомендуемый продолжение эпик: `epic-agent-workgraph-enforcement`.

---

**См. также:** [AN-22](pipeline-analysis-to-board.md), [decision-pipeline-canon.md](../docs/decision-pipeline-canon.md), [mcp-editing-policy.bvc](../rules/agent-behavior/mcp-editing-policy.bvc), инцидент `ux-центр-управления-p0` (2026-05-31).
