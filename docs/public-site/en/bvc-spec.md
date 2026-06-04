## What is a BVC atom

BVC (Basis–Vector–Goal) is the machine-readable contract for a single unit of work in Work Graph. It is not a chat ticket or a PM note: the atom lives in your repository as `.bvc`, is read via `get_work_contract`, and closing work requires evidence and gates.

## Required sections

| Section | Purpose |
|---------|---------|
| **Basis** | Why the work exists: context, constraints, link to the decision (AN) |
| **Vector** | What changes: files, APIs, behaviour, allowlist boundaries |
| **Goal** | How done is recognised: observable criterion, not “the agent said done” |

The atom may also include **Labels** (`work.id`, `work.status`, `target_files`), **Checks** (commands and tier gates), and **Evidence** (structured records).

## Status lifecycle

1. `backlog` — described, contract draft or ready for review.
2. `ready` — agent may call `claim_work_item`.
3. `claimed` / `doing` — execution within `target_files` and allowlist.
4. `verify` — evidence collected, awaiting `assert_task_ready_for_done`.
5. `done` / `verified` — gate passed; record may enter project memory.

## Examples

**Minimal atom** — three sections and `work.id`:

```bvc
#Task_add_llms_txt<[
Basis:
  Agents need a stable entrypoint for Work Graph docs.
Vector:
  Add /llms.txt with key pages and interaction rules.
Goal:
  Cursor and Claude Code can discover docs without scraping HTML.

Labels:
  work.id: add-llms-txt
  work.status: backlog
]>
```

**Realistic** — with `target_files` and checks: see [bvc-spec.bvc.example](/docs/bvc-spec.bvc.example).

**Anti-example** — atom without **Goal**: backlog lint and MCP return `invalid_bvc_section`; it is not a valid contract.

## Related MCP tools

- `create_work_item` — create an atom under `intent/`
- `get_work_contract` — read the contract before editing

Machine-readable authoring context: `/api/docs/bvc-authoring-context`.
