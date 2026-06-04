# AN-70: Work Graph vs GitHub Spec Kit

**Запрос:** сравни WG c Spec Kit от GitHub, разбор сохрани.

**Дата:** 2026-06-04. Источники:
- [Fulcrum Labs — Spec Kit от GitHub](https://fulcrumlabs.ru/blog/spec-kit-ot-github-kak-prevratit-haotichnuyu-rabotu-s-ai-v-strukturirovannuyu-razrabotku/) (03.10.2025)
- [github/spec-kit](https://github.com/github/spec-kit)
- [Spec Kit Quickstart](https://github.github.io/spec-kit/quickstart.html)
- WG: [AN-44](competitor-analysis-vs-work-graph.md), [AN-7](product-self-audit-user.md)

---

## Краткий вывод

**Spec Kit** — методология и **стартер-кит** для *одной фичи*: constitution → spec → plan → tasks → implement через slash-команды агента. Решает проблему «размытого промпта» на этапе **запуска работы**.

**Work Graph** — **операционная система учёта** для *всего продукта*: backlog в git, pipeline стадий, evidence, verification gates, MCP для агентов, operator UI. Решает проблему «работа агента растворилась в чате» на этапе **жизненного цикла задачи**.

Инструменты **не конкурируют напрямую**: Spec Kit — *как начать фичу правильно*; WG — *как хранить, проверять и закрывать обязательства* после (и вместо) чата.

---

## Что это за продукты

| | **GitHub Spec Kit** | **Work Graph (WG)** |
|---|---------------------|-------------------|
| **Суть** | Open-source SDD (Spec-Driven Development) toolkit | Local evidence ledger + backlog OS для AI-assisted dev |
| **Форма** | Python CLI (`specify-cli`) + шаблоны `.specify/` + agent skills / slash-команды | npm-пакеты, BVC-файлы в репо, MCP-сервер, локальный UI |
| **Source of truth** | Markdown в `.specify/specs/<feature>/` | `.work.bvc`, `intent/`, `work/analytics/`, evidence в атомах |
| **Primary user** | Разработчик + AI-агент в IDE (Cursor, Copilot, Claude Code…) | Оператор (человек) + агент через MCP |
| **Лицензия / хостинг** | MIT, без SaaS | Local-first, git-friendly, без обязательного облака |

---

## Процесс: пошаговое сопоставление

### Spec Kit

```
/speckit.constitution → /speckit.specify → /speckit.clarify → /speckit.plan
→ /speckit.tasks → /speckit.analyze → /speckit.implement
```

Артефакты на **ветку фичи**:

```
.specify/
├── memory/constitution.md
├── specs/001-feature/
│   ├── spec.md, plan.md, tasks.md
│   ├── data-model.md, contracts/, research.md, quickstart.md
└── templates/, scripts/
```

### Work Graph

```
Analytics (AN-XX) → Epic → Subtasks → Backlog → Kanban → Verify → Done → Memory / Closing
```

Артефакты **на весь продукт**:

```
intent/domains/*/work/*.work.bvc
work/analytics/AN-*.md
docs/adr-*.md, docs/plan-*.md
architecture/main.bvc
protocols/*.bvc
```

### Таблица этапов

| Этап Spec Kit | Аналог в WG | Сходство | Различие |
|---------------|-------------|----------|----------|
| **Constitution** | Cursor rules, `architecture/main.bvc`, ADR, `protocols/` | Правила до кода | WG: нет одной `/constitution` из коробки |
| **Specify** | `AN-*.md`, BVC goal, Intent Composer | Что и зачем | WG: analytics + BVC, не `spec.md` на ветке |
| **Clarify** | **Анализ:** (6 разделов), `analyze_work_item` | Снятие неопределённости | WG: verdict useful/harmful/defer |
| **Plan** | `docs/plan-*`, ADR, architecture snapshot | Технический «как» | Spec Kit: data-model + OpenAPI в папке фичи |
| **Analyze** | `backlogSchemaLint`, verification matrix, drift MCP | Согласованность | WG: machine-checkable evidence gates |
| **Tasks** | `.work.bvc`, `depends_on`, epic hierarchy | Декомпозиция | WG: persistent backlog, не только `tasks.md` |
| **Implement** | Agent Run, `claim_work_item`, evidence | Агент по задачам | WG: done только с evidence |

---

## Где сильнее Spec Kit

1. Greenfield — spec/plan/tasks на git-ветке за 30–60 минут.
2. Slash-команды из коробки (`specify init --ai cursor`).
3. Clarify как обязательный ритуал до plan.
4. Параллельные планы (Node vs Go) для одной spec.
5. Один `constitution.md` для compliance.

## Где сильнее Work Graph

1. Persistent backlog — kanban, archive, epic roadmap.
2. Evidence ledger — `done` без свидетельств не проходит.
3. Decision pipeline — analyzed → decided → ready.
4. Intent tree + architecture + MCP semantic/information planes.
5. Analytics → epic → closing loop (product memory).
6. `npx @work-graph/cli init` per repo.

## Пересечение (риск двух правд)

| Область | Риск |
|---------|------|
| Задачи | `tasks.md` vs `.work.bvc` |
| Правила | `constitution.md` vs `.cursor/rules` |
| План | `plan.md` на фичу vs `docs/plan-*` |

**Практика:** Spec Kit только на bootstrap фичи → импорт tasks в WG; дальше одна правда в BVC.

---

## Позиционирование

| | |
|---|---|
| **Spec Kit** | «Идея → исполняемая spec и plan до первой строки кода» |
| **Work Graph** | «Обязательства, доказательства и статус работы агента рядом с кодом» |

Spec Kit — **SDD workflow kit**. WG — **операционный backend** после intake. Дополняет [AN-44](competitor-analysis-vs-work-graph.md) (Cursor/Devin/Linear), а не заменяет его.

---

## Сценарии выбора

| Сценарий | Spec Kit | WG | Комбо |
|----------|----------|-----|-------|
| Pet-project за день | ✅ | опционально | Spec Kit → `init` WG |
| Фича в WG-репо | опционально | ✅ | AN + epic; Spec Kit для clarify/plan |
| Долгий продукт | слабо | ✅ | — |
| Legacy reverse-spec | ✅ | ✅ | spec → promote work items |

---

## Интеграция

```mermaid
flowchart LR
  SK[Spec Kit: specify + clarify + plan] --> EXP[tasks.md → draft BVC]
  EXP --> WG[promote + kanban]
  WG --> AG[MCP claim + evidence]
  AG --> VG[verify + closing AN]
```

---

## Итоговая матрица

| Критерий | Spec Kit | WG |
|----------|:--------:|:--:|
| SDD methodology | ●●● | ● |
| Persistent backlog | ○ | ●●● |
| Evidence / verification | ○ | ●●● |
| Agent MCP contract | ○ | ●●● |
| Greenfield speed | ●●● | ● |
| Product memory / closing | ○ | ●●● |

---

## Рекомендация для WG

1. Не позиционировать WG как «Spec Kit clone» — другой слой.
2. Добавить Spec Kit на `/compare` публичного сайта.
3. Опционально: importer `tasks.md` → draft BVC (backlog item).

---

## Связанные документы

- [AN-44: конкуренты vs WG](competitor-analysis-vs-work-graph.md)
- [decision-pipeline-canon](../../docs/decision-pipeline-canon.md)
- [workgraph-mcp-client-strategy](../../docs/workgraph-mcp-client-strategy.md)
