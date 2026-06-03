# AN-49: Объём кодовой базы Work Graph — разложение для переписывания

**Запрос:** «Какой объём кода в WG — коротко для понимания объёма переписывания» (новая обёртка; ioHasC — донор, не целевой продукт).

**Связи:** [AN-43](work-graph-npm-first-distribution.md) (npm/cli), [AN-40](work-graph-project-deployment-model.md) (хост), [AN-41](work-graph-desktop-exe-packaging.md) (exe vs OneBase), [AN-17](onebase-integration-vertical-stack.md) (OneBase-мост).

**Метод:** подсчёт строк в репозитории `work graph` (2026-06-02): `*.mjs`, `*.js`, `*.ts`, `*.bvc`, `*.step`, `*.md` в каноне; без `node_modules`; `packages/work-graph-cli/vendor/` — дубликат `src/`, в сумму runtime **не дублировать**.

---

## Кратко

| Слой | ~строк | Переписывать? |
|------|--------|---------------|
| **Канон** (`intent/`, `work/`, `rules/`, `.bvc`) | **~33k** | **Нет** — данные и prose |
| **Runtime** (`src/`) | **~36k** | **Да**, если новая обёртка |
| **Тесты** (`tests/`) | **~13k** | Вместе с runtime |
| **Скрипты/CI** (`scripts/`) | **~13k** | Частично |
| **npm-пакеты** (уникальный код) | **~2,7k** | MCP, bvc-cli, spec |

**Один файл — ~23% runtime:** `workGraphBacklogUiServer.mjs` (~8 300 строк) — пульт (HTML + inline JS + API).

**Минимальный продукт** (MCP + worker + daemon): переписать/перенести **~5–8k** строк логики. **Полный Rust-backend:** **~50k** (runtime + tests + scripts), канон **не трогать**.

---

## 1. Три слоя репозитория

```
Канон (~33k)     →  intent/, work/, rules/, charter/  — не код приложения
Runtime (~36k)   →  src/                               — ядро переписывания
Окружение (~26k) →  tests/, scripts/, e2e/            — следуют за runtime
```

| Область | Файлов (~) | Строк (~) | Примечание |
|---------|------------|-----------|------------|
| `src/` | 172 | 35 710 | Node ESM |
| `tests/` | 138 | 13 103 | `node:test` |
| `scripts/` | 107 | 13 449 | lint, seed, CI |
| `intent/` + `work/` + `rules/` + … | — | 33 156 | prose / `.bvc` |
| `e2e/` | 1 | 38 | Playwright smoke |

---

## 2. `src/` — куда уходит объём

| Блок | Строк (~) | Доля `src/` | Назначение |
|------|-----------|-------------|------------|
| **`workGraphBacklogUiServer.mjs`** | **8 292** | **~23%** | Пульт: разметка, inline-скрипты, HTTP API |
| Остальной runtime | ~27 400 | ~77% | Бэклог, intent, worker, daemon, graph, OneBase |

### Крупнейшие файлы в `src/` (после UI-server)

| Модуль | Строк (~) |
|--------|-----------|
| `workGraphRuntime.mjs` | 849 |
| `workItemTextRusify.mjs` | 778 |
| `workGraphWorkerProvider.mjs` | 531 |
| `workGraphLlmUsefulnessEval.mjs` | 529 |
| `onebaseWorkerTools.mjs` | 510 |
| `architectureSnapshot.mjs` | 432 |
| `graphCanvasLayout.mjs` | 415 |
| `graphRagContextSlice.mjs` | 398 |
| `agentWorkerLiveLoop.mjs` | 393 |
| `agentWorkerOpenAiProvider.mjs` | 398 |

### Тематические группы (оценка)

| Группа | Строк (~) | Содержание |
|--------|-----------|------------|
| UI + graph canvas client | ~10 000 | UI-server, lit-flow, layout, schematic |
| Work items / intent / backlog | ~8 000 | `.bvc`, lifecycle, lint, projections |
| Agent worker + daemon | ~2 500 | providers, live loop, recovery |
| OneBase bridge | ~800 | CLI runner, worker tools, YAML scan |
| Architecture / analytics / search | ~3 000 | L1, semantic search, AN panel |
| Прочее | ~11 000 | init, MCP shared handlers, rusify, lowcode CLI |

---

## 3. npm-пакеты (без vendor-дубликата)

| Пакет | Строк (~) | Роль |
|-------|-----------|------|
| `packages/workgraph-mcp` | 1 427 | MCP stdio — **лицо продукта** |
| `packages/bvc-cli` | 1 012 | lint/format `.bvc` |
| `packages/bvc-spec` | 27 | схема формата |
| `packages/design-tokens` | 247 | токены UI |
| `packages/work-graph-cli` | ~200 + **vendor** | `init`; vendor = копия `src/` для npm |

**Важно:** `sync:work-graph-cli-vendor` копирует движок в CLI — при оценке переписывания **считать `src/` один раз**.

---

## 4. OneBase и объём (контекст vertical)

OneBase runtime (Go) **не входит** в эти ~36k. В WG — только **мост**:

| Комponent | Строк (~) |
|-----------|-----------|
| `onebaseCliRunner.mjs`, `onebaseWorkerTools.mjs`, scan/parse | ~800–1 000 |

Переписывание WG на Rust **не упаковывает OneBase в npm** — остаётся subprocess/REST к внешнему бинарнику ([AN-41](work-graph-desktop-exe-packaging.md)).

---

## 5. Сценарии переписывания (новая обёртка)

| Сценарий | Объём кода | Канон `.bvc` | Комментарий |
|----------|------------|--------------|-------------|
| **Headless: MCP + worker + daemon** | **~5–8k** | переиспользовать | Без пульта; `@work-graph/mcp` |
| **Новый UI, старый API** | **~8–10k** | переиспользовать | Вынести API из UI-server |
| **Rust backend, UI отдельно** | **~35k + 13k tests** | переиспользовать | MCP на Rust — отдельная оценка SDK |
| **Полный форк runtime** | **~60k** (src+tests+scripts) | **~33k не трогать** | ioHasC — донор паттернов, не merge |
| **Только замена UI-monolith** | **~8 300** | — | Максимальный UX/LOC ratio |

---

## 6. Риски оценки

| Риск | Митигация |
|------|-----------|
| UI-server смешивает view + API | Первый рефактор — разделить routes и static |
| Vendor CLI дублирует `src/` | Один source of truth; vendor — publish artifact |
| «36k» кажется мало для IDE | WG — **не IDE**; orchestrator в доноре, не в WG |
| Тесты 13k — половина effort | При Rust — переписать контракты, не копировать построчно |

---

## 7. Рекомендации

| ID | Смысл |
|----|--------|
| **R1** | Канон **~33k** — актив; runtime менять под новую обёртку. |
| **R2** | Первый cut переписывания — **MCP + worker (~5–8k)**, пульт позже или embed. |
| **R3** | UI-monolith **8,3k** — кандидат №1 на вынос, не «переписать всё сразу». |
| **R4** | Rust имеет смысл для **хоста/exe**, не для «OneBase в npm». |
| **R5** | ioHasC — **донор** (~800 строк OneBase + паттерны); не сливать объёмы репо. |

---

## 8. Итоговая формула

```
Переписывание runtime  ≈  36k (src) + 13k (tests) + часть scripts
Не переписывать        ≈  33k канон + внешний OneBase (Go)
Быстрый MVP обёртки    ≈  5–8k (MCP + worker + gates)
Узкое место UX         ≈  1 файл × 8,3k (UI-server)
```

---

**См. также:** [AN-48](open-agent-chat-ui-embed-options.md), [AN-46](work-graph-agent-sdks-integration.md), [docs/plan-iohasc-rebuild-audit-gap-matrix.md](../../docs/plan-iohasc-rebuild-audit-gap-matrix.md), `src/workGraphBacklogUiServer.mjs`.
