# AN-50.1: BVC как контракт исполнения — projection, MCP gates, structured evidence

**Запрос:** дополнение к [AN-50](verification-panel-tests-evidence-intent.md) — сдвиг «запустили тест → записали лог» на **«контракт задачи → валидация исполнения → структурное доказательство»**.

**Статус:** закрыт (эпик done, 2026-06-02)  
**Closing:** [closing-epic-work-graph-bvc-contract-verification-v1.md](closing-epic-work-graph-bvc-contract-verification-v1.md)
**Эпик:** `epic-work-graph-bvc-contract-verification-v1`  
**План:** [docs/plan-work-graph-bvc-contract-verification.md](../../docs/plan-work-graph-bvc-contract-verification.md)  
**ADR:** [docs/adr-work-item-contract-projection-v1.md](../../docs/adr-work-item-contract-projection-v1.md) (accepted)

**Связи:** [AN-50](verification-panel-tests-evidence-intent.md), `protocols/evidence-model-v1.bvc`, `packages/bvc-spec/schemas/bvc-atom-draft.v1.json`, `src/workGraphRuntime.mjs`, `src/verificationLoop.mjs`.

---

## Кратко

BVC-атом уже **неявный контракт** (Базис, Вектор, Цель, **Проверки**, `work.target_files`, matrix row). Разрыв: агент и UI не получают его **одним машиночитаемым вызовом**; свидетельства в `.bvc` — в основном prose.

**Решение:** projection-слой (`workItemContractProjection.mjs`) + shared evaluate (`workItemReadyForDone.mjs`) + три MCP-инструмента + постепенная миграция на structured evidence.

---

## 1. Что уже есть (baseline AN-50)

| Механизм | Где |
|----------|-----|
| Схема атома | `bvc-atom-draft.v1.json`, `lint:backlog`, `bvc:lint` |
| Evidence v1 types | `protocols/evidence-model-v1.bvc` |
| MCP evidence read | `list_evidence_records`, `get_evidence_record` |
| Gate `done` без evidence | `workGraphRuntime.mjs` → `transitionStatus` |
| Matrix tier A/B/C | `src/verificationLoop.mjs` |
| Human «Свидетельства» | строки в `.work.bvc` |

**Разрыв:** matrix **не читает** отдельный YAML `contract:`; MCP **не отдаёт** собранный контракт; `complete_work_item` не возвращает **структурированный список нарушений**.

---

## 2. Четыре усиления — вердикт

### 2.1. BVC как формальный контракт (схема + structured evidence)

| Сейчас | Целевое |
|--------|---------|
| Prose в «Свидетельства» | **Dual view:** prose для человека + structured JSON (evidence-model-v1) |
| Валидация только atom-draft | Расширить schema **optional** полями evidence; lint при `add_work_item_evidence` |
| «Контракт в голове» | `assert_task_ready_for_done(work_id)` → `violations[]` |

**Миграция:** строка → structured optional → **required для Tier A gate tasks** (не big-bang).

### 2.2. Три слоя контракта — projection, не дублирование

**Канон:** `get_work_contract(work_id)` **собирает** projection:

```
input        ← work.target_files, work.depends_on, basis/vector summary
output       ← checks block + evidence-model types + matrix commands
verification ← tier/matrixRowId(s) from gateTaskIds match; codegen from trace labels
```

Явный `contract:` в atom — **только override** (редко). См. ADR.

### 2.3. Contract-aware MCP (P0)

| Инструмент | Возвращает |
|------------|------------|
| `get_work_contract(work_id)` | `work-item-contract.v1` |
| `validate_evidence(work_id, evidence_json)` | `{ ok, violations[] }` |
| `assert_task_ready_for_done(work_id)` | `{ ok, violations[], suggestedCommands[] }` dry-run |

Resource (optional): `workgraph://contract/{workId}`.

### 2.4. Contract Wrapper для SDK (P2 — deferred)

Sugar поверх MCP; не второй source of truth. Design-only subtask.

---

## 3. Схема контракта v1 (projection)

```json
{
  "schema": "work-item-contract.v1",
  "workId": "implement-step-code-trace-link-validator",
  "input": {
    "targetFiles": ["src/traceLinksValidator.mjs"],
    "dependsOn": ["implement-step-atom-formatter"],
    "contextHint": "trace-links v1 spec"
  },
  "output": {
    "evidenceRequired": [
      { "type": "command", "cmd": "npm run test:deterministic", "mustPass": true }
    ],
    "checksProse": ["tests green", "trace links validator in deterministic suite"]
  },
  "verification": {
    "tier": "A",
    "matrixRowId": "trace-links-v1",
    "matrixRowIds": ["trace-links-v1"],
    "codegenGate": false
  }
}
```

**Non-gate subtask** (не в `gateTaskIds`): `"verification": { "tier": null, "matrixRowId": null, "matrixRowIds": [] }`.

---

## 4. Ответ assert / complete: violations[]

Схема **`work-item-ready-for-done.v1`** — общая для `assert_task_ready_for_done` и отказа `complete_work_item`:

```json
{
  "schema": "work-item-ready-for-done.v1",
  "workId": "implement-mcp-get-work-contract",
  "ok": false,
  "violations": [
    {
      "code": "missing_evidence",
      "severity": "error",
      "message": "done requires non-empty evidence",
      "fix": "add_work_item_evidence with command output"
    },
    {
      "code": "structured_evidence_required",
      "severity": "error",
      "message": "Tier A gate task requires command evidence with exitCode=0",
      "fix": "validate_evidence then add structured payload"
    },
    {
      "code": "matrix_gate_pending",
      "severity": "warn",
      "message": "matrix row trace-links-v1: gate task implement-step-code-trace-link-validator not done",
      "fix": null
    }
  ],
  "suggestedCommands": ["npm run test:deterministic"]
}
```

Коды `violations[].code` (минимальный набор P0): `missing_evidence`, `structured_evidence_required`, `matrix_gate_pending`, `parent_close_blocked`, `blocked_without_reason`.

---

## 5. Риски и канон

### 5.1. Projection не должна быть «магией»

| Канон | Деталь |
|-------|--------|
| Модуль | `src/workItemContractProjection.mjs` |
| Функция | `buildWorkItemContractV1(workItem, ctx)` |
| Свойства | **pure**, deterministic, **no side-effects** (no I/O, no status/evidence writes) |
| Источники | atom labels, basis/vector/goal/checks, `VERIFICATION_MATRIX`, codegen labels |
| Тесты | golden fixtures: gate-task, non-gate subtask, multi-row gate (`implement-workgraph-minimal-runtime`) |
| Overrides | optional `contract.override` в atom — **merge**, не replace (post-MVP) |

Projection = read-model, как `buildVerificationSummary`.

### 5.2. Tier: источник истины

1. Строки `VERIFICATION_MATRIX`, где `workId ∈ row.gateTaskIds`.
2. Несколько строк → tier = **max** (A > B > C): `deterministic`→A, `optional-env`→B, `optional-llm`→C.
3. `matrixRowIds[]` — все совпадения; `matrixRowId` — primary (первая Tier A, иначе первая в списке).
4. Нет совпадений → `tier: null` (контракт = checks + target_files).

### 5.3. assert vs complete

| Компонент | Роль |
|-----------|--------|
| `evaluateWorkItemReadyForDone()` | **одна** функция проверок (`src/workItemReadyForDone.mjs`) |
| `assert_task_ready_for_done` | dry-run → `violations[]` |
| `complete_work_item` | тот же evaluate; **enforce**; prior assert **не обязателен** |
| Cursor rule | «assert → fix → complete» — рекомендация для агента, не protocol gate |

**P0.5:** при отказе `complete_work_item` возвращает те же `violations[]`, не только throw.

### 5.4. Structured evidence: минимальные поля

Канон: `protocols/evidence-model-v1.bvc` (`evidence-record-v1`).

| Фаза | Поля |
|------|------|
| **P0** (Tier A gate, assert) | `type`, `command`, `exitCode`, `status`, `taskId` |
| **P1** strict add | + `time`, `source`, `summary` |
| **P1 audit** | + `artifacts[]`, optional hash лога |

Prose в «Свидетельства» достаточно для задач без Tier A gate.

### 5.5. UI «бейдж контракта» (P1)

**P0/P1 UI:** compact strip + **текстовый список** `violations[]` (как lint), не новая heatmap.

Пример:

```
Контракт · Tier A · trace-links-v1
✓ evidence  ✗ structured command  → 2 нарушения
```

Matrix на панели «Проверки» уже есть — подсветить `matrixRowId`, не дублировать таблицу.

### 5.6. Contract Health (P1)

Метрики в dashboard snapshot (`contractHealth.v1`):

- `% gate tasks со structured evidence`
- `% assert first-pass` (лёгкий audit log вызовов assert — P1)
- `% задач с tier != null и выполненным контрактом`

Для измерения прогресса миграции, не для блокировки CI.

---

## 6. Поток для агента (Cursor)

```
claim_work_item
    → get_work_contract(work_id)
    → edit target_files
    → run suggestedCommands (matrix allowlist)
    → validate_evidence(structured payload)
    → assert_task_ready_for_done          # recommended dry-run
    → add_work_item_evidence + complete_work_item
```

---

## 7. Roadmap (эпик)

| Приоритет | Трек | work.id |
|-----------|------|---------|
| **P0** | ADR | `decide-work-item-contract-projection-adr` |
| **P0** | Projection | `implement-work-item-contract-projection` |
| **P0** | Evaluate shared | (в assert subtask: `workItemReadyForDone.mjs`) |
| **P0** | MCP tools | `implement-mcp-get-work-contract`, `implement-mcp-assert-task-ready-for-done`, `implement-mcp-validate-evidence` |
| **P1** | Schema + runtime evidence | `extend-bvc-schema-structured-evidence-fields`, `extend-runtime-structured-evidence-validation` |
| **P1** | UI + Contract Health | `wire-verification-panel-contract-summary` |
| **P2** | SDK wrapper | `design-sdk-contract-wrapper-v1` |

Seed: `npm run seed:epic-work-graph-bvc-contract-verification-v1`

---

## 8. Границы и анти-goals

- **Не** mandatory assert перед complete на уровне протокола.
- **Не** JSON Schema на весь `.bvc` до stable user-first `bvc:lint`.
- **Не** big-bang structured evidence.
- **Не** дублировать `VERIFICATION_MATRIX` вручную в каждом атоме.
- **Не** второй orchestrator.

---

## 9. GTM

**WG — контрактная платформа AI-разработки:** намерение (BVC-атом), исполнение (target_files + matrix), доказательство (structured evidence) — **машиночитаемый протокол** + понятные `violations[]` для агента.

---

**См. также:** [AN-50](verification-panel-tests-evidence-intent.md), [AN-38](llm-pvrg-richir-memory-slices-usage-audit.md), [AN-8](step-as-open-canon-standard.md).
