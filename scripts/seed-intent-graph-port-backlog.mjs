#!/usr/bin/env node
/**
 * Seed intent-graph port wave (MCP surface). Idempotent by workId.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';
import { DEFAULT_NEXT_ACTION, INTENT_GRAPH_PORT_ITEMS } from './intent-graph-port-backlog-items.mjs';

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));

  let created = 0;
  let skipped = 0;

  for (const item of INTENT_GRAPH_PORT_ITEMS) {
    if (existingIds.has(item.workId)) {
      skipped += 1;
      console.log(`skip ${item.workId} (exists)`);
      continue;
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
    schema: 'workgraph.seed-intent-graph-port-backlog.v1',
    created,
    skipped,
    total: INTENT_GRAPH_PORT_ITEMS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
