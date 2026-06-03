#!/usr/bin/env node
/**
 * Seed: AN-59 — Repo file preview in detail drawer stack.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/drawer-repo-file-preview.md';
const PLAN = 'docs/plan-drawer-repo-file-preview-v1.md';
const EPIC_ID = 'epic-drawer-repo-file-preview-v1';
const STACK_EPIC = 'epic-detail-drawer-stack-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Repo file preview v1: клик по path → stack frame + syntax highlight (AN-59)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: [STACK_EPIC],
    basis: [
      'Related files / target_files в drawer — plain text; оператор не может открыть tests/*.mjs или protocols/*.bvc из разбора.',
      'Detail stack поддерживает analytics/task, но нет frame type repo-file и API чтения файла для UI.',
      'AN-59: клик по path → push следующего уровня stack с preview; код подсвечивается.',
    ],
    vector: [
      'P0: ADR frame repo-file + GET /api/repo-file/preview.',
      'P0: кликабельные ссылки в relatedFiles и work.target_files.',
      'P0: renderer в detailStack с codeSyntaxHighlight.',
      'P1: autolink path tokens в markdown body analytics/task.',
    ],
    goal: [
      'Оператор drill-down: разбор → файл → файл → задача без потери контекста; preview read-only с highlight.',
    ],
    checks: [
      'Click tests/homeSnapshotProjection.test.mjs opens L2 preview',
      'Nested file click increases stack depth',
      'API rejects path traversal',
      'AN-59 closing doc published',
    ],
    analysis: [
      'Reuse detailDrawerStack push/pop; codeSyntaxHighlight already in browser bundle.',
      'Security: normalizeBoundedTargetPath under active workspace cwd.',
    ],
    decision: [
      'Вердикт: полезно',
      'Исполнять по docs/plan-drawer-repo-file-preview-v1.md.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-detail-drawer-repo-file-frame-v1.md',
      'src/workGraphBacklogUiServer.mjs',
      'src/detailDrawerStack.mjs',
      'src/codeSyntaxHighlight.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-59',
  },
  {
    workId: 'decide-drawer-repo-file-frame-adr',
    title: 'ADR: detail stack frame repo-file + preview API contract',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['AN-59 §2: frame payload, push rules, language map, security.'],
    vector: [
      'docs/adr-detail-drawer-repo-file-frame-v1.md — type repo-file, payload.repoPath.',
      'Push from #detail-body / #detail-sub-body only; back = pop.',
    ],
    goal: ['Команда не добавляет ad hoc file modal; только stack frame.'],
    checks: ['ADR accepted', 'Frame table updated in adr-detail-drawer-stack-v1 or cross-ref'],
    targetFiles: [
      'docs/adr-detail-drawer-repo-file-frame-v1.md',
      'docs/adr-detail-drawer-stack-v1.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-59',
  },
  {
    workId: 'implement-repo-file-preview-api',
    title: 'API: GET /api/repo-file/preview — bounded read для UI',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-drawer-repo-file-frame-adr'],
    basis: ['Нет HTTP endpoint для read-only preview файла workspace.'],
    vector: [
      'src/repoFilePreviewApi.mjs — normalize path, read utf8, truncate, detect language.',
      'Wire in workGraphBacklogUiServer.mjs before GET-only guard.',
      'tests/repoFilePreviewApi.test.mjs',
    ],
    goal: ['UI fetch preview без worker allowlist; traversal blocked.'],
    checks: ['200 for existing file', '403/404 for .. traversal', 'truncated flag when > max bytes'],
    targetFiles: [
      'src/repoFilePreviewApi.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/repoFilePreviewApi.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-59',
  },
  {
    workId: 'wire-clickable-repo-file-links-in-drawers',
    title: 'UI: кликабельные repo paths в relatedFiles и target_files',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'decide-drawer-repo-file-frame-adr'],
    basis: ['renderDetailList выводит plain text без data-repo-file-path.'],
    vector: [
      'renderRepoFileLink(path) → button.repo-file-link.',
      'Заменить relatedFiles в analytics + target_files accordion в task drawer.',
      'handleBoardClick delegated handler → openRepoFileStackPreview(path).',
    ],
    goal: ['Related files из AN-50 closing кликабельны.'],
    checks: ['data-repo-file-path in HTML', 'click from detail-body opens sub-drawer'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-59',
  },
  {
    workId: 'implement-repo-file-stack-frame-renderer',
    title: 'UI: stack frame repo-file + syntax highlight preview',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-repo-file-preview-api',
      'wire-clickable-repo-file-links-in-drawers',
    ],
    basis: ['renderDetailStackFrame не знает type repo-file.'],
    vector: [
      'openRepoFileStackPreview(path) — seed L1 context if depth=0, push, renderTopDetailStackFrame.',
      'renderDetailStackFrame repo-file: fetch preview, highlightCode / renderMarkdownDocument.',
      'CSS .repo-file-preview panel; data-testid=repo-file-preview-panel.',
    ],
    goal: ['Preview открывается следующим уровнем stack; nested clicks depth 4+ work.'],
    checks: ['Stack depth grows on nested file click', 'JS file shows code-hl spans', 'Back pops one level'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/codeSyntaxHighlight.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-59',
  },
  {
    workId: 'wire-markdown-inline-repo-file-clicks',
    title: 'UI: клик по path-like токенам в markdown body drawer',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, 'implement-repo-file-stack-frame-renderer'],
    basis: ['В тексте разбора пути `protocols/foo.bvc` не интерактивны.'],
    vector: [
      'Post-process markdown HTML or click delegate on .analytics-record-body code/path patterns.',
      'Reuse openRepoFileStackPreview; avoid false positives on URLs.',
    ],
    goal: ['Пути в prose разбора открывают preview так же как Related files.'],
    checks: ['Click protocols/*.bvc in body opens stack preview'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/markdownDocumentRender.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-59',
  },
  {
    workId: 'write-closing-epic-drawer-repo-file-preview-v1',
    title: 'Closing: epic-drawer-repo-file-preview-v1',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-repo-file-stack-frame-renderer',
      'wire-markdown-inline-repo-file-clicks',
    ],
    basis: ['Эпик требует closing doc.'],
    vector: ['work/analytics/closing-epic-drawer-repo-file-preview-v1.md'],
    goal: ['Зафиксировать evidence для AN-59.'],
    checks: ['Closing doc published', 'Epic marked done'],
    targetFiles: ['work/analytics/closing-epic-drawer-repo-file-preview-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-59',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ root: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (existingIds.has(task.workId)) {
      console.log(`skip ${task.workId}`);
      continue;
    }

    await createWorkItem({
      workId: task.workId,
      title: task.title,
      department: task.department,
      ownerRole: task.ownerRole,
      priority: task.priority,
      risk: task.risk,
      status: task.status,
      itemKind: task.itemKind,
      parentId: task.parentId,
      dependsOn: task.dependsOn?.join(', '),
      basis: task.basis.join('\n'),
      vector: task.vector.join('\n'),
      goal: task.goal.join('\n'),
      checks: task.checks.join('\n'),
      analysis: task.analysis?.join('\n'),
      decision: task.decision?.join('\n'),
      targetFiles: task.targetFiles.join(', '),
      intakeSourceKind: task.intakeSourceKind,
      intakeSourceRef: task.intakeSourceRef,
      analyticsKey: task.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${task.workId}`);
    created += 1;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-epic-drawer-repo-file-preview-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-59',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
