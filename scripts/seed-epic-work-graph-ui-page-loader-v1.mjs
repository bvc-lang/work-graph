#!/usr/bin/env node
/**
 * Seed: page loader overlay — visible loading state for main content.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const PLAN = 'docs/plan-work-graph-ui-page-loader-v1.md';
const EPIC_ID = 'epic-work-graph-ui-page-loader-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'UI: загрузчик контента — overlay при bootstrap и lazy views',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'doing',
    itemKind: 'epic',
    dependsOn: [],
    basis: [
      'При первом открытии UI и переключении на lazy views оператор видит пустой экран или только текст «Загрузка…» в списке.',
      'Нет единого визуального индикатора, что страница ещё грузится.',
    ],
    vector: [
      'Overlay #wg-page-loader поверх .content (sidebar остаётся кликабельным).',
      'Bootstrap: snapshot chain + ensureLazyViewData active view.',
      'View switch: loader при первой загрузке lazy projection.',
      'i18n loader.default / loader.bootstrap / loader.view.',
    ],
    goal: ['Оператор видит spinner и сообщение, пока грузится контент страницы.'],
    checks: ['Loader visible on first paint', 'Loader hides after render()', 'data-testid=wg-page-loader'],
    targetFiles: [PLAN, 'src/workGraphBacklogUiServer.mjs', 'locales/en/ui.json', 'locales/ru/ui.json'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-67',
  },
  {
    workId: 'implement-wg-page-loader-overlay',
    title: 'UI: wg-page-loader — overlay, spinner, bootstrap + lazy view wiring',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'doing',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['Нет глобального loading overlay в backlog UI.'],
    vector: [
      'CSS spinner + semi-transparent backdrop.',
      'runWithPageLoader() с depth counter.',
      'Initial fetch chain + nav tab lazy views.',
    ],
    goal: ['Загрузчик показывается при bootstrap и lazy view fetch.'],
    checks: ['workGraphBacklogUiServer smoke wg-page-loader'],
    targetFiles: ['src/workGraphBacklogUiServer.mjs', 'tests/workGraphBacklogUiServer.test.mjs'],
    intakeSourceKind: 'operator-request',
    intakeSourceRef: PLAN,
    analyticsKey: 'AN-67',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
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
      targetFiles: task.targetFiles.join(', '),
      intakeSourceKind: task.intakeSourceKind,
      intakeSourceRef: task.intakeSourceRef,
      analyticsKey: task.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${task.workId}`);
    created += 1;
  }

  console.log(JSON.stringify({ schema: 'workgraph.seed-epic-ui-page-loader.v1', epicId: EPIC_ID, created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
