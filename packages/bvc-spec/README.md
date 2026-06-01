# @bvc-lang/spec

**BVC** (Basis · Vector · Goal) — typed atom format for AI-agent context and durable intent.

Public file extension: **`.bvc`**.

## Package contents

| Path | Description |
|---|---|
| `dialects/en.json`, `dialects/ru.json` | Registered dialect registry (Detect-or-Declare) |
| `schemas/bvc-atom-draft.v1.json` | LLM draft JSON schema (`lang`, BVC fields) |
| `spec/overview.md` | Spec overview + links to ADR |

## Related packages (roadmap)

- `@bvc/parser` — reference parser / linter
- `@bvc-lang/cli` — `bvc lint`, `bvc format`

## Governance

- Public file extension: **`.bvc`**
- Multilingual: EN canonical + registered dialects, no inline aliases

## Install

```bash
npm install @bvc-lang/spec
```

```javascript
import spec from '@bvc-lang/spec';
import enDialect from '@bvc-lang/spec/dialects/en.json' with { type: 'json' };
```

## License

- **Code** in this package: Apache-2.0 (`LICENSE`)
- **Specification text** (`spec/`, format description in README): CC BY 4.0 (`LICENSE-SPEC`)

Conformance: `npm test -- tests/bvcConformance.test.mjs` in Work Graph repo. See [PUBLIC_API.md](../../PUBLIC_API.md).

## Links

- Work Graph pilot repo (implementation reference)
- AN-8 / AN-18 / AN-19 analytics (design history)
