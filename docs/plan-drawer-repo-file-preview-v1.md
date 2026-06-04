# Plan: epic-drawer-repo-file-preview-v1

## Цель

Клик по пути файла в drawer (analytics related files, task target_files) открывает следующий уровень detail stack с read-only предпросмотром и подсветкой синтаксиса для кода.

## Связи

- [AN-59](../work/analytics/drawer-repo-file-preview.md) — разбор
- [AN-54](../work/analytics/detail-drawer-stack-modal-queue.md) — detail drawer stack
- `epic-detail-drawer-stack-v1` — closed (stack infra)

## Треки

| # | work.id | P | Суть |
|---|---------|---|------|
| A | `decide-drawer-repo-file-frame-adr` | P0 | ADR frame `repo-file` + API contract |
| B | `implement-repo-file-preview-api` | P0 | `GET /api/repo-file/preview` |
| C | `wire-clickable-repo-file-links-in-drawers` | P0 | relatedFiles / target_files as links |
| D | `implement-repo-file-stack-frame-renderer` | P0 | stack renderer + highlight |
| E | `wire-markdown-inline-repo-file-clicks` | P1 | paths in markdown body |
| F | `write-closing-epic-drawer-repo-file-preview-v1` | P1 | closing |

## Seed

```bash
npm run seed:analytics-record -- --body work/analytics/drawer-repo-file-preview.md --key AN-57
node scripts/seed-epic-drawer-repo-file-preview-v1.mjs
```

**Status:** done (2026-06-04)
