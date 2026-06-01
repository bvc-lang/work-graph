# AN-MP-2: Atomic Design — dual location (app/ vs marketplace-core/)

**Эпик:** `epic-marketplace-shared-design-system` · **Источник:** [AN-21](marketplace-integration-and-shared-design-system.md)

## Компромисс

Blade UI atoms/molecules/organisms живут в **двух местах**:

1. `resources/views/components/ui/` — app shell, dev/ui-kit, cross-cutting pages.
2. `packages/marketplace-core/resources/views/components/ui/` — catalog/listing shared blocks.

Префикс единый: `<x-ui.{layer}.{name}>`. Каталог — `docs/ui/components.md` (→ unified generator из `@iohasc/atomic-spec`).

## Правила

- Зависимости только «вниз» (organism → molecule → atom).
- Перед новой вёрсткой — проверка каталога (`marketplace-blade-components.mdc`).
- BVC-спека в Work Graph — машинный канон; Blade — reference implementation.

## feeds_epics

- epic-marketplace-shared-design-system
