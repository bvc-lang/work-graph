#!/usr/bin/env node
/**
 * Validate architecture/main.bvc L1 canon (blocks, edges, containers).
 *
 * Usage:
 *   node scripts/architecture-l1-check.mjs [--cwd repoRoot]
 */
import { resolve } from 'node:path';

import { exportArchitectureSnapshotMermaid } from '../src/architectureViewsProjection.mjs';
import {
  ARCHITECTURE_L1_CANON_ID,
  loadArchitectureL1Canon,
  validateArchitectureL1Canon,
} from '../src/architectureL1Canon.mjs';
import { buildArchitectureSnapshot } from '../src/architectureSnapshot.mjs';
import { buildSnapshot, parseWorkItems } from '../src/workGraphRuntime.mjs';

function parseArgs(argv) {
  const options = { cwd: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--cwd' && argv[index + 1]) {
      options.cwd = resolve(argv[index + 1]);
      index += 1;
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const canon = loadArchitectureL1Canon(options.cwd);
  validateArchitectureL1Canon(canon);

  if (canon.passport?.id !== ARCHITECTURE_L1_CANON_ID) {
    throw new Error(`Unexpected canon id: ${canon.passport?.id}`);
  }

  const emptySnapshot = buildSnapshot(parseWorkItems(''));
  const architectureSnapshot = buildArchitectureSnapshot(emptySnapshot, { repoRoot: options.cwd });
  const mermaid = exportArchitectureSnapshotMermaid(architectureSnapshot);

  for (const block of canon.blocks) {
    const nodeId = block.id.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!mermaid.includes(nodeId)) {
      throw new Error(`Mermaid export missing L1 block id: ${block.id}`);
    }
  }

  console.log(JSON.stringify({
    schema: 'architecture-l1-check.v1',
    ok: true,
    canonId: canon.passport?.id,
    version: canon.passport?.version,
    digest: canon.digest,
    sourcePath: canon.sourcePath,
    blocks: canon.blocks.length,
    edges: canon.edges.length,
  }, null, 2));
}

main();
