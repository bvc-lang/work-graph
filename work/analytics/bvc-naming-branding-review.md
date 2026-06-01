# AN-18: Naming & branding — `.bvc` vs `.bvc` vs `step-canon`

**Запрос:** «поищи что свободно; если `.bvc` занят, свободно ли `.bvc`? `step-canon` длинно».

## Кратко

**`.bvc` для open standard — плохо** (ISO 10303 CAD, MIME `model/step`, ассоциация «3D-модель»).  
**`.bvc` — лучший кандидат**: семантика **B**asis / **V**ector / **G**oal, npm `@bvc/*` и GitHub org `bvc` свободны.  
**`step-canon`** — свободно, но длинно и тянет CAD-ассоциацию через слово «step».

**Рекомендация:** публичный бренд **BVC**, расширение **`.bvc`**, org **`bvc-lang`**, npm **`@bvc/spec`**. В ioHasC `.bvc` оставить как **legacy alias** на переходный период.

## 1. Зачем этот разбор

AN-8 зафиксировал риск: «`.bvc` конфликтует с ISO 10303 STEP (CAD) — **критично**, переименовать или brand `step-canon`». Эта аналитика — **конкретная разведка имён** перед публикацией открытый канон.

## 2. `.bvc` — занят серьёзно

| Факт | Детали |
|---|---|
| **Стандарт** | ISO 10303-21 — «STandard for the Exchange of Product model data» |
| **Расширения** | `.bvc`, `.stp`, `.p21`, `.stpnc` |
| **MIME** | `model/step`, `model/step+xml`, `model/step+zip` |
| **Magic** | `ISO-10303-21` в заголовке файла |
| **Ассоциация** | SolidWorks, Fusion 360, NIST STEP File Analyzer, SCIP, `step-nc` npm |
| **Поиск/Google** | «step file format» → CAD/3D, не AI управление |

**Вердикт:** для **публичного open standard** — **не брать**. Для **внутреннего ioHasC** — можно оставить с пометкой «legacy dialect», но не продвигать наружу.

`.stp` — та же проблема (ISO 10303).

## 3. `.bvc` — в целом свободно

### Расширение `.bvc`

| Конкурирующее использование | Домен | Риск для нас |
|---|---|---|
| **BySoft 7** (Bystronic) | CAM, лазерная резка, cutting plans | низкий — другая индустрия |
| **IBM Voice Type** | legacy speech recognition, Newuser files | очень низкий — мёртвый формат |
| **Basis Vectors Capital** | PE-консалтинг, бренд «BVC Framework» | средний — acronym collision, не file format |

В dev/AI/docs пространстве **нет** устоявшегося «`.bvc` = что-то своё». Коллизии **нишевые**, не блокирующие.

### npm (проверено 2026-05-31)

| Пакет | Статус |
|---|---|
| `bvc` | **занят** — «Beautiful and Valuable Components» v0.0.1 |
| `@bvc/spec` | **свободен** |
| `@bvc/parser` | **свободен** |
| `@bvc/canon` | **свободен** |
| `@bvc/cli` | **свободен** (не проверялся отдельно, но scope `@bvc/*` свободен) |
| `bvc-canon` | **свободен** |
| `canon-bvc` | **свободен** |

### GitHub (проверено 2026-05-31)

| Ресурс | Статус |
|---|---|
| org `bvc` | **свободен** |
| `bvc/bvc-spec` | **свободен** |
| `bvc-canon/spec` | **свободен** |

### Семантика

**BVC = Basis · Vector · Goal** — прямое попадание в триаду формата. Короче и точнее, чем `step-canon`.

**Риски `.bvc`:**
- в ML «basis vectors» — другой смысл (линейная алgebra), но в контексте spec/doc format терпимо;
- PE-бренд Basis Vectors Capital — не file format, путаница маловероятна при позиционировании «BVC format for AI agents».

**Вердикт:** **лучший кандидат** на extension + primary brand.

## 4. `step-canon` — свободно, но длинно

| Ресурс | Статус |
|---|---|
| npm `step-canon` | **свободен** |
| npm `@step-canon/spec`, `@step-canon/parser` | **свободны** |
| GitHub org `step-canon` | не найден |

**Плюсы:** понятно текущим пользователям ioHasC; AN-8…AN-16 уже используют термин.

**Минусы:**
- длинно (11 символов vs 3 у `bvc`);
- слово **step** тянет CAD-ассоциацию;
- `@step-canon/parser` — громоздко для CLI/npm.

**Вердикт:** приемлемо как **transitional alias** или redirect, не как primary brand.

## 5. Другие короткие кандидаты

| Имя | npm | GitHub | Плюс | Минус |
|---|---|---|---|---|
| **`.bvc` / `bvc`** | `@bvc/*` free | org `bvc` free | коротко, = BVC-триада | BySoft `.bvc`, PE BVC |
| **`.hasc` / `hasc`** | free | `hasc-lang/spec` free | связь с ioHasC, парсер HasC уже есть | HASC = Human Activity Sensing (Япония) |
| **`stpc`** | free | `stpc-lang/spec` free | «step canon» без `.bvc` | аббревиатура неочевидна |
| **`@canon/bvc`** | free | — | универсально | `@relational-fabric/canon` уже в нише type primitives |
| **`bspec`** | — | **занят** (Business Specification, bspec.dev) | — | **не брать** |

## 6. Сравнительная таблица

| Критерий | `.bvc` | `.bvc` | `step-canon` | `.hasc` |
|---|---|---|---|---|
| ISO/CAD collision | **критично** | нет | через слово step | нет |
| Семантика BVC | косвенно | **прямо** | косвенно | через ioHasC brand |
| Длина бренда | 4 | **3** | 10 | 4 |
| npm scope free | n/a | **`@bvc/*`** | `@step-canon/*` | `@hasc/*` |
| GitHub org free | n/a | **`bvc`** | да | `hasc-lang` |
| Понятность автору | высокая | средняя | высокая | высокая |
| Понятность внешнему | **низкая** (CAD) | **средняя-высокая** | средняя | низкая |

## 7. Рекомендуемая схема именования

```
Формат:     BVC (Basis · Vector · Goal)
Расширение: .bvc
Org:        github.com/bvc-lang   (или bvc-spec)
npm:        @bvc/spec, @bvc/parser, @bvc/cli
CLI:        bvc lint file.bvc
Human name: "BVC format" / "BVC canon"
```

### Dual-layer (переходный период в ioHasC)

| Слой | Имя | Статус |
|---|---|---|
| **Public canon** | `.bvc`, `@bvc/*` | целевой стандарт |
| **Internal legacy** | `.bvc` | читается парсером, не продвигается наружу |
| **Transitional org name** | `step-canon` → redirect на `bvc-lang` | 6-12 мес, потом убрать |

### Не брать

- `.bvc` / `.stp` — ISO CAD
- npm root `bvc` — занят UI-components
- `bspec` — Business Specification
- `step-canon` как primary brand — слишком длинно

## 8. Решения до публикации (checklist)

- [ ] Зарезервировать GitHub org: `bvc-lang` или `bvc-spec`
- [ ] Опубликовать npm `@bvc/spec` v0.0.0 (блокирует scope)
- [ ] ADR/changelog: «public canon = BVC `.bvc`; `.bvc` = legacy»
- [ ] Обновить AN-8: переименовать рекомендации `step-canon` → `@bvc/*`
- [ ] Парсер: принимать `.bvc` и `.bvc`, emit только `.bvc` в CLI format
- [ ] VS Code extension: language id `bvc`, alias `.bvc`

## 9. Что зарезервировать сейчас (15 минут)

1. GitHub org `bvc-lang`
2. npm publish `@bvc/spec@0.0.0` (placeholder README)
3. Строка в `charter/main.bvc`: «Public format name: BVC, extension `.bvc`»

## 10. Связь с другими аналитиками

- **AN-8 (`.bvc` открытый канон)**: §8 «Брендинг» — **обновить** на `.bvc` + `@bvc/*`
- **AN-16 (meta-review)**: Step-Canon Stack → переименовать в **BVC Stack** (org `bvc-lang`)
- **AN-14 (Round-Trip)**: `@step-canon/каркас` → `@bvc/каркас`
- **AN-17 (OneBase)**: `@step-canon/onebase-mcp` → `@bvc/onebase-mcp` (опционально)

## 11. Финальный вердикт

| Вопрос | Ответ |
|---|---|
| `.bvc` свободно? | **Нет** — ISO 10303 CAD |
| `.bvc` свободно? | **Да** — для нашей ниши |
| `step-canon` длинно? | **Да** — заменить на **`bvc`** |
| Что делать? | **BVC + `.bvc` + `@bvc/*`**, `.bvc` = legacy в ioHasC |

---

**См. также:** [AN-8](step-as-открытый канон-standard.md), [AN-16](unique-tech-stack-meta-review.md), [AN-14](compiler-round-trip-low-code-каркас.md).
