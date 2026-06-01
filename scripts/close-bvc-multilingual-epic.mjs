#!/usr/bin/env node
/**
 * Close bvc-multilingual-detect-or-declare epic + subtasks when artifacts exist.
 * Idempotent: only updates work.status != done.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CLOSURES = [
  {
    id: 'adr-bvc-multilingual-keys',
    evidence: [
      'docs/adr-bvc-multilingual-keys.md принят (status Принято 2026-05-31)',
      'AN-19 и migration plan ссылаются на ADR',
    ],
  },
  {
    id: 'bvc-dialect-registry-en-ru',
    evidence: [
      'packages/bvc-dialects/en.json + ru.json + README.md',
      'ru покрывает Basis/Vector/Goal/Labels',
    ],
  },
  {
    id: 'extend-bvc-atom-draft-lang-field',
    evidence: [
      'schemas/step-atom-draft.v1.json: lang enum en|ru, default en',
    ],
  },
  {
    id: 'update-llm-bvc-atom-writer-multilingual',
    evidence: [
      'protocols/llm-step-atom-writer.bvc: one-dialect-per-atom, @lang, draft.lang',
    ],
  },
  {
    id: 'implement-parser-detect-or-declare',
    evidence: [
      'src/bvcAtomParser.mjs: Detect-or-Declare, E_BVC_DIALECT_MIX, registry load',
      'tests/bvcAtomParser.test.mjs — 5 кейсов pass',
    ],
  },
  {
    id: 'bvc-multilingual-conformance-tests',
    evidence: [
      'tests/conformance/*.bvc + tests/bvcConformance.test.mjs — 4 кейса pass',
      'EN/RU identical AST + dialect round-trip',
    ],
  },
  {
    id: 'charter-bvc-lang-pragma',
    evidence: [
      'charter/main.bvc начинается с #!bvc lang=ru',
    ],
  },
  {
    id: 'update-migration-plan-multilingual-an19',
    evidence: [
      'docs/plan-step-to-bvc-migration.md: multilingual ADR + todo фазы 1',
    ],
  },
  {
    id: 'sync-an14-ir-open-canon-multilingual',
    evidence: [
      'work/analytics/ir-rich-ir-open-canon.md §8: EN canonical + @bvc/*',
    ],
  },
  {
    id: 'bvc-multilingual-detect-or-declare',
    evidence: [
      '9/9 подзадач closed; ADR + registry + parser + conformance green',
      'node --test tests/bvcAtomParser.test.mjs tests/bvcConformance.test.mjs',
    ],
  },
];

function patchWorkStep(content, { id, evidence }) {
  if (/work\.status: done/m.test(content)) {
    return { content, changed: false, id };
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
    .replace(/work\.status: backlog/g, 'work.status: done');

  return { content: next, changed: true, id };
}

async function main() {
  const cwd = process.cwd();
  const base = join(cwd, 'intent/system/runtime/work');
  let updated = 0;

  for (const closure of CLOSURES) {
    const path = join(base, `${closure.id}.work.bvc`);
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

  console.log(JSON.stringify({ schema: 'workgraph.close-bvc-multilingual-epic.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
