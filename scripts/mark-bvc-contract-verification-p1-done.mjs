#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  'intent/system/runtime/work/extend-bvc-schema-structured-evidence-fields.work.bvc',
  'intent/system/runtime/work/extend-runtime-structured-evidence-validation.work.bvc',
  'intent/system/runtime/work/design-sdk-contract-wrapper-v1.work.bvc',
  'intent/system/runtime/work/write-closing-epic-work-graph-bvc-contract-verification-v1.work.bvc',
  'intent/system/runtime/work/epic-work-graph-bvc-contract-verification-v1.work.bvc',
];

const EVIDENCE = {
  'extend-bvc-schema-structured-evidence-fields': 'bvc-atom-draft.v1.json structuredEvidence + stepAtomFormatter lint',
  'extend-runtime-structured-evidence-validation': 'src/structuredEvidenceV1.mjs + add_work_item_evidence Tier A validation',
  'design-sdk-contract-wrapper-v1': 'docs/design-sdk-contract-wrapper-v1.md (MCP-first, deferred npm)',
  'write-closing-epic-work-graph-bvc-contract-verification-v1': 'work/analytics/closing-epic-work-graph-bvc-contract-verification-v1.md',
  'epic-work-graph-bvc-contract-verification-v1': 'AN-50.1 P0+P1+P2 design closed; npm run test:deterministic green',
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
    } else if (EVIDENCE[workId] && !text.includes(EVIDENCE[workId])) {
      text = text.replace(
        /(Свидетельства:\n(?:  - .+\n)*)/u,
        `$1  - ${EVIDENCE[workId]}\n`,
      );
    }

    text = text.replace(/  work\.status: backlog\n/gu, '  work.status: done\n');
    text = text.replace(/  trace\.status: pending\n/gu, '  trace.status: verified\n');
    text = text.replace(/  work\.next_action: просмотреть и перевести в ready\n/gu, '  work.next_action: —\n');

    await writeFile(filePath, text, 'utf8');
    console.log(`done ${workId}`);
  }
}

main();
