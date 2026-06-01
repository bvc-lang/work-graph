#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CLOSURES = [
  {
    id: 'implement-parser-dual-extension-step-bvc',
    evidence: [
      'src/bvcFileFormat.mjs: dual-read .bvc и .bvc',
      'tests/bvcDualExtension.test.mjs — 4 кейса pass',
    ],
  },
  {
    id: 'update-charter-bvc-naming-adr',
    evidence: [
      'charter/main.bvc: canon.public_format=bvc, canon.public_extension=.bvc, adr links',
    ],
  },
  {
    id: 'reserve-bvc-spec-npm-package',
    evidence: [
      'packages/bvc-spec/@bvc/spec@0.0.0 готов локально (npm run pack:bvc-spec)',
      'tests/bvcSpecPackage.test.mjs — 4 кейса pass',
      'npm publish — внешний шаг (фаза 0 migration plan)',
    ],
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

async function main() {
  const base = join(process.cwd(), 'intent/system/runtime/work');
  for (const closure of CLOSURES) {
    const path = join(base, `${closure.id}.work.bvc`);
    const original = await readFile(path, 'utf8');
    const { content, changed } = patchWorkStep(original, closure);
    if (changed) {
      await writeFile(path, content, 'utf8');
      console.log(`closed ${closure.id}`);
    }
  }
}

main();
