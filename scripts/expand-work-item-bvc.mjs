#!/usr/bin/env node
import { rename, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { formatStepAtomDraft, parseStepAtomDrafts } from '../src/stepAtomFormatter.mjs';
import { readWorkItemAtomFromRepo, readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import {
  enrichWorkItemBvcDraft,
  evaluateWorkItemBvcQuality,
  needsWorkItemBvcEnrichment,
} from '../src/workItemBvcQuality.mjs';

async function writeTextAtomically(path, text) {
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, text, 'utf8');
  await rename(tempPath, path);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cwd = process.cwd();
  const items = await readWorkItemsFromRepo({ cwd });
  let candidates = 0;
  let updated = 0;
  let unchanged = 0;

  for (const summary of items) {
    if (!needsWorkItemBvcEnrichment(summary)) {
      unchanged += 1;
      continue;
    }

    candidates += 1;
    const source = await readWorkItemAtomFromRepo(summary.id, { cwd });
    const [existingItem] = parseWorkItems(source.text);
    const parsed = parseStepAtomDrafts(source.text)[0];
    if (!existingItem || !parsed || parsed.errors.length > 0) {
      console.warn(`skip ${summary.id}: invalid atom`);
      continue;
    }

    const enriched = enrichWorkItemBvcDraft(parsed.draft, existingItem);
    const remainingIssues = evaluateWorkItemBvcQuality({
      ...existingItem,
      basis: enriched.basis.join('\n'),
      vector: enriched.vector.join('\n'),
      goal: enriched.goal.join('\n'),
    });

    if (remainingIssues.length > 0) {
      console.warn(`still short ${summary.id}:`, remainingIssues.map((issue) => issue.code).join(', '));
    }

    const atomText = `${formatStepAtomDraft(enriched)}\n`;
    if (dryRun) {
      console.log(`would update ${summary.id} (${source.path})`);
      continue;
    }

    await writeTextAtomically(source.path, atomText);
    updated += 1;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.expand-work-item-bvc.v1',
    dryRun,
    total: items.length,
    candidates,
    updated,
    unchanged,
  }, null, 2));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
