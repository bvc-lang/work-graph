#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CLOSURES = [
  {
    id: 'decide-iohasc-heritage-reuse-adr',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/adr-iohasc-heritage-reuse-v1.md — ≥15 подсистем, anti-goals'],
  },
  {
    id: 'author-plan-iohasc-heritage-reuse-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/plan-iohasc-heritage-reuse-v1.md — волны P0→P6 + checklist'],
  },
  {
    id: 'maintain-iohasc-heritage-port-registry-v1',
    paths: ['intent/system/runtime/work'],
    evidence: [
      'docs/iohasc-heritage-port-registry.v1.json',
      'npm run check:iohasc-heritage-port-registry',
    ],
  },
  {
    id: 'decide-rich-ir-heritage-port-adr',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/adr-rich-ir-heritage-port-v1.md'],
  },
  {
    id: 'port-tur-ir-flow-executor-mvp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['src/irFlow/validateIrFlow.mjs', 'src/irFlow/executeIrFlowCfg.mjs', 'tests/irFlowExecutor.test.mjs'],
  },
  {
    id: 'port-iohasc-llm-ir-normalizer-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['src/irFlow/llmIrNormalizer.mjs', 'docs/spec-llm-ir-normalizer-v1.md', 'tests/irFlowNormalizer.test.mjs'],
  },
  {
    id: 'integrate-pvrg-core-scanner-adapter-v1',
    paths: ['intent/research/pvrg/work'],
    evidence: ['src/pvrgCoreScannerAdapter.mjs', 'tests/pvrgCoreScannerAdapter.test.mjs'],
  },
  {
    id: 'port-iohasc-semantic-runtime-stage2-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['src/semanticRuntimeStage2.mjs', 'tests/semanticRuntimeStage2.test.mjs'],
  },
  {
    id: 'port-vector-dsl-codegen-from-iohasc-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['src/vectorDslCodegenPort.mjs — bridge to compilerRoundTripCli'],
  },
  {
    id: 'implement-gbc-gfs-heritage-slice-mvp-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['src/gbcSliceMvp.mjs', 'tests/gbcSliceMvp.test.mjs'],
  },
  {
    id: 'wire-iohasc-shell-workgraph-embed-v1',
    paths: ['intent/ui/dashboard/work'],
    evidence: ['docs/adr-iohasc-workgraph-embed-v1.md'],
  },
  {
    id: 'align-heritage-track-with-semantic-plane-epic-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['docs/adr-dual-track-lite-heritage-v1.md'],
  },
  {
    id: 'write-closing-epic-iohasc-heritage-reuse-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['work/analytics/closing-epic-iohasc-heritage-reuse-v1.md'],
  },
  {
    id: 'epic-iohasc-heritage-reuse-v1',
    paths: ['intent/system/runtime/work'],
    evidence: ['heritage wave P0–P6 delivered; port-registry check green'],
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
        console.log(`closed ${closure.id} (${base})`);
        return;
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
  console.warn(`skip ${closure.id}: atom not found`);
}

async function main() {
  for (const closure of CLOSURES) {
    await closeItem(closure);
  }
}

main();
