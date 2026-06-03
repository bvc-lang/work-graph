#!/usr/bin/env node
/**
 * Reference migration: AN-50.1 lineage.parentKey → AN-50 (deepens).
 * Journal already seeded; script documents the canonical lineage block.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TARGET_ID = 'analytics:work-graph-bvc-contract-verification';
const LINEAGE = {
  parentKey: 'AN-50',
  parentId: 'analytics:verification-panel-tests-evidence-intent',
  relation: 'deepens',
};

async function main() {
  const journalPath = join(process.cwd(), 'work/analytics-records.jsonl');
  const text = await readFile(journalPath, 'utf8');
  const lines = text.split(/\r?\n/u).filter(Boolean);
  let updated = 0;

  const nextLines = lines.map((line) => {
    const entry = JSON.parse(line);
    if (entry.record?.id !== TARGET_ID) {
      return line;
    }

    if (entry.record.lineage?.parentKey === LINEAGE.parentKey) {
      return line;
    }

    entry.record.lineage = LINEAGE;
    updated += 1;
    return JSON.stringify(entry);
  });

  if (updated > 0) {
    await writeFile(journalPath, `${nextLines.join('\n')}\n`, 'utf8');
  }

  console.log(JSON.stringify({ schema: 'migrate-analytics-lineage-an50-pair.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
