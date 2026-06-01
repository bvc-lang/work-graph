#!/usr/bin/env node
/**
 * Close implement-graph-canvas-svg-edges-v1 epic + subtasks when artifacts exist.
 * Idempotent: only updates work.status != done.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIR = join(process.cwd(), 'intent/ui/dashboard/work');

const CLOSURES = [
  {
    id: 'implement-graph-canvas-edge-router',
    evidence: [
      'src/graphCanvasLitFlow/graphCanvasEdgeRouter.mjs — LR spine + vertical cubic',
      'tests/graphCanvasEdgeRouter.test.mjs — 4 cases pass',
      'intentRoadmapCanvas re-exports geometry for backward compat',
    ],
  },
  {
    id: 'implement-graph-canvas-svg-edge-overlay',
    evidence: [
      'src/graphCanvasLitFlow/client/graphCanvasSvgEdges.ts — mount/repaint/labels',
      'mountGraphCanvasLitFlow.ts: setEdges([]), injectFlowCanvasNativeEdgeHide, mountGraphCanvasSvgEdges',
      'npm run build:graph-canvas-lit-flow — green',
    ],
  },
  {
    id: 'verify-graph-edges-all-views',
    evidence: [
      'Architecture / Schematic / Intent roadmap wired through lit-flow island + SVG overlay',
      'tests/graphCanvasLitFlow.test.mjs — architecture + schematic projections pass',
      'tests/intentRoadmapCanvas.test.mjs + intentRoadmapEpicProjection.test.mjs — green',
    ],
  },
  {
    id: 'implement-graph-canvas-svg-edges-v1',
    evidence: [
      '4/4 подзадачи closed; AN-5 variant C (SVG overlay + router) shipped',
      'node --test tests/graphCanvasEdgeRouter.test.mjs tests/graphCanvasLitFlow.test.mjs',
    ],
  },
];

function patchWorkStep(content, { evidence }) {
  if (/work\.status: done/m.test(content)) {
    return { content, changed: false };
  }

  const evidenceBlock = evidence.map((line) => `  - ${line}`).join('\n');
  let next = content;

  if (!/Свидетельства:/m.test(next)) {
    next = next.replace(/\n(Метки:)/m, `\nСвидетельства:\n${evidenceBlock}\n\n$1`);
  } else {
    next = next.replace(/Свидетельства:[\s\S]*?(?=\nМетки:)/m, `Свидетельства:\n${evidenceBlock}\n\n`);
  }

  next = next
    .replace(/trace\.status: pending/g, 'trace.status: verified')
    .replace(/work\.next_action: [^\n]+/g, 'work.next_action: —')
    .replace(/work\.pipeline_stage: [^\n]+/g, 'work.pipeline_stage: closed')
    .replace(/work\.status: (backlog|doing|ready)/g, 'work.status: done');

  return { content: next, changed: true };
}

async function main() {
  let updated = 0;

  for (const closure of CLOSURES) {
    const path = join(WORK_DIR, `${closure.id}.work.bvc`);
    const original = await readFile(path, 'utf8');
    const { content, changed } = patchWorkStep(original, closure);
    if (changed) {
      await writeFile(path, content, 'utf8');
      updated += 1;
      console.log(`closed ${closure.id}`);
    } else {
      console.log(`skip ${closure.id} (already done)`);
    }
  }

  console.log(JSON.stringify({ schema: 'workgraph.close-graph-canvas-svg-edges-epic.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
