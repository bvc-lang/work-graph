# AN-12: GVM + SBG Mandate (Genesis Virtual Machine) — уникальная технология ioHasC

**Запрос:** «ищи ещё уникальные технологии в ioHasC».

## Кратко

GVM — **Wasm-рантайм с обязательной проверкой политики мандата перед вызовами**, где каждый export модуля проверяется против декларативной policy перед инвокацией. SBG мандат types типизируют, **что** wasm-модулю разрешено делать (с какими ресурсами, под каким guid, через какие интерфейсы).

Это **не WASI**, **не Wasmtime preview**, **не Cap-VM** в чистом виде — это **гибрид Wasm + capability-based security + project-passport-aware policy**. В OSS аналогов не вижу. Уникально, но **самая R&D-сильная и продуктово-сомнительная** технология ioHasC из всех проанализированных.

## 1. Что есть сегодня

| Слой | Где | Назначение |
|---|---|---|
| **GvmLiteStub** | `src/gvmLite/gvmLiteStub.ts` | минимальный Wasm runtime для dev/test |
| **Module registry** | `src/gvmLite/gvmModuleRegistry.ts` | реестр загруженных модулей из GBC слайсов |
| **Invoke export** | `src/gvmLite/gvmInvokeExport.ts` | вызов wasm-export через gate |
| **Mandate policy** | `src/gvmLite/gvmMandatePolicy.ts` | декларативная политика «кому что можно» |
| **SBG мандат types** | `src/gvmLite/gvmSbgMandateTypes.ts` | типы capabilities (System / Business / Genesis) |
| **From-GBC-registry** | `gvmMandatePolicyFromGbcRegistry.ts` | мандат из паспорта проекта (GBC) |
| **Bytecode payload kind** | `gvmBytecodePayloadKind.ts` | классификация bytecode_b64 (Wasm vs неизвестный binary) |
| **Import policy JSON** | `gvmImportPolicyJson.ts` | переопределение import policy через JSON |
| **Sync from GBC slice GFS** | `syncGvmFromModuleObjectSliceGfs.ts` | загрузка модулей при изменении `.gbc` в GFS |
| **Dev panel** | `src/panels/gvmDevPanel.js`, `genesis2022/gvmDevPanelVmLimits.ts` | UI для инвокаций, интроспекции, лимитов |
| **Mandate UI hint** | `runtime/iohascGvmDevEvents.js` | обновление подсказки мандат при GFS update |
| **E2E** | `e2e/gvm-dev/gvm-tab-smoke.spec.js` | smoke на dev panel |
| **Genesis2022 FFI** | `src/genesis2022/gvmDevGenesisInvoke.ts` | наследуемый мост к Genesis 2022 (CODE/socket) |

### Архитектура

```
                    ┌─────────────────────┐
   .bvc + IR ───►  │  GBC compiler       │  ──► ModuleObjectSliceV1 (.gbc)
                    └─────────────────────┘             │
                                                        ▼
                    ┌─────────────────────┐
                    │  GFS-Lite           │ ◄── put('module.gbc', bytes)
                    └─────────────────────┘             │
                                                        ▼
                    ┌─────────────────────┐
                    │  GVM module registry│ ◄── syncGvmFromModuleObjectSliceGfs
                    └─────────────────────┘             │
                                                        ▼
                    ┌─────────────────────┐
                    │  Mandate policy     │ ◄── gvmMandatePolicyFromGbcRegistry
                    └─────────────────────┘             │
                    ┌─────────────────────┐             ▼
   invokeExport ──► │  gvmInvokeExport    │ ──► [gate check] ──► wasm.exports[name](args)
                    └─────────────────────┘
```

### SBG (Security/Business/Genesis) Mandate Types

Три класса capabilities:
- **System** — runtime ресурсы (memory limits, хост functions, file I/O).
- **Business** — domain-specific capabilities (1С API, OneBase metadata access).
- **Genesis** — proprietary Genesis-platform функции (legacy FFI 2022).

Mandate policy — `{ kind: 'System' | 'Business' | 'Genesis', name: string, scope?: object }[]`. Policy bound к module GUID, проверяется на каждый invoke.

## 2. Зачем стандарт — какую боль решает

| Боль | Кто страдает | Чем закрывают |
|---|---|---|
| Wasm-модули запускают всё подряд (нет capability-проверок) | встраивающая средаs | host-side ручной checks |
| WASI preview ещё не v1.0, capability story неполная | разработчики | wait for WASI 0.2 |
| Sandboxing для plugins — каждый встраивающая среда свой | extension hosts | плагин-системы изобретают |
| Нет привязки policy к project metadata (passport) | enterprise | манифесты вручную |
| AI-агент исполняет код — нужен gating инвокаций | AI-runtime | OpenAI Functions с список разрешений (плоский) |
| `.bvc` исполняемые компиляции — где запускать? | ioHasC | GVM (нет альтернативы) |

**Уникальное обещание GVM/SBG:** «Wasm-модуль = декларация capabilities + bytecode, инвокация всегда через мандат-gate, policy выводится из паспорта проекта, не пишется руками».

## 3. Конкуренты

| Технология | Сильно | Слабо vs GVM/SBG |
|---|---|---|
| **WASI 0.2 / preview2** | стандарт W3C | capability story только формируется |
| **Wasmtime / wasmer** | мейнстрим Wasm runtimes | хост решает policy ручной |
| **wasmcloud** | actor model + capabilities | сложный, для distributed apps |
| **Spin (Fermyon)** | serverless Wasm | другая ниша |
| **Capability-based OS (seL4, EROS)** | формально verified | OS-level, не embedded |
| **Object capabilities (E lang)** | conceptual purity | academic |
| **OpenAI Functions список разрешений** | мейнстрим | плоский, не policy |
| **MCP authorization** | для AI-tools | tool-level, не invoke-level |
| **OPA / Cedar** | policy engines | general purpose, не Wasm-aware |
| **JS realms / SES (hardened JS)** | песочницаing | JS-only |
| **Deno permissions** | flag-based | coarse-grained |
| **WebContainers (StackBlitz)** | full node в browser | песочницаing OS-level |
| **JVM SecurityManager** | устарел | устаревший |
| **OAuth scopes** | concept matches | runtime, not invoke |
| **Wasm Components** | composition | без мандат concept |
| **Sandboxed Rhino / GraalVM polyglot** | встроенные скрипты | без declarative policy |

**Главный конкурент:** WASI 0.2 + wasmtime + сторонние policy engines (OPA). GVM/SBG объединяет в одном пакете, но **WASI 0.2 быстро догоняет**.

## 4. Что в GVM/SBG действительно уникально

Шесть вещей:

1. **SBG-classification capabilities** — три явных уровня (System/Business/Genesis), не один плоский список разрешений.
2. **Mandate из паспорта проекта** — `gvmMandatePolicyFromGbcRegistry` выводит policy **из** project metadata. Это «GitOps for Wasm capabilities».
3. **GBC bytecode payload type discrimination** — `gvmBytecodePayloadKind.ts` различает Wasm vs неизвестный binary в bytecode_b64 поле. Тип-первый подход.
4. **Module loading через GFS overlay** — синхронизация модулей при изменении GBC слайсов в GFS. Горячая перезагрузка без перезапуска.
5. **Import policy override** — `gvmImportPolicyJson.ts` для dev-override, dev panel показывает effective мандат.
6. **`.bvc` как первоисточник** — модуль может быть скомпилирован из `.bvc`, мандат выводится из BVC/Меток. Это закрывает цикл canon → bytecode → execution.

## 5. Где GVM/SBG обречён проиграть

1. **Конкурировать с WASI 0.2** — невозможно, стандарт W3C.
2. **Стать общим Wasm runtime** — Wasmtime/Wasmer слишком сильны.
3. **Без killer-app** — никому не нужен «yet another песочница».
4. **Coupling с Genesis 2022 FFI** — это исторический баланс, не привлекает новых пользователей.
5. **R&D зрелость низкая** — `gvmLiteStub.ts` (stub в имени!), много tests/PoC, мало production кода.
6. **Charter явно откладывает** — `gbc-gvm-zig-deferral-boundary.bvc` исключает GVM из MVP. Это сильный сигнал.

## 6. Что нужно сделать

**4 артефакта** (минимум):

1. **Спецификация SBG Mandate Types v1** — формализация System/Business/Genesis capability schema.
2. **`@step-canon/gvm-runtime`** — Wasm runtime adapter с мандат-gate, поверх wasmtime/wasmer/browser Wasm.
3. **Policy compiler** — `.bvc` BVC labels → мандат policy JSON.
4. **CLI** `gvm invoke <module> <export>` / `gvm policy from-step <file>`.

## 7. Стратегические подварианты

| Под-вариант | Суть | Шанс |
|---|---|---|
| **A: open Wasm capability standard** | формализовать SBG как extension к WASI | низкий (WASI команда не примет нестандартное) |
| **B: AI-agent Wasm песочница** | runtime для AI-генерированного Wasm с автогенерируемой policy из задачи | средний |
| **C: 1С-vertical Wasm runtime** | для 1С обработок как Wasm с мандат | низкий (1С на своей VM, переход дорогой) |
| **D: spec only** | формализовать SBG как pattern, без runtime | средний |
| **E: внутренний компонент** | оставить GVM как часть ioHasC, не стандартизировать | **высокая разумность** |

**Моя ставка — E**. GVM/SBG — самая слабая автономный кандидатка для стандартизировать из всех проанализированных в AN-8…12. Charter явно говорит «отложить».

## 8. Решения **до** начала работ

- **Если стандартизировать: переименовать**. «GVM» путается с JVM/GraalVM. Например `SBG Runtime` или `Mandate VM`.
- **Если оставить внутренним**: чётко зафиксировать в charter «R&D трек, не MVP».
- **Связь с WASI**: следить за WASI 0.2 capability proposals — возможно SBG может стать contribution.

## 9. Риски

- **Очень высокая** вероятность дублирования с WASI 0.2 за 12-24 мес.
- **Высокая** сложность для входа: Wasm + FlatBuffers + capabilities — 3 учебных кривых сразу.
- Genesis 2022 FFI — устаревший слой, тормозит.
- Без AN-11 (GBC/GFS) и AN-10 (PVRG) GVM не имеет контекста.

## 10. Метрики через 6 месяцев

**Зелёные:** SBG-мандат-types spec опубликован, ≥1 внешний сценарий применения.
**Жёлтые:** GVM работает только «на себе».
**Красные:** WASI 0.2 закрывает 80% сценарий применения → GVM устарел, разворот в E (внутренний компонент).

## 11. Что **не делать**

- Не конкурировать с Wasmtime/Wasmer по runtime.
- Не делать собственный Wasm runtime — wrap существующих.
- Не привязывать к Genesis 2022 FFI.
- Не публиковать как «новый стандарт» — это **самопровальная** позиция.
- Не вкладывать в стандартизировать до того, как AN-10/11 не получат интерес.

## 12. Связь с другими аналитиками

- **AN-11 (GBC/GFS)**: GVM **tight coupled** к ModuleObjectSliceV1. Нужно ослабить если стандартизировать.
- **AN-10 (PVRG)**: GVM может исполнять PVRG-derived Wasm для проектных проверок.
- **AN-9 (IR)**: IR может компилироваться в Wasm с мандат из BVC. Это закрывает execution-цикл.
- **AN-8 (`.bvc`)**: `.bvc` BVC может декларировать мандат. Связь есть, но опциональная.
- **AN-7 / charter**: GVM **явно отложен** до post-MVP. Это сильный аргумент против стандартизировать сейчас.

## 13. Roadmap (если стандартизировать)

| Неделя | Артефакт |
|---|---|
| 1 | Решение E vs A/B/D, переименование |
| 2-3 | SBG мандат types спецификация |
| 4-6 | `@step-canon/gvm-runtime` (wrap wasmtime + мандат gate) |
| 7 | Policy compiler `.bvc → мандат` |
| 8 | CLI |
| 9-10 | Spec doc, examples, MCP integration |

## 14. Финальный вердикт

GVM/SBG — **технически любопытный, продуктово сомнительный** трек. Charter ioHasC сам **явно** говорит «отложить». Standardize-перспектива — самая слабая из 5 разобранных уникальных технологий.

**Реалистично:**
- **Не стандартизировать.** Оставить как внутренний R&D-компонент.
- Зафиксировать в `charter/main.bvc` как «experimental», не дискутировать чаще раза в квартал.
- Следить за WASI 0.2 — если capability story закроется там, GVM закрывается.
- Если **очень** хочется — D2 (AI-agent Wasm песочница с автогенерируемой policy) — единственный потенциально интересный угол.

**Минимальная проверка через 3 месяца:**
- зафиксирован статус «experimental» в charter.
- WASI 0.2 progress check.
- 1 публичный pattern-write-up «SBG мандат as illustration of capability-policy outside WASI».

Если ни одного внешнего отклика — закрытие.

---

**См. также:** [AN-11 GBC/GFS](gbc-gfs-binary-slice-overlay.md), [AN-10 PVRG](pvrg-verified-reference-graph.md), [AN-9 IR](ir-rich-ir-открытый канон.md), [AN-7 charter audit](product-self-audit-user.md).
