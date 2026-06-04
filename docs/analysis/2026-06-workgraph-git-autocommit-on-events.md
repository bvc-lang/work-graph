# Analysis: автокоммиты Git на событиях WG

**Type:** explanation (Diátaxis) — pre-epic  
**Date:** 2026-06-04  
**Outcome:** [AN-71](../work/analytics/work-graph-git-autocommit-on-events.md) (`разбор`)

## Вопрос

Можно ли встроить автоматические git-коммиты при завершении задачи, создании анализа и т.п.?

## Вывод

Да, как **opt-in слой** после persist (BVC + analytics jsonl). Сейчас WG только пишет файлы; `git commit` не вызывается. MVP: scoped stage, commit на `done` / `analytics.created`, без auto-push, SHA опционально в evidence.

Полный разбор — [AN-71](../work/analytics/work-graph-git-autocommit-on-events.md).
