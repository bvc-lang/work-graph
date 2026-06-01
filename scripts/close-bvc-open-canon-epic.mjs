#!/usr/bin/env node
/**
 * Close bvc-open-canon-naming epic after npm publish @bvc-lang/spec.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIR = join(process.cwd(), 'intent/system/runtime/work');

const CLOSURES = [
  {
    id: 'reserve-bvc-spec-npm-package',
    evidence: [
      'npm publish @bvc-lang/spec@0.0.0 --access public (2026-05-31, org bvc-lang)',
      'https://www.npmjs.com/package/@bvc-lang/spec',
      'tests/bvcSpecPackage.test.mjs — 4 кейса pass',
    ],
  },
  {
    id: 'reserve-bvc-github-org',
    evidence: [
      'npm org bvc-lang на registry.npmjs.com',
      'https://github.com/diflux/bvc-lang-spec — public repo, main pushed 2026-05-31',
      '10 files: README, LICENSE, dialects, schemas, spec/overview.md',
      'follow-up: перенос в github.com/bvc-lang/spec после создания GitHub org',
    ],
  },
  {
    id: 'finalize-step-to-bvc-migration-plan',
    evidence: [
      'docs/plan-step-to-bvc-migration.md — фаза 0 npm done, CLI/migrate script pilot',
    ],
  },
  {
    id: 'bvc-open-canon-naming',
    evidence: [
      '@bvc-lang/spec@0.0.0 на npm; dual-read parser; migration plan; ADR принят',
      'GitHub diflux/bvc-lang-spec — initial push main 2026-05-31',
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
      console.log(`skip ${closure.id}`);
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-bvc-open-canon-epic.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
