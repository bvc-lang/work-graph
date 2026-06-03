#!/usr/bin/env node
/**
 * Seed: Jira-style colored vector owner avatars in backlog UI cards.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const EPIC_ID = 'epic-work-graph-ui-avatars-v1';
const AVATARS_ROOT = 'public/assets/avatars';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'UI Avatars v1: Jira-style цветные векторные аватарки owner',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-work-graph-ui-icons-v1'],
    basis: [
      'Карточки задач показывают owner-avatar с инициалами на однотонном фоне.',
      'Оператор просит пак цветных векторных аватарок в стиле Jira/Atlassian.',
    ],
    vector: [
      'P0: public/assets/avatars — 10 SVG (Atlassian palette + силуэт).',
      'P0: src/ui/userAvatars.mjs — deterministic pick по ownerRole/department.',
      'P0: GET /assets/avatars/** + renderOwnerAvatar в kanban/list/analytics/memory.',
      'P1: owner-avatar-stack CSS для overlapping assignees.',
    ],
    goal: [
      'Owner на карточках — цветная круглая векторная аватарка как в Jira, стабильная для одной роли.',
    ],
    checks: [
      'GET /assets/avatars/avatar-01.svg → 200',
      'renderOwnerAvatar deterministic for same owner key',
      'task cards use img.owner-avatar instead of initials',
      'tests/userAvatars.test.mjs green',
    ],
    analysis: ['Atlassian default avatar colors: #FF5630 … #8777D9; hash owner → variant.'],
    decision: ['Вердикт: полезно', 'Собственные SVG-силуэты, не копировать Atlaskit assets.'],
    targetFiles: [
      AVATARS_ROOT,
      'src/ui/userAvatars.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/userAvatars.test.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: AVATARS_ROOT,
    analyticsKey: 'AN-60',
  },
  {
    workId: 'wire-user-avatar-asset-pack',
    title: 'UI: пак SVG-аватарок + static /assets/avatars',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['Нет цветного avatar pack и HTTP route.'],
    vector: [
      'public/assets/avatars/avatar-01.svg … avatar-10.svg.',
      'tryServePublicAvatarsAsset в workGraphBacklogUiServer.mjs.',
    ],
    goal: ['Аватарки доступны по URL с cache-control.'],
    checks: ['10 SVG files exist', 'GET /assets/avatars/avatar-07.svg → 200'],
    targetFiles: [AVATARS_ROOT, 'src/workGraphBacklogUiServer.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: AVATARS_ROOT,
    analyticsKey: 'AN-60',
  },
  {
    workId: 'implement-user-avatar-renderer',
    title: 'UI: userAvatars.mjs — hash owner → avatar variant',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['wire-user-avatar-asset-pack'],
    basis: ['Нет renderOwnerAvatar helper.'],
    vector: [
      'hashOwnerKey + resolveOwnerAvatarFile.',
      'renderOwnerAvatar → span.owner-avatar > img.',
      'Browser inline via loadBrowserUserAvatarsSource.',
    ],
    goal: ['Один owner всегда получает один и тот же цвет/силуэт.'],
    checks: ['tests/userAvatars.test.mjs', 'HTML contains renderOwnerAvatar'],
    targetFiles: ['src/ui/userAvatars.mjs', 'src/workGraphBacklogUiServer.mjs', 'tests/userAvatars.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: 'src/ui/userAvatars.mjs',
    analyticsKey: 'AN-60',
  },
  {
    workId: 'wire-owner-avatar-in-task-cards',
    title: 'UI: аватарки owner в kanban, backlog, memory, analytics',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-user-avatar-renderer'],
    basis: ['renderIssueFooter и list rows всё ещё на initials.'],
    vector: [
      'renderIssueFooter → renderOwnerAvatar(item.ownerRole || item.department).',
      'memory/analytics list rows → renderOwnerAvatar.',
      'CSS owner-avatar img 28px circle.',
    ],
    goal: ['Все карточки показывают Jira-style avatar вместо букв.'],
    checks: ['workGraphBacklogUiServer.test owner-avatar img', 'visual check on board view'],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: 'src/workGraphBacklogUiServer.mjs',
    analyticsKey: 'AN-60',
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
    schema: 'workgraph.seed-epic-work-graph-ui-avatars-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-60',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
