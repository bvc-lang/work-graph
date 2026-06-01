# Plan: Architecture views v1 (multi-view UX)

## Цель

Внедрить **multi-view** визуализацию архитектуры и иерархии в Work Graph: list-first + tree + pipeline graph + drawer; Full graph — power-user режим; static export для docs.

## Почему

AN-34: один вид (только canvas или только список) не покрывает операции, composition и lineage. Опыт AN-1 (layout mess) и индустрия (C4, Backstage) подтверждают list-first mission control с secondary diagram modes.

## Что делать

### Track A — Canon & profiles

1. ADR «Architecture views v1»: List / Tree / Pipeline / Full / Export — когда какой режим, anti-patterns.
2. Список architecture blocks (`list-rows`) как primary альтернатива canvas-only.

### Track B — Hierarchy & graph

3. Tree mode в workflow по `work.parent_id` (см. parent-subtask-hierarchy).
4. Pipeline graph default + compact canvas cards (хвост AN-1).
5. Matrix prototype: domain × layer × status heat.

### Track C — Export & quality

6. CLI `architecture-export --format mermaid` из snapshot.
7. Tests + AN-34 closing.

## Todo

- [x] `seed:epic-architecture-views-v1`
- [x] `adr-architecture-views-v1-profiles`
- [x] `architecture-blocks-list-view-tab`
- [x] `workflow-tree-mode-parent-id`
- [x] `graph-pipeline-default-compact-nodes`
- [x] `architecture-domain-layer-matrix-prototype`
- [x] `architecture-snapshot-mermaid-export-cli`
- [x] `tests-architecture-views-v1`
- [ ] `write-an34-closing-architecture-views-v1`

## Критерий завершения

- Вкладка Architecture: list + переключатель Tree/Pipeline; drawer для деталей блока.
- Workflow: tree mode по epic/parent; graph pipeline — default на Architecture.
- ADR и AN-34 closing опубликованы; tests green.
