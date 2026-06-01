#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  'intent/system/runtime/work/design-intent-graph-storage-v1.work.bvc',
  'intent/system/runtime/work/implement-intent-node-atom-profile.work.bvc',
  'intent/system/runtime/work/implement-analytics-decision-structure.work.bvc',
  'intent/system/runtime/work/implement-intent-lineage-labels-for-work-items.work.bvc',
  'intent/ui/dashboard/work/implement-roadmap-from-intent-graph-view.work.bvc',
  'intent/ui/dashboard/work/implement-intent-graph-drilldown-ui.work.bvc',
];

const EVIDENCE = {
  'design-intent-graph-storage-v1': 'protocols/intent-graph-storage-v1.bvc + src/intentGraphProjection.mjs',
  'implement-intent-node-atom-profile': 'src/intentNodeRuntime.mjs + src/intentNodeLint.mjs',
  'implement-analytics-decision-structure': 'analyticsPanelProjection intentGraph enrichment + UI sections',
  'implement-intent-lineage-labels-for-work-items': 'MCP intentQuestionId/OptionId/DecisionId + workItemCreateAnalysis lineage',
  'implement-roadmap-from-intent-graph-view': 'src/intentRoadmapProjection.mjs + intent-roadmap-panel UI',
  'implement-intent-graph-drilldown-ui': 'analytics intent-graph-drilldown + lineage navigation',
};

async function main() {
  for (const relativePath of TASKS) {
    const filePath = join(process.cwd(), relativePath);
    let text = await readFile(filePath, 'utf8');
    const workIdMatch = text.match(/work\.id: ([^\n]+)/u);
    const workId = workIdMatch?.[1]?.trim() ?? relativePath;

    if (!text.includes('Свидетельства:')) {
      text = text.replace(
        /\nМетки:\n/u,
        `\nСвидетельства:\n  - ${EVIDENCE[workId] ?? 'npm test pass'}\n\nМетки:\n`,
      );
    }

    text = text.replace(/  work\.status: backlog\n/gu, '  work.status: done\n');
    text = text.replace(/  trace\.status: pending\n/gu, '  trace.status: verified\n');
    text = text.replace(/  work\.next_action: просмотреть и перевести в ready\n/gu, '  work.next_action: —\n');

    await writeFile(filePath, text, 'utf8');
    console.log(`done ${workId}`);
  }
}

main();
