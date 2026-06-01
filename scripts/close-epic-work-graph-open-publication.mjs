#!/usr/bin/env node
/**
 * Close epic-work-graph-open-publication + subtasks (AN-42).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIRS = [
  'intent/system/runtime/work',
  'intent/research/pvrg/work',
];

const CLOSURES = [
  { id: 'decide-work-graph-open-publication-adr', evidence: ['docs/adr-work-graph-open-publication.md'] },
  { id: 'inventory-public-private-packages-an42', evidence: ['docs/publication-inventory-an42.md'] },
  {
    id: 'publish-bvc-open-standard-pack-an42',
    evidence: [
      'packages/bvc-spec/ + LICENSE-SPEC (CC BY 4.0)',
      '@bvc-lang/cli Apache-2.0',
      'tests/bvcConformance.test.mjs',
      'PUBLIC_API.md',
    ],
  },
  { id: 'publish-ir-richir-public-spec-an42', evidence: ['packages/ir-spec/ draft schema ir.flow.v1'] },
  { id: 'publish-pvrg-public-spec-an42', evidence: ['packages/pvrg-spec/ draft schema pvrg.v1'] },
  {
    id: 'split-work-graph-core-commercial-packs-an42',
    evidence: ['docs/publication-inventory-an42.md public/private/experimental', 'experimental/README.md boundary'],
  },
  {
    id: 'trademark-conformance-policy-an42',
    evidence: ['docs/trademark-conformance-policy.md', 'PUBLIC_API.md'],
  },
  {
    id: 'legal-hygiene-public-release-an42',
    evidence: ['LICENSE', 'SECURITY.md', 'PRIVACY.md', 'CONTRIBUTING.md', 'workgraph-mcp license field'],
  },
  {
    id: 'review-patent-defensive-publication-an42',
    evidence: ['work/analytics/patent-defensive-publication-decision-an42.md'],
  },
  {
    id: 'ci-guard-private-paths-npm-pack-an42',
    evidence: ['scripts/check-npm-pack-public-boundary.mjs', 'npm run check:npm-pack-boundary'],
  },
  {
    id: 'write-an42-closing-work-graph-open-publication',
    evidence: ['work/analytics/closing-epic-work-graph-open-publication.md'],
  },
  {
    id: 'epic-work-graph-open-publication',
    evidence: ['AN-42 open publication strategy implemented', 'closing doc published'],
  },
];

function patchWorkBvc(content, { evidence }) {
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

async function findWorkFile(id) {
  for (const dir of WORK_DIRS) {
    const path = join(process.cwd(), dir, `${id}.work.bvc`);
    try {
      await readFile(path, 'utf8');
      return path;
    } catch {
      // continue
    }
  }
  throw new Error(`work file not found: ${id}`);
}

async function main() {
  let updated = 0;
  for (const closure of CLOSURES) {
    const path = await findWorkFile(closure.id);
    const original = await readFile(path, 'utf8');
    const { content, changed } = patchWorkBvc(original, closure);
    if (changed) {
      await writeFile(path, content, 'utf8');
      updated += 1;
      console.log(`closed ${closure.id}`);
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-epic-open-publication.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
