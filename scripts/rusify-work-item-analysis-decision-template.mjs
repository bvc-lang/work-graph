#!/usr/bin/env node
/**
 * Перезаписывает шаблонный английский «Анализ»/«Решение» на русский (buildDefaultWorkItem*).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import {
  applyWorkItemAnalysisToRepo,
  applyWorkItemDecisionToRepo,
} from '../src/workItemDecisionPipeline.mjs';
import {
  buildDefaultWorkItemAnalysis,
  buildDefaultWorkItemDecision,
  isLegacyEnglishAnalysisDecisionTemplate,
  normalizeCreateWorkItemLines,
} from '../src/workItemCreateAnalysis.mjs';

async function main() {
  const cwd = process.cwd();
  const items = await readWorkItemsFromRepo({ cwd });
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const analysisText = normalizeCreateWorkItemLines(item.analysis).join('\n');
    const decisionText = normalizeCreateWorkItemLines(item.decision).join('\n');
    const combined = `${analysisText}\n${decisionText}`;

    if (!isLegacyEnglishAnalysisDecisionTemplate(combined)) {
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
    };

    const verdict = String(item.labels?.['work.decision.verdict'] ?? 'useful').trim() || 'useful';

    await applyWorkItemAnalysisToRepo(item.id, buildDefaultWorkItemAnalysis(args, verdict), {
      cwd,
      analysisSource: item.labels?.['work.analysis.source'] ?? 'rusify-template',
      nextAction: item.labels?.['work.next_action'] ?? 'просмотреть и перевести в ready',
    });

    await applyWorkItemDecisionToRepo(item.id, verdict, {
      cwd,
      notes: buildDefaultWorkItemDecision(args, verdict).join('\n'),
    });

    updated += 1;
    console.log(`rusified ${item.id}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.rusify-work-item-analysis-decision-template.v1',
    updated,
    skipped,
    total: items.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
