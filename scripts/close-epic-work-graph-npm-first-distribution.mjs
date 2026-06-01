#!/usr/bin/env node
/**
 * Close epic-work-graph-npm-first-distribution + subtasks (AN-43).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIRS = [
  'intent/system/runtime/work',
  'intent/ui/dashboard/work',
];

const CLOSURES = [
  {
    id: 'decide-work-graph-npm-first-distribution-adr',
    evidence: ['docs/adr-work-graph-npm-first-distribution.md', 'docs/plan-work-graph-npm-first-distribution.md'],
  },
  {
    id: 'implement-engine-root-resolver-npm-first',
    evidence: ['src/workGraphEngineRoot.mjs', 'src/workGraphInstallLayout.mjs', 'tests/workGraphEngineRoot.test.mjs'],
  },
  {
    id: 'refactor-init-npm-devdependencies',
    evidence: ['src/workGraphProjectInit.mjs config v2', 'devDependencies @work-graph/cli @work-graph/mcp'],
  },
  {
    id: 'publish-work-graph-cli-npm',
    evidence: ['packages/work-graph-cli/package.json v0.2.0 public', 'scripts/sync-work-graph-cli-vendor.mjs', 'npm pack ready'],
  },
  {
    id: 'publish-work-graph-mcp-npm',
    evidence: ['packages/workgraph-mcp → @work-graph/mcp@0.2.0', 'bin/workgraph-mcp.mjs'],
  },
  {
    id: 'refactor-run-ui-mcp-from-node-modules',
    evidence: ['resolveEngineRoot + vendor layout', 'run-ui.mjs / run-mcp.mjs npm-first', 'workGraphInstallLayout asset paths'],
  },
  {
    id: 'update-docs-skill-npm-first',
    evidence: ['README.md', 'docs/runbook-deploy-work-graph-on-project.md', 'skills/install-work-graph/SKILL.md', 'CONTRIBUTING.md'],
  },
  {
    id: 'tests-work-graph-npm-first-distribution',
    evidence: ['tests/workGraphEngineRoot.test.mjs', 'tests/workGraphProjectInit.test.mjs'],
  },
  {
    id: 'implement-optional-global-engine-npm-first',
    evidence: ['Deferred phase 2 — ADR optional global engine; MVP npm-first complete without it'],
  },
  {
    id: 'write-closing-work-graph-npm-first-distribution',
    evidence: ['work/analytics/closing-epic-work-graph-npm-first-distribution.md'],
  },
  {
    id: 'epic-work-graph-npm-first-distribution',
    evidence: ['AN-43 npm-first distribution shipped in repo', 'closing doc published'],
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
  return null;
}

async function main() {
  let patched = 0;
  for (const closure of CLOSURES) {
    const path = await findWorkFile(closure.id);
    if (!path) {
      console.log(`skip missing ${closure.id}`);
      continue;
    }
    const raw = await readFile(path, 'utf8');
    const { content, changed } = patchWorkBvc(raw, closure);
    if (changed) {
      await writeFile(path, content, 'utf8');
      patched += 1;
      console.log(`closed ${closure.id}`);
    } else {
      console.log(`already done ${closure.id}`);
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-epic-npm-first.v1', patched }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
