# Work Graph Rebuild Skill

Use this skill when working inside the `work graph` rebuild directory or when making architectural decisions for the new minimal ioHasC rebuild.

## Purpose

Keep the rebuild aligned with its own methodology:

- `.bvc` is the canonical format for intentions, tasks, rules, and trace.
- LLMs should produce Step Atom Draft JSON first; deterministic formatters should write canonical `.bvc`.
- Work Graph is the operational task model.
- Evidence is required before marking work done.
- Existing ioHasC layers are classified as `take`, `replace`, or `defer`.

## Required First Reads

Before proposing or changing architecture, read:

1. `charter/main.bvc`
2. `work/backlog.bvc`
3. `rules/agent-behavior/rebuild.bvc`
4. `protocols/llm-step-atom-writer.bvc`
5. `schemas/step-atom-draft.v1.json`

## Working Rules

- Prefer adding or updating `.bvc` artifacts for canonical decisions.
- For new atoms, create a Step Atom Draft shape first: `profile`, `name`, `basis`, `vector`, `goal`, `labels`.
- Put machine fields under `labels` / `Метки`, not as legacy top-level lines.
- Use Markdown only for human-readable summaries, indexes, or ADR-style explanation.
- Keep the first release focused on the golden path:
  `charter -> Work Graph task -> agent claim/execute -> code change -> evidence -> verification -> memory update`.
- Do not import old ioHasC code without classifying it:
  - `take`: unique and core to the new approach.
  - `replace`: useful goal, but use existing infrastructure or a cleaner implementation.
  - `defer`: promising, but not needed for the first golden path.

## Definition Of Done

A task is done only when:

- the relevant `.bvc` artifact is updated;
- evidence is recorded in `work/backlog.bvc` or a derived evidence artifact;
- the change advances the golden path or explicitly reduces scope.
