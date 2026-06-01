# Closing: epic-bvc-open-format-tail-v1

Эпик: `epic-bvc-open-format-tail-v1`  
Источник: [AN-37](bvc-open-format-tail-v1.md)  
Закрыт: 2026-06-01

## Outcomes

### Track A — Parser deprecation

- `warnLegacyStepRead()` в `readBvcTextFile` (once-per-path, не error до v2)
- Тест `bvcDualExtension.test.mjs`; sync в `@bvc-lang/cli@0.1.7`
- `plan-step-to-bvc-migration.md` фаза 3 отмечена

### Track B — Deterministic CI

- `npm run test:deterministic` — 646/646 green
- Фиксы: `pipelineProseRender` `.bvc` inline-term, analytics projection counts

### Track C — npm / GitHub

| Пакет | Версия | npm | GitHub tag |
|-------|--------|-----|------------|
| `@bvc-lang/spec` | **0.0.3** | latest | `v0.0.3` |
| `@bvc-lang/cli` | **0.1.7** | latest | `v0.1.7` |

- README без `.step` примеров; Управление без ISO STEP
- `PUBLISH.md` stub на cli repo (нет 404)

### Track D — мост ioHasC + lint

- `docs/plan-iohasc-project-bvc-bridge.md`
- `npm run lint:backlog` green после close trilogy (31 item)

## Уроки

1. Trilogy close — batch script + `basename()` для Windows paths.
2. npm CDN lag: проверять `@version` и `dist-tags.latest`, не только главную страницу.
3. ioHasC `../project/*.step` — отдельный epic, не смешивать с WG tail.

## feeds_epics

- epic-bvc-open-format-tail-v1
