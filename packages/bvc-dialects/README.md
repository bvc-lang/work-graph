# BVC dialect registry (pilot)

JSON-каталог локализованных ключей BVC-атома. Канон: [ADR `docs/adr-bvc-multilingual-keys.md`](../../docs/adr-bvc-multilingual-keys.md), [AN-19](../../work/analytics/bvc-multilingual-keys-design.md).

Публичная цель — репозиторий `bvc-lang/dialects`. Здесь pilot для Work Graph / `@bvc/parser`.

Контракт:

- `bvc` — обязательные ключи (Basis/Vector/Goal/Labels).
- `optional` — расширенные секции work item (Checks, Analysis, …).
- Profile и label keys (`work.id`, `trace.status`) **не** входят в dialect.

Добавление dialect — PR с уникальными localized strings без коллизий с EN и другими dialect.
