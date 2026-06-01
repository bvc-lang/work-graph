# ADR: BVC format naming — `.bvc` вместо `.bvc` для open canon

## Статус

**Принято** (2026-05-31). Источник: [AN-18](../work/analytics/bvc-naming-branding-review.md), обновление [AN-8](../work/analytics/step-as-open-canon-standard.md).

## Контекст

Open canon (позиция D из AN-7) изначально назывался «`.bvc` format» / org `step-canon`. Разведка имён (AN-18) показала:

- **ISO 10303-21** уже закрепил расширения `.bvc` / `.stp` за CAD/3D (MIME `model/step`, magic `ISO-10303-21`).
- npm `@step-canon/*` и org свободны, но бренд **длинный** и тянет CAD-ассоциацию через слово «step».
- **`.bvc`** семантически = **B**asis · **V**ector · **G**oal; npm scope **`@bvc`** на registry **занят** → публикуем под **`@bvc-lang/*`** (org `bvc-lang` на npm и GitHub).

В ioHasC сотни файлов `*.bvc` — миграция не может быть big-bang.

## Решение

### Публичный open canon

| Элемент | Значение |
|---|---|
| **Human name** | BVC format / BVC canon |
| **Extension** | `.bvc` |
| **GitHub org** | `bvc-lang` (или `bvc-spec`) |
| **npm scope** | `@bvc-lang/spec`, `@bvc-lang/parser`, `@bvc-lang/cli` (org `bvc-lang`; scope `@bvc` на npm занят) |
| **CLI** | `bvc lint`, `bvc format`, `bvc query` |
| **Schema prefix** | `bvc-atom.v1.schema.json` (не `step-atom`) |

### Внутри ioHasC / Work Graph (переходный период)

| Элемент | Статус |
|---|---|
| `*.bvc` | **legacy alias** — парсер **читает**, новые export/CLI **пишут** `.bvc` |
| `step-atom-draft.v1.json` | переименовать в `bvc-atom-draft.v1.json` (с alias на старое имя до v2) |
| HasC parser | dual-extension: `.bvc` + `.bvc`, один AST |
| Charter | явная строка: public format = BVC `.bvc` |

### Не делаем

- Не использовать `.bvc` / `.stp` в публичной спецификации и npm root `bvc`.
- Не переименовывать массово все `*.bvc` в репо одним PR — только план + dual-read.
- Не брендировать org как `step-canon` (допустим redirect/README alias на 6–12 мес).

## Последствия

- AN-8, AN-16, AN-14 и seed-задачи open canon переводятся на `@bvc/*`.
- ADR supersede прежнюю рекомендацию AN-8 §8 «`.bvc` — проверить и решить» → **решено: `.bvc`**.
- Первый шаг исполнения: epic `bvc-open-canon-naming` (reserve `@bvc/spec` + migration plan).

## Критерии завершения миграции (v1)

- [x] `@bvc-lang/spec@0.0.1` на npm (2026-05-31, org `bvc-lang`; GitHub `bvc-lang/spec`)
- [x] `docs/plan-step-to-bvc-migration.md` с фазами dual-read → new-write → optional rename (owners/dates 2026-05-31)
- [x] Parser/linter принимает `.bvc` и `.bvc` (Work Graph MVP)
- [x] `charter/main.bvc` ссылается на ADR + `@bvc-lang/spec`
- [ ] VS Code / Cursor extension: language id `bvc`, aliases `step` (ioHasC; WG runtime adapter `bvc-v1` готов)

## Ссылки

- [AN-8: BVC open canon](../work/analytics/step-as-open-canon-standard.md)
- [AN-18: naming review](../work/analytics/bvc-naming-branding-review.md)
- [AN-19: multilingual keys](../work/analytics/bvc-multilingual-keys-design.md)
- [adr-bvc-multilingual-keys.md](adr-bvc-multilingual-keys.md)
- [plan-step-to-bvc-migration.md](plan-step-to-bvc-migration.md)
