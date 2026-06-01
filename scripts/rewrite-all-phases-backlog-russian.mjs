#!/usr/bin/env node
/**
 * Перезаписывает тексты execution backlog (36 items) на русский.
 * Сохраняет status, evidence, depends_on и прочие метки из существующего atom.
 */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

import { BACKLOG_ITEMS, DEFAULT_NEXT_ACTION } from './all-phases-backlog-items.mjs';
import { readWorkItemAtomFromRepo } from '../src/intentTreeWorkItems.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import { formatStepAtomDraft } from '../src/stepAtomFormatter.mjs';

function atomNameFromWorkId(workId) {
  return `Задача_${String(workId).replace(/-/gu, '_')}`;
}

function normalizeTextList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(/\n+/u).map((line) => line.trim()).filter(Boolean);
  }
  return [...fallback];
}

function buildDraftFromSeed(seed, existingItem) {
  const dependsOn = normalizeTextList(seed.dependsOn ?? existingItem?.dependsOn?.join(', '));
  const targetFiles = normalizeTextList(seed.targetFiles ?? existingItem?.targetFiles?.join(', '));
  const checks = normalizeTextList(seed.checks, [
    'Atom WorkItem проходит StepAtomDraft validation',
    'intent/index.bvc актуален',
    'Свидетельства записаны перед переводом в done',
  ]);

  const labels = {
    'atom.profile': 'work_item',
    'work.id': seed.workId,
    'work.title': seed.title,
    'work.status': existingItem?.status ?? 'backlog',
    'work.owner_role': seed.ownerRole ?? existingItem?.ownerRole ?? 'integration_architect',
    'work.department': seed.department ?? existingItem?.department ?? 'agent-platform',
    'work.priority': seed.priority ?? existingItem?.priority ?? 'medium',
    'work.risk': existingItem?.risk ?? 'medium',
    'work.next_action': DEFAULT_NEXT_ACTION,
    'migration.strategy': seed.migrationStrategy ?? 'rebuild',
    'trace.status': existingItem?.labels?.['trace.status'] ?? 'pending',
    ...(dependsOn.length > 0 ? { 'work.depends_on': dependsOn.join(', ') } : {}),
    ...(targetFiles.length > 0 ? { 'work.target_files': targetFiles.join(', ') } : {}),
  };

  const evidence = existingItem?.evidence?.length
    ? existingItem.evidence
    : undefined;

  return {
    name: atomNameFromWorkId(seed.workId),
    profile: 'work_item',
    basis: normalizeTextList(seed.basis),
    vector: normalizeTextList(seed.vector),
    goal: normalizeTextList(seed.goal),
    checks,
    ...(evidence ? { evidence } : {}),
    labels,
  };
}

async function writeTextAtomically(path, text) {
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, text, 'utf8');
  await rename(tempPath, path);
}

async function main() {
  const cwd = process.cwd();
  let updated = 0;
  let missing = 0;

  for (const seed of BACKLOG_ITEMS) {
    let existingItem = null;
    let absolutePath = null;

    try {
      const source = await readWorkItemAtomFromRepo(seed.workId, { cwd });
      absolutePath = source.path;
      [existingItem] = parseWorkItems(source.text);
    } catch {
      missing += 1;
      console.warn(`skip ${seed.workId} (not found)`);
      continue;
    }

    const draft = buildDraftFromSeed(seed, existingItem);
    const atomText = `${formatStepAtomDraft(draft)}\n`;
    await writeTextAtomically(absolutePath, atomText);
    updated += 1;
    console.log(`updated ${seed.workId}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.rewrite-all-phases-backlog-russian.v1',
    updated,
    missing,
    total: BACKLOG_ITEMS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
