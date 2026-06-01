# ADR: стратегия публикации Work Graph — лицензии и open core

**Статус:** принято  
**Дата:** 2026-06-01  
**Эпик:** `epic-work-graph-open-publication`  
**Источник:** [AN-42](../work/analytics/open-publication-technology-holdback-strategy.md)

## Контекст

Work Graph готовится к публичному релизу. В эпоху LLM защита через секретность алгоритмов не работает. Рост строится на открытых форматах, reference implementations, trademark/conformance и коммерческих vertical packs.

## Решение

### Open core

| Слой | Роль | Spec | Code |
|------|------|------|------|
| **BVC** | универсальный human-readable формат | CC BY 4.0 | Apache-2.0 |
| **IR/RichIR** | машинный workflow/reasoning IR | CC BY 4.0 | Apache-2.0 |
| **PVRG** | машинный project graph | CC BY 4.0 | Apache-2.0 |
| **Bracket IR trace** | hash/drift envelope | CC BY 4.0 | Apache-2.0 |
| **Work Graph core** | UI, MCP, CLI, runtime | — | **Apache-2.0** |
| **Domain/enterprise packs** | OneBase/1С, eval, hosted | proprietary | commercial / source-available |

### Apache-2.0 vs MPL-2.0 для core

**Выбор: Apache-2.0** для Work Graph core и reference implementations.

- permissive adoption для компаний;
- explicit patent grant;
- proprietary plugins и commercial packs допустимы рядом без file-level copyleft.

MPL-2.0 отклонён для первого public release: выше friction у юристов без критичной выгоды на текущем этапе.

### Что не делаем

- BUSL / source-available **не** для форматов BVC/IR/PVRG — убьёт adoption.
- Не прячем spec BVC — формат не станет стандартом.
- Bracket IR full compiler — **defer** / experimental; в core только trace envelope.

### Commercial boundary

См. [publication-inventory-an42.md](publication-inventory-an42.md):

- **Public:** `packages/bvc-*`, `packages/ir-spec`, `packages/pvrg-spec`, `packages/work-graph-cli`, core `src/` runtime
- **Private:** eval corpus, customer fixtures, operator playbooks с PII
- **Experimental:** `experimental/`, Genesis/GVM, full Bracket IR compiler

### Trademark & conformance

См. [trademark-conformance-policy.md](trademark-conformance-policy.md). Имена `BVC`, `Work Graph`, `PVRG` — brand; «BVC-compatible» только по conformance suite.

### Patents

См. [patent-defensive-publication-decision-an42.md](../work/analytics/patent-defensive-publication-decision-an42.md): defensive publication через dated specs + Apache-2.0; отдельный patent filing — по решению с патентным специалистом до wide release.

## Последствия

- Root `LICENSE` — Apache-2.0
- `@bvc-lang/spec` — code Apache-2.0, spec text CC BY 4.0 (`LICENSE-SPEC`)
- `@bvc-lang/cli` — Apache-2.0 (aligned with ADR)
- CI guard: private paths не попадают в npm pack
- Inventory обязателен перед любым `npm publish` из monorepo

## См. также

- [plan-work-graph-open-publication.md](plan-work-graph-open-publication.md)
- [AN-8](../work/analytics/step-as-open-canon-standard.md), [AN-9](../work/analytics/ir-rich-ir-open-canon.md), [AN-10](../work/analytics/pvrg-verified-reference-graph.md)
