# AN-MP-1: Hub & Spoke architecture — Marketplace

**Эпик:** `epic-marketplace-shared-design-system` · **Источник:** [AN-21](marketplace-integration-and-shared-design-system.md)

## Решение

Marketplace построен как **Hub & Spoke**: `marketplace-core` (hub) + vertical packages (classified, freelance, wellness). Composer path-repos + symlink; публичный API и модели — в hub, вертикали добавляют доменную логику без дублирования аккаунта.

## Почему не monolith

- Один аккаунт — много контекстов (manifesto в `docs/project-vision-ru.md`).
- Shared listing/order/review/audit в core; compliance matrix per vertical.
- Work Graph PM-слой (`intent/domains/marketplace/`) трассирует epic/subtasks без смешения с ioHasC IDE backlog.

## feeds_epics

- epic-marketplace-shared-design-system
