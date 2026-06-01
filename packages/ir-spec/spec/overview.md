# IR Flow v1 — overview (draft)

Published: 2026-06-01

IR is a **machine format** second to BVC. Humans write BVC prose; tools normalize to IR Flow for execution, validation, and trace.

## Node kinds

- `decision` — branch on condition
- `action` — side effect or tool call
- `merge` — join parallel paths
- `start` / `end` — boundaries

## BVC on nodes

Every executable node SHOULD carry `basis`, `vector`, `goal` copied or derived from source BVC atom.

## RichIR extensions

Optional: `domain`, `stepVersion`, `references`, ontology terms — see AN-9.

## Conformance

Future: `tests/conformance/ir-flow/` fixtures. Not blocking Work Graph MVP.
