#!/usr/bin/env node
/**
 * Seed: architecture block / task type classifier badges on Kanban board cards.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const EPIC_ID = 'epic-work-graph-ui-classifier-badges-v1';
const CLASSIFIER_ROOT = 'src/ui/workItemClassifierBadge.mjs';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'UI Classifier badges v1: блок архитектуры на карточках доски вместо статуса',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-work-graph-ui-avatars-v1'],
    basis: [
      'На Kanban-карточках бейдж показывает статус (ready/doing), хотя статус уже виден по колонке.',
      'Оператор просит Jira-style lozenge с блоком архитектуры или типом задачи (UI, WORK GRAPH, MEMORY).',
    ],
    vector: [
      'P0: workItemBlockClassifier.mjs — classifyWorkItemBlock из architecture snapshot.',
      'P0: workItemClassifierBadge.mjs — resolve + renderWorkItemClassifierBadge.',
      'P0: renderIssueFooter surface=board → classifier badge; workflow list → status badge.',
      'P1: labels architecture.block_id override для явной классификации.',
    ],
    goal: [
      'На доске бейдж = блок архитектуры или department/kind; статус остаётся только в workflow list.',
    ],
    checks: [
      'tests/workItemClassifierBadge.test.mjs green',
      'board cards contain data-testid="classifier-*" not status badge',
      'workflow backlog list still shows status badge',
    ],
    analysis: ['Reuse classifyWorkItemBlock from architectureSnapshot; Jira lozenge tones from badge.mjs.'],
    decision: ['Вердикт: полезно', 'Board-only switch via surface=board in renderTaskAtom.'],
    targetFiles: [
      'src/workItemBlockClassifier.mjs',
      CLASSIFIER_ROOT,
      'src/workGraphBacklogUiServer.mjs',
      'tests/workItemClassifierBadge.test.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: CLASSIFIER_ROOT,
    analyticsKey: 'AN-61',
  },
  {
    workId: 'extract-work-item-block-classifier',
    title: 'UI: workItemBlockClassifier.mjs — classifyWorkItemBlock',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['classifyWorkItemBlock дублировался в architectureSnapshot.mjs.'],
    vector: [
      'Extract classifyWorkItemBlock to src/workItemBlockClassifier.mjs.',
      'architectureSnapshot re-exports for operatorShellProjection.',
    ],
    goal: ['Один источник классификации блоков для architecture graph и UI badges.'],
    checks: ['architectureSnapshot imports classifyWorkItemBlock'],
    targetFiles: ['src/workItemBlockClassifier.mjs', 'src/architectureSnapshot.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: 'src/workItemBlockClassifier.mjs',
    analyticsKey: 'AN-61',
  },
  {
    workId: 'implement-work-item-classifier-badge',
    title: 'UI: workItemClassifierBadge.mjs — resolve + render lozenge',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['extract-work-item-block-classifier'],
    basis: ['Нет resolveWorkItemClassifierBadge и ARCHITECTURE_BLOCK_BADGES map.'],
    vector: [
      'ARCHITECTURE_BLOCK_BADGES + DEPARTMENT_BADGES maps.',
      'resolveWorkItemClassifierBadge: block_id → classify → department → itemKind.',
      'renderWorkItemClassifierBadge via renderClientUiBadge.',
    ],
    goal: ['Детерминированный lozenge label/tone для любой work item.'],
    checks: ['tests/workItemClassifierBadge.test.mjs'],
    targetFiles: [CLASSIFIER_ROOT, 'tests/workItemClassifierBadge.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: CLASSIFIER_ROOT,
    analyticsKey: 'AN-61',
  },
  {
    workId: 'wire-classifier-badge-on-board-cards',
    title: 'UI: classifier badge на kanban cards (surface=board)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-work-item-classifier-badge'],
    basis: ['renderIssueFooter всегда показывает status badge.'],
    vector: [
      'loadBrowserWorkItemClassifierSource in workGraphBacklogUiServer.mjs.',
      'renderTaskAtom kanban-card → surface board.',
      'renderIssueFooter: board → renderWorkItemClassifierBadge; else status.',
    ],
    goal: ['Kanban cards показывают UI / WORK GRAPH / MEMORY вместо ready/doing.'],
    checks: [
      'workGraphBacklogUiServer.test renderWorkItemClassifierBadge',
      'visual check board view lozenges',
    ],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: 'src/workGraphBacklogUiServer.mjs',
    analyticsKey: 'AN-61',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const known = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (known.has(task.workId)) {
      console.log(`skip ${task.workId} (exists)`);
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
    schema: 'workgraph.seed-epic-work-graph-ui-classifier-badges-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-61',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
