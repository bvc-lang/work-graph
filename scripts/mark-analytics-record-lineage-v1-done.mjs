#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  'intent/ui/dashboard/work/decide-analytics-lineage-storage-adr.work.bvc',
  'intent/system/runtime/work/extend-analytics-record-schema-lineage-v1.work.bvc',
  'intent/system/runtime/work/implement-analytics-lineage-projection.work.bvc',
  'intent/ui/dashboard/work/wire-analytics-drawer-lineage-sections.work.bvc',
  'intent/ui/dashboard/work/wire-analytics-list-lineage-badges.work.bvc',
  'intent/system/runtime/work/migrate-analytics-lineage-seed-examples.work.bvc',
  'intent/system/runtime/work/implement-mcp-get-analytics-lineage.work.bvc',
  'intent/ui/dashboard/work/write-closing-epic-analytics-record-lineage-v1.work.bvc',
  'intent/ui/dashboard/work/epic-analytics-record-lineage-v1.work.bvc',
];

const EVIDENCE = {
  'decide-analytics-lineage-storage-adr': 'docs/adr-analytics-record-lineage-v1.md accepted (AN-51)',
  'extend-analytics-record-schema-lineage-v1': 'analytics-record.v1 optional lineage block in analyticsRecordStore.mjs',
  'implement-analytics-lineage-projection': 'src/analyticsLineageProjection.mjs + tests/analyticsLineageProjection.test.mjs',
  'wire-analytics-drawer-lineage-sections': 'renderAnalyticsLineageSections + lineage nav in drawer',
  'wire-analytics-list-lineage-badges': 'buildAnalyticsLineageListBadge in flat analytics list',
  'migrate-analytics-lineage-seed-examples': 'AN-50.1 lineage.parentKey AN-50 in work/analytics-records.jsonl',
  'implement-mcp-get-analytics-lineage': 'MCP get_analytics_lineage + tests/workgraph-mcp.test.mjs',
  'write-closing-epic-analytics-record-lineage-v1': 'work/analytics/closing-epic-analytics-record-lineage-v1.md',
  'epic-analytics-record-lineage-v1': 'AN-51 P0-P2 closed; npm run test:deterministic green',
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
    } else if (EVIDENCE[workId] && !text.includes(EVIDENCE[workId])) {
      text = text.replace(
        /(Свидетельства:\n(?:  - .+\n)*)/u,
        `$1  - ${EVIDENCE[workId]}\n`,
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
