#!/usr/bin/env node
/**
 * Controlled migration: AN-77 epic/subtasks created before create_work_item
 * exposed parentId/itemKind in MCP schema.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildWorkGraphWriteAuditLabels,
} from '../src/workGraphWriteAudit.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const EPIC_ID = 'epic-workgraph-canon-write-boundary-v1';
const SUBTASK_IDS = [
  'decide-workgraph-canon-write-boundary-adr',
  'implement-workgraph-write-audit-marker',
  'lint-direct-canon-file-edits',
  'document-cursor-canon-readonly-policy',
  'design-workgraph-canon-folder-layout-v1',
  'design-workgraph-host-workspace-switcher-v1',
  'improve-workgraph-mcp-write-convenience',
  'add-bypass-incident-regression-tests',
  'fix-create-work-item-parent-kind-schema',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upsertLabelLine(body, key, value) {
  const pattern = new RegExp(`^(\\s*)${escapeRegex(key)}:\\s*.+$`, 'm');
  const line = `  ${key}: ${value}`;

  if (pattern.test(body)) {
    return body.replace(pattern, line);
  }

  const labelsMatch = body.match(/^(\s*)Метки:\s*$/m);
  if (labelsMatch) {
    const insertAt = labelsMatch.index + labelsMatch[0].length;
    return `${body.slice(0, insertAt)}\n${line}${body.slice(insertAt)}`;
  }

  return `${body.trimEnd()}\n\nМетки:\n${line}`;
}

function patchAtomText(atomText, workId, labels) {
  const span = findWorkItemAtomSpan(atomText, workId);
  if (!span) {
    throw new Error(`work item atom not found: ${workId}`);
  }

  let body = span.body;
  for (const [key, value] of Object.entries(labels)) {
    body = upsertLabelLine(body, key, value);
  }

  const patchedAtom = `#${span.atomName}<[\n${body}\n]>`;
  return `${atomText.slice(0, span.start)}${patchedAtom}${atomText.slice(span.end)}`;
}

async function resolveWorkItemPath(workId) {
  const indexText = await readFile(join(repoRoot, 'intent/index.bvc'), 'utf8');
  const match = indexText.match(new RegExp(`^\\s*-\\s*${escapeRegex(workId)}:\\s*(.+)$`, 'm'));
  if (!match?.[1]) {
    throw new Error(`index entry not found for ${workId}`);
  }
  return join(repoRoot, match[1].trim());
}

async function migrateWorkItem(workId, labels) {
  const path = await resolveWorkItemPath(workId);
  const atomText = await readFile(path, 'utf8');
  const migrationLabels = {
    ...labels,
    ...buildWorkGraphWriteAuditLabels({
      migration: 'scripts/migrate-an77-epic-hierarchy.mjs',
    }),
  };
  const nextText = patchAtomText(atomText, workId, migrationLabels);
  if (nextText === atomText) {
    console.log(`skip ${workId} (already migrated)`);
    return path;
  }
  await writeBacklogTextAtomically(path, nextText);
  console.log(`patched ${workId} -> ${path}`);
  return path;
}

async function main() {
  await migrateWorkItem(EPIC_ID, { 'work.item_kind': 'epic' });

  for (const workId of SUBTASK_IDS) {
    await migrateWorkItem(workId, {
      'work.item_kind': 'subtask',
      'work.parent_id': EPIC_ID,
    });
  }

  console.log('AN-77 epic hierarchy migration complete');
}

await main();
