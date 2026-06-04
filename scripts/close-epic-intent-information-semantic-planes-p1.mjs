#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CLOSURES = [
  {
    id: 'design-intent-plane-ui-graph-v1',
    paths: ['intent/ui/dashboard/work'],
    evidence: ['docs/adr-intent-plane-ui-graph-v1.md'],
  },
  {
    id: 'implement-intent-plane-graph-view-mvp',
    paths: ['intent/ui/dashboard/work'],
    evidence: ['GET /api/intent-plane/graph', 'intent-plane-panel in architecture view'],
  },
  {
    id: 'implement-semantic-drift-heatmap-ui-v1',
    paths: ['intent/ui/dashboard/work'],
    evidence: ['drift heatmap toggle + legend', 'src/semanticDrift.mjs batch API'],
  },
  {
    id: 'implement-find-semantic-voids-mcp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['find_semantic_voids MCP', 'src/semanticVoids.mjs'],
  },
  {
    id: 'write-closing-epic-intent-information-semantic-planes-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['work/analytics/closing-epic-intent-information-semantic-planes-v1.md'],
  },
  {
    id: 'epic-intent-information-semantic-planes-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['P0 MCP + P1 UI + voids MCP delivered'],
  },
];

function patchWorkStep(content, { evidence }) {
  if (/work\.status: done/m.test(content)) return { content, changed: false };
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
    .replace(/work\.status: backlog/g, 'work.status: done');
  return { content: next, changed: true };
}

async function closeItem(closure) {
  for (const base of closure.paths) {
    const path = join(process.cwd(), base, `${closure.id}.work.bvc`);
    try {
      const original = await readFile(path, 'utf8');
      const { content, changed } = patchWorkStep(original, closure);
      if (changed) {
        await writeFile(path, content, 'utf8');
        console.log(`closed ${closure.id}`);
        return;
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
}

async function main() {
  for (const closure of CLOSURES) {
    await closeItem(closure);
  }
}

main();
