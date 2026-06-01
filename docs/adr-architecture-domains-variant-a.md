# ADR: Variant A — L1 «Дomены» hub

**Статус:** принято (2026-06-01)  
**Supersedes:** [adr-architecture-domains-l1-hierarchy.md](./adr-architecture-domains-l1-hierarchy.md) (variant B+)

## Решение

1. L1-блок **`domains`** («Домены») на architecture map.
2. L2-контейнеры **`onebase-domain`** (OneBase) и **`marketplace-domain`** (Marketplace).
3. Work items: department `domain-onebase` / `domain-marketplace` без изменений; **`classifyWorkItemBlock` → `domains`**.
4. Edges: `domains -> work-graph : maps_to`; `agent-runtime -> domains : uses`.

## Последствия

- L1 blocks: 8 → **7**; edges: 9 → **8**.
- ID `domain-onebase` / `domain-marketplace` **сняты с L1** (не breaking для work items — только architecture block id).
