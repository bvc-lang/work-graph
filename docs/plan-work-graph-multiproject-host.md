# Plan: Work Graph multiproject host (AN-40)

## Цель

Гибрид **вариант C**: канон (`intent/`, `charter/`, `architecture/main.bvc`) живёт **в репозитории проекта**; одна **консоль-хост** монтирует N корней и переключается между ними без N UI на N портах.

## Источник

- [AN-40](../work/analytics/work-graph-project-deployment-model.md)
- Эпик: `epic-work-graph-multiproject-host`

## Треки

| # | work.id | Суть |
|---|---------|------|
| A | `decide-work-graph-multiproject-deployment-model` | ADR: вариант C, анти-цели |
| B | `implement-workspace-registry-multiproject` | `workspaceRegistry.mjs`, `~/.work-graph/workspaces.json` |
| C | `implement-backlog-ui-reporoot-multiproject` | `WG_PROJECT_ROOT`, порт из конфига, без неявного cwd |
| D | `implement-architecture-snapshot-reporoot-aware` | `buildArchitectureSnapshot({ repoRoot })` |
| E | `implement-work-graph-cli-multiproject` | CLI `init` / `register` / `ui` |
| F | `implement-ui-project-switcher-multiproject` | шапка UI + Cmd+K `project:` |
| G | `docs-runbook-deploy-work-graph-on-project` | runbook для оператора |
| H | `tests-work-graph-multiproject-host` | тесты реестра и переключения |
| I | `write-an40-closing-work-graph-multiproject-host` | closing AN-40 |

## Критерий завершения

- Два корня проектов зарегистрированы; переключение в UI без перезапуска сервера
- `npm test` green; runbook опубликован
- AN-40 closing + journal

---

## AN-77: Host workspace и write-boundary (расширение v1)

**Work item:** `design-workgraph-host-workspace-switcher-v1`  
**Контекст:** [AN-77](../work/analytics/workgraph-agent-mcp-bypass-install-boundary-incident.md), [ADR write-boundary](./adr-workgraph-canon-write-boundary-v1.md)

### Проблема self-hosted режима

Когда Cursor открыт в репозитории **Work Graph engine** (`src/`, `packages/`, `intent/` в одном дереве), агент видит канon как соседние файлы с кодом движка. Это **high-risk mode** — write-boundary (MCP + lint) обязателен, но UX всё равно провоцирует bypass.

### Рекомендуемая модель (host separation)

```text
┌─────────────────────────────────────┐
│  WG Host process (UI :4177, MCP)    │
│  hostRoot = engine install OR       │
│             dedicated host folder   │
│  ~/.work-graph/workspaces.json      │
└──────────────┬──────────────────────┘
               │ active repoRoot
       ┌───────┴────────┐
       ▼                ▼
  project-a/      work-graph-engine/
  intent/...      intent/...  ← WG dogfood canon
  src/...         src/packages/...
```

**Роли:**

| Роль | Путь | Cursor workspace |
|------|------|------------------|
| **Engine host** | npm package / clone для UI process | опционально отдельное окно |
| **Managed project** | git repo с канon | основная разработка |
| **WG self-dogfood** | engine repo как *один из* registered projects | только для WG runtime work |

### Registry contract (уже реализовано — AN-40)

Файл `~/.work-graph/workspaces.json`, schema `workspaces.v1`:

```json
{
  "schema": "workspaces.v1",
  "activeProjectId": "my-app",
  "workspaces": [
    { "id": "my-app", "root": "D:/projects/my-app", "label": "My App", "lastOpenedAt": "..." },
    { "id": "work-graph", "root": "D:/Work/IDE/work graph", "label": "Work Graph", "lastOpenedAt": "..." }
  ]
}
```

Реализация: `src/workspaceRegistry.mjs`, `src/workGraphProjectHost.mjs`.

### Active repoRoot contract (UI + MCP must align)

| Surface | Как задаётся `repoRoot` | Запрет |
|---------|-------------------------|--------|
| **UI server** | `resolveWorkGraphRequestContext(hostState, url).repoRoot` | не `process.cwd()` |
| **UI switcher** | `POST /api/workspace/switch` → обновляет `activeProjectId` | — |
| **MCP per-project** | `.cursor/mcp.json` env `WORKGRAPH_ROOT=${workspaceFolder}` | один project per IDE window |
| **MCP host mode** | env `WG_PROJECT_ROOT` synced с active registry entry | требует host MCP wrapper или manual switch |

**Invariant:** все read/write MCP handlers используют `resolveWorkGraphRoot()` → absolute `repoRoot`; canon paths — через future `resolveCanonPaths` ([plan canon layout](./plan-workgraph-canon-folder-layout-v1.md)).

### UI project switcher (target UX)

1. Header chip: `{label} · {branch?} · {path}`  
2. Dropdown: список `workspaces.json` + «Add project…»  
3. Switch → `/api/workspace/switch` → все API (`/api/backlog`, graph, analytics) перечитывают `repoRoot`  
4. Cmd+K: `project: <name>` (track `implement-ui-project-switcher-multiproject`)

### Self-hosted WG repo: operator playbook

1. **Предпочтительно:** открыть Cursor в **managed project**; WG UI на host с switcher.  
2. **Dogfood WG backlog:** зарегистрировать engine repo в registry; переключаться явно — не смешивать с feature work другого проекта в одной сессии без switch.  
3. **Always:** work items только через MCP; см. Cursor rules `agent-workgraph-single-backlog.mdc`.  
4. **CI:** `lint:canon-write-boundary` на изменённые `*.work.bvc`.

### MCP alignment gaps (implementation backlog)

| Gap | Proposal |
|-----|----------|
| MCP не знает про UI switch | Host launcher sets `WG_PROJECT_ROOT` on switch, or MCP resource `workgraph://workspace/active` |
| Per-project MCP vs host | Per-project: default (`WORKGRAPH_ROOT=workspaceFolder`). Host: document `work-graph ui` + env sync |
| Engine repo in same window | Mark high-risk in rules; recommend split windows |

### Proposed work items (draft)

| work.id | Суть | Depends |
|---------|------|---------|
| `wire-mcp-active-workspace-resource-v1` | MCP read active repoRoot from registry | host initialized |
| `document-self-hosted-high-risk-runbook-v1` | Runbook section in golden-path / deploy docs | this plan |
| `implement-ui-project-switcher-multiproject` | уже в AN-40 track F | — |

### Критерий готовности design (AN-77 section)

- [x] Registry + active repoRoot описаны
- [x] UI switcher не полагается на cwd
- [x] MCP/UI project root contract зафиксирован
- [x] Self-hosted high-risk mode + host separation recommendation

## См. также

- [Plan canon folder layout](./plan-workgraph-canon-folder-layout-v1.md)
- [ADR multiproject host](./adr-work-graph-multiproject-host.md)
