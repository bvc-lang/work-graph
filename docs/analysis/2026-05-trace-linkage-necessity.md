# Analysis: необходимость полной связи `.bvc` ↔ код (ioHasC parity)

**Type:** explanation (Diátaxis) — pre-decision analysis  
**Date:** 2026-05-30  
**Outcome:** [ADR-0001: trace linkage scope](../decisions/0001-trace-linkage-scope.md) (`accepted`, level 0)

## Контекст вопроса

В ioHasC связь step и кода замыкалась несколькими механизмами: `trace-links.v1.json`, unified linkage из passport/generation, `@iohasc-tur` / TUR scanner, `npm run iohasc -- generate`, code-gap в CI. В Work Graph rebuild есть protocol Trace Links v1, validator, code-gap MVP, unified linkage projection — но нет полного codegen loop и mandatory trace-graph CI.

Вопрос: **нужно ли доводить parity до ioHasC**, или текущего контура достаточно для headless intent backend + operator dashboard?

## Задачи, которые «связь step↔code» решает

| Задача | Нужна full graph? |
|--------|-------------------|
| Навигация оператора / агента к файлам | Частично — `work.target_files` + MCP scope |
| Accountability (done = изменения в X) | Evidence + tests + `trace.status` |
| Рефакторинг по guid/TUR на сотнях link-mode blocks | Да — codegen/TUR pipeline |
| Детерминированный codegen без LLM | Да — `generate` / Vector DSL port |
| Compliance / audit atom→artifact | Да — плотные trace refs + CI validate |

## Что уже закрыто без full trace-graph

- Work Graph execution: claim, evidence, transitions, verification matrix
- Bounded worker read по `target_files`
- `parseTraceLinksV1`, reverse markers, linkage drilldown (MVP)
- Code-gap analyzer + operator panel (optional signal)
- OneBase static verify / worker tools (artifact-level)
- Cursor как IDE — semantic index репозитория для агента

## Риски полного port

1. **Три параллельных указателя на код** (`target_files`, trace labels, markers) без политики canonical → drift.
2. **Стоимость сопровождения** при каждом rename/move.
3. **Compiler roundtrip** в rebuild — стабильность формата `.bvc`, не генерация TS (иллюзия parity).
4. **Противоречие headless ADR** — full canvas + mandatory GBC trace slices не цель rebuild.

## Уровни зрелости (предложение)

| Level | Содержание | Mandatory CI? |
|-------|------------|---------------|
| **0** | Protocol + validator + target_files-first; code-gap optional | Нет |
| **1** | Authoring policy: code-facing items → `trace.source_step` или `trace.code_refs`; lint warnings | Warnings |
| **2** | Port generate / link-mode codegen; code-gap in release matrix | Partial |
| **3** | trace-links JSON + CI validate как ioHasC | Да |

## Вывод анализа

Для текущего Work Graph (MCP-first, backlog execution track закрыт, Cursor = editor) **level 0 достаточен**; investment в level 2–3 оправдан только при явном продуктовом решении «codegen-first» или regulated audit trail на уровне atom→symbol.

Полный текст решения и won't do — в [ADR-0001](../decisions/0001-trace-linkage-scope.md).
