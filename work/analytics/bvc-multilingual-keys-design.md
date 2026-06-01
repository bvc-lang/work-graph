# AN-19: Мультиязычность в BVC — где жить указанию языка

**Запрос:** «или как лучше добавить мультиязычность? стоит ли указание языка вынести в метки? такое предложение мне не нравится: [пример с inline-комментариями alias-ов]».

## Кратко

**Mixed inline aliases — плохо.** Комментарии-как-спецификация ломаются, LLM не знает «как писать», ревьюер не видит каноническую форму.

**Рекомендация: `Detect-or-Declare`**
1. **EN — единственный canonical dialect** спецификации (для open standard это обязательно).
2. **RU/other — registered dialects** через dialect registry (i18n catalog), на равных с точки зрения парсера.
3. **Один атом = один dialect** (нельзя смешивать `Basis` и `Цель` в одном `#Name<[…]>`).
4. **Указание языка** — четыре уровня (Detect-or-Declare), каждый опционален, приоритет сверху вниз:
   - **File-level pragma** `#!bvc lang=ru` — default для атомов файла.
   - **Atom header** `#Name@ru<[…]>` — override на атом.
   - **Atom-level label** `Labels: { lang: ru }` — override до auto-detect.
   - **Auto-detect** — первый BVC-ключ атома (`Basis` → en, `Базис` → ru).
5. **Без явного указания** — парсер применяет auto-detect (п.4) или запасной вариант `en` + warning.

Это решает все болезни inline-mix: спека читается без комментариев, dialect один на атом, корпус мигрирует без переписывания, LLM имеет чёткую инструкцию «выбери один dialect на атом».

## 1. Почему mixed inline (AN-8 §6 #1) плохо

Пример, который не нравится:

```
#Name<[
Basis:          # EN-canon; alias: Базис
  - …
Vector:         # alias: Вектор
  - …
]>
```

Концретные failure modes:

| Что ломается | Как |
|---|---|
| **Спека через комментарии** | парсер `#…` отсутствует / стрипается / меняет семантику между реализациями |
| **LLM-неоднозначность** | модель не знает, что писать в новом атоме — `Basis` или `Базис`? Получится Frankenstein |
| **Two sources of truth** | равно валидны 2^4 = 16 комбинаций ключей в одном атоме |
| **Ревью** | visual diff показывает alias-комментарии, не семантику |
| **Tooling** | linter/formatter должен решать, в какой dialect нормализовать; нет «канона» |
| **Tree-sitter grammar** | EN и RU keyword'ы в одной production rule — сложнее grammar, медленнее highlight |
| **Conformance tests** | тестовая матрица удваивается |
| **i18n далее ES/DE/JA** | каждый dialect добавляет ещё N×N alias-ов |

**Вывод:** alias-inline решает проблему «не сломать старые `.bvc`», но создаёт **архитектурный долг** на годы.

## 2. Восемь подходов — сравнение

### A. Mixed inline aliases (текущая AN-8 §6 #1) — **REJECT**

Описан выше. Минусы преобладают.

### B. Atom-level `lang` в Labels — **HEAD кандидат (как просит пользователь)**

```
#Name<[
Базис:
  - …
Вектор:
  - …
Цель:
  - …

Labels:
  lang: ru
  trace.status: pending
]>
```

- ✅ Явное указание языка
- ✅ Один dialect per atom
- ✅ Метки и так машинный конверт — логичное место
- ⚠️ Chicken-egg: парсер должен прочитать Labels (а Labels — само ключевое слово, которое имеет dialect)
- ⚠️ Не работает для атомов без Labels

**Решение chicken-egg:** Labels — **универсальный** ключ (Labels / Метки оба распознаются как «технический» якорь), но **остальные** BVC-ключи следуют dialect, определённому по Labels.lang **или** auto-detect по первому увиденному.

### C. Atom-header attribute `#Name@ru<[…]>` — **чистый синтаксис**

```
#Name@ru<[
Базис:
  - …
Вектор:
  - …
]>
```

- ✅ Видно сразу в заголовке
- ✅ Нет chicken-egg
- ✅ Грамматика чище (один token `@lang`)
- ⚠️ Меняет atom grammar (новый sigil `@`)
- ⚠️ Не очевидно для default («`#Name<[…]>` это какой dialect?»)

### D. File extension `.bvc.ru` / `.bvc.en` — overhead

```
charter.bvc.ru
agent-rules.bvc.en
```

- ✅ Полная развязка на уровне filesystem
- ❌ Удваивает количество файлов в больших корпусах
- ❌ Невозможно смешать в одном файле
- ❌ Атомы — единицы переноса (между файлами), теряют lang

### E. File-level pragma `#!bvc lang=ru` — shebang-style

```
#!bvc lang=ru
#!bvc version=1

#Name<[
Базис:
  - …
]>

#Other<[
Базис:
  - …
]>
```

- ✅ Одно объявление на файл
- ✅ Чисто, по примеру shebang в скриптах
- ✅ Не ломает atom grammar
- ⚠️ Атом без файла (LLM-context fragment) теряет язык
- ⚠️ Нужен override на уровень атома (см. F)

### F. i18n display-only (файл всегда EN, RU — tool-side translation) — **strict but harsh**

- ✅ Один единый источник правды
- ✅ Как в программировании (`if/else` не локализуем)
- ❌ Тысячи существующих RU `.bvc` нужно переписать (или жить с поломкой)
- ❌ RU-говорящие авторы вынуждены учить EN-ключи
- ❌ Disqualifier для текущего корпуса

### G. Profile-scoped language — фрагментация

- charter → RU обязателен (для RU-уставов)
- agent-context → EN обязателен (для агента)

- ⚠️ Сложно, расщепляет стандарт по профилям
- ⚠️ Не масштабируется на новые языки

### H. **Hybrid: Detect-or-Declare** (комбинация B + C + E + auto-detect) — **РЕКОМЕНДУЕТСЯ**

Три уровня, каждый опционален, последний — запасной вариант:

1. **File pragma** `#!bvc lang=ru` (первая строка файла) — default для атомов файла.
2. **Atom header** `#Name@ru<[…]>` — override на атом (если задан, перебивает file pragma).
3. **Atom labels** `Labels: { lang: ru }` — если ни 1, ни 2 нет, тоже override (если задан, перебивает auto-detect, должен совпадать с фактическими ключами).
4. **Auto-detect** — если ни 1, ни 2, ни 3, парсер смотрит на **первый** BVC-ключ атома (`Basis` → en, `Базис` → ru) и резолвит в AST.

Один dialect per atom (после resolve). Mixed-keys в одном атоме = **lint error**, не silent accept.

## 3. Сравнительная матрица

| Критерий | A inline | B labels | C header | D ext | E pragma | F en-only | G profile | **H hybrid** |
|---|---|---|---|---|---|---|---|---|
| Один canonical dialect | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Зеро-конфиг для существующих файлов | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ | ⚠️ | ✅ |
| LLM-неоднозначность | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Чистая grammar | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ |
| Расширяется на ES/DE/JA | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Видно сразу при чтении | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Атом-фрагмент сохраняет lang | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ⚠️ | ✅ |
| Зеро chicken-egg | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Совместимо с tree-sitter | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Open standard friendly | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ❌ | ✅ |

**H выигрывает по совокупности.**

## 4. Рекомендуемый синтаксис

### Спецификация (EN canonical)

```
#!bvc lang=en

#AgentCharter<[
Basis:
  - LLM agents need durable shared canon.
  - Markdown lacks atom boundaries.
Vector:
  - Publish BVC spec v1 as open standard.
  - Maintain dialect registry for non-English authors.
Goal:
  - BVC becomes default context format for AI agents.

Labels:
  profile: charter
  trace.status: pending
]>
```

### RU-файл (legacy charter)

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

### Файл без pragma, смешанные атомы (auto-detect)

```
#EnglishOne<[
Basis: [...]
Vector: [...]
Goal: [...]
]>

#РусскийДва<[
Базис: [...]
Вектор: [...]
Цель: [...]
]>
```

→ парсер резолвит каждому атому свой `lang` по первому ключу, AST содержит `atom.lang: 'en' | 'ru'`.

### Atom-fragment (для LLM context, без файла)

LLM ВСЕГДА должен ставить либо `#Name@ru<[…]>` либо `Labels: { lang: ru }` в передаваемом фрагменте, чтобы получатель резолвил без файла.

## 5. Алгоритм парсера

```
parse_atom(text, file_pragma?):
  1. Tokenize atom header → name, optional `@lang`
  2. resolved_lang = atom_header.lang
                  || labels.lang (если успели прочитать)
                  || file_pragma.lang
                  || auto_detect_from_first_key(atom_body)
                  || default_en
  3. Validate all keys belong to resolved_lang dialect
       → mixed-dialect-keys = LINT ERROR (E_BVC_DIALECT_MIX)
  4. Normalize keys to canonical EN in AST:
       atom.bvc.basis  ← Basis | Базис | Basis_es | …
       atom.bvc.vector ← Vector | Вектор | …
       atom.lang = resolved_lang  (для round-trip format)
```

**Round-trip:** formatter сохраняет файл в том dialect, в котором был при чтении (`atom.lang`).

## 6. Dialect registry

В отдельном репо `bvc-lang/dialects` — i18n catalog:

```
bvc-lang/dialects/
├── en.json      # canonical
├── ru.json      # Basis → Базис, Vector → Вектор, Goal → Цель, Labels → Метки
├── es.json
├── de.json
└── ja.json
```

Каждый dialect = JSON-карта `{ canonicalEnKey → localizedKey }`. Парсер `@bvc/parser` грузит registry, валидирует, нормализует.

**Контракт dialect:**
- Каждое локализованное слово — **уникально** (нет коллизий с EN или другими dialect).
- Каждый dialect покрывает **весь** обязательный набор BVC-ключей (Basis/Vector/Goal/Labels), иначе ошибка регистрации.
- Profile names и label keys (`trace.status`, `profile`) **всегда EN** — не локализуются.

## 7. Влияние на существующий корпус (ioHasC + Work Graph)

| Что | Что делать |
|---|---|
| 233 `*.bvc` RU work items | Парсер auto-detect → работают **без** изменений |
| `charter/main.bvc` (RU) | + 1 строка `#!bvc lang=ru` для явности — желательно, не обязательно |
| `protocols/*.bvc` (mix EN/RU) | Если в одном атоме перемешаны ключи — **lint error**, починить руками (мало кейсов) |
| `schemas/step-atom-draft.v1.json` | Расширить: `lang` (enum от registered dialects), default `en` |
| `protocols/llm-step-atom-writer.bvc` | Обновить: LLM выбирает **один** dialect на атом, ставит `Labels: { lang: … }` или `@lang` |
| Tests | Conformance suite дублируется для EN и RU входов, проверка одинакового AST |

## 8. Что мы НЕ делаем

- Не вводим mixed-keys-в-одном-атоме (это lint error).
- Не делаем file-extension-based dialect (`.bvc.ru`).
- Не локализуем ключи Labels (`profile`, `trace.status`, etc.) — всегда EN.
- Не локализуем имена профилей.
- Не делаем display-only EN (это disqualifier для RU-корпуса).

## 9. Влияние на AN-8

§6 #1 «Bilingual: Basis/Vector/Goal/Labels ≡ Базис/Вектор/Цель/Метки» — **заменён** этой AN-19:
- Bilingual остаётся (RU — registered dialect).
- Но aliases **не inline в комментариях**, а через `lang`-pragma + dialect registry.
- Mixed keys в одном атоме = error, не feature.

Обновить AN-8 §6 #1 после принятия ADR. **Сделано 2026-05-31** — см. [AN-8](step-as-открытый канон-standard.md). ADR: [docs/adr-bvc-multilingual-keys.md](../docs/adr-bvc-multilingual-keys.md) (**принят**).

## 10. Что попадает в ADR (`docs/adr-bvc-multilingual-keys.md`)

Решения:
- Canonical dialect: **EN**.
- Mechanism: **Detect-or-Declare hybrid** (pragma + atom header + labels + auto-detect).
- Dialect registry: отдельный артефакт `bvc-lang/dialects`.
- Один dialect per atom — strict.
- Mixed-keys-in-atom = `E_BVC_DIALECT_MIX` lint error.
- Round-trip preserve dialect.

## 11. Риски и митигация

| Риск | Митигация |
|---|---|
| Auto-detect ошибается на корнер-кейсах | первый BVC-ключ детерминирован; для ambiguity — запасной вариант `lang=en` + warning |
| RU-авторы хотят писать profile/label-ключи по-русски тоже | спека: **только** BVC-ключи (Basis/Vector/Goal/Labels) локализованы; profile namespace = always EN |
| Registry становится bottleneck | реестр в `bvc-lang/dialects` — PR-based, без central authority |
| LLM в atom-фрагменте забывает `lang` | контракт `llm-bvc-atom-writer`: обязательно `@lang` или `Labels.lang` для фрагментов |
| Round-trip ломает форматирование | conformance-тесты на dialect-preserve |
| Сложность для tooling | dialect registry — простой JSON; парсер делает один lookup table |

## 12. Связь с другими аналитиками

- **AN-8** (BVC открытый канон) — §6 #1 (bilingual aliases) **заменён** этой AN.
- **AN-18** (naming) — extension `.bvc`, registry в org `bvc-lang/dialects`.
- **AN-14** (round-trip + каркас) — codegen из `.bvc` должен учитывать `atom.lang` при reverse extract.
- **AN-17** (OneBase) — OneBase YAML — не BVC, не затрагивается; обратный импорт `.bvc`/`.bvc` для OneBase объектов следует pragma источника.
- **AN-13** (uncertainty barrier) — профиль `charter` уже зависит от dialect (`#Устав…`); auto-detect должен согласоваться с charter heuristic.

## 13. Финальный вердикт

| Подход | Вердикт |
|---|---|
| A inline aliases | **REJECT** — архитектурный долг |
| B labels.lang | хорошо, но chicken-egg на reader-уровне |
| C atom-header `@lang` | чисто, но меняет grammar |
| D file extension | overhead, не масштабируется |
| E file pragma | хорошо, но не для фрагментов |
| F EN-only display | disqualifier для существующего корпуса |
| G profile-scoped | фрагментирует стандарт |
| **H Detect-or-Declare hybrid** | **ACCEPT** — закрывает все сценарии применения |

### Один dialect, явно или auto-detected, всегда per atom — это правильный закон для BVC.

Это контракт, который понятен **человеку** (один атом — один язык), **LLM** (одна инструкция: выбери dialect и используй его), **парсеру** (один lookup), **сообществу** (registry PR), и **future-proof** (легко добавить ES/DE/JA).

---

**См. также:** [AN-8 BVC открытый канон](step-as-открытый канон-standard.md), [AN-18 naming](bvc-naming-branding-review.md), [ADR naming](../docs/adr-bvc-format-naming.md), [ADR multilingual](../docs/adr-bvc-multilingual-keys.md), [migration plan](../docs/plan-step-to-bvc-migration.md).
