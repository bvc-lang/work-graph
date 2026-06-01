#!/usr/bin/env node
/**
 * Backfill intent lineage labels on AN-3 WorkItems (idempotent label insert).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const LABELS = [
  '  intent.question_id: iq:intent-graph-storage',
  '  intent.option_id: option-c-intent-node-canon',
  '  intent.decision_id: decision:intent-graph-storage-v1',
];

const TASKS = [
  {
    workId: 'design-intent-graph-storage-v1',
    path: 'intent/system/runtime/work/design-intent-graph-storage-v1.work.bvc',
    extra: ['  work.item_kind: epic'],
  },
  {
    workId: 'implement-intent-node-atom-profile',
    path: 'intent/system/runtime/work/implement-intent-node-atom-profile.work.bvc',
    extra: ['  work.parent_id: design-intent-graph-storage-v1'],
  },
  {
    workId: 'implement-analytics-decision-structure',
    path: 'intent/system/runtime/work/implement-analytics-decision-structure.work.bvc',
    extra: ['  work.parent_id: design-intent-graph-storage-v1'],
  },
  {
    workId: 'implement-intent-lineage-labels-for-work-items',
    path: 'intent/system/runtime/work/implement-intent-lineage-labels-for-work-items.work.bvc',
    extra: ['  work.parent_id: design-intent-graph-storage-v1'],
  },
  {
    workId: 'implement-roadmap-from-intent-graph-view',
    path: 'intent/ui/dashboard/work/implement-roadmap-from-intent-graph-view.work.bvc',
    extra: ['  work.parent_id: design-intent-graph-storage-v1'],
  },
  {
    workId: 'implement-intent-graph-drilldown-ui',
    path: 'intent/ui/dashboard/work/implement-intent-graph-drilldown-ui.work.bvc',
    extra: ['  work.parent_id: design-intent-graph-storage-v1'],
  },
];

async function main() {
  let updated = 0;
  for (const task of TASKS) {
    const filePath = join(ROOT, task.path);
    let text = await readFile(filePath, 'utf8');
    if (text.includes('intent.question_id: iq:intent-graph-storage')) {
      continue;
    }

    const insertLines = [...LABELS, ...task.extra].join('\n');
    text = text.replace(
      /(\nМетки:\n(?:  [^\n]+\n)+?)(  work\.analysis\.at:)/u,
      `$1${insertLines}\n$2`,
    );
    await writeFile(filePath, text, 'utf8');
    updated += 1;
    console.log(`updated ${task.workId}`);
  }

  console.log(JSON.stringify({ updated, total: TASKS.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
