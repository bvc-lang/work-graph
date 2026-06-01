#!/usr/bin/env node
/**
 * Close completed backlog epics (AN-33, AN-34, AN-36) — status hygiene.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';

const WORK_IDS = [
  'epic-architecture-main-bvc-canon',
  'author-architecture-main-bvc-v1',
  'charter-architecture-ref-derived-projections',
  'implement-architecture-l1-canon-loader',
  'migrate-architecture-snapshot-from-canon',
  'schema-architecture-snapshot-l1-bvc-fields',
  'ui-architecture-block-drawer-bvc',
  'ui-architecture-l1-canon-badge',
  'cli-architecture-l1-check',
  'tests-architecture-main-bvc-canon',
  'migrate-repo-step-files-to-bvc-bulk',
  'write-an36-closing-architecture-main-bvc-canon',
  'epic-architecture-views-v1',
  'adr-architecture-views-v1-profiles',
  'architecture-blocks-list-view-tab',
  'architecture-domain-layer-matrix-prototype',
  'architecture-snapshot-mermaid-export-cli',
  'graph-pipeline-default-compact-nodes',
  'workflow-tree-mode-parent-id',
  'tests-architecture-views-v1',
  'write-an34-closing-architecture-views-v1',
  'epic-gripe-ds-visual-default-wave3',
  'gripe-dark-default-theme-json-and-css',
  'backlog-default-gripe-theme-wireup',
  'wg-ui-wave3-client-badge-button-helpers',
  'wg-ui-wave3-status-badges-atoms',
  'wg-ui-wave3-kanban-cards-atoms',
  'wg-ui-wave3-detail-toolbar-atoms',
  'wg-ui-wave3-view-toolbar-atoms',
  'tests-gripe-visual-default-wave3',
  'write-an33-closing-gripe-ds-visual-default-wave3',
];

const EVIDENCE_BY_PREFIX = {
  'epic-architecture-main-bvc-canon': [
    'architecture/main.bvc live; architecture:l1-check green',
    'AN-36 closing published',
  ],
  'epic-architecture-views-v1': [
    'ADR + list/tree/pipeline/matrix + mermaid export',
    'AN-34 closing published',
  ],
  'epic-gripe-ds-visual-default-wave3': [
    'gripe-dark-default default CSS + wave 3 atoms',
    'AN-33 closing published',
  ],
  'write-an36-closing-architecture-main-bvc-canon': [
    'work/analytics/closing-epic-architecture-main-bvc-canon.md',
  ],
  'write-an34-closing-architecture-views-v1': [
    'work/analytics/closing-epic-architecture-views-v1.md',
  ],
  'write-an33-closing-gripe-ds-visual-default-wave3': [
    'work/analytics/closing-epic-gripe-ds-visual-default-wave3.md',
  ],
};

function evidenceFor(workId) {
  if (EVIDENCE_BY_PREFIX[workId]) return EVIDENCE_BY_PREFIX[workId];
  if (workId.startsWith('epic-')) return [`${workId} delivered`];
  return [`${workId} completed`];
}

function patchWorkBvc(text, workId) {
  if (!/work\.status:\s*backlog/.test(text)) {
    return null;
  }

  let out = text
    .replace(/trace\.status:\s*pending/g, 'trace.status: verified')
    .replace(/work\.status:\s*backlog/g, 'work.status: done')
    .replace(/work\.pipeline_stage:\s*decided/g, 'work.pipeline_stage: closed')
    .replace(/work\.next_action:.*$/gm, 'work.next_action: —');

  if (!/Свидетельства:/.test(out)) {
    const lines = evidenceFor(workId).map((line) => `  - ${line}`).join('\n');
    out = out.replace(
      /(\nМетки:)/,
      `\nСвидетельства:\n${lines}\n$1`,
    );
  }

  return out;
}

async function main() {
  const repoRoot = resolve(process.cwd());
  const files = [];
  for await (const entry of glob('intent/**/work/*.work.bvc', { cwd: repoRoot })) {
    files.push(entry);
  }
  const idSet = new Set(WORK_IDS);
  let updated = 0;

  for (const relativePath of files) {
    const fileName = basename(relativePath).replace('.work.bvc', '');
    if (!idSet.has(fileName)) continue;

    const absolutePath = join(repoRoot, relativePath);
    const original = await readFile(absolutePath, 'utf8');
    const patched = patchWorkBvc(original, fileName);
    if (!patched || patched === original) {
      console.log(`skip ${fileName} (no backlog status)`);
      continue;
    }
    await writeFile(absolutePath, patched, 'utf8');
    console.log(`closed ${fileName}`);
    updated += 1;
  }

  console.log(JSON.stringify({ schema: 'workgraph.close-completed-backlog-epics.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
