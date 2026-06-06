# AN-80: Задачи Gripe не связаны с L1-блоками архитектуры — рассинхрон классификатора WG

**Запрос:** изучить инцидент/вопрос: должны ли задачи Work Graph быть связаны с блоками архитектуры в Gripe; связаны ли сейчас; почему нет; что делать.

**Дата:** 2026-06-06

---

## Краткий вывод

Связь **полезна**, но **не обязательна** для всех задач. В Gripe канон архитектуры и Work Graph **разведены намеренно**: WG — инструмент вне продуктовой L1-карты. Сейчас продуктовые задачи с блоками «Архитектуры» **фактически не связаны** — из‑за рассинхрона встроенного классификатора WG (starter-kit движка) и `architecture/main.bvc` Gripe (7 продуктовых L1).

---

## Что задумано в модели Gripe

В `architecture/main.bvc` Gripe явно:

- **L1-канон** — SSoT для вкладки «Архитектура»
- **Work Graph** — инструмент **вне** продуктовой карты (нет meta-блока `work-graph` среди 7 L1)
- **7 продуктовых блоков:** `marketplace-core`, `app-host`, `seller-account`, `verticals`, `catalog-pipeline`, `presentation`, `platform-ops`

Не каждая задача WG обязана сидеть на L1-карте. Задачи, меняющие код подсистем, **логично** привязывать к нужному блоку — для навигации и трассируемости.

---

## Механизмы связи в WG

| Механизм | Назначение | Где учитывается |
|----------|------------|-----------------|
| `architecture.block_id` в метках задачи | Явная привязка (override) | Бейдж Kanban (`resolveWorkItemClassifierBadge`) |
| `work.target_files` | Пути артефактов | L2 граф блока (когда задача уже в блоке) |
| `architecture.intent_roots` у блока | Корни intent/кода блока | Канон L1/L2 |
| `work.parent_id` | Epic → подзадачи | Иерархия backlog, **не** архитектура |

---

## Связаны ли задачи сейчас

**Нет** — с продуктовыми L1-блоками Gripe не связаны.

Проверка на живом каноне Gripe: у всех 7 блоков `taskIds` пустые на вкладке «Архитектура».

### Почему: классификатор заточен под движок WG

`classifyWorkItemBlock()` в `src/workItemBlockClassifier.mjs` возвращает id блоков **starter-kit Work Graph**, не Gripe:

| Задача (пример) | `work.department` | Куда попадает классификатор | Есть ли блок в Gripe? |
|-----------------|-------------------|----------------------------|------------------------|
| `import-zhivotnye-catalog-facets` | `domain-onebase` | `domains` | **Нет** |
| `ui-kit-theme-preview-switcher` | `frontend-ui` | `derived-projections` | **Нет** (у Gripe — `presentation`) |
| `epic-catalog-facet-coverage-an3` | `domain-onebase` | `domains` | **Нет** |

В `architecture/main.bvc` Gripe нет `domains` и `derived-projections` → `tasksByBlock.get('domains')` в `buildArchitectureSnapshot()` ничего не находит → задачи не попадают ни в один L1.

Код snapshot (`src/architectureSnapshot.mjs`):

```javascript
for (const item of items) {
  const blockId = classifyWorkItemBlock(item);
  tasksByBlock.get(blockId)?.push(item.id);
}
```

**Только** `classifyWorkItemBlock` — метка `architecture.block_id` в snapshot **не читается**.

### Дополнительные пробелы

1. **Ни одна** задача в `Gripe/intent/**/work/*.work.bvc` не имеет `architecture.block_id`.
2. Даже при проставлении `architecture.block_id: catalog-pipeline` бейдж Kanban **не сработает** без расширения `ARCHITECTURE_BLOCK_BADGES` в `src/ui/workItemClassifierBadge.mjs` — там захардкожены только id starter-kit (`domains`, `derived-projections`, `work-graph`, …).
3. `work.target_files` есть (напр. `config/catalog-facets.php`, `app/Support/Avito/`) и семантически указывают на `catalog-pipeline` / `presentation`, но UI архитектуры это не отображает, пока классификатор не совпадёт с `block.id`.

---

## Что связано косвенно

| Связь | Тип |
|-------|-----|
| Epic → подзадачи (`work.parent_id`) | Иерархия backlog (AN-3 → import-zhivotnye, …) |
| `work.target_files` | Семантическая привязка к зонам кода без отображения на L1 |

---

## Должны ли быть связаны

| Тип задачи | Рекомендация |
|------------|--------------|
| Меняет код подсистемы (AN-3 фасеты, hub, токены) | **Да** — `catalog-pipeline`, `marketplace-core`, `presentation` |
| Операционная/meta WG (analytics, MCP, UI WG) | **Нет** на L1 Gripe — по канону WG вне продуктовой карты |
| Epic | Можно без блока; подзадачи — с блоком |

### Практичный минимум для текущего backlog Gripe

| Задачи | `architecture.block_id` |
|--------|-------------------------|
| `import-*-catalog-facets`, `capture-*` | `catalog-pipeline` |
| `resolve-facets-hub-*`, `add-travel-hub-*` | `marketplace-core` |
| `migrate-hardcoded-accent-*`, `ui-kit-*` | `presentation` |

---

## Варианты исправления (продукт WG)

### A. Быстрый (оператор / Gripe)

Проставить `architecture.block_id` на подзадачах через MCP + **доработать WG**, чтобы snapshot и бейджи читали id из **живого канона**, а не из фиксированного `ARCHITECTURE_BLOCK_BADGES`.

### B. Средний (per-project классификатор)

Расширить `classifyWorkItemBlock()`:

- матчить `work.target_files` и `work.department` с `architecture.intent_roots` и `architecture.container.*.paths` из `architecture/main.bvc` проекта;
- fallback: явный `architecture.block_id`;
- не хардкодить id starter-kit как единственный словарь.

### C. Долгий (из AN-78 / epic-architecture-main-bvc-canon)

Канон-осознанный классификатор + lint: задача с `target_files` вне `intent_roots` всех блоков → warning; epic без подзадач с блоком → hint.

---

## Схема рассинхрона

```text
Gripe architecture/main.bvc          classifyWorkItemBlock() (WG engine)
  marketplace-core                      domains  ──┐
  catalog-pipeline                      derived-projections ──┤→ tasksByBlock.get(id)
  presentation                          work-graph  ──┘       → undefined для Gripe L1
  … 7 блоков                            (нет catalog-pipeline)
         │                                        │
         └──────── taskIds: []  ← нет пересечения id ────────┘
```

---

## Итог

| Вопрос | Ответ |
|--------|-------|
| Должны ли задачи быть связаны с блоками? | Полезно для продуктовых; WG как инструмент — вне L1 по дизайну Gripe |
| Связаны ли сейчас? | **Нет** — классификатор WG-engine vs 7 блоков Gripe; `architecture.block_id` нигде не проставлен |
| Корневая причина | `buildArchitectureSnapshot` использует только `classifyWorkItemBlock` со starter-kit id; канон проекта не участвует в классификации |

Связанные разборы: AN-78 (жёсткий L1 / канон), AN-79 (MCP root), `epic-architecture-main-bvc-canon`.
