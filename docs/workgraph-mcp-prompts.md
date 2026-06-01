# WorkGraph MCP Prompts

## Цель

Prompts give Cursor, Claude, and other MCP clients ready entrypoints for WorkGraph workflows. They do not replace tools; each prompt tells the agent which WorkGraph tools/resources to call and which evidence gates to respect.

## Prompts

- `take_next_work_item`: inspect the current cycle, choose a ready item, claim it, implement it, add evidence, and complete only after verification.
- `create_work_item`: draft a small `.work.bvc` WorkItem in the intent tree and update `intent/index.bvc`.
- `add_evidence`: inspect one WorkItem, verify a fact, and append a concrete evidence line.
- `close_work_item`: verify one WorkItem against its criteria and close it with `complete_work_item`.
- `show_blockers`: summarize blocked items, dependency gaps, and smallest unblock actions without writing by default.
- `summarize_current_cycle`: summarize current focus, ready queue, blocked risks, and recommended next action.

## Safety Rules

- Read before writing: use `get_current_cycle`, `list_work_items`, `get_work_item`, or `workgraph://item/{workId}`.
- Use WorkGraph write tools for state changes: `claim_work_item`, `update_work_item_status`, `add_work_item_evidence`, and `complete_work_item`.
- Do not mark a WorkItem `done` without concrete evidence.
- Use `blocked` with an explicit reason when the task cannot proceed.
- Keep dashboard/kanban operations in the WorkGraph UI; MCP is the bridge for agent clients.
