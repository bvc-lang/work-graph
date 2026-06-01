# @work-graph/ir-spec (draft)

**IR Flow v1** — machine-readable workflow graph where each node carries BVC fields (`basis`, `vector`, `goal`).

Draft spec for public release (AN-42). Reference implementation lives in sibling ioHasC repo; Work Graph ships schema + overview only.

## Schema

- `schemas/ir-flow.v1.json` — minimal IR Flow envelope

## Example

```json
{
  "schema": "ir.flow.v1",
  "nodes": [
    {
      "id": "check-intent",
      "kind": "decision",
      "basis": "Work item must have clear reason.",
      "vector": "Check basis/vector/goal present.",
      "goal": "Reject vague work before execution."
    }
  ],
  "edges": []
}
```

## License

- Spec text: **CC BY 4.0** (`LICENSE-SPEC`)
- Package metadata & schemas: **Apache-2.0** (`LICENSE`)

## See also

- [AN-9](../../work/analytics/ir-rich-ir-open-canon.md)
- [adr-work-graph-open-publication.md](../../docs/adr-work-graph-open-publication.md)
