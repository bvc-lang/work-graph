#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CLOSURES = [
  {
    id: 'decide-intent-information-semantic-planes-adr',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/adr-intent-information-semantic-planes-v1.md'],
  },
  {
    id: 'author-plan-intent-information-semantic-planes-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/plan-intent-information-semantic-planes-v1.md — ADR + dual-track links'],
  },
  {
    id: 'design-intent-plane-canonical-model-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['protocols/intent-information-plane-v1.bvc'],
  },
  {
    id: 'implement-intent-plane-linkage-index-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['src/intentPlaneLinkageIndex.mjs', 'tests/intentPlaneLinkageIndex.test.mjs'],
  },
  {
    id: 'specify-query-intent-plane-mcp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/spec-query-intent-plane-mcp-v1.md'],
  },
  {
    id: 'implement-query-intent-plane-mcp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['packages/workgraph-mcp query_intent_plane tool', 'src/queryIntentPlane.mjs'],
  },
  {
    id: 'design-semantic-plane-metrics-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/semantic-plane-metrics-v1.md'],
  },
  {
    id: 'specify-semantic-plane-mcp-p0-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/spec-semantic-plane-mcp-p0-v1.md'],
  },
  {
    id: 'implement-query-semantic-field-mcp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['query_semantic_field MCP tool', 'src/semanticPlaneMcp.mjs'],
  },
  {
    id: 'implement-detect-semantic-drift-mcp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['detect_semantic_drift MCP tool'],
  },
  {
    id: 'implement-get-context-slice-mcp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['get_context_slice MCP tool'],
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
