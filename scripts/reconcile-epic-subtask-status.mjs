#!/usr/bin/env node
/**
 * Close open descendant WorkItems for epics already marked done/verified.
 *
 * Usage:
 *   node scripts/reconcile-epic-subtask-status.mjs [--cwd repoRoot] [--dry-run]
 */
import { resolve } from 'node:path';

import { persistWorkItemUpdatesToRepo, readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import {
  closeOpenDescendantsForDoneEpic,
  findDoneEpicsWithOpenDescendants,
} from '../src/workItemEpicCascade.mjs';

function parseArgs(argv) {
  const options = { cwd: process.cwd(), dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--cwd' && argv[index + 1]) {
      options.cwd = resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (argv[index] === '--dry-run') {
      options.dryRun = true;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const items = await readWorkItemsFromRepo({ cwd: options.cwd });
  const drifts = findDoneEpicsWithOpenDescendants(items);

  /** @type {Array<{ epicId: string, closedChildIds: string[] }>} */
  const results = [];
  let working = items;

  for (const drift of drifts) {
    const outcome = closeOpenDescendantsForDoneEpic(working, drift.epicId);
    working = outcome.items;
    if (outcome.updatedItems.length === 0) {
      continue;
    }

    if (!options.dryRun) {
      await persistWorkItemUpdatesToRepo(outcome.updatedItems, { cwd: options.cwd });
    }

    results.push({
      epicId: drift.epicId,
      closedChildIds: outcome.cascadedChildIds,
    });
  }

  console.log(JSON.stringify({
    schema: 'workgraph.reconcile-epic-subtask-status.v1',
    dryRun: options.dryRun,
    driftEpics: drifts.length,
    reconciled: results.length,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
