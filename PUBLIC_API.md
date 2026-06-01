# Work Graph — public API surface

**Policy:** [trademark-conformance-policy.md](docs/trademark-conformance-policy.md)

## Stable (v1)

### BVC format

- File extension: `.bvc`
- Atom shape: `#Name<[ Basis / Vector / Goal / Labels ]>`
- Package: `@bvc-lang/spec`, `@bvc-lang/cli`
- Conformance: `npm test -- tests/bvcConformance.test.mjs`

### Work Graph MCP

- Package: `@work-graph/mcp` (v0.2.0+; was `@iohasc/workgraph-mcp` in monorepo)
- Tools: work item CRUD, snapshot read — see `packages/workgraph-mcp/README.md`

### Backlog UI HTTP (local)

| Endpoint | Method | Stable |
|----------|--------|--------|
| `/api/snapshot` | GET | yes |
| `/api/dashboard-snapshot` | GET | yes |
| `/api/home-snapshot` | GET | yes |
| `/api/workspaces` | GET | yes (power-user) |
| `/api/workspace/switch` | POST | yes (power-user, no UI) |

### CLI

- Package: `@work-graph/cli` (v0.2.0+)
- `npx @work-graph/cli init [path]` — npm-first per-project install
- `work-graph ui [path]` — backlog UI
- `work-graph doctor [path]` — install check
- `work-graph register [path]` — optional registry

## Draft (may change before 1.0)

| Surface | Package / path |
|---------|----------------|
| IR Flow schema | `packages/ir-spec/schemas/ir-flow.v1.json` |
| PVRG schema | `packages/pvrg-spec/schemas/pvrg.v1.json` |
| Bracket IR trace envelope | `protocols/bracket-ir-trace-envelope-v1.bvc` |

## Experimental (not public API)

- `experimental/` — R&D, no semver
- Full Bracket IR compiler (`parseBracketIr`, `bracketIrToVectorAst`) — sibling repo, defer
- Genesis / GVM / Wasm mandate tracks

## Not public

- Eval fixtures under `tests/fixtures/eval/`
- Internal analytics operator drafts marked private in inventory
