# ADR: Detail drawer repo-file frame v1

**Status:** accepted  
**Date:** 2026-06-04  
**Related:** AN-59, `epic-drawer-repo-file-preview-v1`, `epic-detail-drawer-stack-v1`

## Context

Analytics and task drawers list repository paths (`relatedFiles`, `work.target_files`, markdown prose) as plain text. Operators cannot drill into `tests/*.mjs`, `protocols/*.bvc`, or similar evidence paths without leaving the Work Graph UI.

The detail drawer stack (AN-54) supports typed frames and push/pop navigation, but has no frame type for read-only file preview.

## Decision

1. **Frame type `repo-file`:** `{ schema: detail-stack.frame.v1, type: 'repo-file', key, title, payload: { repoPath } }`.
2. **Push rules:** click on a repo path **inside** an open drawer (`#detail-body` or `#detail-sub-body`) → seed L1 context if stack depth is 0 → `push(repo-file)` → render L2 sub-drawer via `renderTopDetailStackFrame()`.
3. **Back / Esc:** existing `popDetailStackNavigation()` — no ad hoc file modal.
4. **Preview API:** `GET /api/repo-file/preview?path=…` returns `{ schema: workgraph.repo-file-preview.v1, path, language, content, truncated, byteLength }`.
5. **Security:** relative paths only; reject `..` and absolute paths; resolve under active workspace `cwd`; cap 128 KB; **no** worker `targetFiles` allowlist for operator preview.
6. **Rendering:** code → `highlightCodeBlock`; markdown/bvc/md → `renderMarkdownDocument`; errors → inline message panel.
7. **Links:** unified `button.repo-file-link[data-repo-file-path]` from related file lists, target_files accordion, and P1 autolink in markdown HTML (outside `pre`/`code`).

## Consequences

- Operators drill down analysis → file → nested file without losing drawer context.
- Multiproject host uses active workspace root for path resolution.
- Unit tests: `tests/repoFilePreviewApi.test.mjs`; smoke in `workGraphBacklogUiServer.test.mjs`.

## Out of scope v1

- Monaco editor, diff, git blame, open in IDE
- Cross-repo paths without workspace switch
- Binary file preview
