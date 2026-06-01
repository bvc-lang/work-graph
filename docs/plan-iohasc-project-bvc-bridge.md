# ioHasC project BVC bridge plan

## Цель

Согласовать миграцию sibling-репо `../project` (ioHasC) с открытым BVC-контуром Work Graph, не ломая внутренний `.step`-корпус до отдельного решения product_owner.

## Почему

Work Graph pilot завершил bulk `.step`→`.bvc` и npm publish; ioHasC остаётся на `.step` для plans/rules/skills. Global replace в WG уже **исключает** `../project/*.step`.

## Scope

| Область | Work Graph | ioHasC `../project` |
|---------|------------|---------------------|
| Charter / protocols | `.bvc` canon | отдельный трек |
| Agent rules `.step` | не трогаем пути | preserve в `globalStepPathToBvcReferences` |
| npm `@bvc-lang/cli` | consumer | optional devDependency |
| MCP onebase bridge | in progress | ADR `docs/plan-onebase-iohasc-bridge.md` |

## Что делать (фазы)

1. **Read-only bridge** — WG docs ссылаются на ioHasC paths; dual-read CLI уже поддерживает `.step`.
2. **Pilot new-write** — новые `docs/plan-*.md` в ioHasC; `.step` plans остаются до `/run-plan` migration.
3. **Optional bulk** — только после ioHasC product_owner sign-off; отдельный epic, не блокер AN-37 tail.

## Guardrails

- `replaceStepPathReferencesInText` сохраняет `` `../project/...step` `` и prose «legacy `.step`».
- Не публиковать `.step` примеры в `@bvc-lang/spec` / `@bvc-lang/cli` README.
- CI ioHasC: `npm test` без forced rename.

## Todo

- [ ] ioHasC: зафиксировать ADR «`.step` internal, `.bvc` public export»
- [ ] ioHasC: optional `bvc lint` в `npm run ci` для новых `.bvc` paths
- [ ] Shared: cross-repo trace links (`iohasc-ref:`) — см. ioHasC docs

## Критерий завершения

Отдельный epic в ioHasC backlog; WG tail v1 считает bridge **спланированным** (этот документ + guardrails в коде).
