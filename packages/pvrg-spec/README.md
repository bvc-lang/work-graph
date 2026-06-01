# @work-graph/pvrg-spec (draft)

**PVRG** — Project Verified Reference Graph: deterministic project graph for AI-agent context (files, work items, BVC atoms, trace-links as typed nodes/edges).

Draft schema for public release (AN-42). Full scanner: sibling `pvrg-core/` repo. Work Graph ships schema + lite integration in architecture snapshot.

## Schema

- `schemas/pvrg.v1.json`

## Example

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

## License

- Spec text: **CC BY 4.0** (`LICENSE-SPEC`)
- Schemas: **Apache-2.0** (`LICENSE`)

## See also

- [AN-10](../../work/analytics/pvrg-verified-reference-graph.md)
