# BVC open format tail v1

## Цель

Закрыть хвосты после canon trilogy (architecture main.bvc, views v1, Gripe default): предупреждение legacy `.step`, зелёный deterministic suite, npm/docs sync, план моста к ioHasC `../project`.

## Почему

Три эпика выполнены в коде, но в plan-step-to-bvc остались unchecked пункты фазы 2–3; тесты и npm readme отстают от GitHub.

## Что делать

1. Parser: deprecation warning при read `.step` (не error до v2).
2. Починить регрессии deterministic suite после embedded UI fix.
3. npm: `@bvc-lang/spec@0.0.3` readme sync; verify `@bvc-lang/cli@0.1.6`.
4. Документ `docs/plan-iohasc-project-bvc-bridge.md` — scope sibling repo, preserve `../project/*.step` в global replace.
5. `npm run lint:backlog` без новых errors.

## Todo

- [x] `parser-legacy-step-read-deprecation-warning`
- [x] `fix-deterministic-test-regressions-post-canon`
- [x] `sync-bvc-lang-npm-github-publishables`
- [x] `author-plan-iohasc-project-bvc-bridge`
- [x] `lint-backlog-after-epic-trilogy-close`
- [x] `write-an37-closing-bvc-open-format-tail-v1`

## Критерий завершения

Эпик `epic-bvc-open-format-tail-v1` в `done`; plan-step-to-bvc фаза 3 deprecation warning отмечена; AN-37 closing опубликован; backlog показывает только актуальные ready/in_progress задачи.
