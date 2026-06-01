# AN-42: Публикация Work Graph — лицензии, форматы и что считать инновацией

**Запрос:** «В эпоху LLM всё копируется, защита может быть юридической, на перспективу роста, в выборе лицензий на технологии, например PVRG и IR и их формат это инновация? Кто из них универсальный читаемый формат?»

## Кратко

Да, прежняя формулировка «придержать алгоритмы» была слабой. В эпоху LLM защита через секретность почти не работает: код, prompts, ранжирование и UI-паттерны быстро копируются. Реалистичная защита для публикуемого проекта — **юридическая и экосистемная**:

- правильно выбрать лицензии;
- закрепить авторство и дату публикации;
- отделить открытые стандарты от коммерческих пакетов;
- использовать trademark/бренд для названий;
- при необходимости сделать patent/defensive publication до широкого релиза;
- строить рост через conformance suite, registry, hosted/enterprise features и вертикальные пакеты.

Главный вывод: **BVC — единственный кандидат на универсальный человекочитаемый формат.** IR/RichIR и PVRG — инновационные машинные форматы второго уровня. **Bracket IR + bracketIrToVectorAst** — узкий compiler-слой для исполняемого блока `Вектор` (префикс `bracket:`), не замена BVC и не core Work Graph MVP; в WG уже портирован только **hash/trace drift** (`bracketIrTraceSignal`).

## 1. Ошибка в прежнем подходе

Фраза «придержать graph ranking, prompts, thresholds» звучит разумно только для короткой внутренней форы. Для долгой стратегии это слабая защита:

- LLM помогает быстро переписать реализацию по описанию;
- пользователи и конкуренты видят поведение через продукт;
- prompts и heuristics не дают устойчивого moat;
- секретность мешает доверию к формату;
- закрытый core не станет стандартом.

Поэтому вопрос не «что спрятать», а:

1. **Что сделать стандартом**, чтобы вокруг этого появился сетевой эффект?
2. **Какой лицензией управлять ростом и коммерческим использованием?**
3. **Какие имена, спецификации и тесты закрепить за проектом?**
4. **Где продавать ценность, если код открыт?**

## 2. Что здесь является инновацией

### BVC

**Да, инновация как формат.** BVC — человекочитаемый атом смысла:

```bvc
#!bvc lang=en

#AgentCharter<[
Basis:
  The project uses AI agents, but chat history is not durable.
Vector:
  Store intentions, work items and evidence as typed atoms.
Goal:
  Keep agent work auditable across sessions.

Labels:
  profile: charter
  trace.status: pending
]>
```

Уникальность:

- Basis / Vector / Goal как первичная смысловая триада;
- `Labels` внутри блока, а не frontmatter;
- один атом читается человеком и парсится агентом;
- dialect model: EN canonical + RU registered dialect;
- подходит для charter, work item, decision, evidence, memory.

**Роль:** универсальный readable-формат. Это то, что можно продвигать как «Markdown для намерений AI-эпохи», не обещая заменить Markdown вообще.

### IR / RichIR

**Да, инновация как промежуточное представление**, но не как универсальный формат для людей.

IR — это typed CFG / workflow graph, куда BVC-проза нормализуется для исполнения, проверки и trace:

```json
{
  "schema": "ir.flow.v1",
  "nodes": [
    {
      "id": "check-intent",
      "kind": "decision",
      "basis": "A work item must have a clear reason.",
      "vector": "Check whether basis/vector/goal are present.",
      "goal": "Reject vague work before execution."
    }
  ],
  "edges": []
}
```

Уникальность:

- BVC-поля на узлах CFG;
- bridge `BVC ↔ IR`;
- LLM-friendly JSON, а не BPMN XML;
- RichIR добавляет domain, version, references, ontology terms;
- trace-links связывают IR node с кодом и evidence.

**Роль:** машинный exchange/runtime format для tools. Он должен быть понятным разработчику, но не основным языком оператора.

### PVRG

**Да, инновация как формат графа проекта**, но тоже не универсальный readable-формат.

PVRG — deterministic project graph: файлы, функции, BVC-атомы, тесты, evidence и trace-links как typed nodes/edges:

```json
{
  "schema": "pvrg.v1",
  "nodes": [
    { "id": "file:src/workGraphRuntime.mjs", "kind": "file" },
    { "id": "work:install-work-graph", "kind": "work_item" }
  ],
  "edges": [
    { "from": "work:install-work-graph", "to": "file:src/workGraphRuntime.mjs", "kind": "touches" }
  ]
}
```

Уникальность:

- deterministic graph, не LLM-generated graph;
- graph для AI-agent context, а не только code navigation;
- узлы BVC/intent/evidence рядом с code nodes;
- verified edges и invariants;
- subgraph extraction для MCP/agent context.

**Роль:** машинно-читаемый project graph. Пользователь видит его через UI/diagram/query, но не пишет руками.

### Bracket IR + bracketIrToVectorAst

**Да, инновация как compiler-bridge**, но **не** универсальный readable-формат и **не** ядро Work Graph для OneBase MVP.

Не путать с синтаксисом BVC `#Имя<[ … ]>`. Bracket IR — отдельная грамматика `{ … }`, `< … >`, `( … )` внутри секции **`Вектор`**, когда она начинается с префикса `bracket:`:

```text
{(если) <(больше (сумма) (1000))>} <(то) <{(вернуть <(ошибка ("Требуется верификация"))>)}>>
```

Цепочка в ioHasC (код: `../project/src/parser/`):

```text
текст Вектор (bracket: …)
  → parseBracketIr              — дерево block/angle/paren/ident/literal
  → bracketIrToVectorAst        — lowering в Vector DSL Program (Rule, ActionCall, …)
  → codegen (TS и др.)
  → vectorHash + parserEngineVersion — кэш, diff, CI (Phase 11)
```

Уникальность:

- RU/EN ключевые слова (`если`, `больше`, `вернуть` / `if`, `greater`, …) сходятся к **одному** Bracket IR и Vector AST после фиксации правил;
- детерминированный парсинг структуры правил **без LLM** (LLM не генерирует дерево);
- hash drift: `vectorHash = H(normalize(bracket body) ‖ engineVersion)` — если step изменился, а `trace.bracket_ir_hash` в work item старый → `bracket_ir.hash_drift`;
- семантический diff IR (canonical JSON) для compiler round-trip.

**Что не инновация само по себе:** скобочный DSL и lowering в AST — классика; Vector DSL пересекается с IR/RichIR и rule engines.

**Роль для Work Graph:**

| Компонент | В WG сейчас | Рекомендация при публикации |
|-----------|-------------|----------------------------|
| `bracketIrTraceSignal` (hash/drift) | портирован, `port-bracket-ir-trace-envelope` done | **оставить** в open core |
| `parseBracketIr` + `bracketIrToVectorAst` | не портирован | **defer** / experimental, не блокировать MVP |
| Bracket IR cache (Phase 11) | нет | optional tooling, не public MVP |
| Codegen round-trip из Vector | defer для OneBase | commercial/compiler pack позже |

Work items в WG пишут **обычный русский `Вектор`**, не `bracket:`. Bracket IR — **legacy/compiler профиль** для step→code, не конкурирует с BVC prose и не заменяет IR Flow (AN-9) для agent plans.

**Роль в стеке:** боковая ветка **BVC → (опционально bracket: Vector) → Vector AST → code**; параллельно основная линия **BVC → IR → PVRG → Trace/Evidence**.

## 3. Кто из них универсальный читаемый формат

| Кандидат | Человек пишет руками? | Машина парсит? | Универсальность | Вердикт |
|----------|------------------------|----------------|-----------------|---------|
| **BVC** | Да | Да | Высокая: намерения, правила, задачи, evidence | **Главный readable-формат** |
| **IR/RichIR** | Иногда, но не желательно | Да | Средняя: workflows, reasoning traces, agent plans | Машинный формат |
| **PVRG** | Нет | Да | Средняя: project graph / code graph | Машинный формат |
| **Bracket IR** | Технически да (`bracket:`), но не для оператора | Да | Узкая: исполняемые правила в `Вектор` | Compiler-профиль, defer в WG MVP |
| Trace-Links | Редко | Да | Средняя: связи артефактов | Sidecar-формат |
| Audit Gap Matrix | Нет | Да | Узкая: отчёты проверки | Report format |

Если нужен один публичный «язык», это **BVC**.  
Если нужен технологический стек: **BVC → IR → PVRG → Trace/Evidence**, с опциональной веткой **BVC → Bracket IR → Vector AST → code** для compiler/low-code (не для OneBase golden path).

## 4. Лицензионная стратегия

### Рекомендованный минимум

| Артефакт | Лицензия | Почему |
|----------|----------|--------|
| BVC spec | **CC BY 4.0** или **CC0 + trademark policy** | Спеку должны цитировать и реализовывать |
| BVC parser/formatter/CLI | **Apache-2.0** | Permissive + явный patent grant |
| IR/PVRG specs | **CC BY 4.0** | Форматы должны быть открыты |
| Bracket IR grammar spec | **CC BY 4.0** | Открыть грамматику `{ } < > ( )` и trace envelope |
| Bracket IR parser + bracketIrToVectorAst | **Apache-2.0** или **experimental/** | Не блокировать MVP; codegen pack позже |
| Bracket IR trace/hash (WG port) | **Apache-2.0** | Уже в open core (`bracketIrTraceSignal`) |
| IR/PVRG reference implementation | **Apache-2.0** | Удобно для adoption и компаний |
| Work Graph app/UI/MCP | **Apache-2.0** или **MPL-2.0** | Выбор зависит от желаемой защиты core-файлов |
| Domain packs / enterprise features | Commercial / source-available | Монетизация |
| Eval corpus, customer fixtures | Proprietary | Это данные и качество |

### Apache-2.0

Хороший выбор для core, если цель — рост и принятие компаниями:

- permissive;
- есть explicit patent grant;
- понятен юристам;
- не пугает интеграторов;
- подходит для standard/reference implementation.

Минус: конкуренты могут брать код и закрывать свои расширения.

### MPL-2.0

Хороший выбор, если хочется, чтобы изменения в core-файлах возвращались в открытый код, но чтобы компании могли писать закрытые плагины рядом:

- file-level copyleft;
- мягче GPL;
- proprietary modules возможны отдельно;
- полезно для parser/engine core, если важен вклад обратно.

Минус: adoption чуть хуже, чем у Apache/MIT, потому что юристы чаще задают вопросы.

### BUSL / source-available

Подходит не для форматов, а для коммерческого приложения или enterprise-паков:

- source visible;
- production/competitive use ограничен;
- позже можно auto-convert в open source.

Минус: это **не open source**. Если назвать это open-source, будет удар по доверию.

### MIT

Слишком слабая для долгой стратегии: проста, но нет явного patent grant и слабее юридическая рамка для инновационного формата. Для маленьких утилит норм, для BVC/IR/PVRG core лучше Apache-2.0.

## 5. Патенты и defensive publication

Я не юрист, но стратегически:

- если есть намерение патентовать конкретный механизм, нужно говорить с патентным специалистом **до** публичного раскрытия;
- если патентовать не хотим, стоит сделать **defensive publication**: датированная публичная спецификация, которая мешает другим запатентовать тот же подход;
- Apache-2.0 помогает с contributor patent grant, но не заменяет патентную стратегию;
- trademark защищает имя, а не идею.

Для BVC/PVRG/IR разумнее всего:

1. Опубликовать specs с датой и авторами.
2. Поставить Apache-2.0 на код.
3. Зарегистрировать/закрепить brand names: `BVC`, `Work Graph`, возможно `PVRG`.
4. Для особенно ценных claim-ов сделать отдельный defensive publication или provisional patent review.

## 6. Где юридическая защита реально работает

| Механизм | Что защищает | Что не защищает |
|----------|--------------|-----------------|
| Copyright | конкретный код, текст спеки, docs | идею, архитектурный паттерн |
| Patent | технический способ, если патентоспособен | бренд, код как текст |
| Trademark | название `BVC`, `Work Graph`, логотип | реализацию и формат |
| License | условия использования кода | независимую clean-room реализацию |
| Defensive publication | мешает чужим патентам | не запрещает копировать |
| Conformance trademark | «BVC-compatible» только по правилам | не запрещает несовместимые форки |

Поэтому рост строится не на «не скопируют», а на:

- самый понятный spec;
- лучший reference implementation;
- conformance tests;
- доверенный brand;
- hosted/enterprise workflow;
- доменные packs;
- сообщество и интеграции.

## 7. Рекомендация по каждому слою

### BVC

**Публиковать как открытый стандарт.**

- Spec: CC BY 4.0.
- Code: Apache-2.0.
- Org/package: `@bvc/*` или отдельный нейтральный namespace.
- Trademark policy: кто может писать «BVC-compatible».
- Conformance suite обязателен.

Почему: это единственный формат, который может получить adoption как readable канон. Если закрыть BVC, он не станет стандартом.

### IR/RichIR

**Публиковать как машинный стандарт второго уровня.**

- Spec: CC BY 4.0.
- Code: Apache-2.0 или MPL-2.0.
- Не продавать как universal language.
- Позиционировать как «AI-agent reasoning/workflow IR with BVC semantics».

Что может быть коммерческим:

- adapters к enterprise-системам;
- visual editor;
- verified runtime;
- domain profiles.

### PVRG

**Публиковать как открытый graph schema + lite scanner.**

- Spec: CC BY 4.0.
- Code: Apache-2.0 или MPL-2.0.
- Ставка не «заменить Sourcegraph», а «portable AI-agent project graph».

Что может быть коммерческим:

- advanced language adapters;
- hosted graph index;
- enterprise policy gates;
- private project analytics;
- vertical graph packs для 1С/OneBase.

### Bracket IR + Vector AST lowering

**Публиковать выборочно: trace envelope в core, полный compiler — defer или commercial pack.**

- **Open core (уже в WG):** `protocols/bracket-ir-trace-envelope-v1.bvc`, `bracketIrTraceSignal.mjs` — Apache-2.0; spec trace labels — CC BY 4.0.
- **Draft grammar spec:** `bracket-ir-to-vector-ast-examples.md` → нормализованная spec v1, CC BY 4.0.
- **Reference parser/lowering:** `parseBracketIr`, `bracketIrToVectorAst` — Apache-2.0 в `experimental/` или отдельном `@bvc/bracket-ir` пакете; **не** тащить в первый public tarball Work Graph MVP.
- **Не позиционировать** как второй BVC или universal language; это compiler-профиль для `bracket:` в `Вектор`.

Что может быть коммерческим:

- codegen backends (TS/PHP/…);
- Bracket IR cache + semantic diff tooling (Phase 11);
- verified round-trip CI pack;
- visual rule editor.

Почему defer для WG MVP: golden path OneBase — BVC prose + YAML/.os + MCP; `defer-vector-dsl-codegen` явно откладывает auto-codegen из Vector DSL.

### Work Graph

**Публиковать как продуктовый open core.**

- Core app/MCP/CLI: Apache-2.0 или MPL-2.0.
- Enterprise packs: commercial/source-available.
- Hosted/on-prem: коммерческая лицензия.

Если цель — максимальный рост, core лучше Apache-2.0. Если цель — не дать закрыть улучшения core без возврата, MPL-2.0.

## 8. Что не стоит делать

- Не делать BVC под BUSL: формат не взлетит.
- Не прятать BVC spec: это убьёт доверие.
- Не продавать PVRG как «универсально читаемый формат»: это graph schema, не язык человека.
- Не продавать Bracket IR как «язык оператора»: это `bracket:` compiler-профиль, defer для WG MVP.
- Не портировать полный `bracketIrToVectorAst` в core без отдельного codegen-эпика.
- Не смешивать всё в один public repo без лицензий по пакетам.
- Не надеяться, что «секретный prompt» защитит продукт.
- Не называть source-available open-source.

## 9. Практический выбор на сегодня

Если цель — публиковать проект и расти:

1. **BVC**: CC BY 4.0 spec + Apache-2.0 parser/CLI + conformance suite.
2. **IR/RichIR**: Apache-2.0 reference implementation, spec как draft/RFC.
3. **PVRG**: Apache-2.0 graph schema + lite scanner, advanced adapters позже.
4. **Bracket IR**: Apache-2.0 trace/hash в core; grammar spec CC BY 4.0; полный parser/lowering — experimental или commercial compiler pack, не WG MVP.
5. **Work Graph core**: Apache-2.0 для быстрого adoption или MPL-2.0, если важнее возврат изменений.
6. **OneBase/1С pack**: коммерческий/dual-license, потому что это вертикальная бизнес-ценность.
7. **Eval corpus/customer fixtures**: не публиковать, но использовать для платного качества.

Мой выбор: **Apache-2.0 для core + CC BY 4.0 для specs + commercial packs отдельно**. Это честнее и сильнее для роста, чем пытаться удержать секреты.

## 10. Как переформулировать стратегию

Старая формула:

> Открываем базу, придерживаем алгоритмы.

Новая формула:

> Открываем форматы и reference implementations так, чтобы они могли стать стандартом. Защиту строим через лицензии, trademark, conformance, дату публикации, коммерческие packs и лучший сервис вокруг открытого core.

## feeds_epics

- `epic-work-graph-open-publication` — лицензии, open core, specs BVC/IR/PVRG, legal hygiene, закрытие AN-42

## 11. См. также

- [Plan: open publication](../docs/plan-work-graph-open-publication.md)
- [AN-8: BVC как открытый канон](step-as-open-canon-standard.md)
- [AN-9: IR/RichIR как открытый канон](ir-rich-ir-open-canon.md)
- [AN-10: PVRG](pvrg-verified-reference-graph.md)
- Bracket IR: [`../../../project/docs/architecture-v2/bracket-ir-to-vector-ast-examples.md`](../../../project/docs/architecture-v2/bracket-ir-to-vector-ast-examples.md), `protocols/bracket-ir-trace-envelope-v1.bvc`, `src/bracketIrTraceSignal.mjs`
- [AN-16: мета-обзор уникальных технологий](unique-tech-stack-meta-review.md)
- [AN-7: продуктовый аудит](product-self-audit-user.md)
