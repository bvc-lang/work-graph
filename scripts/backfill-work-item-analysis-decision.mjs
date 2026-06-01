#!/usr/bin/env node
/**
 * Backfill «Анализ» / «Решение» for WorkItems created before create_work_item auto-fill.
 * Idempotent: skips items that already have analysis text.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import {
  applyWorkItemAnalysisToRepo,
  applyWorkItemDecisionToRepo,
} from '../src/workItemDecisionPipeline.mjs';
import { hasWorkItemAnalysis } from '../src/workItemExecutionGate.mjs';
import {
  buildDefaultWorkItemAnalysis,
  buildDefaultWorkItemDecision,
} from '../src/workItemCreateAnalysis.mjs';

async function main() {
  const cwd = process.cwd();
  const items = await readWorkItemsFromRepo({ cwd });
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    if (hasWorkItemAnalysis(item)) {
      skipped += 1;
      continue;
    }

    const args = {
      workId: item.id,
      title: item.title,
      basis: item.basis,
      vector: item.vector,
      goal: item.goal,
      dependsOn: item.dependsOn,
      intakeSourceKind: item.labels?.['intake.source_kind'],
      intakeSourceRef: item.labels?.['intake.source_ref'],
      analyticsKey: item.labels?.['intake.analytics_key'],
      status: item.status,
    };

    await applyWorkItemAnalysisToRepo(item.id, buildDefaultWorkItemAnalysis(args), {
      cwd,
      analysisSource: args.intakeSourceKind ?? 'backfill',
      nextAction: item.labels?.['work.next_action'] ?? 'просмотреть и перевести в ready',
    });

    await applyWorkItemDecisionToRepo(item.id, 'useful', {
      cwd,
      notes: buildDefaultWorkItemDecision(args, 'useful').join('\n'),
    });

    updated += 1;
    console.log(`backfilled ${item.id}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.backfill-work-item-analysis-decision.v1',
    updated,
    skipped,
    total: items.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
