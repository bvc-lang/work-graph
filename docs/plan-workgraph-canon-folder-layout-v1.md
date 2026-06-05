# Plan: layout `.work-graph/canon` (AN-77)

**Статус:** design v1 (без миграции)  
**Дата:** 2026-06-05  
**Контекст:** [AN-77](../work/analytics/workgraph-agent-mcp-bypass-install-boundary-incident.md), [ADR write-boundary](./adr-workgraph-canon-write-boundary-v1.md)  
**Эпик:** `epic-workgraph-canon-write-boundary-v1`  
**Work item:** `design-workgraph-canon-folder-layout-v1`

## Цель

Сделать control-plane границу **видимой** для оператора и агента: канон проекта живёт в `.work-graph/canon/`, а не смешивается с прикладным `src/`. Реализация и bulk-миграция — **отдельные work items**; этот plan фиксирует target layout и compatibility mode.

## Текущее состояние (v0)

```text
my-project/
  src/
  intent/index.bvc
  intent/**/work/*.work.bvc
  charter/
  architecture/main.bvc
  .work-graph/
    config.json
    run-ui.mjs
    run-mcp.mjs
```

- `repoRoot` = корень git-проекта = `WG_PROJECT_ROOT` / `WORKGRAPH_ROOT`
- Индекс: `intent/index.bvc` (относительно `repoRoot`)
- Lint write-boundary: `intent/**/work/*.work.bvc` и будущий `.work-graph/canon/**`

## Target layout (v1)

```text
my-project/
  src/
  package.json
  .cursor/mcp.json
  .work-graph/
    config.json          # canonLayout + paths
    run-ui.mjs
    run-mcp.mjs
    canon/
      intent/index.bvc
      intent/**/work/*.work.bvc
      charter/
      architecture/main.bvc
```

**Принцип:** прикладной код и control-plane разделены одной dot-folder. Агентские правила: «`.work-graph/canon/**` read-only для file tools; writes только MCP».

## Config contract (`.work-graph/config.json` v3 — proposed)

| Поле | Тип | Описание |
|------|-----|----------|
| `schema` | `"workgraph.project.config.v3"` | расширение v2 |
| `projectRoot` | string | абсолютный путь git root |
| `canonLayout` | `"root-intent"` \| `"dot-canon"` | режим разрешения путей |
| `canonRoot` | string? | относительный путь от `projectRoot`; default `.work-graph/canon` когда `canonLayout=dot-canon` |

**v2 projects (today):** `canonLayout: "root-intent"` (implicit default) — поведение без изменений.

**v3 new installs (future):** `init` может предлагать `dot-canon` opt-in; default остаётся `root-intent` до отдельного ADR на breaking change.

## Path resolution (единый контракт)

Ввести модуль `resolveCanonPaths({ repoRoot, config })` →:

```javascript
{
  repoRoot,           // git / managed project root
  canonRoot,          // absolute: .../my-project/.work-graph/canon OR repoRoot
  intentIndexPath,    // relative from canonRoot: intent/index.bvc
  intentTreeRoot,     // intent/
  charterRoot,        // charter/
  architectureRoot,   // architecture/
}
```

### Правила

1. **Никогда** не использовать неявный `process.cwd()` для чтения канона — только `repoRoot` + `canonRoot` из config/env.
2. **MCP:** `WORKGRAPH_ROOT` = `repoRoot`; внутри handlers вызывать `resolveCanonPaths` (не хардкод `intent/index.bvc`).
3. **UI server:** `resolveWorkGraphRequestContext().repoRoot` → `resolveCanonPaths`.
4. **CLI init:** пишет stubs в target canon tree согласно `canonLayout`.
5. **Lint:** уже покрывает оба prefix (`intent/**` и `.work-graph/canon/**`).

### Compatibility matrix

| canonLayout | intent index | Новые work items | Migration |
|-------------|--------------|------------------|-----------|
| `root-intent` (default) | `repoRoot/intent/index.bvc` | `intent/**/work/` | none |
| `dot-canon` | `repoRoot/.work-graph/canon/intent/index.bvc` | under canon tree | one-time script |

Dual-read (transition): опциональный режим `canonLayout: "dual-read"` — читать оба дерева, писать только в primary; **не в v1 implementation**, только задокументирован как escape hatch.

## Затронутые компоненты (implementation backlog)

| Компонент | Изменение |
|-----------|-----------|
| `src/canonPaths.mjs` (new) | `resolveCanonPaths`, unit tests |
| `src/intentTreeWorkItems.mjs` | принимать `canonRoot` / `intentIndexPath` из resolver |
| `src/workGraphProjectInit.mjs` | config v3 fields, opt-in `--canon-layout dot-canon` |
| `src/workGraphBacklogUiServer.mjs` | все `readWorkItemsFromRepo({ cwd })` → canon-aware |
| `packages/workgraph-mcp/src/handlers.mjs` | `resolveRoot` + canon paths |
| `scripts/lint-backlog.mjs`, `lint-canon-write-boundary` | без изменений (paths already dual) |
| `docs/runbook-deploy-work-graph-on-project.md` | описать оба layout |
| Tests | fixture projects для `root-intent` и `dot-canon` |

## Proposed work items (implementation — delivered in epic AN-77)

| work.id | Статус |
|---------|--------|
| `implement-canon-paths-resolver-v1` | done — `src/canonPaths.mjs` |
| `extend-init-dot-canon-layout-v1` | done — init `--canon-layout dot-canon` |
| `migrate-project-root-intent-to-dot-canon-v1` | done — `scripts/migrate-root-intent-to-dot-canon.mjs` |
| `tests-canon-layout-dual-mode-v1` | done — `tests/canonLayoutDualMode.test.mjs` |

Rollup: [plan-workgraph-canon-write-boundary-v1.md](./plan-workgraph-canon-write-boundary-v1.md)

## Анти-цели

- Не ломать существующие репо с root `intent/` в этом эпике.
- Не считать перенос папки заменой write-boundary (MCP + audit + lint остаются обязательными).
- Не дублировать канон в двух местах без migration evidence.

## Критерий готовности design (этот document)

- [x] Target layout описан
- [x] Compatibility `root-intent` vs `dot-canon`
- [x] Path resolution без implicit cwd
- [x] UI/MCP/CLI получают canon через config contract
- [x] Implementation/migration отложены в отдельные work items

## См. также

- [ADR write-boundary](./adr-workgraph-canon-write-boundary-v1.md)
- [Plan multiproject host](./plan-work-graph-multiproject-host.md) — `repoRoot` per project
- [Per-project install ADR](./adr-work-graph-per-project-install.md)
