# AN-32: Gripe DS phase 2 — миграция WG UI, molecules, OneBase OData catalog import

**Запрос:** после закрытия AN-21 / `epic-marketplace-shared-design-system` — продолжить work **вне scope эпика**: atomify inline-кнопки в backlog UI, расширить atomic-spec на molecules, полноценный OneBase OData import (сейчас stub + dry-run).

**Коррекция терминологии:** **дизайн-система — Gripe Marketplace** (`APP_NAME=Gripe`, `04 Marketplace`, Blade `x-ui.*`, `brand-tokens.css`). **OneBase** — с открытым исходным кодом 1С-like **runtime** (YAML + `.os`); к DS не относится. В AN-21 контракт tokens/spec **извлечён из Gripe**, OneBase упомянут только как **bridge каталога/заказов** ([AN-17](onebase-integration-vertical-stack.md)).

## Кратко

| Поток | Сейчас (после AN-21) | Phase 2 |
|---|---|---|
| **WG backlog UI** | ~9000 строк inline HTML; 5 atoms; `renderUiButton` только в `/dev/ui-kit` | Поэтапная замена `<button>` / `renderListRow` action-кнопок на atoms |
| **atomic-spec** | 5 atoms; modal.bvc помечен atom, в Gripe — **organism** | molecules: rating, tabs; organism modal parity |
| **OneBase → Gripe catalog** | `OneBaseCatalogTreeImporter` stub + dry-run log | REST/OData fetch + `CatalogStructureSynchronizer` + facets → `listing_form_schema` |

**Эпик:** `epic-gripe-ds-adoption-phase2`  
**План:** [docs/plan-gripe-ds-adoption-phase2.md](../docs/plan-gripe-ds-adoption-phase2.md)

---

## 1. Почему отдельный эпик (не AN-21)

AN-21 закрыл **контракт** (`@iohasc/design-tokens`, 5 atoms, sync script, PM layer). Явно **out of scope** closing AN-30:

1. Постепенная замена inline UI в `workGraphBacklogUiServer.mjs`.
2. Molecules / organism parity с Gripe.
3. Production OneBase catalog import (stub → real upsert).

Смешивать с OneBase DS было бы ошибкой: OneBase не задаёт палитру Gripe.

---

## 2. Gripe DS reference (molecules phase 2)

| Компонент | Gripe (Blade) | WG target |
|---|---|---|
| Rating | `x-ui.molecules.rating` | `src/ui/molecules/rating.mjs` + `packages/atomic-spec/molecules/rating.bvc` |
| Tabs | `x-ui.molecules.tabs.group` / `.trigger` | `src/ui/molecules/tabs.mjs` — замена `nav-tab`, `рабочий процесс-subtab`, analytics subtabs |
| Modal | `x-ui.organisms.modal` (Alpine teleport) | `src/ui/organisms/modal.mjs` — parity props; убрать mismatch atom vs organism |

Каталог Gripe: [docs/ui/components.md](../../../04%20Marketplace/docs/ui/components.md).

---

## 3. OneBase OData import (не DS)

AN-21 §3.3A: OneBase «Номенклатура» → `category_nodes`; атрибуты → `listing_form_schema` через `CatalogFacetsToListingFormConverter`.

**Stub (AN-21 P2):** `OneBaseCatalogTreeImporter::importFromDescribe()` — dry-run log only.

**Phase 2:**
- HTTP client к OneBase REST (`onebase describe --json` / catalogs API).
- Нормализация дерева в формат `CatalogStructureSynchronizer` (паттерн `AvitoCatalogTreeImporter`).
- Artisan command `catalog:import-onebase {--dry-run}`.
- Integration test на fixture из `tests/fixtures/onebase/real-trade/`.
- **Не** смешивать с tokens/UI.

---

## 4. Риски

| Риск | Mitigation |
|---|---|
| Big-bang refactor 9000-line server | Две волны migration + тесты `/api/*` smoke |
| Modal Alpine vs vanilla WG | Organism shell без Alpine; confirm flows — phase 2b |
| Dual backlog import jobs | Один command + audit log; WG work item evidence |
| Путаница OneBase / Gripe DS | Явные department: `domain-onebase` vs `ui-dashboard` |

---

## 5. Связи

| AN | Связь |
|---|---|
| **AN-21** | Parent epic; tokens + 5 atoms delivered |
| **AN-30** | Closing; lists out-of-scope items → this epic |
| **AN-17** | OneBase vertical; OData import cross-ref |
| **AN-MP-2** | Dual-location Blade; molecules spec follows same pattern |

---

**См. также:** [closing-epic-marketplace-shared-design-system.md](closing-epic-marketplace-shared-design-system.md), [marketplace-integration-and-shared-design-system.md](marketplace-integration-and-shared-design-system.md).
