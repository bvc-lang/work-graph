# Closing: epic-work-graph-bvc-contract-verification-v1

Эпик: `epic-work-graph-bvc-contract-verification-v1`  
Источник: [AN-50.1](work-graph-bvc-contract-verification.md)  
Закрыт: 2026-06-02

## Что сработало

- **ADR accepted:** [docs/adr-work-item-contract-projection-v1.md](../../docs/adr-work-item-contract-projection-v1.md) — projection-слой, не дублирование YAML.
- **Projection:** `src/workItemContractProjection.mjs` — tier A/B/C из `VERIFICATION_MATRIX`, primary row по порядку матрицы.
- **Readiness:** `src/workItemReadyForDone.mjs` — shared evaluate для `assert_task_ready_for_done` и `complete_work_item`.
- **MCP P0:** `get_work_contract`, `assert_task_ready_for_done`, `validate_evidence`, resource `workgraph://contract/{workId}`.
- **UI:** блок «Контракт gate-задач» в verification panel (`verificationLoop.mjs` contractSummaries).
- **P1 schema:** `packages/bvc-spec/schemas/bvc-atom-draft.v1.json` — optional `structuredEvidence[]` + `$defs/evidenceRecordV1`.
- **P1 runtime:** `src/structuredEvidenceV1.mjs` + strict Tier A validation в `add_work_item_evidence` (MCP).
- **P1 lint:** `stepAtomFormatter.mjs`, `backlogSchemaLint.mjs` — shape check при наличии structured evidence.
- **P2 design:** [docs/design-sdk-contract-wrapper-v1.md](../../docs/design-sdk-contract-wrapper-v1.md) — MCP-first SDK sketch, implementation deferred.

## MCP tools (contract surface)

| Tool | Returns |
|------|---------|
| `get_work_contract` | `work-item-contract.v1` |
| `validate_evidence` | `{ ok, violations[] }` |
| `assert_task_ready_for_done` | `{ ok, violations[], suggestedCommands[] }` |
| `add_work_item_evidence` | prose and/or `structuredEvidence`; Tier A gate rejects weak prose |
| `complete_work_item` | `{ ok, violations[] }` on failure (no throw) |

## Tests

- `tests/workItemContractProjection.test.mjs`
- `tests/workgraph-mcp-contract.test.mjs`
- `tests/structuredEvidenceV1.test.mjs`
- `tests/verificationLoop.test.mjs`
- `npm run test:deterministic` — green

## Что не сработало / осталось

- `@work-graph/contract-layer` npm package — только design doc (P2 defer).
- Tier A structured evidence **required at runtime**, но atom-draft field остаётся **optional** (dual view prose + JSON line in «Свидетельства»).
- SDK `runAllowedCheck` auto-runner — не реализован; агент запускает команды локально.

## Уроки

1. Projection из существующих BVC-полей + matrix — меньше drift, чем отдельный `contract:` YAML.
2. `complete_work_item` и `add_work_item_evidence` должны делить один evaluate-path — иначе gate обходится на append.
3. Primary matrix row — по **индексу в матрице**, не по алфавиту row id.

## feeds_epics

- epic-work-graph-bvc-contract-verification-v1
