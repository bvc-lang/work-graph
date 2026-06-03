# @bvc-lang/spec

**BVC** (Basis · Vector · Goal) — typed atom format for AI-agent context and durable intent.

BVC is a small text format for writing durable, reviewable intent that both humans and AI agents can use. A BVC atom separates:

- **Basis** — context and constraints
- **Vector** — direction, action or plan
- **Goal** — desired outcome

Public file extension: **`.bvc`**.

## Why BVC?

BVC is meant for agent-facing project memory, work contracts, architecture notes and prompt rules where plain Markdown is too loose and JSON/YAML is too noisy for humans.

Use BVC when you need:

- stable text artifacts that can live in Git;
- a predictable shape for LLM context and tools;
- multilingual authoring without mixing aliases in one file;
- evidence and labels that machines can inspect.

## Example

```bvc
#Ship_Spec_Update@en<[
Basis:
  - Public README is too thin for first-time readers.
Vector:
  - Document the format, package artifacts and compatibility story.
Goal:
  - A developer can understand BVC without reading the implementation repo.

Checks:
  - npm pack --dry-run
Evidence:
  - npm publish @bvc-lang/spec@0.0.6

Labels:
  atom.profile: work_item
  trace.status: done
]>
```

The same atom can be authored with registered Russian section titles:

```bvc
#!bvc lang=ru

#Обновить_Спеку<[
Базис:
  - Публичная страница должна объяснять формат.
Вектор:
  - Описать BVC, dialect registry и schema artifacts.
Цель:
  - Читатель понимает, когда использовать BVC.

Метки:
  atom.profile: work_item
  trace.status: done
]>
```

## Package contents

| Path | Description |
|---|---|
| `dialects/en.json`, `dialects/ru.json` | Registered dialect registry (Detect-or-Declare) |
| `schemas/bvc-atom-draft.v1.json` | LLM draft JSON schema (`lang`, BVC fields, optional `structuredEvidence`) |
| `spec/overview.md` | Spec overview, dialect rules, optional sections and compatibility notes |

## Quick Start

Install the static spec artifacts:

```bash
npm install @bvc-lang/spec
```

Use the package from Node.js:

```javascript
import spec, { dialects, schemas } from '@bvc-lang/spec';
import ruDialect from '@bvc-lang/spec/dialects/ru.json' with { type: 'json' };

console.log(spec.extension); // .bvc
console.log(dialects.en.bvc.basis); // Basis
console.log(ruDialect.bvc.basis); // Базис
console.log(schemas.bvcAtomDraftV1.properties.lang.enum); // [ 'en', 'ru' ]
```

For command-line linting and formatting, install the companion CLI:

```bash
npm install -g @bvc-lang/cli
bvc lint path/to/file.bvc
bvc format path/to/file.bvc
```

## Related packages (roadmap)

- `@bvc-lang/cli` — `bvc lint`, `bvc format`
- `@bvc/parser` — future standalone parser package

## Governance

- Public file extension: **`.bvc`**
- Legacy readable extension: **`.step`** (compatibility alias; new writes use `.bvc`)
- Multilingual: EN canonical + registered dialects, no inline aliases
- Evidence: prose `Evidence` / `Свидетельства` remains valid; `structuredEvidence[]` is an optional machine-readable companion in the draft schema

## Compatibility

BVC currently treats `.bvc` as the public canonical extension. Some early Work Graph artifacts used `.step`; `.step` remains a readable compatibility alias, but new public writes should use `.bvc`.

The canonical dialect is English. Other dialects are registered through JSON files. A single atom must use one dialect for BVC section titles; mixed section keys are a lint error.

## Conformance

The current implementation reference lives in the Work Graph pilot repository and is exposed through `@bvc-lang/cli`.

Conformance checks include:

- EN/RU atoms normalize to equivalent ASTs;
- Detect-or-Declare language resolution;
- mixed dialect linting;
- `.bvc` / legacy `.step` read compatibility;
- `structuredEvidence[]` schema shape.

## License

- **Code** in this package: Apache-2.0 (`LICENSE`)
- **Specification text** (`spec/`, format description in README): CC BY 4.0 (`LICENSE-SPEC`)

## Links

- GitHub: https://github.com/bvc-lang/spec
- npm: https://www.npmjs.com/package/@bvc-lang/spec
- CLI: https://www.npmjs.com/package/@bvc-lang/cli
