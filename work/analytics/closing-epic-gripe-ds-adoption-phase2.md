# Closing: epic-gripe-ds-adoption-phase2

Эпик: `epic-gripe-ds-adoption-phase2`  
Источник: [AN-32](gripe-ds-adoption-phase2-post-an21.md)  
Закрыт: 2026-05-31

## Outcomes

### Track A — Gripe DS в Work Graph UI

- `renderUiButton` расширен (`unstyled`, `id`, `aria*`, `attrs`, `labelHtml`)
- `src/ui/backlogShellButtons.mjs` — shell + subtabs через `renderUiTabsGroup`
- Wave 1: nav, theme, detail, agent dock → atoms
- Wave 2: intent composer, code-gap, pagination → `renderClientUiButton`
- Analytics/рабочий процесс subtabs → **tabs molecule** (`data-analytics-tab`, `data-рабочий процесс-tab` сохранены)

### Track B — atomic-spec molecules + organism

- BVC: `molecules/{rating,tabs-group,tabs-trigger}.bvc`, `organisms/modal.bvc`
- `src/ui/molecules/{rating,tabs}.mjs`, `src/ui/organisms/modal.mjs`
- `/dev/ui-kit` — rating + tabs; `docs-generator` v2

### Track C — OneBase OData → Gripe catalog

- `OneBaseCatalogApiClient` — file + HTTP
- `OneBaseCatalogTreeImporter` — `treeFromDescribe` + `listing_form_schema`
- `OneBaseCatalogFacetsMapper` — OneBase fields → facets → `CatalogFacetsToListingFormConverter`
- Artisan `catalog:import-onebase {--file|--http} {--dry-run}`

## Метрики

| Метрика | Цель | Итог |
|---------|------|------|
| Shell action buttons через atoms | wave 1–2 | nav/dock/composer/subtabs/code-gap/pagination ✓ |
| Molecule BVC | ≥3 | **3** (rating, tabs×2) |
| Organism modal BVC | 1 | **1** |
| OneBase import | dry-run + schema | PHPUnit **5** tests green |
| DS naming | Gripe not OneBase | зафиксировано в AN-32 |

## Уроки

1. **Gripe DS ≠ OneBase** — tokens/molecules из Marketplace; OneBase только catalog bridge.
2. Tabs molecule требует `dataAttrKey` / `countId` для совместимости с legacy client JS selectors.
3. `listing_form_schema` на узле каталога — правильный контракт для полей OneBase, не `meta` в sync payload.

## feeds_epics

- epic-gripe-ds-adoption-phase2
