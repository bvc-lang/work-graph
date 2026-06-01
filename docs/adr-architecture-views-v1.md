# ADR: Architecture views v1

## Статус

Accepted — epic `epic-architecture-views-v1` (AN-34).

## Контекст

Work Graph показывает architecture blocks, workflow и lineage через разные поверхности. AN-1 зафиксировал проблемы full-canvas layout; AN-34 сравнил list / tree / diagram с индустрией (C4, Backstage, Structurizr).

## Решение

**Multi-view**, не один канонический вид:

| Profile | Назначение | Primary surface |
|---------|------------|-----------------|
| **List** | Операции, scan, filter, jump | Architecture blocks list-rows; workflow backlog |
| **Tree** | Composition / parent hierarchy | Workflow tree mode (`work.parent_id`); не для `depends_on` |
| **Pipeline** | Lineage, execution order | Architecture graph default (LR pipeline profile) |
| **Full** | Power-user обзор всех L1 blocks | Architecture graph toggle «Full» |
| **Export** | Docs / PR / ADR | CLI `architecture-export --format mermaid` |

Drawer L2 остаётся для глубины (containers, tasks, l2Graph).

## Anti-patterns

- Заменять все списки одной большой диаграммой.
- Mermaid в runtime product UI как основной canvas.
- Tree вместо graph для `depends_on` / execution order.
- Третий ручной layout-движок без reuse `graphCanvasLayout`.

## Последствия

- Backlog UI: вкладка **Архитектура** с subtabs List / Graph / Matrix.
- Graph default = **pipeline**; compact node cards в `architectureLayout.mjs`.
- Workflow: display mode **epic-groups** (default) | **flat** | **tree**.
- Static export — только CLI/markdown, не interactive canvas.

## Связи

- AN-34, AN-1, AN-4, AN-5, AN-20
- `docs/plan-architecture-views-v1.md`
