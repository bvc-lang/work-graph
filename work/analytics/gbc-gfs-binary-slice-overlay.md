# AN-11: GBC + GFS (Genesis Binary Code + File System) — уникальная технология ioHasC

**Запрос:** «ищи ещё уникальные технологии в ioHasC».

## Кратко

GBC/GFS — **слайс-ориентированный бинарный формат на FlatBuffers + overlay-VFS поверх дискового дерева**. Каждый слайс — типизированный self-contained артефакт (passport, step-file, module-object, trace-link, pvrg-cache-metrics), которые накладываются на текстовое представление через GFS-Lite, не ломая `getFileContent`-контракт.

Это сочетание — **бинарный канон + overlay над текстом + zero-copy чтение в браузере** — в OSS делает **никто**. Это уникальный паттерн «self-describing binary repository, который остаётся git-friendly».

## 1. Что есть сегодня

| Слайс | Схема `.fbs` | TS encode/decode | Назначение |
|---|---|---|---|
| **PassportSliceV1** | `schemas/iohasc-gbc/passport_slice_v1.fbs` | `passportSliceV1.ts` | паспорт проекта (имя, версия, dependencies) |
| **StepFileSliceV1** | `step_file_slice_v1.fbs` | `stepFileSliceV1.ts` | бинарный срез одного `.bvc` |
| **ModuleObjectSliceV1** | `module_object_slice_v1.fbs` | `moduleObjectSliceV1.ts` | модуль с bytecode + metadata |
| **TraceLinkSliceV1** | `trace_link_slice_v1.fbs` | `traceLinkSliceV1.ts` | бинарный trace-link (from/to GUID + relation) |
| **PvrgCacheMetricsSliceV1** | `pvrg_cache_metrics_slice_v1.fbs` | `pvrgCacheMetricsSliceV1.ts` | агрегат метрик PVRG (nodes, edges, file_edges, folder_edges) |

### GFS-Lite — overlay над текстом

`src/iohascGbc/gfsLite.ts` — in-memory VFS, у которого:
- `getBytes(logicalPath)` — байты слайса по логическому пути;
- `put(logicalPath, bytes)` / `delete(logicalPath)` — события `onIohascGbcGfsObjectUpdated` для UI;
- **overlay**: если в дереве `*.b64`, а в GFS — соответствующий `*.gbc`, чтение `*.b64` подставляет base64 байтов из GFS.

### Двусторонний мост с дисковым деревом

`mergeLogicalPathsWithGfsOverlay` (`gfsFileContentOverlay.ts`):
- добавляет в выдачу дерева `*.b64`-пути, если в GFS есть `*.gbc`.
- `mergeGetFileContentWithGfs`: при `getFileContent('*.b64')` возвращает строку base64 из GFS, **если непустой текст с диска отсутствует** (диск важнее GFS).

### Контракты и кэш

- Логические пути канонизированы (`cachePaths.ts`): `PASSPORT_SLICE_GBC_LOGICAL`, `STEP_FILE_SLICE_GBC_LOGICAL`, …
- Кэш в `.iohasc/cache/*.gbc` + `.iohasc/cache/*.b64` (текстовый эквивалент для git).
- Скрипты: `npm run iohasc:passport-gbc`, `iohasc:step-slice-gbc`, `iohasc:module-slice-gbc`, `iohasc:trace-link-slice-gbc`, `iohasc:pvrg-cache-metrics-gbc`.
- Dev в браузере: `VITE_IOHASC_DEV_SYNC_STEP_SLICE=1` — при сохранении `.bvc` в дерево автоматически пересчитывается `step-file-slice.b64`.
- В Work Graph Rebuild — только charter-фиксация (`gbc-gvm-zig-deferral-boundary.bvc`), реализация в исходном `D:/Work/IDE/project`.

## 2. Зачем стандарт — какую боль решает

| Боль | Кто страдает | Чем закрывают |
|---|---|---|
| Бинарные форматы не дружат с git | разработчики | text-only (markdown, json, yaml) |
| Бинарные форматы требуют декодера для просмотра | code review | hex-dump, `git diff --binary` |
| Project metadata размазана (package.json, lockfile, …) | tooling | парсят каждый формат отдельно |
| Self-describing repository нет (RDF/Notion API ≠ git-native) | методологи | конвенции в README |
| `.b64` обвешан вокруг бинарей вручную (часто) | DevOps | base64 ручной |
| Zero-copy чтение в браузере для big repo | веб-IDE | загружают JSON и парсят целиком |
| Overlay between cached/runtime/disk — нет стандарта | tooling | каждый делает свой |

**Уникальное обещание GBC/GFS:** «бинарный слайс остаётся в git как `.b64` рядом с `.gbc`, читается zero-copy в браузере, накладывается на текстовое дерево overlay-VFS — без замены `getFileContent` API. Один формат — все слои проекта.»

## 3. Конкуренты — кто близко

| Технология | Сильно | Слабо vs GBC/GFS |
|---|---|---|
| **FlatBuffers сам по себе** | zero-copy, экосистема | без overlay-VFS, без `.b64`-twin для git |
| **Cap'n Proto** | zero-copy | то же |
| **Protocol Buffers** | мейнстрим | требует декодирования |
| **SQLite в репо** | self-describing | binary blob, не git-friendly |
| **DuckDB файлы** | analytical | для аналитики, не для metadata |
| **Apache Parquet** | columnar | data, не code |
| **OCI image manifests** | self-describing layers | для контейнеров |
| **Git LFS** | большие бинари | external store, не в репозитории |
| **dolt (git for data)** | бинарь+history | специализированный database |
| **Plan9 9P / WebDAV** | overlay VFS | network FS, не in-process |
| **OverlayFS (Linux)** | union mount | OS-level |
| **wasmtime virtual fs** | песочницаed | runtime, не repository |
| **Bazel runfiles** | overlay для build | build-time |
| **Nx workspace metadata** | project graph | JSON, не binary |
| **Sourcegraph SCIP** | code index | один тип артефакта |
| **JSON-LD / RDF** | semantic | text, нет zero-copy |
| **Notion API objects** | typed blocks | proprietary |

**Главный конкурент:** прямой FlatBuffers — но без overlay-pattern и `.b64`-twin для git. GBC/GFS делает шаг дальше.

## 4. Что в GBC/GFS действительно уникально

Шесть вещей, которые **в одном пакете** не покрывает никто:

1. **`.gbc` + `.b64` twin** — binary в git как base64 + parallel binary cache file. Это позволяет git-diff видеть **семантический** diff (через переэнкод), а runtime читать zero-copy. Гениально просто.
2. **GFS-Lite overlay над текстовым контуром** — `getFileContent('*.b64')` прозрачно возвращает base64 байтов из in-memory GFS, без смены API. Это паттерн «binary as text proxy».
3. **Канонические логические пути** — `cachePaths.ts` фиксирует «`.iohasc/cache/passport-slice.gbc`» как контракт, без магии путей в коде.
4. **Self-describing слайсы** — каждый слайс знает свой тип (PassportSliceV1, StepFileSliceV1…), не «один общий blob».
5. **PVRG cache metrics как GBC слайс** — связка binary slice + AI agent (через AN-10). Это даёт агенту проектные метрики **константой памяти**, без re-scan.
6. **Dev autosync** — при сохранении `.bvc` бинарный срез **сам** пересчитывается. Это меняет ментальную модель: binary не «build-time artifact», а **derived runtime view**, синхронный с текстом.

## 5. Где GBC/GFS обречён проиграть

1. **Конкурировать с FlatBuffers напрямую** — невозможно, они мейнстрим.
2. **Стать заменой git LFS** — другая ниша.
3. **Без killer-app** мёртв, формат сам по себе никого не интересует.
4. **Без интеграции с PVRG/Step/Trace** — это просто «ещё один бинарный формат».
5. **Сложность входа** — нужно понимать FlatBuffers, схемы `.fbs`, кэш-пути.

## 6. Что нужно сделать (артефакты)

**5 артефактов** для стандартизировать:

1. **Спецификация GBC v1** (`step-canon/gbc-spec`)
   - Каноническая схема `.fbs` для базовых слайсов.
   - Контракт двойного хранения (`.gbc` + `.b64`).
   - Конвенция логических путей.
2. **Спецификация GFS-Lite** — overlay-VFS контракт: `getBytes`, события, merge с дисковым деревом.
3. **`@step-canon/gbc`** — npm пакет с TS encoder/decoder для базовых слайсов + FlatBuffers builder/reader.
4. **`@step-canon/gfs`** — GFS-Lite реализация (in-memory, browser+node).
5. **CLI** `gbc encode --schema passport ...`, `gbc decode ...`, `gfs merge`.

## 7. Стратегические подварианты

| Под-вариант | Суть | Срок | Шанс |
|---|---|---|---|
| **A: open binary canon для AI-IDE** | self-describing repository для AI-агентов | 4-6 мес | **средний** |
| **B: extension к git** | git smudge/clean фильтры `.gbc` ↔ `.b64` | 2-3 мес | средний |
| **C: alternative к sqlite в репо** | typed binary slices вместо одной БД | 6-12 мес | низкий |
| **D: spec only** | без runtime ambition | 2 мес | средний |
| **E: 1С-vertical bytecode** | для 1С: конфигурации как GBC слайсы | 4-6 мес | средний |

**Ставка — A + B**.

## 8. Решения **до** начала работ

- **Имя**: «GBC» путается с Game Boy Color. **Переименовать**.
- **Coupling с Genesis vision**: GBC сейчас часть «Genesis IDE roadmap». Для стандартизировать **отделить от Genesis/GVM/Zig** (это R&D трек).
- **EN canon**: схемы `.fbs` на английском.
- **Лицензия**: Apache 2.0 + CC BY для спеки.

## 9. Риски

- Имя GBC конфликт с retro-gaming.
- FlatBuffers — высокий barrier для понимания.
- Без AN-10 (PVRG) и AN-9 (IR) GBC не имеет реальной ценности.
- Git большая база `.b64` — оптимизация LFS на лету (или периодический prune).

## 10. Метрики через 6 месяцев

**Зелёные:** spec на GitHub, ≥50 stars, ≥2 внешних использования (например для нестандартной project-metadata).

**Красные:** никто кроме автора → разворот в D (spec only) или отказ.

## 11. Что **не делать**

- Не пытаться заменить FlatBuffers / Cap'n Proto.
- Не делать GBC обязательным для `.bvc`/IR/PVRG.
- Не привязывать к GVM (см. AN-12) — это другой R&D трек.
- Не делать без EN-canon.

## 12. Связь с другими аналитиками

- **AN-10 (PVRG)**: PVRG cache metrics — пример GBC слайса. Loose coupling.
- **AN-9 (IR)**: IR bundle может стать GBC слайсом для zero-copy исполнения.
- **AN-12 (GVM)**: GVM использует `ModuleObjectSliceV1.bytecode_b64` для Wasm-байткода. **Tight coupling сейчас** — нужно ослабить.
- **AN-8 (`.bvc`)**: StepFileSliceV1 — binary form. Опциональная.

## 13. Roadmap (8 недель)

| Неделя | Артефакт |
|---|---|
| 1 | Решить §8 (имя, EN, отделение от Genesis) |
| 2-3 | Спецификация GBC + GFS контракты |
| 4-5 | `@step-canon/gbc` (encoder/decoder для 5 базовых слайсов) |
| 6 | `@step-canon/gfs` |
| 7 | CLI + git smudge/clean фильтры |
| 8 | Spec doc, examples, post |

## 14. Финальный вердикт

GBC/GFS — **технически уникальный, продуктово сомнительный** артефакт. Сам по себе не нужен никому. Имеет ценность **только** в связке с PVRG, IR, Trace-links. Standardize имеет смысл **после** AN-8 / AN-9 / AN-10 — иначе нет потребителя.

**Минимальная проверка через 6 недель:** имя зафиксировано, `@step-canon/gbc` опубликован с 5 базовыми слайсами, git smudge/clean демо работает. Если за месяц ни одного внешнего issue — D (spec only) или закрытие трека.

---

**См. также:** [AN-10 PVRG](pvrg-verified-reference-graph.md), [AN-12 GVM](gvm-sbg-мандат-wasm-runtime.md), [AN-9 IR](ir-rich-ir-открытый канон.md), [AN-8 step](step-as-открытый канон-standard.md).
