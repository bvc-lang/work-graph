# AN-21: Marketplace (d:/Work/04 Marketplace) — интеграция с Work Graph + OneBase и общая atomic design-система

**Запрос:** «изучи проект d:/Work/04 Marketplace, я его начал создавать без Work Graph и OneBase, но теперь стоит их использовать. Обрати внимание на атомарную дизайн-систему — я бы хотел чтобы это была общая с Work Graph система. Запиши разбор в аналитика».

## Кратко

Marketplace — это **зрелый Laravel 12 + Filament 4 monorepo** с:
- Hub & Spoke архитектурой (`marketplace-core` + 3 verticals: classified / freelance / wellness)
- **Развитой atomic design системой** (~98 Blade-компонентов в `resources/views/components/ui/{atoms,molecules,organisms}`)
- Двухслойными design-токенами (`--brand-*` фундамент + `--ui-*` runtime semantic layer)
- Per-vertical runtime темами через `MarketplaceThemeResolver` (тема psychology уже работает)
- Каталогом компонентов в `docs/ui/components.md` (живой документ)
- 4 cursor-rules форсирующих использование компонентов

**Главный вывод:** atomic design **уже сильнее, чем в Work Graph**. Не «делиться» нашей — а **взять Marketplace DS за основу**, абстрагировать в `@iohasc/design-system`, и заставить **Work Graph её потреблять**.

**Кратко по интеграциям:**
- **Общая DS** — реалистично через **headless contracts**: токены (JSON) + спецификация компонентов (BVC-атомы) + две реализации (Blade для Marketplace, Web Components / vanilla для Work Graph)
- **Work Graph как PM-инструмент над Marketplace** — реалистично сразу: ADR → BVC, plans → backlog, AN-records для дизайн-решений
- **OneBase для Marketplace** — реалистично как **bridge каталога**: OneBase «Номенклатура» / «ВидыНоменклатуры» → `category_nodes` / `listing_form_schema`; Listing → OneBase «РеализацияТоваровУслуг» для эскроу-сценария

---

## 1. Что такое Marketplace сейчас

### 1.1. Стек

| Слой | Технология |
|---|---|
| Backend | **Laravel 12** (PHP 8.2) |
| Admin | **Filament 4** |
| UI runtime | **Livewire 3 + Alpine.js + React islands** (через `resources/js/react-islands.tsx`) |
| View engine | **Blade x-components** |
| Styles | **Tailwind 3** + `@tailwindcss/forms` + кастомные CSS-tokens |
| Auth | Laravel Breeze + Socialite (VK, Yandex) |
| Permissions | spatie/laravel-permission |
| Build | Vite 7 + Laravel Vite plugin |
| Quality | **PHPUnit 11 + larastan 3 + phpstan 2 + Pint** |
| Browser tests | Puppeteer 24, Spatie/Browsershot 5 |
| Hosting | Docker Compose + Jino shared hosting вариант |

### 1.2. Hub & Spoke architecture

```
packages/
├─ marketplace-core/            ← hub: Listing, MarketplaceOrder, Review, Audit
│  ├─ src/{Catalog,Models,Search,Audit,Policies,ListingForm,...}
│  ├─ resources/views/         (Blade компоненты + страницы каталога/листинга)
│  └─ database/migrations/
├─ vertical-classified/         ← товары C2C
├─ vertical-freelance/          ← проекты + отклики + IP
└─ vertical-wellness/           ← слоты + бронирования + чувствительные данные
```

Composer связан через `repositories: type=path` + `symlink=true`. **Симптом синхронизации:** при правке `packages/*` без `composer update marketplace/core` старая копия в `vendor/` (есть [monorepo-composer-sync.md](../../../04%20Marketplace/docs/monorepo-composer-sync.md)).

### 1.3. Atomic design (главное)

**Структура:** `resources/views/components/ui/{atoms, molecules, organisms}/*.blade.php` + те же папки в `packages/marketplace-core/resources/views/components/ui/`.

**Префикс:** `<x-ui.{слой}.{имя}>`, например `<x-ui.atoms.button variant="primary" size="md">`.

**Слои (из [docs/ui/atomic-design.md](../../../04%20Marketplace/docs/ui/atomic-design.md)):**
- **Atoms** — кнопка, поле, бейдж, иконка, чек/радио, swagger-toggle, drop-list-item, чип, map-pin, аватар, лого
- **Molecules** — price-tag, tabs, segmented-control, rating, listing-card-gallery, header-search-box, pagination, drop-list, sort-bar, side-menu
- **Organisms** — modal, toast, auth-popup, market-site-header, listing-card, catalog-filter-panel, catalog-location-modal (Leaflet + center pin), listing-form-renderer, listing-wizard-shell, hub-rubricator, megamenu, …
- **Pages** склеивают organisms + данные (`catalog/category.blade.php`, `listing/show.blade.php`)
- **Partials** — переиспользуемые куски organism (mobile-bottom-navigation, megamenu-inner, …)

**Каталог:** ~98 Blade-компонентов задокументированы в [docs/ui/components.md](../../../04%20Marketplace/docs/ui/components.md) с пропсами и поведением. Это живой каталог: каждое изменение должно туда попадать (`marketplace-blade-components.mdc`).

**Storybook-аналог:** `GET /dev/ui-kit` (`route('dev.ui-kit')`) при `APP_ENV=local` или `DEV_UI_KIT_ENABLED=true`. Это редкая зрелость для Laravel-проекта.

### 1.4. Design tokens (двухслойный канон)

**Источник правды:** [resources/css/brand-tokens.css](../../../04%20Marketplace/resources/css/brand-tokens.css).

**Слой 1 — `--brand-*` (фирменный):**
- `--brand-primary-rgb` — Amber 500 (`245 158 11`)
- `--brand-bg/surface/border/muted-rgb` — Slate dark
- `--brand-font-sans` — Graphik LCG
- `--brand-radius-sm/md/lg`

**Слой 2 — `--ui-*` (semantic runtime):**
- `--ui-accent-rgb` — основной UI акцент (по умолчанию `12 115 254` синий)
- `--ui-link-*`, `--ui-control-bg-*`, `--ui-control-checked-*`
- `--ui-surface-*`, `--ui-text-rgb`, `--ui-muted-rgb`, `--ui-danger-rgb`
- `--ui-cta-*` — чёрная контрастная CTA-кнопка
- `--ui-rating-active-rgb` — цвет звёзд
- `--ui-radius-card/modal/control-*`

**Runtime theming per vertical:** `config/marketplace-themes.php` + `MarketplaceThemeResolver.php` подмешивают inline CSS variables через `data-market-theme` на layout. Это значит: **тема `psychology` уже переопределяет `--ui-*` без пересборки Tailwind**. Зрелый паттерн (CSS variables → no rebuild).

**Filament бренд:** `filament-brand.css` использует те же `--brand-*` — админка и витрина выглядят как один продукт.

**Tailwind мосты:** в `tailwind.config.js` все `--ui-*` доступны как `text-ui-accent`, `bg-ui-control`, `rounded-ui-card`, `focus:ring-ui-accent`. Все ступени `text-xs…9xl` — нечётные px при root 16px ([tokens.md §Кегль](../../../04%20Marketplace/docs/ui/tokens.md)).

### 1.5. Cursor rules (живой управление UI)

Четыре правила в `.cursor/rules/`:

| Файл | Что форсирует |
|---|---|
| `marketplace-ui-atomic-design.mdc` | Слои atomic, deps только «вниз», Filament использует те же токены |
| `marketplace-blade-components.mdc` | **Always-apply**: перед версткой проверить компонент в `docs/ui/components.md`; не дублировать кастом-вёрстку |
| `marketplace-typography-tokens.mdc` | **Always-apply**: только `text-sm/base/lg`, никаких `text-[15px]` |
| `marketplace-catalog-shortcuts.mdc` | Только `x-catalog.*` для блоков catalog |

Это **то же, что мы делаем в Work Graph через `rules/agent-behavior/*.bvc`** — но Marketplace ушёл дальше с `alwaysApply: true` правилами вёрстки.

### 1.6. Документы / процессы

- `docs/project-vision-ru.md` — manifesto «Hub & Spoke, один аккаунт много контекстов»
- `docs/compliance-matrix-ru.md` — матрица данные×хранение×согласия по вертикалям (РФ, 2026)
- `docs/adr/001-marketplace-audit-log.md` — единственный пока ADR
- `docs/plans/` — оперативные планы
- `docs/seo/`, `docs/design-references/` (avito-эталон), `docs/ui/`
- `docs/mail-routing-smtp-bz.md`, `docs/deploy-jino-shared-hosting.md`, `docs/monorepo-composer-sync.md`

---

## 2. Сравнение DS Marketplace ↔ Work Graph

| Аспект | Marketplace | Work Graph | Победитель |
|---|---|---|---|
| Atomic layering | ✅ atoms/molecules/organisms (~98 компонентов) | ❌ всё в одном `workGraphBacklogUiServer.mjs` (~9000 строк) | **Marketplace** |
| Каталог компонентов | ✅ `docs/ui/components.md` | ❌ нет | **Marketplace** |
| Storybook / preview | ✅ `/dev/ui-kit` | ❌ | **Marketplace** |
| Design tokens (CSS vars) | ✅ двухслойный `--brand-*` / `--ui-*` | ⚠️ один слой `--cursor-*` | **Marketplace** |
| Runtime theming per context | ✅ per vertical via `data-market-theme` | ❌ только dark | **Marketplace** |
| Tailwind мосты для токенов | ✅ `text-ui-accent`, `bg-ui-control` | ⚠️ частично | **Marketplace** |
| Typography scale | ✅ нечётные px ступени | ⚠️ есть, но не задокументировано | **Marketplace** |
| Cursor-rules управление | ✅ 4 alwaysApply rules | ✅ rules/agent-behavior/*.bvc | равны |
| BVC спецификация UI | ❌ нет (только md) | ✅ есть `ui/*.bvc` | **Work Graph** |
| Verification / evidence trace | ❌ только phpstan/phpunit | ✅ verification matrix + evidence | **Work Graph** |
| Backlog как файлы | ⚠️ только `docs/plans/*.md` | ✅ `intent/**/*.work.bvc` + рабочий процесс | **Work Graph** |
| LLM agent-OS поверх | ❌ нет | ✅ ядро продукта | **Work Graph** |
| Compliance matrix | ✅ зрелая | ❌ нет нужды | **Marketplace** |
| Monorepo: композиция | ✅ composer path-repos | ✅ workspaces (вариант) | равны |

**Вывод:** по **UI/DS** Marketplace **сильнее**; по **процессам / трассировке / агенту** Work Graph сильнее. **Объединить = взаимное усиление**.

---

## 3. Точки интеграции (что реально совместить)

### 3.1. Общая дизайн-система — `@iohasc/design-system` (или `@bvc/design-system`)

**Идея:** не «делать общий код» (Blade и vanilla JS несовместимы), а **общий контракт** + параллельные реализации.

```
packages/
├─ design-tokens/              ← JSON Schema + tokens.json + builders
│  ├─ tokens/
│  │  ├─ base.json             — brand-* (palette, radius, font, scale)
│  │  └─ themes/
│  │     ├─ marketplace.json   — Amber + Slate dark
│  │     ├─ marketplace-psychology.json
│  │     ├─ workgraph-dark.json — Cursor blue + VS Code grey
│  │     └─ filament.json
│  ├─ schema/
│  │  ├─ design-tokens.v1.schema.json
│  │  └─ semantic-roles.v1.schema.json   — accent, surface, muted, danger, cta, ...
│  └─ build/
│     ├─ tokens-to-css.mjs      — → brand-tokens.css
│     ├─ tokens-to-tailwind.mjs — → tailwind.config.preset.js
│     └─ tokens-to-filament.mjs — → filament-brand.css
│
├─ atomic-spec/                ← BVC контракты компонентов
│  ├─ atoms/
│  │  ├─ button.bvc            — Basis: интент, Вектор: props/variants/sizes/slots, Цель: UX, Метки: a11y, tokens
│  │  ├─ text-input.bvc
│  │  ├─ badge.bvc
│  │  └─ ...
│  ├─ molecules/
│  └─ organisms/
│
├─ ui-blade/                   ← Laravel реализация (потребляется Marketplace)
│  ├─ resources/views/components/ui/atoms/button.blade.php
│  └─ ...
│
├─ ui-web/                     ← Vanilla web components / lit (потребляется Work Graph)
│  ├─ src/atoms/button.ts
│  └─ ...
│
└─ docs-generator/             ← BVC → docs/ui/components.md (для обоих проектов)
```

**Что общее физически:**
- `design-tokens/tokens.json` — палитра в одном месте, билдится в CSS / Tailwind / Filament
- `atomic-spec/*.bvc` — спецификация props/variants/states каждого компонента; LLM может читать
- `docs-generator` — единый каталог компонентов для обоих UI
- `schemas/*.schema.json` — JSON Schema для токенов и компонент-API

**Что НЕ общее (реализации):**
- Blade-компоненты остаются в Marketplace
- Web components / vanilla остаются в Work Graph
- НО они оба **зеркалят одну спецификацию** и **используют одни токены**

**Преимущества:**
- Изменение токена в одном месте → обе системы перестраиваются
- Новый компонент добавляется одной BVC-спекой → две реализации
- LLM-агент видит общую спецификацию и может писать варианты для обоих
- Сторибук `/ui-kit` строится из спеки (рендерит для своей реализации)

**Подводные камни:**
- Поддерживать parity между Blade и Web components = накладные расходы. Начать с **только токенов** + **только atoms** (button, badge, input, icon).
- Marketplace зрелее → пусть **Marketplace остаётся reference implementation**, Work Graph догоняет.

### 3.2. Work Graph как PM-инструмент над Marketplace

**Реалистично в первые 2 недели:**

1. **ADR Marketplace → BVC**
   - Существующий `docs/adr/001-marketplace-audit-log.md` остаётся как md
   - Новые ADR пишутся **через intent composer Work Graph** → `docs/adr/*.md` + соответствующий `*.work.bvc` в `intent/marketplace/adr/`
   - Связь через `relatedFiles` в analytics-records

2. **Backlog Marketplace в Work Graph**
   - Создать `intent/marketplace/` в Work Graph
   - Перенести items из `docs/plans/*.md` Marketplace в `intent/marketplace/work/*.work.bvc`
   - Verification matrix Work Graph включает evidence из Marketplace (`vendor/bin/phpunit`, `vendor/bin/phpstan`, `vendor/bin/pint`)

3. **AN-records для дизайн-решений Marketplace**
   - Hub&Spoke vs monolith → AN
   - Filament theming → AN
   - Listing form schema model → AN
   - Compliance matrix → AN

4. **PVRG код↔Blade↔docs**
   - Адаптер `bladeAdapter` для языкового реестра ioHasC (parse `*.blade.php`)
   - Trace: `Listing.php` ↔ `listing-form-renderer.blade.php` ↔ `docs/ui/components.md`

**Не реалистично сразу:**
- Полная BVC-фикация всего monorepo Marketplace (слишком большой)
- Замена Filament на ioHasC UI (Filament даёт админку дешевле любой переписки)

### 3.3. OneBase для Marketplace

**Реалистично:**

**A. OneBase → каталог Marketplace**
- OneBase «Номенклатура» / «ВидыНоменклатуры» как **reference catalog** для импорта в `category_nodes`
- Существующий `AvitoCatalogTreeImporter.php` дополняется `OneBaseCatalogTreeImporter.php`
- Атрибуты «Номенклатуры» → `listing_form_schema` JSON (через `CatalogFacetsToListingFormConverter.php`)

**B. Заказы Marketplace → OneBase**
- Маркет `MarketplaceOrder` → OneBase «РеализацияТоваровУслуг» (Документ) через REST/OData
- Для эскроу-сценария — связь с OneBase «Кассы/Платежи»
- Журнал `marketplace_audit_logs` дополняется `onebase_export_status`

**C. Cross-vertical через OneBase BSPe**
- Если использовать OneBase Бухгалтерия — отчётность по выручке per vertical
- Wellness сеансы → OneBase «Оказание услуг»

**Не реалистично:**
- Заменить Laravel моделями OneBase напрямую (это REST/OData мост, не ORM)
- OneBase как primary backend (Marketplace остаётся хозяином public API)

### 3.4. Marketplace берёт у Work Graph

| Что Marketplace может взять | Откуда в Work Graph |
|---|---|
| BVC формат для спецификации компонентов | `ui/*.bvc`, `protocols/*.bvc` |
| Intent composer для генерации `listing_form_schema` (раздел → вертикаль → форма) | `src/intentComposerProposal.mjs` |
| Verification matrix как отдельный layer evidence | `src/verificationMatrix*.mjs` |
| AN-records процесс для крупных дизайн-решений | `work/analytics/*.md` + `analytics-records.jsonl` |
| ADR в `.bvc` (структурный, агенту легче читать) | `docs/adr-*.md` подход |
| Agent run panel для модерации/импорта (long jobs) | `protocols/operator-agent-run-panel-v1.bvc` |

### 3.5. Work Graph берёт у Marketplace

| Что Work Graph берёт | Откуда в Marketplace |
|---|---|
| Atomic design слои atoms/molecules/organisms (даже для vanilla) | `resources/views/components/ui/` |
| Двухслойные токены `--brand-*` + `--ui-*` (semantic) | `brand-tokens.css` |
| Runtime theming per context | `MarketplaceThemeResolver` + `data-market-theme` |
| Storybook-style `/dev/ui-kit` | `route('dev.ui-kit')` |
| Каталог компонентов в md (живой) | `docs/ui/components.md` |
| Cursor-rule `alwaysApply` «перед версткой проверь компонент» | `marketplace-blade-components.mdc` |
| Compliance matrix как формат | `docs/compliance-matrix-ru.md` |
| Filament стиль через те же токены | `filament-brand.css` |

---

## 4. Что взять Work Graph немедленно

### 4.1. Atomic-fy Work Graph UI (P0)

**Сейчас:** `src/workGraphBacklogUiServer.mjs` ≈ 9000 строк inline HTML + CSS + JS.

**Цель:** разделить на:
- `src/ui/atoms/*.mjs` (button, badge, input, icon)
- `src/ui/molecules/*.mjs` (toolbar, tabs, pagination, …)
- `src/ui/organisms/*.mjs` (kanban-board, detail-drawer, verification-matrix, …)
- `src/ui/pages/*.mjs` (home, рабочий процесс, analytics, …)
- `docs/ui/components.md` — каталог как в Marketplace
- `/ui-kit` route в dev — story-page

### 4.2. Двухслойные токены (P0)

Сейчас `src/style.css` имеет `--cursor-*` без семантического слоя. Переход:

```css
:root {
  /* Слой 1 — brand: ioHasC editor identity */
  --brand-primary-rgb: 0 102 255;          /* Cursor blue */
  --brand-bg-rgb: 30 30 30;
  --brand-surface-rgb: 37 37 38;
  --brand-border-rgb: 45 45 48;
  --brand-muted-rgb: 133 133 133;

  /* Слой 2 — UI semantic (можно переопределять per workspace theme) */
  --ui-accent-rgb: var(--brand-primary-rgb);
  --ui-surface-rgb: var(--brand-surface-rgb);
  --ui-control-bg-rgb: 45 45 48;
  --ui-radius-card: 0.5rem;
  /* … те же роли, что в Marketplace */
}
```

Имена ролей **одинаковые**, значения **разные** → DS общая, продукты разные.

### 4.3. Cursor-rule `iohasc-ui-components.mdc` (P0)

По образцу `marketplace-blade-components.mdc`:
- alwaysApply: true
- «перед версткой UI Work Graph — проверь `docs/ui/components.md` и переиспользуй компонент»
- «новый вариант — пропсом, не классом с `!`»
- «новый компонент — добавь в каталог одной строкой»

Этот же rule можно зеркалить в Marketplace, переименовав глоб.

### 4.4. `/dev/ui-kit` route в Work Graph (P1)

Endpoint `/dev/ui-kit` рендерит story-страницу: список компонентов в сайдбаре, варианты с превью. Аналогично Marketplace, но vanilla.

### 4.5. Theme runtime (P1)

Поддержка `data-iohasc-theme="dark|light|high-contrast|cursor-bright"` на `<html>` для переопределения `--ui-*` без пересборки.

---

## 5. Что взять Marketplace от Work Graph

### 5.1. AN-records для крупных дизайн-решений (P0)

Создать `marketplace/work/analytics/` и записать туда:
- `AN-MP-1: Hub&Spoke vs monolith` — почему именно так
- `AN-MP-2: Atomic Design + двойная локация компонентов (app/ vs marketplace-core/)` — текущий компромисс
- `AN-MP-3: Listing form schema — JSON в category_nodes` — почему так, ограничения
- `AN-MP-4: Filament reuses brand tokens` — паттерн
- `AN-MP-5: Compliance matrix as living doc` — статус

Чтобы потом было что показать новому контрибьютору и LLM-агенту.

### 5.2. Intent composer для генерации `listing_form_schema` (P1)

Wizard «выберите вертикаль → выберите category root → опишите контекст → получите draft listing_form_schema JSON». Через тот же `intentComposerProposal` подход Work Graph, но с целевым артефактом — Listing Form Schema, а не WorkItem.

### 5.3. Verification matrix как отдельный layer (P1)

Сейчас Marketplace гоняет phpunit / phpstan / pint в CI без UI представления. Можно поднять простой `/dev/verification` exposing:
- последний PHPUnit run (pass/fail/time)
- phpstan baseline diff
- pint pending
- pa11y / Lighthouse результаты (если будут)

Тот же шаблон, что Work Graph verification view.

### 5.4. ADR в `.bvc` (P2)

Для новых ADR — формат BVC: Basis (контекст), Вектор (опции), Цель (что решаем), Метки (refs, дата). Plain `.md` рядом для людей. LLM получает структурный вход.

---

## 6. Архитектура общей DS — дорожная карта

### Phase 0 — извлечь токены (1–2 дня)

1. Создать `@iohasc/design-tokens` пакет в Work Graph monorepo (npm workspace)
2. Скопировать `brand-tokens.css` Marketplace как `tokens/base.json`
3. Builder `tokens-to-css.mjs` → генерит `brand-tokens.css` для обоих проектов
4. Marketplace: заменить руками-написанный `brand-tokens.css` на сгенерированный
5. Work Graph: подключить `--ui-*` слой

**Артефакт:** один JSON, два CSS на выходе, обе системы выглядят как раньше.

### Phase 1 — компонент-спецификация (1 неделя)

1. Создать `@iohasc/atomic-spec` — BVC-атомы для **5 базовых компонентов**: button, badge, text-input, icon, modal
2. Каждый атом описывает: props, variants, sizes, slots, states, a11y
3. Marketplace `button.blade.php` остаётся как есть, но **зеркалится спецификацией**
4. Work Graph пишет первые **vanilla web components** по той же спецификации
5. `docs-generator` → объединённый `docs/ui/components.md` для обоих

**Артефакт:** одна спека → два рабочих компонента; LLM может предложить новый variant в спеке и обе стороны его получают.

### Phase 2 — runtime theming (1 неделя)

1. `MarketplaceThemeResolver` обобщается до `IohascThemeResolver` (общий API)
2. Marketplace тема: `marketplace-default` / `marketplace-psychology`
3. Work Graph тема: `workgraph-cursor-dark` / `workgraph-high-contrast`
4. JSON theme файлы рядом с tokens

**Артефакт:** одна функция `applyTheme(themeId, root)` для обеих систем.

### Phase 3 — каталог + storybook (1 неделя)

1. `@iohasc/ui-kit-renderer` — story-page generator (читает спецификацию, генерирует HTML preview)
2. Marketplace: `/dev/ui-kit` использует renderer для Blade компонентов
3. Work Graph: `/dev/ui-kit` использует renderer для vanilla
4. Общий `docs/ui/components.md` всегда из spec

**Артефакт:** одна точка истины для каталога; обе системы рендерят свою преview.

### Phase 4 — molecule/organism зеркало (2–3 недели)

Постепенно зеркалить molecules/organisms где есть смысл (rating, modal, tabs, pagination, segmented-control). Не зеркалить специфичное (listing-card-gallery, catalog-megamenu — это marketplace-only; kanban-board, verification-matrix — workgraph-only).

### Phase 5 — Work Graph управляет Marketplace (2 недели)

1. `intent/marketplace/` epic + work items
2. Bridge `bladeAdapter` для PVRG
3. AN-records процесс в Marketplace
4. Опционально: agent run panel умеет запускать `composer ...`, `npm run build` в Marketplace

---

## 7. Риски и подводные камни

| Риск | Митигация |
|---|---|
| Двойная реализация Blade + Web components — двойные баги | Начать с тривиальных atoms (button, badge); molecules/organisms — только где явная польза |
| Marketplace runs на shared hosting (Jino) — переход на workspaces сложен | Pакет токенов может быть просто статическим JSON в `vendor/iohasc/design-tokens/` (path repo) |
| Спецификация компонентов на BVC может отстать от Blade | CI-проверка: BVC spec ↔ blade-компонент должны иметь одни props (статический анализ) |
| Marketplace команда не любит файлы без DOM-семантики (.bvc) | Каждый `.bvc` дублируется markdown-секцией в `components.md` |
| мост OneBase требует 1С-эксперта на стороне | Начать с одностороннего: OneBase → каталог Marketplace (импорт), позже двусторонний |
| Compliance matrix Marketplace под РФ — не для Work Graph | Compliance остаётся в Marketplace; в общую DS не тянется |
| Filament 4 ожидает свой brand layer — не сломать | `filament-brand.css` остаётся в Marketplace, но получает токены из общего JSON |
| Работа в Cursor + WSL/Windows — пути с пробелом `04 Marketplace` | Пакеты публикуются через `file:` ссылки или path-repos, без globbing по пробелам |
| BVC дизайн-токенов перекроет существующий Marketplace `tokens.md` | Marketplace docs остаются source-of-truth для UX-описания; BVC — машинный канон |
| Tailwind 3 в Marketplace vs возможный Tailwind 4 в Work Graph | Tokens живут в JSON, билдер генерит preset под нужную версию |

---

## 8. Метрики успеха интеграции

| Метрика | Сейчас | Цель через 1 квартал |
|---|---|---|
| Единый источник правды для палитры | 2 (brand-tokens.css × 2) | **1** (JSON) |
| Каталогов UI-компонентов | 1 (Marketplace) | **1 общий** |
| Storybook-страниц | 1 (Marketplace `/dev/ui-kit`) | **2 единообразных** |
| Cursor-rules для DS-дисциплины | 4 (Marketplace) + 0 (WG) | **4 + 2** |
| BVC-атомов спецификаций | 0 | ≥10 (atoms + ключевые molecules) |
| Дублирующие inline-стили в Work Graph | ~9000 LOC inline | **<1500 LOC inline + компоненты** |
| AN-records по Marketplace | 0 | ≥5 |
| WorkItem-ов по Marketplace в WG | 0 | ≥20 (epic + tasks) |
| OneBase-bridges из Marketplace | 0 | 1 (catalog import) |

---

## 9. Что НЕ делать

- ❌ Не переписывать Marketplace на ioHasC / OneBase — он работает и зрелый
- ❌ Не делать общий код Blade↔Web components — контракт да, реализации раздельно
- ❌ Не выносить Filament-страницы в общую DS — Filament держит свою экосистему
- ❌ Не пытаться сразу на 98 компонентов — фокус на 5 atoms + 3 molecules
- ❌ Не запускать OneBase двустороннюю интеграцию первой — сначала read-only импорт каталога
- ❌ Не ломать существующие `<x-ui.*>` Blade — даже мажорно расширяя пропсы, держать обратную совместимость

---

## 10. Приоритеты P0/P1/P2

### P0 — фундамент общей DS (2 недели)

1. `@iohasc/design-tokens` пакет (JSON Schema + tokens.json + CSS builder)
2. Marketplace переходит на сгенерированный `brand-tokens.css` (без визуальных изменений)
3. Work Graph добавляет двухслойные токены (`--brand-*` + `--ui-*`)
4. Cursor-rule `iohasc-ui-components.mdc` для Work Graph + `marketplace-uses-shared-tokens.mdc`
5. AN-MP-1 / AN-MP-2 (Hub&Spoke, Atomic Design)

### P1 — спецификация + atomify Work Graph (3–4 недели)

6. `@iohasc/atomic-spec` для 5 atoms (button, badge, input, icon, modal) — BVC + JSON props schema
7. Work Graph: вынести button/badge/input/icon в `src/ui/atoms/` с теми же пропсами
8. `/dev/ui-kit` в Work Graph
9. `docs-generator` единый каталог
10. `intent/marketplace/` epic + 20 work items
11. AN-MP-3 / AN-MP-4 / AN-MP-5

### P2 — глубокая интеграция (6+ недель)

12. Molecules/organisms зеркало (3–5 штук)
13. OneBase catalog import мост для Marketplace
14. PVRG `bladeAdapter` + trace docs↔code в Marketplace
15. Theme runtime обобщён до `IohascThemeResolver`
16. Verification matrix view для Marketplace
17. Intent composer для `listing_form_schema`

---

## 11. Финальный вердикт

Marketplace — **не "сделанный без Work Graph и OneBase" проект, а проект с самостоятельной зрелой DS**. У него есть **то, чего нет в Work Graph** (atomic design, токены, runtime темы, storybook, каталог). У Work Graph есть **то, чего нет в Marketplace** (BVC спецификации, intent composer, verification matrix, agent-OS).

**Правильное направление:**

1. **Извлечь общий канон** (`@iohasc/design-tokens` + `@iohasc/atomic-spec`) из Marketplace, не наоборот.
2. **Work Graph догоняет** Marketplace по UI-дисциплине (atomic, storybook, каталог).
3. **Marketplace получает** Work Graph как PM-слой (backlog, AN, verification, agent runs).
4. **OneBase** входит как **bridge** (каталог + опционально заказы), не как замена backend.
5. **Не сливать** реализации — Blade остаётся в Marketplace, vanilla/web components в Work Graph, общий контракт между ними.

Marketplace — **первый реальный потребитель** общей DS Work Graph. Это сильнее любого design-system-в-вакууме: DS, построенная под реальный продукт, на старте проверяется на ~98 компонентах продакшна.

---

**См. также:**
- [AN-17 onebase-integration-vertical-stack](onebase-integration-vertical-stack.md)
- [AN-20 ux-current-state-and-vector](ux-current-state-and-vector.md)
- [AN-6 product-self-audit-tech](product-self-audit-tech.md)
- [AN-7 product-self-audit-user](product-self-audit-user.md)
- [Marketplace docs/project-vision-ru.md](../../../04%20Marketplace/docs/project-vision-ru.md)
- [Marketplace docs/ui/atomic-design.md](../../../04%20Marketplace/docs/ui/atomic-design.md)
- [Marketplace docs/ui/tokens.md](../../../04%20Marketplace/docs/ui/tokens.md)
- [Marketplace docs/ui/components.md](../../../04%20Marketplace/docs/ui/components.md)
- [Marketplace docs/compliance-matrix-ru.md](../../../04%20Marketplace/docs/compliance-matrix-ru.md)
- [Marketplace docs/monorepo-composer-sync.md](../../../04%20Marketplace/docs/monorepo-composer-sync.md)
- [Marketplace .cursor/rules/marketplace-ui-atomic-design.mdc](../../../04%20Marketplace/.cursor/rules/marketplace-ui-atomic-design.mdc)
- [Marketplace .cursor/rules/marketplace-blade-components.mdc](../../../04%20Marketplace/.cursor/rules/marketplace-blade-components.mdc)
