# BVC format overview (v0.0.6 draft)

**Human name:** BVC — Basis · Vector · Goal  
**Extension:** `.bvc`.
**Legacy readable extension:** `.step` (compatibility alias; new writes use `.bvc`).

## Purpose

BVC is a compact, human-readable atom format for durable intent. It is designed for AI-agent workflows where the same artifact should be:

- easy for a human to review in Git;
- predictable for an LLM to consume;
- structured enough for linting, projection and evidence gates;
- stable across languages through a dialect registry.

BVC is not a replacement for general Markdown documentation or JSON APIs. It is a focused format for small intent atoms: work items, prompt rules, architecture decisions, trace notes and other context records.

## Core Atom Shape

```
#Name@en<[
Basis:
  - context
Vector:
  - action
Goal:
  - telos

Labels:
  atom.profile: work_item
  trace.status: pending
]>
```

An atom has:

- a header: `#Name<[` or `#Name@en<[`;
- required BVC sections: `Basis`, `Vector`, `Goal`;
- a machine section: `Labels`;
- a closing marker: `]>`.

Line items inside text sections are plain text. Formatters may accept leading `-` list markers and normalize them.

## Required Sections

| Field | Meaning | English title | Russian title |
|---|---|---|---|
| `basis` | Known context, constraints, reasons | `Basis` | `Базис` |
| `vector` | Direction, action, plan, movement | `Vector` | `Вектор` |
| `goal` | Desired outcome or acceptance result | `Goal` | `Цель` |
| `labels` | Machine-readable key/value metadata | `Labels` | `Метки` |

Label keys are machine keys and should stay stable across dialects. Example: `atom.profile`, `trace.status`, `work.id`.

## Optional Sections

Optional sections are part of the registered dialects and are useful for agent workflows:

| Field | English title | Russian title | Notes |
|---|---|---|---|
| `checks` | `Checks` | `Проверки` | Human-readable verification checklist |
| `evidence` | `Evidence` | `Свидетельства` | Prose or command evidence summary |
| `analysis` | `Analysis` | `Анализ` | Reasoning or triage notes |
| `decision` | `Decision` | `Решение` | Chosen outcome and rationale |
| `uiRefs` | `UI_References` | `Референсы_UI` | UI or external references |

## Multilingual (Detect-or-Declare)

Priority: `#Name@lang` → `Labels.lang` → `#!bvc lang=xx` → auto-detect first BVC key → `en`.

One dialect per atom. Mixed keys = `E_BVC_DIALECT_MIX`.

Registered dialects in this package:

- `en` — canonical section titles: `Basis`, `Vector`, `Goal`, `Labels`
- `ru` — registered section titles: `Базис`, `Вектор`, `Цель`, `Метки`

Examples:

```bvc
#English_Atom@en<[
Basis:
  - Uses explicit header lang.
Vector:
  - Keep section titles in one dialect.
Goal:
  - Parser resolves lang=en.

Labels:
  atom.profile: prompt_rule
]>
```

```bvc
#!bvc lang=ru

#Русский_Атом<[
Базис:
  - Uses file-level pragma.
Вектор:
  - Section titles stay Russian.
Цель:
  - Parser resolves lang=ru.

Метки:
  atom.profile: prompt_rule
]>
```

## Draft schema

`schemas/bvc-atom-draft.v1.json` defines the structured authoring boundary used by formatters and LLM tools.

Core fields:

- `profile`, `name`, `basis`, `vector`, `goal`
- optional `labels`, `lang`, `checks`, `evidence`
- optional `structuredEvidence[]` as a machine-readable companion to prose evidence

`structuredEvidence[]` records are intentionally optional in the draft schema so existing atoms remain valid. Implementations may make structured evidence required for stricter task or gate tiers.

Minimal draft JSON:

```json
{
  "profile": "work_item",
  "name": "Ship_Spec_Update",
  "lang": "en",
  "basis": ["Public spec page is too terse."],
  "vector": ["Explain the format and artifacts."],
  "goal": ["Readers can start without private context."],
  "labels": {
    "trace.status": "done"
  }
}
```

Structured evidence example:

```json
{
  "type": "command",
  "status": "succeeded",
  "command": "npm pack --dry-run",
  "exitCode": 0,
  "summary": "Package tarball includes README, schema and overview."
}
```

## Lints and compatibility

- `E_BVC_DIALECT_MIX`: one atom mixes BVC section keys from multiple dialects.
- `E_BVC_DIALECT_LANG_MISMATCH`: declared/resolved `lang` disagrees with section keys.
- `W_BVC_LANG_FALLBACK_EN`: no dialect declaration or detectable section key; parser falls back to `en`.
- `W_BVC_LEGACY_STEP_EXTENSION`: `.step` file path is readable but legacy.

## Public vs Implementation-Specific

This package defines the public syntax artifacts, dialect registry and draft JSON schema.

Implementations may define additional label conventions and profile-specific rules. For example, Work Graph uses labels such as `work.id`, `work.status`, `work.depends_on` and `trace.status`. Those labels are valid BVC metadata, but their workflow meaning belongs to the implementing system.

## Suggested Authoring Rules

- Use `.bvc` for new public files.
- Use exactly one dialect per atom.
- Keep label keys stable and English-like even in non-English atoms.
- Prefer `atom.profile` over a generic `profile` label.
- Put prose proof in `Evidence` and machine proof in `structuredEvidence[]` when a tool requires it.
- Treat generated JSON, dashboards and databases as projections, not as the source of truth for the atom.

## Artifacts in this package

- `dialects/*.json` — localized BVC section titles
- `schemas/bvc-atom-draft.v1.json` — LLM intermediate JSON

## Status

Published on npm as `@bvc-lang/spec`. Reference parser/linter: `@bvc-lang/cli`.
