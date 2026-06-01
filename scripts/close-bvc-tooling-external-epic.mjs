#!/usr/bin/env node
/**
 * Close bvc-tooling-external epic after CLI npm + GitHub + MCP prompts.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIR = join(process.cwd(), 'intent/system/runtime/work');

const CLOSURES = [
  {
    id: 'publish-bvc-lang-cli-npm',
    evidence: [
      '@bvc-lang/cli@0.1.3 published (npm dist-tag latest; bin bvc)',
      'scripts/sync-bvc-cli-lib.mjs + verify-bvc-cli-publish-ready.mjs',
      'npm pkg fix: bin path bin/bvc.mjs (not ./bin/...)',
    ],
  },
  {
    id: 'export-bvc-cli-github',
    evidence: [
      'scripts/export-bvc-cli-github.mjs → dist/bvc-cli-github',
      'npm run export:bvc-cli-github; git init in dist — push after repo create in bvc-lang org',
    ],
  },
  {
    id: 'extend-mcp-prompts-bvc-new-write',
    evidence: [
      'packages/workgraph-mcp/src/prompts.mjs — TOOL_RULES + create_work_item .work.bvc',
      'protocols/bvc-new-write-policy-v1.bvc cross-referenced',
    ],
  },
  {
    id: 'bvc-tooling-external',
    evidence: [
      'External tooling: @bvc-lang/cli npm + GitHub cli repo + MCP prompts',
      'docs/plan-step-to-bvc-migration.md tooling follow-up done',
    ],
  },
];

function patchWorkAtom(content, { evidence }) {
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

async function readWorkFile(id) {
  for (const suffix of ['.work.bvc', '.work.bvc']) {
    const path = join(WORK_DIR, `${id}${suffix}`);
    try {
      const original = await readFile(path, 'utf8');
      return { path, original };
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  throw new Error(`Work item file not found: ${id}`);
}

async function main() {
  let updated = 0;
  for (const closure of CLOSURES) {
    const { path, original } = await readWorkFile(closure.id);
    const { content, changed } = patchWorkAtom(original, closure);
    if (changed) {
      await writeFile(path, content, 'utf8');
      updated += 1;
      console.log(`closed ${closure.id}`);
    } else {
      console.log(`skip ${closure.id}`);
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-bvc-tooling-external.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
