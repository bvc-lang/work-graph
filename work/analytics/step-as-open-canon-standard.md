# AN-8: BVC (`.bvc`) как открытый канон — анализ позиции D из AN-7

**Запрос (исходный):** «сделай отдельно аналитику по D. Открытый канон — `.bvc` как стандарт».

**Обновлено 2026-05-31:** naming зафиксирован в [AN-18](bvc-naming-branding-review.md) и [ADR `docs/adr-bvc-format-naming.md`](../docs/adr-bvc-format-naming.md). **Публичный canon = BVC + `.bvc` + `@bvc/*`**. Расширение `.bvc` — **legacy alias** в ioHasC/Work Graph (ISO 10303 CAD collision). План миграции: [`docs/plan-step-to-bvc-migration.md`](../docs/plan-step-to-bvc-migration.md).

**Обновлено 2026-05-31 (multilingual):** inline bilingual aliases (§6 #1, старый синтаксис) **заменён** [AN-19](bvc-multilingual-keys-design.md) — модель **Detect-or-Declare** (pragma / atom header / Labels.lang / auto-detect).

## Кратко

**BVC** (Basis · Vector · Goal) — не «ещё один формат сериализации», а **типизированная единица смысла (атом BVC)** с трассировкой и машинными метками. Публичное расширение — **`.bvc`**, не `.bvc`.

Это потенциально влиятельный артефакт **для эпохи AI-агентов**: «как зафиксировать намерение, а не только данные».

Чтобы это стало стандартом, нужно **7 артефактов** (§6). Самое сложное — **EN-canon + registered dialects (Detect-or-Declare, не inline aliases)** и **отделение спеки от Work Graph**. Бюджет 6–8 недель. Шанс в нише «AI-agent context format» — **заметно выше**, чем «заменить Markdown».

## 1. Что такое BVC сегодня — фактический срез

**В репо (legacy `.bvc`):**
- 64 protocol-файла, 233 work-item, 1 charter — всё в `*.bvc` (internal).
- Спецификация **не зафиксирована** — есть `schemas/step-atom-draft.v1.json` (draft для LLM); целевое имя **`bvc-atom-draft.v1.json`**.
- Парсер HasC — приватный, в `src/`; целевой пакет **`@bvc/parser`**.
- Профили атомов — enum в schema; в spec v1 — **расширяемый** registry.

**Синтаксис атома (`.bvc` = тот же текст, другое расширение):**

EN-файл (pragma optional, default `en`):

```
#!bvc lang=en

#AgentCharter<[
Basis:
  - …
Vector:
  - …
Goal:
  - …

Labels:
  profile: charter
  trace.status: pending
]>
```

RU-файл (legacy charter; один dialect на атом — без смешения `Basis` и `Базис`):

```
#!bvc lang=ru

#Устав_Продукта<[
Базис:
  - …
Вектор:
  - …
Цель:
  - …

Метки:
  profile: charter
  trace.status: pending
]>
```

**Не использовать:** mixed inline aliases в комментариях (`Basis: # alias: Базис`) — см. [AN-19](bvc-multilingual-keys-design.md).

**Семантика:**
- **BVC** — Basis (контекст) / Vector (действие) / Goal (telos).
- **Labels** — машинный конверт (id, profile, trace, evidence).
- **Именованный атом** — самодостаточная единица для LLM-контекста.

## 2. Зачем стандарт — какую боль решает

| Боль | Кто страдает | Чем закрывают |
|---|---|---|
| Markdown без структуры теряет смысл при LLM-ретриве | AI-агенты | RAG кусками |
| YAML/JSON не для прозы | разработчики | frontmatter + MD |
| ADR — convention без валидатора | архитекторы | grep |
| Нет формата, где «намерение» = first-class | команды с AI | tickets + чат |

**Уникальное обещание BVC:** «один формат, BVC + Labels в одном атоме; человек читает, агент парсит, граф связывает».

## 3. Конкуренты

| Формат | Сильно | Слабо для BVC |
|---|---|---|
| **Markdown** | network effect | нет границ смысла |
| **`.cursor/rules` / AGENTS.md** | AI-канон de-facto | proprietary / flat file |
| **YAML / TOML** | парсинг | не проза |
| **Gherkin** | BDD | узко |
| **ISO `.bvc` (CAD)** | — | **не мы** — другой формат |

**Реальные конкуренты:** Markdown, `.cursor/rules`, AGENTS.md.

## 4. Что в BVC действительно уникально

1. **BVC как первоклассная триада** (prior cause → action → telos).
2. **Именованный атом** `#Имя<[…]>`.
3. **Labels внутри** человекочитаемого блока.
4. **Профили атомов** (charter, work_item, plan, …).
5. **Trace-first** (`trace.status`, evidence, links).
6. **LLM draft JSON → deterministic formatter** (`bvc-atom-draft.v1.json`).

## 5. Где BVC обречён проиграть

1. Заменить Markdown — невозможно.
2. Конкурировать с `.cursor/rules` без MCP/extension — сложно.
3. **Продвигать `.bvc` наружу** — ISO CAD collision (**решено: `.bvc`**).
4. RU-only canon — disqualifier.
5. Спека в одном репо с UI-сервером — не возьмут.

## 6. Минимальный артефактный набор (7 штук)

### 1. Спецификация v1 — `bvc-lang/spec`

- EBNF атома, профили, conformance Core/Extended/Strict.
- **Multilingual (Detect-or-Declare):** EN — canonical dialect; RU и др. — **registered dialects** в `bvc-lang/dialects` (Basis/Vector/Goal/Labels ≡ Базис/Вектор/Цель/Метки через lookup, не inline-комментарии).
- Указание языка: file pragma `#!bvc lang=ru` → atom header `#Name@ru<[…]>` → `Labels.lang` → auto-detect по первому BVC-ключу.
- Один dialect per atom; mixed keys в одном атоме = lint error `E_BVC_DIALECT_MIX`.
- CC BY 4.0 (spec), Apache 2.0 (code).

### 2. JSON Schema

- `bvc-atom.v1.schema.json`
- `bvc-atom-labels.v1.schema.json`
- `bvc-document.v1.schema.json`

### 3. Reference parser — `@bvc/parser`

- `parse` / `format` / `lint`, dual `.bvc` + `.bvc` read.

### 4. CLI — `@bvc/cli`

- `bvc lint`, `bvc format`, `bvc query`, `bvc render --to markdown`

### 5. Editor support

- VS Code: language id **`bvc`**, alias `.bvc`
- Tree-sitter + thin LSP

### 6. Conformance tests

- `tests/conformance/*.bvc` + expected AST JSON

### 7. Community

- GitHub **`bvc-lang`**, examples gallery, HN post «BVC pattern for AI-agent era»

## 7. Стратегические подварианты (позиция D)

| Под-D | Суть | Шанс |
|---|---|---|
| **D1: Pure spec** | артефакты 1–7 | низкий-средний |
| **D2: AI-context format** | MCP + extension | **средний-высокий** ← ставка |
| **D3: ADR 2.0** | архитекторы | средний |
| **D4: BVC convention on MD** | низкий barrier | средний |
| **D5: Embedded in Cursor** | партнёрство | низкий |

## 8. Решения (зафиксировано ADR 2026-05-31)

| Решение | Было | **Сейчас** |
|---|---|---|
| Extension | `.bvc` / ? | **`.bvc`** (public); `.bvc` legacy read-only |
| Org | `step-canon` | **`bvc-lang`** |
| npm | `@step-canon/*` | **`@bvc/spec`, `@bvc/parser`, `@bvc/cli`** |
| Canon language | bilingual inline | **EN canonical + registered dialects** ([AN-19](bvc-multilingual-keys-design.md)) |
| Spec repo | отдельный | **`bvc-lang/spec`** |
| Управление | BDFL → RFC | без изменений |
| Work Graph coupling | loose | **loose** |

## 9. Риски

| Риск | Митигация |
|---|---|
| ~~`.bvc` vs ISO CAD~~ | **`.bvc`** (AN-18, ADR) |
| «yet another format» | D2 — только AI-канон |
| Cursor/Anthropic свой формат | первый public spec + MCP |
| LLM ломает синтаксис | draft JSON + formatter |
| Mixed dialect keys в одном атоме | lint `E_BVC_DIALECT_MIX` + Detect-or-Declare ([AN-19](bvc-multilingual-keys-design.md)) |
| Bus factor 1 | RFC с первого дня |

## 10. Метрики (6 мес)

**Зелёные:** VS Code ext ≥500 installs; `@bvc/parser` ≥3 external projects; spec ≥100 stars.

**Красные:** spec не зафиксирована за 3 мес; ноль внешних PR.

## 11. Что не делать

- Не строить IDE поверх BVC (это C).
- Не заменять Markdown/YAML.
- Не публиковать как `.bvc`.
- Не big-bang rename всех `*.bvc` в репо.
- Не использовать mixed inline bilingual aliases (§1, старый draft) — только Detect-or-Declare ([AN-19](bvc-multilingual-keys-design.md)).

## 12. Связь с позициями A–D

- **C (1С vertical)** + **D (открытый канон)** — совместимы: `@bvc/onebase-mcp`, open spec + paid vertical.
- **D2** + MCP — канал дистрибуции.

## 13. Roadmap (8 недель)

| Неделя | Арtefact |
|---|---|
| 1 | ADR + `@bvc/spec@0.0.0` + `bvc-lang/spec` repo |
| 2 | EBNF + spec.md v0.1 + dialect registry (`bvc-lang/dialects`) |
| 3 | `@bvc/parser` (dual `.bvc`/`.bvc`) |
| 4 | `@bvc/cli` |
| 5 | VS Code extension (`bvc` + `.bvc` alias) |
| 6 | Tree-sitter + LSP MVP |
| 7 | Examples + MCP demo |
| 8 | Community post + RFC doc |

## 14. Финальный вердикт

D **реалистичен** при:
1. **`.bvc` + `@bvc/*`** (не `.bvc`, не `step-canon`).
2. **D2** (AI-context format).

Совместим с **C**: open `@bvc/*` + OneBase vertical.

**Проверка через месяц:** `@bvc/spec` v0.1, `@bvc/parser` npm, VS Code syntax, ≥10 stars / ≥1 external issue. Иначе — фокус в C.

---

**См. также:** [AN-7](product-self-audit-user.md), [AN-18 naming](bvc-naming-branding-review.md), [AN-19 multilingual](bvc-multilingual-keys-design.md), [ADR](../docs/adr-bvc-format-naming.md), [migration plan](../docs/plan-step-to-bvc-migration.md), [AN-6](product-self-audit-tech.md).
