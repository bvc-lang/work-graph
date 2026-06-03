# Plan: epic-work-graph-bvc-contract-verification-v1 (AN-50.1)

## Цель

Сдвинуть «Проверки» с audit-view логов на **контракт исполнения**: projection из существующих полей BVC + MCP gates + structured evidence (миграция).

## Источник

[AN-50.1](../work/analytics/work-graph-bvc-contract-verification.md) · родитель [AN-50](../work/analytics/verification-panel-tests-evidence-intent.md)

## ADR

[adr-work-item-contract-projection-v1.md](adr-work-item-contract-projection-v1.md) (accepted) — subtask `decide-work-item-contract-projection-adr`

**Ключевые решения ADR:**
- `src/workItemContractProjection.mjs` — pure projection
- `src/workItemReadyForDone.mjs` — shared `evaluateWorkItemReadyForDone()` для assert и complete
- tier из `gateTaskIds`, A > B > C; non-gate → `tier: null`
- assert recommended, complete enforces; violations[] schema `work-item-ready-for-done.v1`
- Contract Health metrics — P1

## Треки

| # | work.id | Приоритет | Суть |
|---|---------|-----------|------|
| A | `decide-work-item-contract-projection-adr` | P0 | projection vs duplicate `contract:` YAML |
| B | `implement-work-item-contract-projection` | P0 | `work-item-contract.v1` builder |
| C | `implement-mcp-get-work-contract` | P0 | MCP tool + optional resource |
| D | `implement-mcp-assert-task-ready-for-done` | P0 | dry-run violations before `done` |
| E | `implement-mcp-validate-evidence` | P0 | evidence JSON vs task contract |
| F | `extend-bvc-schema-structured-evidence-fields` | P1 | optional evidence[] in atom-draft |
| G | `extend-runtime-structured-evidence-validation` | P1 | validate on add_work_item_evidence |
| H | `wire-verification-panel-contract-summary` | P1 | contract badge on «Проверки» |
| I | `design-sdk-contract-wrapper-v1` | P2 | design doc only |
| J | `write-closing-epic-work-graph-bvc-contract-verification-v1` | — | closing + journal |

## Критерий завершения (MVP = P0)

- `get_work_contract`, `validate_evidence`, `assert_task_ready_for_done` в `@work-graph/mcp` с тестами
- Projection собирается из существующих полей + `VERIFICATION_MATRIX` без обязательного `contract:` в атомах
- ADR принят; README MCP обновлён
- `eval:llm-usefulness` fixture для contract tools (optional P1)

## Seed

```bash
npm run seed:epic-work-graph-bvc-contract-verification-v1
```
