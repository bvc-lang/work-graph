# План: epic-marketplace-shared-design-system (AN-21)

## Цель

Общий контракт дизайн-системы (`@iohasc/design-tokens` + `@iohasc/atomic-spec`) на базе зрелой DS Marketplace; Work Graph как PM-слой над Marketplace; OneBase — bridge (каталог), не замена backend.

## Почему

[AN-21](../work/analytics/marketplace-integration-and-shared-design-system.md): Marketplace сильнее по UI (atomic, токены, `/dev/ui-kit`); Work Graph — по процессам (BVC, backlog, verification, agent-OS). Направление: **извлечь канон из Marketplace**, WG догоняет по UI-дисциплине.

## Todo

- [x] `epic-marketplace-shared-design-system` — эпик в бэклоге
- [x] `extract-iohasc-design-tokens-package` — JSON Schema + tokens + CSS/Tailwind builders (Phase 0)
- [x] `marketplace-adopt-generated-brand-tokens` — Marketplace на сгенерированный `brand-tokens.css`
- [x] `workgraph-dual-layer-semantic-tokens` — `--brand-*` + `--ui-*` в Work Graph
- [x] `cursor-rules-shared-ds-discipline` — `iohasc-ui-components.mdc` + shared-tokens rule
- [x] `marketplace-an-records-bootstrap` — AN-MP-1…AN-MP-2 (Hub&Spoke, Atomic Design)
- [x] `atomic-spec-five-base-atoms` — BVC spec: button, badge, input, icon, modal
- [x] `workgraph-extract-ui-atoms-layer` — `src/ui/atoms/` по спеке
- [x] `docs-generator-unified-component-catalog` — единый `docs/ui/components.md`
- [x] `workgraph-dev-ui-kit-route` — `/dev/ui-kit` в Work Graph
- [x] `intent-marketplace-backlog-bootstrap` — `intent/domains/marketplace/` + миграция plans
- [x] `onebase-marketplace-catalog-import-bridge` — OneBase → `category_nodes` (P2)
- [x] `iohasc-theme-resolver-shared` — обобщённый runtime theming (P2)
- [x] `pvrg-blade-adapter-marketplace` — bladeAdapter + trace (P2)
- [x] `write-an30-closing-marketplace-shared-design-system` — closing AN-30

## Критерий завершения

1. Один JSON source of truth для палитры; Marketplace и WG потребляют сгенерированные токены.
2. ≥5 BVC-атомов; WG UI вынесен из monolith inline в atoms.
3. `intent/marketplace/` backlog в Work Graph; ≥5 AN-MP records.
4. AN-30 closing опубликован, эпик закрыт.
