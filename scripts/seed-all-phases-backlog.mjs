#!/usr/bin/env node
/**
 * Seed execution backlog: 3 WorkItems per phase (0–11).
 * Idempotent: skips workIds that already exist in intent tree.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';
import { BACKLOG_ITEMS, DEFAULT_NEXT_ACTION, PHASE_EPICS } from './all-phases-backlog-items.mjs';

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));

  let created = 0;
  let skipped = 0;

  for (const item of BACKLOG_ITEMS) {
    if (existingIds.has(item.workId)) {
      skipped += 1;
      console.log(`skip ${item.workId} (exists)`);
      continue;
    }

    const epic = item.dependsOn?.split(',')[0]?.trim();
    if (epic && !existingIds.has(epic) && !PHASE_EPICS.includes(epic)) {
      console.warn(`warn ${item.workId}: depends_on ${epic} not found yet`);
    }

    const result = await createWorkItem({
      ...item,
      nextAction: DEFAULT_NEXT_ACTION,
    }, { cwd: process.cwd() });
    existingIds.add(item.workId);
    created += 1;
    console.log(`created ${result.workId} → ${result.path}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-all-phases-backlog.v1',
    created,
    skipped,
    total: BACKLOG_ITEMS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
