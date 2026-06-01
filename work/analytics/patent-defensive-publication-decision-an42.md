# Patent & defensive publication decision (AN-42)

**Дата:** 2026-06-01  
**Эпик:** `epic-work-graph-open-publication`  
**Статус:** решение зафиксировано (не юридическая консультация)

## Контекст

BVC, IR/RichIR, PVRG и Work Graph graph-ranking — потенциально патентоспособные механизмы. Перед wide public release нужна явная стратегия.

## Решение

### Primary path: defensive publication + open licenses

1. **Dated public specs** (CC BY 4.0) для BVC, IR, PVRG с авторами и версией схемы.
2. **Apache-2.0** на reference code — contributor patent grant для adopters.
3. **Trademark** на `BVC`, `Work Graph`, `PVRG` — защита бренда, не идеи.

Defensive publication мешает третьим лицам запатентовать тот же подход после даты публикации spec.

### Patent filing

**Отложено** до консультации с патентным специалистом. Триггеры для review:

- внешний инвестор или enterprise deal требует IP portfolio;
- конкурент публикует близкий claim до нашего wide release;
- новый механизм с высокой commercial exclusivity (не формат, а конкретный verified runtime).

### Не патентуем как primary moat

- Prompts и ranking heuristics (быстро копируются)
- UI layout patterns
- Eval corpus contents

### Action items выполнены в эпике

- [x] ADR open publication
- [x] Draft specs dated 2026-06-01 in `packages/*-spec/`
- [x] Apache-2.0 root LICENSE
- [ ] Patent attorney review — **optional**, when business triggers above

## См. также

- [AN-42](open-publication-technology-holdback-strategy.md)
- [adr-work-graph-open-publication.md](../docs/adr-work-graph-open-publication.md)
