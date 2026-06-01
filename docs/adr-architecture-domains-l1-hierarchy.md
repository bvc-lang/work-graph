# ADR: Иерархия прикладных доменов на L1 architecture map

**Статус:** superseded → [adr-architecture-domains-variant-a.md](./adr-architecture-domains-variant-a.md) (variant A)  
**Дата:** 2026-06-01  
**Источник:** [AN-39](../work/analytics/architecture-domains-l1-hierarchy.md)  
**Эпик:** `epic-architecture-domains-l1-hierarchy`

## Контекст

Intent tree уже multi-domain (`intent/domains/onebase`, `intent/domains/marketplace`), write policy знает `domain-onebase` и `domain-marketplace`, но L1-карта показывала только peer-блок `domain-onebase`. Задачи Marketplace классificировались в `derived-projections`.

## Решение

**Вариант B+** (из AN-39):

1. Сохранить отдельные L1-блоки `domain-*` (не один hub «Домены»).
2. Поле **`architecture.group: domains`** на прикладных domain-блоках.
3. Новый L1 **`domain-marketplace`** симметрично `domain-onebase`.
4. UI Architecture list: секция **«Домены»** и подпись строк **«Домены › {title}»**.
5. `classifyWorkItemBlock`: `domain-marketplace` department / `intent/domains/marketplace` → блок `domain-marketplace`.

## Отклонённые альтернативы

| Вариант | Причина отклонения |
|---------|-------------------|
| A — один L1 hub + L2 per domain | Breaking rename `domain-onebase`, лишний drill-down для OneBase MVP |
| C — только UI | L1-карта и matrix остаются неверными для Marketplace |

## Последствия

- L1 block count: 7 → **8**; edges: 8 → **9** (`domain-marketplace -> work-graph : maps_to`).
- Digest `architecture/main.bvc` меняется; `architecture:l1-check` обновляется.
- Charter MVP (OneBase vertical) **не меняется** — architecture map описывает структуру, не приоритет roadmap.

## Проверка

- `npm run architecture:l1-check`
- `npm test` — classify, canon loader, views projection
- Marketplace work item с `work.department: domain-marketplace` на блоке `domain-marketplace` в snapshot
