#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  'intent/ui/dashboard/work/design-graph-canvas-layout-profile-v1.work.bvc',
  'intent/ui/dashboard/work/implement-graph-canvas-layout-profile-v1.work.bvc',
  'intent/ui/dashboard/work/implement-graph-canvas-layout-quality-snapshot-test.work.bvc',
  'intent/ui/dashboard/work/implement-graph-canvas-pipeline-full-view-modes.work.bvc',
];

const EVIDENCE = {
  'design-graph-canvas-layout-profile-v1': 'protocols/graph-canvas-layout-profile-v1.bvc + schemas/graph-canvas-layout-profile.v1.json',
  'implement-graph-canvas-layout-profile-v1': 'src/graphCanvasLayout.mjs + architecture/schematic integration',
  'implement-graph-canvas-layout-quality-snapshot-test': 'tests/graphCanvasLayoutQuality.test.mjs',
  'implement-graph-canvas-pipeline-full-view-modes': 'Pipeline/Full graph toggle in architecture + schematic UI',
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
    }

    text = text.replace(/  work\.status: backlog\n/gu, '  work.status: done\n');
    text = text.replace(/  trace\.status: pending\n/gu, '  trace.status: verified\n');
    text = text.replace(/  work\.next_action: promote в ready после depends_on, затем claim\/execute\n/gu, '  work.next_action: —\n');

    await writeFile(filePath, text, 'utf8');
    console.log(`done ${workId}`);
  }
}

main();
