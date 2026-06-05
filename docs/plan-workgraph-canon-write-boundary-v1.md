# Plan: Work Graph canon write-boundary v1 (AN-77 rollup)

**Статус:** эпик закрыт — enforcement + canon layout implementation  
**Дата закрытия:** 2026-06-05  
**Analytics:** [AN-77](../work/analytics/workgraph-agent-mcp-bypass-install-boundary-incident.md)  
**ADR:** [adr-workgraph-canon-write-boundary-v1.md](./adr-workgraph-canon-write-boundary-v1.md)  
**Эпик:** `epic-workgraph-canon-write-boundary-v1`

## Цель эпика

Агент не может незаметно обойти MCP при создании/изменении work items: enforced write path, audit marker, lint, rules, MCP DX, regression tests; canon layout `.work-graph/canon` с resolver/init/migration; multiproject MCP resource для active workspace.

## Итог

| Фаза | Subtasks | Статус |
|------|----------|--------|
| Write-boundary enforcement | 9 | done |
| Canon layout implementation | 5 | done |
| **Всего subtasks** | **14** | **done** |

---

## Phase 1 — Write-boundary enforcement (delivered)

| work.id | Результат |
|---------|-----------|
| `decide-workgraph-canon-write-boundary-adr` | [ADR write-boundary](./adr-workgraph-canon-write-boundary-v1.md) |
| `fix-create-work-item-parent-kind-schema` | MCP `parentId` / `itemKind`; `scripts/migrate-an77-epic-hierarchy.mjs` |
| `implement-workgraph-write-audit-marker` | `src/workGraphWriteAudit.mjs`; labels `work.updated_by`, `work.write.*` на MCP writes |
| `lint-direct-canon-file-edits` | `npm run lint:canon-write-boundary`; `src/canonWriteBoundaryLint.mjs` |
| `document-cursor-canon-readonly-policy` | Cursor rules, [workgraph-mcp-clients.md](./workgraph-mcp-clients.md), `sync:cursor-rules` |
| `improve-workgraph-mcp-write-convenience` | Prompts `create_work_item_from_analytics`, `create_epic_subtasks` |
| `add-bypass-incident-regression-tests` | `fixtures/bypass-an77/`, `tests/bypassAn77Regression.test.mjs` |
| `design-workgraph-canon-folder-layout-v1` | [plan-workgraph-canon-folder-layout-v1.md](./plan-workgraph-canon-folder-layout-v1.md) |
| `design-workgraph-host-workspace-switcher-v1` | [plan-work-graph-multiproject-host.md](./plan-work-graph-multiproject-host.md) § AN-77 |

### Enforcement stack (as-built)

```text
Layer 1: Cursor rules (read-only canon, MCP-only writes)
Layer 2: MCP prompts + parentId/itemKind + audit marker on writes
Layer 3: CI lint:canon-write-boundary (git diff on *.work.bvc)
Layer 4: Regression tests (AN-77 bypass fixtures)
```

---

## Phase 2 — Canon layout implementation (delivered)

| work.id | Результат |
|---------|-----------|
| `implement-canon-paths-resolver-v1` | `src/canonPaths.mjs`; `resolveCanonPaths` + wiring `readWorkItemsFromRepo`, MCP handlers |
| `extend-init-dot-canon-layout-v1` | `work-graph init --canon-layout dot-canon`; config v3; stubs под `.work-graph/canon/` |
| `wire-mcp-active-workspace-resource-v1` | `src/activeWorkspaceProjection.mjs`; MCP resource `workgraph://workspace/active` |
| `migrate-project-root-intent-to-dot-canon-v1` | `src/canonLayoutMigration.mjs`; `scripts/migrate-root-intent-to-dot-canon.mjs` |
| `tests-canon-layout-dual-mode-v1` | `tests/canonLayoutDualMode.test.mjs` + fixtures |

### Canon layout (as-built)

```text
root-intent (default, v2 config):
  repoRoot/intent/index.bvc

dot-canon (opt-in init or migration, v3 config):
  repoRoot/.work-graph/canon/intent/index.bvc
  canonLayout: dot-canon in .work-graph/config.json
```

**Ключевые модули:** `canonPaths.mjs`, `canonLayoutMigration.mjs`, `activeWorkspaceProjection.mjs`, `workGraphProjectInit.mjs` (init v3).

**Migration (controlled):**

```bash
node scripts/migrate-root-intent-to-dot-canon.mjs --dry-run .
node scripts/migrate-root-intent-to-dot-canon.mjs .
# evidence: .work-graph/migration/root-intent-to-dot-canon.v1.json
```

---

## Verification (rollup)

```bash
npm run lint:canon-write-boundary
node --test tests/bypassAn77Regression.test.mjs tests/workGraphWriteAudit.test.mjs tests/canonWriteBoundaryLint.test.mjs
node --test tests/canonPaths.test.mjs tests/canonLayoutMigration.test.mjs tests/canonLayoutDualMode.test.mjs tests/activeWorkspaceProjection.test.mjs
node --test tests/workgraph-mcp.test.mjs tests/workgraph-mcp-contract.test.mjs
npm run sync:cursor-rules
```

---

## Out of scope / follow-up (not blocking epic)

| Draft work.id | Источник |
|---------------|----------|
| `document-self-hosted-high-risk-runbook-v1` | multiproject host AN-77 — runbook для dogfood WG repo |
| `implement-ui-project-switcher-multiproject` | AN-40 track F — UI switcher (design уже в host plan) |

---

## Критерии эпика (checklist)

- [x] ADR write-boundary
- [x] Audit marker на MCP writes
- [x] Lint против direct canon edits
- [x] Cursor/project rules
- [x] MCP DX (prompts, schema)
- [x] Regression tests AN-77
- [x] Design: `.work-graph/canon` layout
- [x] Design: host workspace / switcher
- [x] **Implementation:** `resolveCanonPaths` + read wiring
- [x] **Implementation:** init dot-canon + migration tool
- [x] **Implementation:** MCP `workgraph://workspace/active`
- [x] **Implementation:** dual-mode regression tests
