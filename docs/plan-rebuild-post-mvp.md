# Rebuild post-MVP

## Цель

Закрыть последний environment gate OneBase golden path и перейти от operator dashboard MVP к автономному agent worker с реальным LLM.

## Почему сейчас

`rebuild-start-plan` (фазы 1–5) выполнен: Work Graph runtime, backlog UI, verification loop и OneBase design package готовы. Патч gross-profit-by-warehouse в `../onebase` подготовлен и проходит static artifact gate; `go test ./...` заблокирован отсутствием Go в PATH.

## Что делать

1. Установить Go (winget или https://go.dev/dl/), перезапустить shell, проверить `go version`.
2. Запустить `npm run test:optional:onebase` из `D:/Work/IDE/work graph`; при exit 0 — перевести `onebase-implement-gross-profit-warehouse-dimension` в `done` с evidence и `trace.status: verified`.
3. Подключить local agent worker (`npm run worker:local`) к claim/act циклу для ready-задач post-MVP.
4. Добавить optional LLM golden path eval (сценарий discovery по OneBase slice) без блокировки CI.
5. Вести полный перенос ioHasC по [`docs/plan-iohasc-full-rebuild-backlog.md`](plan-iohasc-full-rebuild-backlog.md): root roadmap `iohasc-full-rebuild-roadmap`, phase tasks `phase-0-*` ... `phase-11-*`, leaf tasks с `migration.strategy`.

## Todo

- [x] Установить Go и прогнать `npm run test:optional:onebase` (portable: `D:/Work/IDE/.tools/go`)
- [x] Закрыть задачу `onebase-implement-gross-profit-warehouse-dimension` в `work/backlog.bvc`
- [x] Запустить `npm run intent:migrate` после обновления backlog
- [x] Спроектировать backlog atom для `implement-agent-worker-live-loop`
- [x] Реализовать `implement-agent-worker-live-loop`
- [x] Завести backlog atom для optional LLM eval
- [x] Задокументировать optional LLM eval command в `protocols/golden-path-test-v1.bvc`
- [x] Завести полный backlog переноса ioHasC (`iohasc-full-rebuild-roadmap` + phase/leaf tasks)
- [x] Post-full: OpenAI-compatible provider + live-loop `--provider` selection (см. [`docs/plan-rebuild-post-full-roadmap.md`](plan-rebuild-post-full-roadmap.md))

## Критерий завершения

OneBase implementation task в статусе `done` с go test evidence; post-MVP plan atom в backlog; deterministic suite зелёный; operator UI показывает verification matrix без blocked OneBase row (или с passed optional gate); полный roadmap переноса ioHasC представлен в backlog и intent tree.
