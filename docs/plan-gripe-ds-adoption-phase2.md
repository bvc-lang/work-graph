# Plan: Gripe DS adoption phase 2 (post AN-21)

## Цель

Довести интеграцию **дизайн-системы Gripe Marketplace** в Work Graph UI и Gripe backend-bridge после закрытия `epic-marketplace-shared-design-system`: atoms в production backlog UI, molecules/organism spec parity, production OneBase OData catalog import.

**OneBase** — только 1С-like runtime bridge; **не** source of design tokens.

## Почему сейчас

AN-30 closing зафиксировал out-of-scope: inline buttons, molecules, full OData import. Без phase 2 `/dev/ui-kit` и production UI расходятся; catalog bridge остаётся dry-run stub.

## Что делать

### Track A — WG UI atom migration (Gripe DS)

1. Wave 1: shell buttons (nav, theme, agent dock, detail close).
2. Wave 2: dynamic panels (analytics/workflow subtabs, intent composer, pagination, code-gap).
3. Lint/grep gate: новые `<button class="` в server только через atoms (cursor rule update).

### Track B — atomic-spec molecules + organism

1. BVC: `rating`, `tabs.group`, `tabs.trigger` в `packages/atomic-spec/molecules/`.
2. WG renderers + `/dev/ui-kit` секции.
3. Modal: `packages/atomic-spec/organisms/modal.bvc` + `src/ui/organisms/modal.mjs` parity с Gripe organism.
4. `docs-generator` — scan molecules/ и organisms/.

### Track C — OneBase OData catalog (Gripe backend)

1. `OneBaseCatalogApiClient` — fetch describe/catalog tree.
2. `OneBaseCatalogTreeImporter` — production upsert via `CatalogStructureSynchronizer`.
3. Facets → `listing_form_schema` через `CatalogFacetsToListingFormConverter`.
4. Artisan command + PHPUnit + WG evidence.

## Todo

- [x] `seed-epic-gripe-ds-adoption-phase2` — эпик и subtasks в backlog
- [x] `wg-backlog-ui-button-migration-wave-1` — nav / theme / agent dock
- [x] `wg-backlog-ui-button-migration-wave-2` — workflow / analytics / composer
- [x] `atomic-spec-molecules-rating-tabs` — BVC molecules
- [x] `wg-ui-molecules-rating-tabs-renderers` — src/ui/molecules + ui-kit
- [x] `atomic-spec-organism-modal-gripe-parity` — organism modal BVC
- [x] `wg-ui-organism-modal-parity` — src/ui/organisms/modal.mjs
- [x] `docs-generator-molecules-organisms` — catalog generator v2
- [x] `onebase-odata-catalog-api-client` — HTTP + fixture tests
- [x] `onebase-odata-catalog-import-production` — sync + artisan command
- [x] `onebase-catalog-facets-listing-form-bridge` — facets → listing_form_schema
- [x] `write-an32-closing-gripe-ds-adoption-phase2` — closing AN-32-C

## Критерий завершения

- ≥80% action `<button>` в `workGraphBacklogUiServer.mjs` через `renderUiButton` (grep metric в closing).
- ≥3 molecule BVC + organism modal BVC; ui-kit показывает rating/tabs/modal.
- `catalog:import-onebase --dry-run` и без `--dry-run` на fixture; upsert в БД покрыт тестом.
- AN-32 closing опубликован; эпик closed с evidence.
