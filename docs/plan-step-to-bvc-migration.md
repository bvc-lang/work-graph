# План миграции `.bvc` → `.bvc`

**Статус:** исполняется (утверждён 2026-05-31; naming ADR + multilingual ADR приняты).  
**Цель:** публичный open canon = **BVC + `.bvc`**, внутри репо `.bvc` остаётся readable legacy до фазы 3.

**См. также:** [adr-bvc-format-naming.md](adr-bvc-format-naming.md), [adr-bvc-multilingual-keys.md](adr-bvc-multilingual-keys.md), [AN-19](../work/analytics/bvc-multilingual-keys-design.md), [PUBLISH.md](../packages/bvc-spec/PUBLISH.md).

## Владельцы и сроки

| Фаза | Owner | Окно | Статус |
|---|---|---|---|
| 0 — резервирование имён | product_owner | 2026-05-31 … 2026-06-07 | **done** |
| 1 — dual-read + multilingual | frontend_architect | 2026-06-01 … 2026-06-28 | **MVP done** |
| 2 — new-write `.bvc` | frontend_architect | 2026-06-15 … 2026-07-15 | **MVP done** (WG pilot) |
| 3 — optional bulk rename | product_owner | по запросу | **done** (337 renames) |

## Затронутые пути (Work Graph pilot)

| Область | Сейчас | Фаза 1 | Фаза 2+ |
|---|---|---|---|
| `charter/main.bvc` | legacy + `#!bvc lang=ru`, метки canon | read OK | optional `.bvc` |
| `protocols/*.bvc` | legacy read | read OK | **new-write `.bvc`** |
| `intent/**/work/*.work.bvc` | legacy read | read OK | new items → `.bvc` |
| `packages/bvc-spec/` | placeholder npm package | publish external | `@bvc/parser` extract |
| `packages/bvc-dialects/` | pilot registry | keep in repo | move → `bvc-lang/dialects` |
| `src/bvcAtomParser.mjs`, `src/bvcFileFormat.mjs` | MVP parser/lint | maintain | `@bvc/parser` npm |
| VS Code / Cursor grammar | ioHasC track | WG adapter `bvc-v1` | extension alias `.bvc` |

## Фазы

### Фаза 0 — резервирование имён (1–2 дня)

- [x] GitHub org `bvc-lang` + repo [`bvc-lang/spec`](https://github.com/bvc-lang/spec) — transfer + rename 2026-05-31
- [x] npm publish `@bvc-lang/spec@0.0.1` — 2026-05-31 (org `bvc-lang`; GitHub `bvc-lang/spec`)
- [x] ADR naming принят (`docs/adr-bvc-format-naming.md`)
- [x] ADR multilingual принят (`docs/adr-bvc-multilingual-keys.md`)
- [x] Charter: `canon.public_format=bvc`, `#!bvc lang=ru`, ADR links

### Фаза 1 — dual-read + multilingual (2–4 недели)

- [x] Parser/linter: `.bvc` и `.bvc` → один AST (`src/bvcFileFormat.mjs`, `scripts/bvc-lint.mjs`)
- [x] Detect-or-Declare: pragma, `@lang`, `Labels.lang`, auto-detect, `E_BVC_DIALECT_MIX` (`src/bvcAtomParser.mjs`)
- [x] Dialect registry pilot: `packages/bvc-dialects/` (+ copy in `@bvc/spec`)
- [x] Tests: EN + RU conformance identical AST (`tests/bvcConformance.test.mjs`)
- [x] `bvc-atom-draft.v1.json` + alias `step-atom-draft`; поле `lang`
- [x] CLI `bvc lint` pilot — `packages/bvc-cli`, `npm run bvc lint …`
- [x] npm publish `@bvc-lang/spec@0.0.3` — 2026-06-01
- [x] npm publish `@bvc-lang/cli@0.1.7` — lint + format; depends on `@bvc-lang/spec@^0.0.3`
- [x] GitHub [`bvc-lang/cli`](https://github.com/bvc-lang/cli) — tag `v0.1.3`

### Фаза 2 — new-write `.bvc` (2–4 недели)

- [x] Formatter / CLI `bvc format` пишет `.bvc`; round-trip preserve `atom.lang` — `npm run bvc:format`
- [x] MCP `create_work_item`: новые items → `*.work.bvc`; protocol `bvc-new-write-policy-v1.bvc`
- [x] Новые work items: **`.work.bvc` by default** (`src/bvcNewWritePolicy.mjs`)
- [x] MCP prompts WorkGraph: recommend `.bvc` in TOOL_RULES + `create_work_item` (`packages/workgraph-mcp/src/prompts.mjs`)
- [ ] Agent tools / MCP: recommend `.bvc` в prompt examples (ioHasC track — отдельный репо)
- [ ] VS Code grammar: primary `.bvc`, secondary `.bvc` (ioHasC extension)
- [x] `protocols/llm-step-atom-writer.bvc` — один dialect на атом

### Фаза 3 — optional bulk rename (по запросу, не блокер)

- [x] Script `scripts/migrate-step-to-bvc.mjs` (dry-run default; `--apply` for rename)
- [x] Batch rename `work/**/*.bvc` → `.bvc` (337 files, 2026-05-31; `npm run migrate:step-to-bvc -- --apply`)
- [x] Deprecation notice в parser: `.step` → warning (не error) до v2

## Что не мигрируем

- Git history — не rewrite
- External repos (ioHasC `../project`) — отдельный трек, после Work Graph pilot; см. [plan-iohasc-project-bvc-bridge.md](plan-iohasc-project-bvc-bridge.md)
- **Содержимое RU-корпуса** — не переписываем на EN; **Detect-or-Declare** + auto-detect (см. AN-19), не inline bilingual aliases

## Rollback

Если `@bvc/spec` не получает traction за 30 дней — org/npm остаются, public brand можно заморозить; `.bvc` legacy продолжает работать (dual-read permanent).

## Todo (исполнение)

### Naming (AN-18)

- [x] `reserve-bvc-spec-npm-package` — npm publish done (@bvc-lang/spec)
- [x] `reserve-bvc-github-org` — https://github.com/bvc-lang/spec
- [x] `implement-parser-dual-extension-step-bvc` — dual-read + tests
- [x] `update-charter-bvc-naming-adr`
- [x] `vscode-bvc-language-id-alias-step` — WG: `languageId=bvc` in `stepAdapter.mjs` (ioHasC ext — follow-up)

### Multilingual (AN-19)

- [x] `adr-bvc-multilingual-keys` — ADR принят
- [x] `bvc-dialect-registry-en-ru` — pilot registry
- [x] `extend-bvc-atom-draft-lang-field` — schema `lang`
- [x] `update-llm-bvc-atom-writer-multilingual` — protocol
- [x] `charter-bvc-lang-pragma` — `#!bvc lang=ru`
- [x] `update-migration-plan-multilingual-an19` — этот файл
- [x] `sync-an14-ir-open-canon-multilingual` — AN-14
- [x] `implement-parser-detect-or-declare` — MVP in `src/bvcAtomParser.mjs` (+ extract `@bvc/parser` later)
- [x] `bvc-multilingual-conformance-tests` — EN/RU suite in repo
