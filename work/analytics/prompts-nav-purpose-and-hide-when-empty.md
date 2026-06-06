# AN-82: Вкладка «Промпты» — назначение, границы и скрытие в продуктовых репо

**Запрос:** для чего раздел «Промпты» в UI Work Graph — это история WG или нужен другим проектам; если да, зачем; сохранить разбор и создать задачу скрыть пункт, когда не нужен.

**Дата:** 2026-06-06

**Work item:** `hide-prompts-nav-when-empty`

---

## Краткий вывод

Вкладка **«Промпты»** — **не** история чатов и **не** MCP prompts Cursor (`take_next_work_item`, `create_work_item` и т.д.). Это **read-only просмотрщик** атомов `atom.profile: prompt_rule` из каталогов **`protocols/`** и **`rules/`** текущего репозитория.

Сейчас содержимое есть в основном в **репозитории WG-engine** (`rules/agent-behavior/*.bvc`). После `work-graph init` в продуктовый проект `rules/` и `protocols/` **не копируются** — вкладка **пустая**, но пункт меню всё равно виден. **Рекомендация:** скрывать nav «Промпты», когда в проекте нет ни одного `prompt_rule`.

---

## Что показывает UI «Промпты»

| Аспект | Деталь |
|--------|--------|
| Источник данных | `GET /api/prompt-rules-projection` |
| Сканирование | `protocols/`, `rules/` — все `.bvc` |
| Фильтр | `atom.profile: prompt_rule` |
| Отображение | Базис / Вектор / Цель, labels, validation status |
| Редактирование | MVP read-only; правка — позже через Atom Inspector |

Замена старой панели **prompt-step** из ioHasC (`protocols/prompt-step-lowcode-replacement-scope-v1.bvc`).

```text
Старый ioHasC prompt-step tab  →  Nav «Промпты» в operator dashboard (read-only)
```

---

## Чем «Промпты» НЕ являются

1. **MCP prompts** — живут в `packages/workgraph-mcp/src/prompts.mjs`, отдаются MCP-клиенту, в UI не показываются.
2. **История промптов из чатов** — не хранится и не отображается.
3. **Cursor user rules** — отдельный механизм (`.cursor/rules/`); starter-kit кладёт только `work-graph-project.mdc`.

---

## WG-engine vs продуктовые проекты

### WG-engine (репозиторий движка)

- `rules/agent-behavior/` — MCP guardrails, worker policy, parity с Cursor и др.
- Правила **используются в рантайме**: `agentBehaviorRulesBundle.mjs` → prompt slice воркера/MCP.
- Вкладка «Промпты» **осмысленна** — оператор видит канон поведения агента в репо.

### Продуктовый репо (Gripe, marketplace, …)

- `work-graph init` **не** копирует `rules/` и `protocols/`.
- Проекция `prompt-rules` возвращает **0 rules**.
- Вкладка пустая → пункт меню **шум**, без пользы.

### Когда вкладка нужна в продукте

Если команда ведёт **project-specific agent behavior canon** в `.bvc`:

- версионируемые правила рядом с `intent/` и `architecture/`;
- review / trace / evidence как у остального канона;
- UI — просмотр без открытия файлов.

Пока такого канона нет — вкладка не обязательна.

---

## Связь с другими слоями WG

| Слой | Связь с «Промптами» |
|------|---------------------|
| `agentBehaviorRulesBundle.mjs` | Читает те же `rules/agent-behavior` для runtime prompt slice |
| MCP tools | Независимы; workflow prompts не в UI |
| Verification / Code-gap | Отдельные панели; не дублируют prompt rules |
| Memory / Analytics | Другие проекции; «Промпты» — узкий prompt_rule canon |

---

## Рекомендуемое изменение (задача)

**Скрывать пункт «Промпты» в sidebar**, когда `prompt-rules-projection.summary.total === 0`:

1. При bootstrap / смене `repoRoot` — запросить projection (или lightweight HEAD с count).
2. Если rules > 0 — показать tab как сейчас.
3. Если 0 — `hidden` на nav tab + не регистрировать view в activeView switcher.
4. При появлении первого `prompt_rule` в репо — tab снова виден (после refresh / poll).
5. WG-engine с `rules/agent-behavior` — без изменений для оператора.

**Не делать в v1:** удалять API, feature flag в config, перенос rules в engine package.

---

## Критерии готовности задачи

- Nav «Промпты» скрыт в fixture-проекте без `rules/` и `protocols/`.
- Nav виден в WG-engine repo (или fixture с `prompt_rule`).
- Прямой URL / stale localStorage view не ломает UI (fallback на workflow или settings).
- `npm run test:deterministic` green.

---

## Связанные артефакты

- `src/promptRulesProjection.mjs` — projection schema
- `protocols/prompt-step-lowcode-replacement-scope-v1.bvc` — replacement scope
- `intent/ui/dashboard/work/implement-prompt-step-review-ui-mvp.work.bvc` — MVP UI (done)
- `work/analytics/ux-current-state-and-vector.md` — карта вкладок
