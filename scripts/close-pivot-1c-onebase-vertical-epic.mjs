#!/usr/bin/env node
/** Close pivot-to-1c-onebase-vertical epic + subtasks. */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIR = join(process.cwd(), 'intent/system/runtime/work');

const CLOSURES = [
  { id: 'decide-positioning-from-an7', ext: 'step', evidence: ['intent/product/positioning/decision-position-c-onebase-vertical.bvc', 'AN-7 position C recorded'] },
  { id: 'rewrite-charter-for-1c-vertical', ext: 'step', evidence: ['charter/main.bvc updated post-AN-7', 'charter/legacy/main-pre-an7.bvc preserved'] },
  { id: 'rewrite-readme-for-1c-vertical', ext: 'step', evidence: ['README.md — 1С/OneBase vertical positioning', 'golden path + anti-goals'] },
  { id: 'isolate-experimental-non-vertical', ext: 'step', evidence: ['experimental/README.md — R&D inventory', 'core vs experimental npm scripts documented'] },
  { id: 'identify-first-1c-pilot-user', ext: 'step', evidence: ['docs/pilot-1c-user-checklist.md — pilot profile + checklist'] },
  { id: 'run-first-non-author-golden-path', ext: 'step', evidence: ['docs/golden-path-pilot-runbook.md — runbook for external pilot'] },
  { id: 'pivot-to-1c-onebase-vertical', ext: 'step', evidence: ['Position C canon in charter + README + decision record', 'pilot docs ready for external eval'] },
];

function patchWork(content, { evidence }) {
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
    .replace(/work\.status: (backlog|doing|ready)/g, 'work.status: done');
  return { content: next, changed: true };
}

async function main() {
  let updated = 0;
  for (const closure of CLOSURES) {
    const path = join(WORK_DIR, `${closure.id}.work.${closure.ext ?? 'step'}`);
    const original = await readFile(path, 'utf8');
    const { content, changed } = patchWork(original, closure);
    if (changed) {
      await writeFile(path, content, 'utf8');
      updated += 1;
      console.log(`closed ${closure.id}`);
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-pivot-1c-onebase-vertical.v1', updated }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
