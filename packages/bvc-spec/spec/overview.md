# BVC format overview (v0.0.0 draft)

**Human name:** BVC — Basis · Vector · Goal  
**Extension:** `.bvc`.

## Atom shape

```
#Name@en<[
Basis:
  - context
Vector:
  - action
Goal:
  - telos

Labels:
  profile: work_item
  trace.status: pending
]>
```

## Multilingual (Detect-or-Declare)

Priority: `#Name@lang` → `Labels.lang` → `#!bvc lang=xx` → auto-detect first BVC key → `en`.

One dialect per atom. Mixed keys = `E_BVC_DIALECT_MIX`.

## Artifacts in this package

- `dialects/*.json` — localized BVC section titles
- `schemas/bvc-atom-draft.v1.json` — LLM intermediate JSON

## Status

Published on npm as `@bvc-lang/spec`. Reference parser/linter: `@bvc-lang/cli`.
