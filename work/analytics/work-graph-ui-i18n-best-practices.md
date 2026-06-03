# AN-55: Мультиязычность UI Work Graph — baseline, best practices, рекомендация

**Запрос:** провести анализ и поиск лучшей практики для реализации мультиязычности UI WG.

**Статус:** принято (analysis), implementation — backlog (эпик не seeded)  
**План (draft):** `docs/plan-work-graph-ui-i18n-v1.md` (создать при старте эпика)

**Связи:** [AN-19](bvc-multilingual-keys-design.md) (BVC dialect, **не UI**), [AN-7](product-self-audit-user.md) (боль non-RU), [AN-20](ux-current-state-and-vector.md) (B11 dialect-aware inspector), [AN-45](work-graph-sidebar-sections-guide.md), [ADR BVC multilingual](../docs/adr-bvc-multilingual-keys.md).

---

## Кратко

| Вопрос | Ответ |
|--------|--------|
| Есть ли i18n в WG UI сегодня? | **Нет** — ~300+ строк RU захардкожены в `workGraphBacklogUiServer.mjs` + `src/ui/*` |
| Есть ли i18n в WG вообще? | **Да, но формат BVC** — `bvcDialectRegistry` (EN canonical + RU dialect), AN-19 **done** |
| Что рекомендуем? | **Отдельный UI message catalog** (ICU JSON) + SSR locale resolution + постепенная экстракция строк |
| Default locale? | **Политика продукта:** `ru` (legacy corpus) vs `en` (open/npm) — см. §5 |
| Atom inspector labels? | Переиспользовать **dialect registry для section titles**, не дублировать catalog (AN-20 B11) |

---

## 1. Baseline: два разных «языка»

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│  BVC file format (AN-19)    │     │  Operator UI chrome         │
│  Basis / Базис              │  ≠  │  «Задачи», «Доска», errors  │
│  bvcDialectRegistry         │     │  hardcoded RU + EN leak      │
│  ✅ Done                    │     │  ❌ Not started             │
└─────────────────────────────┘     └─────────────────────────────┘
```

### 1.1. UI сегодня

| Место | Паттерн |
|-------|---------|
| `workGraphBacklogUiServer.mjs` | `<html lang="ru">`, sidebar, kanban, drawer, errors — RU |
| `src/ui/backlogShellButtons.mjs` | «Закрыть», «Тёмная тема» |
| `src/ui/workItemStatusTone.mjs` | `STATUS_LABELS` на RU |
| `src/pipelineProseRender.mjs` | verdict codes → RU (контент pipeline, не chrome) |
| API / errors | смесь EN (`forbidden`) и RU |

**Нет:** `t()`, locale switcher, `Accept-Language`, JSON catalogs, i18n npm deps.

### 1.2. BVC multilingual (уже сделано)

- EN — canonical dialect спеки; RU — registered dialect (`packages/bvc-dialects/`).
- Detect-or-Declare: file pragma, atom `@ru`, `Labels.lang`, auto-detect.
- **Profile keys** (`work.id`, `trace.status`) — always EN.

Это **не переводит UI** — только ключи секций в `.bvc` файлах.

### 1.3. Rusification scripts (обратное направление)

`rusify-all-work-items`, `workItemTextRusify` — контент backlog → RU. Противоречит «international UI» для **данных**, но не мешает **chrome i18n**.

**Правило:** UI locale ≠ язык work item prose. Атом пишет автор на своём языке; chrome следует locale оператора.

---

## 2. Продуктовый контекст (AN-7)

- README / onboarding слабые; UI **русскоязычный** → барьер для non-RU (AN-7).
- AN-45 просил «без англоязычного жаргона» в **описании разделов для RU-оператора** — это не запрет EN locale, а plain language.
- Open publication (npm-first) тянет **EN default** для новых пользователей; legacy WG corpus — **RU**.

**Вывод:** нужна **явная locale policy** (§5), не «перевести всё на EN» одним махом.

---

## 3. Industry best practices (2025–2026)

Источники: [Unicode i18n guide](https://unicodefyi.com/series/modern-web/internationalization/), ICU MessageFormat, FormatJS.

| Практика | Зачем |
|----------|--------|
| **ICU MessageFormat** | Plural/gender/select — не `if (count === 1)` |
| **Separate message catalogs** | JSON/properties per locale, keys stable (`nav.tasks`) |
| **SSR embed locale + messages** | Нет flash untranslated content (FOUC) |
| **`Intl.*` для date/number** | `Intl.DateTimeFormat`, `Intl.NumberFormat` |
| **`html lang` + `dir`** | RTL-ready (`dir=auto` для UGC) |
| **Locale resolution chain** | user pref → cookie → `Accept-Language` → default |
| **Pseudolocalization in CI** | `[!! ~~строка~~ !!]` — ловит overflow |
| **No string concat for sentences** | «N задач» → ICU plural |
| **Don't translate everything** | Technical ids, `work.id`, MCP errors — stable EN |

### Что **не** брать для WG v1

| Подход | Почему |
|--------|--------|
| **react-i18next / next-intl** | UI — vanilla JS in SSR monolith, не React SPA |
| **gettext (.po)** | ICU JSON проще для plural; меньше tooling на Windows |
| **Runtime-only client fetch locales** | FOUC; WG уже SSR-first |
| **Inline aliases в UI** | тот же anti-pattern, что отвергнут в AN-19 |

### Минимальный npm stack (рекомендация)

| Package | Роль |
|---------|------|
| `@formatjs/intl-messageformat` | ICU format в Node + browser |
| `@formatjs/intl-localematcher` | Negotiate `Accept-Language` → `ru`, `en` |
| (optional) `intl-pluralrules` | Polyfill старых Node |

**Без** полного `@formatjs/intl` / i18next — WG не нужен 200KB React-intl stack.

---

## 4. Архитектура UI i18n для WG (рекомендация)

### 4.1. Модули

```
locales/
  en/
    ui.json          # ICU messages: nav.*, drawer.*, kanban.*
  ru/
    ui.json
src/ui/i18n/
  resolveUiLocale.mjs    # cookie → Accept-Language → default
  createUiTranslator.mjs # t('nav.tasks', { count: 5 })
  embedUiI18nScript.mjs    # window.__WG_I18N__ for client JS
```

### 4.2. API surface

```javascript
// Server render (shell)
const { locale, t } = createUiTranslator({ req, defaultLocale: 'ru' });
html = renderBacklogHtml({ t, locale });

// Client (inline handlers)
const t = window.__WG_I18N__.t;
detailTitle.textContent = t('drawer.task.title');
```

### 4.3. Связь с BVC dialect (AN-20 B11)

| UI element | Source |
|------------|--------|
| Sidebar, buttons, errors | `ui.json` catalog |
| Atom section titles in inspector | **`bvcDialectRegistry`** by atom `lang` |
| Atom field labels `work.status` | always EN (spec) |
| Work item basis/vector/goal | **author language** — no auto-translate |

Inspector показывает badge `lang: ru` + warning on mixed keys — **B11**, не general UI i18n.

### 4.4. Migration strategy (strangler)

1. **Phase 0:** ADR + `resolveUiLocale` + empty catalog + locale switcher stub.
2. **Phase 1:** Extract **shell** (`backlogShellButtons`, nav tabs, theme) — ~30 keys.
3. **Phase 2:** Kanban + workflow list labels.
4. **Phase 3:** Detail drawer + verification panel.
5. **Phase 4:** Client-side dynamic strings in monolith (batch by `data-i18n-key`).

**Не блокировать** фичи на «полный перевод» — **en coverage gate** только для P0 chrome (nav + errors).

### 4.5. Testing

| Test | Что |
|------|-----|
| `resolveUiLocale.test.mjs` | Accept-Language negotiation |
| `uiCatalog.test.mjs` | en/ru same keys; no missing keys |
| Pseudolocale job | optional `locale=ps` lengthens strings |
| Snapshot smoke | `renderBacklogHtml({ locale: 'en' })` contains `Tasks` not `Задачи` |

---

## 5. Политика default locale (решение для ADR)

| Вариант | + | − |
|---------|---|---|
| **A. Default `ru`** | legacy operators, corpus | npm/open users (AN-7) |
| **B. Default `en`** | open standard, README EN | текущие операторы |
| **C. Auto from browser** | UX best practice | первый визит без cookie |
| **D. C + fallback `en`** | компромисс open + i18n norm | RU операторы один клик |

**Рекомендация:** **D** — `Accept-Language` → `ru`/`en`; fallback **`en`** для неизвестных; **cookie `wg_locale` overrides**; settings toggle в header (рядом с theme).

Legacy corpus BVC default `ru` в parser **не менять** — это отдельный слой.

---

## 6. Сравнение подходов (UI-only)

| # | Подход | Verdict |
|---|--------|---------|
| A | Big-bang перевод monolith | ❌ freeze на месяцы |
| B | ICU catalog + strangler | ✅ **рекомендуется** |
| C | Display-only EN overlay (Google Translate style) | ❌ качество, offline |
| D | Duplicate HTML templates per locale | ❌ drift |
| E | Только EN UI, RU только в контенте | ⚠️ теряем текущих операторов |

---

## 7. Roadmap (draft epic)

| P | work.id (draft) | Суть |
|---|-----------------|------|
| P0 | `decide-work-graph-ui-i18n-adr` | locale policy, catalog format, boundaries vs BVC |
| P0 | `implement-ui-locale-resolution` | cookie + Accept-Language + `wg_locale` |
| P0 | `implement-ui-message-catalog-v1` | `locales/en|ru/ui.json` + `t()` |
| P1 | `extract-backlog-shell-i18n` | nav, theme, close buttons |
| P1 | `extract-kanban-workflow-i18n` | columns, filters, empty states |
| P1 | `wire-bvc-dialect-atom-inspector-b11` | AN-20 B11 (registry, not catalog) |
| P2 | `extract-detail-drawer-i18n` | drawer + verification + analytics chrome |
| P2 | `add-ui-i18n-pseudolocalization-ci` | overflow guard |
| — | `write-closing-epic-work-graph-ui-i18n-v1` | closing |

Seed (when approved): `npm run seed:epic-work-graph-ui-i18n-v1` — see `scripts/seed-epic-work-graph-ui-i18n-v1.mjs`.

---

## 8. Анти-goals

- Не смешивать UI catalog с `bvc-dialects` JSON (разные lifecycle).
- Не auto-translate work item / analytics body через UI i18n.
- Не требовать RTL v1 (заложить `dir` hook only).
- Не блокировать rusification scripts — они про **content**, не chrome.

---

## 9. GTM

**«Work Graph speaks your language»** для npm/open: EN chrome + EN getting started, RU one-click. BVC open standard остаётся EN-canonical; RU — dialect для авторов.

---

**См. также:** [AN-19](bvc-multilingual-keys-design.md), [AN-54](detail-drawer-stack-modal-queue.md) (drawer strings тоже в catalog), `src/bvcDialectRegistry.mjs`, `docs/adr-bvc-multilingual-keys.md`.
