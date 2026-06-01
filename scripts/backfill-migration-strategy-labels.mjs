import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readWorkItemAtomFromRepo, readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';

const DEFERR_IDS = new Set([
  'analyze-claude-note-memory-extractor-reference',
  'analyze-promptpilot-task-runner-reference',
  'choose-runtime-substrate',
  'defer-gbc-gvm-zig-scope',
  'evaluate-flatbuffers-gbc-slice',
]);

const PORT_IDS = new Set([
  'golden-path-test',
  'onebase-artifact-mapping',
  'onebase-implement-gross-profit-warehouse-dimension',
  'onebase-posting-rule-golden-path',
  'onebase-posting-scenario-design',
  'onebase-verification-command',
]);

function inferMigrationStrategy(workId) {
  if (DEFERR_IDS.has(workId)) {
    return 'defer';
  }
  if (PORT_IDS.has(workId)) {
    return 'port';
  }
  return 'rebuild';
}

function insertMigrationStrategyLabel(text, strategy) {
  if (text.includes('migration.strategy:')) {
    return text;
  }

  const labelLine = `  migration.strategy: ${strategy}`;
  const atomProfileMatch = text.match(/^(\s+atom\.profile:\s+work_item\s*)$/mu);
  if (atomProfileMatch) {
    return text.replace(atomProfileMatch[0], `${atomProfileMatch[0]}\n${labelLine}`);
  }

  const labelsMatch = text.match(/^Метки:\s*$/mu);
  if (labelsMatch) {
    return text.replace(labelsMatch[0], `${labelsMatch[0]}\n${labelLine}`);
  }

  throw new Error('unable to locate Метки section for migration.strategy insert');
}

export async function backfillMigrationStrategyLabels(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const items = options.items ?? await readWorkItemsFromIntentTree({ cwd });
  const missing = items.filter((item) => !String(item.labels?.['migration.strategy'] ?? '').trim());
  const patched = [];

  for (const item of missing) {
    const strategy = inferMigrationStrategy(item.id);
    const atom = await readWorkItemAtomFromRepo(item.id, { cwd });
    const nextText = insertMigrationStrategyLabel(atom.text, strategy);
    if (nextText !== atom.text) {
      await writeFile(atom.path, nextText, 'utf8');
      patched.push({ workId: item.id, strategy, path: atom.relativePath ?? atom.path });
    }
  }

  return {
    schema: 'workgraph.migration-strategy.backfill.v1',
    missingCount: missing.length,
    patchedCount: patched.length,
    patched,
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await backfillMigrationStrategyLabels();
  console.log(`migration.strategy backfill: patched ${report.patchedCount}/${report.missingCount}`);
  for (const entry of report.patched) {
    console.log(`  - ${entry.workId} -> ${entry.strategy}`);
  }
}
