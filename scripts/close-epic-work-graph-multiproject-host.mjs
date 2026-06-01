#!/usr/bin/env node
/**
 * Close epic-work-graph-multiproject-host + subtasks (AN-40).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIRS = [
  'intent/system/runtime/work',
  'intent/ui/dashboard/work',
];

const CLOSURES = [
  {
    id: 'decide-work-graph-multiproject-deployment-model',
    evidence: ['docs/adr-work-graph-multiproject-host.md', 'docs/adr-work-graph-per-project-install.md'],
  },
  {
    id: 'implement-workspace-registry-multiproject',
    evidence: ['src/workspaceRegistry.mjs', 'tests/workspaceRegistry.test.mjs'],
  },
  {
    id: 'implement-backlog-ui-reporoot-multiproject',
    evidence: ['src/workGraphProjectHost.mjs', 'GET/POST /api/workspace/* in workGraphBacklogUiServer.mjs'],
  },
  {
    id: 'implement-architecture-snapshot-reporoot-aware',
    evidence: ['buildArchitectureSnapshot({ repoRoot })', 'tests/architectureSnapshot.test.mjs foreign repoRoot'],
  },
  {
    id: 'implement-work-graph-cli-multiproject',
    evidence: ['packages/work-graph-cli/bin/work-graph.mjs', 'tests/workGraphProjectInit.test.mjs'],
  },
  {
    id: 'implement-ui-project-switcher-multiproject',
    evidence: [
      'Не реализован по ADR per-project-install — UI switcher удалён',
      'POST /api/workspace/switch остаётся для CLI power-user',
    ],
  },
  {
    id: 'docs-runbook-deploy-work-graph-on-project',
    evidence: ['docs/runbook-deploy-work-graph-on-project.md', 'skills/install-work-graph/SKILL.md'],
  },
  {
    id: 'tests-work-graph-multiproject-host',
    evidence: ['tests/workspaceRegistry.test.mjs', 'createBacklogUiServer multiproject host integration test'],
  },
  {
    id: 'write-an40-closing-work-graph-multiproject-host',
    evidence: ['work/analytics/closing-epic-work-graph-multiproject-host.md'],
  },
  {
    id: 'epic-work-graph-multiproject-host',
    evidence: ['AN-40 epic deliverables shipped', 'closing doc published'],
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
  console.log(JSON.stringify({ schema: 'workgraph.close-epic-multiproject-host.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
