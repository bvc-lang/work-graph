#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const TASKS = [
  'implement-lit-flow-graph-canvas-v1',
  'design-graph-canvas-lit-flow-v1',
  'implement-lit-flow-package-and-build',
  'implement-lit-flow-custom-node-cards',
  'implement-graph-canvas-dagre-to-flow-adapter',
  'migrate-architecture-map-lit-flow',
  'migrate-schematic-view-lit-flow',
  'migrate-intent-roadmap-lit-flow',
  'implement-graph-canvas-lineage-keyboard-nav',
  'implement-graph-canvas-minimap-controls',
  'remove-legacy-static-graph-canvas',
];

async function markDone(workId) {
  const path = join(ROOT, 'intent/ui/dashboard/work', `${workId}.work.bvc`);
  let text = await readFile(path, 'utf8');
  if (text.includes('work.status: done')) {
    return false;
  }
  text = text.replace(/(\swork\.status:\s)\S+/, '$1done');
  if (!text.includes('trace.status: verified')) {
    text = text.replace(/(\strace\.status:\s)\S+/, '$1verified');
  }
  const evidence = [
    '  - protocols/graph-canvas-lit-flow-v1.bvc + schemas/graph-canvas-lit-flow-projection.v1.json',
    '  - public/graph-canvas-lit-flow.js (lit-flow client island)',
    '  - src/graphCanvasLitFlow/* + tests/graphCanvasLitFlow.test.mjs',
  ].join('\n');
  if (!text.includes('Свидетельства:')) {
    text = text.replace(/\nМетки:\n/u, `\nСвидетельства:\n${evidence}\n\nМетки:\n`);
  }
  await writeFile(path, text, 'utf8');
  return true;
}

async function main() {
  let updated = 0;
  for (const workId of TASKS) {
    if (await markDone(workId)) {
      updated += 1;
      console.log(`marked done: ${workId}`);
    }
  }
  console.log(JSON.stringify({ updated, total: TASKS.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
