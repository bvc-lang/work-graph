#!/usr/bin/env node
/**
 * Close bvc-phase2-new-write epic after format CLI + new-write policy MVP.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIR = join(process.cwd(), 'intent/system/runtime/work');

const CLOSURES = [
  {
    id: 'implement-bvc-format-cli',
    evidence: [
      'src/bvcFormatCli.mjs + formatBvcFileContent in bvcFileFormat.mjs',
      'npm run bvc format; packages/bvc-cli command format',
      'tests/bvcFormatCli.test.mjs pass',
    ],
  },
  {
    id: 'implement-new-write-work-item-bvc',
    evidence: [
      'src/bvcNewWritePolicy.mjs — intentPathForNewWorkItem → *.work.bvc',
      'intentTreeWorkItems, intentHierarchy, intentTreeLint dual suffix',
    ],
  },
  {
    id: 'document-bvc-new-write-mcp-policy',
    evidence: [
      'protocols/bvc-new-write-policy-v1.bvc',
      'workgraph-mcp create_work_item description + default checks',
    ],
  },
  {
    id: 'bvc-phase2-new-write',
    evidence: [
      'Phase 2 MVP: bvc format CLI, new-write *.work.bvc, MCP/protocol policy',
      'docs/plan-step-to-bvc-migration.md §2 updated',
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
    try {
      const original = await readFile(path, 'utf8');
      const { content, changed } = patchWorkStep(original, closure);
      if (changed) {
        await writeFile(path, content, 'utf8');
        updated += 1;
        console.log(`closed ${closure.id}`);
      } else {
        console.log(`skip ${closure.id}`);
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        const bvcPath = join(WORK_DIR, `${closure.id}.work.bvc`);
        const original = await readFile(bvcPath, 'utf8');
        const { content, changed } = patchWorkStep(original, closure);
        if (changed) {
          await writeFile(bvcPath, content, 'utf8');
          updated += 1;
          console.log(`closed ${closure.id} (.work.bvc)`);
        }
        continue;
      }
      throw error;
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-bvc-phase2-new-write.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
