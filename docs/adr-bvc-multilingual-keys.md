# ADR: BVC multilingual keys — Detect-or-Declare

## Статус

**Принято** (2026-05-31). Источник: [AN-19](../work/analytics/bvc-multilingual-keys-design.md), обновление [AN-8](../work/analytics/step-as-open-canon-standard.md) §6 #1.

## Контекст

Open canon BVC (см. [adr-bvc-format-naming.md](adr-bvc-format-naming.md)) изначально описывал bilingual через **inline aliases** в комментариях (`Basis: # alias: Базис`). AN-19 показала failure modes:

- спека через комментарии не парсится детерминированно;
- LLM не знает, какой dialect писать в новом атоме;
- 2⁴ комбинации ключей в одном атоме;
- tree-sitter / conformance / i18n ES/DE/JA не масштабируются.

В Work Graph и ioHasC сотни RU `*.bvc` — решение должно **не требовать** mass rewrite.

## Решение

### Canonical dialect

| Элемент | Значение |
|---|---|
| **Canonical dialect** | **EN** (Basis / Vector / Goal / Labels) |
| **Registered dialects** | RU и др. через `bvc-lang/dialects` (pilot: `packages/bvc-dialects/`) |
| **Profile / label keys** | **всегда EN** (`profile`, `trace.status`, `work.id`) — не локализуются |

### Mechanism: Detect-or-Declare (приоритет сверху вниз)

1. **File pragma** — первая строка файла: `#!bvc lang=ru`
2. **Atom header** — `#Name@ru<[…]>` (override на атом)
3. **Labels.lang** — `lang: ru` в секции Labels/Метки
4. **Auto-detect** — первый BVC-ключ атома (`Basis` → en, `Базис` → ru)
5. **Fallback** — `en` + warning при неоднозначности

Один **dialect per atom** после resolve. Mixed keys (`Basis` + `Цель` в одном атоме) = lint **`E_BVC_DIALECT_MIX`**.

### AST и round-trip

- Парсер нормализует BVC-ключи в **EN** в AST (`atom.bvc.basis`, …).
- AST хранит `atom.lang` для round-trip.
- Formatter пишет ключи dialect из `atom.lang`, не hardcode.

### Draft JSON (LLM)

- `schemas/step-atom-draft.v1.json`: поле `lang` (`en` \| `ru`, default `en` для open spec).
- Work Graph formatter без `lang` сохраняет **RU** (legacy corpus).
- LLM-фрагмент без файла: обязателен `@lang` в header или `Labels.lang`.

### Не делаем

- Mixed inline aliases в комментариях.
- File-extension dialect (`.bvc.ru`).
- Локализация profile names и label keys.
- EN-only display для существующего RU-корпуса.

## Последствия

- AN-8 §6 #1 (inline bilingual) **superseded** этим ADR.
- Epic `bvc-multilingual-detect-or-declare` — исполнение registry, schema, protocol, parser, conformance.
- [plan-step-to-bvc-migration.md](plan-step-to-bvc-migration.md) дополнен секцией multilingual (фаза 1).

## Критерии завершения (v1)

- [x] ADR принят (`docs/adr-bvc-multilingual-keys.md`)
- [x] `packages/bvc-dialects/en.json` + `ru.json`
- [x] `lang` в step-atom-draft schema
- [x] `protocols/llm-step-atom-writer.bvc` — один dialect на атom
- [x] Parser MVP: Detect-or-Declare, `E_BVC_DIALECT_MIX`, file pragma, `@lang` header (`src/bvcAtomParser.mjs`)
- [x] Conformance: `tests/conformance/*.bvc` + `tests/bvcConformance.test.mjs`

## Ссылки

- [AN-19: multilingual design](../work/analytics/bvc-multilingual-keys-design.md)
- [AN-8: BVC open canon](../work/analytics/step-as-open-canon-standard.md)
- [adr-bvc-format-naming.md](adr-bvc-format-naming.md)
- [plan-step-to-bvc-migration.md](plan-step-to-bvc-migration.md)
