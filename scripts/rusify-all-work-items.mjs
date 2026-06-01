#!/usr/bin/env node
/**
 * Русифицирует ВСЕ WorkItem в intent tree (193+).
 * Каталог all-phases-backlog-items.mjs имеет приоритет для execution-задач.
 */
import { rename, writeFile } from 'node:fs/promises';

import { BACKLOG_ITEMS, DEFAULT_NEXT_ACTION } from './all-phases-backlog-items.mjs';
import { readWorkItemAtomFromRepo, readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import { formatStepAtomDraft } from '../src/stepAtomFormatter.mjs';
import { rusifyLine, rusifyNextAction, rusifyStringList, rusifyTitle } from '../src/workItemTextRusify.mjs';

const CATALOG_BY_ID = new Map(BACKLOG_ITEMS.map((item) => [item.workId, item]));

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

function buildDraftFromCatalog(seed, existingItem) {
  const dependsOn = normalizeTextList(seed.dependsOn ?? existingItem?.dependsOn?.join(', '));
  const targetFiles = normalizeTextList(seed.targetFiles ?? existingItem?.targetFiles?.join(', '));
  const checks = normalizeTextList(seed.checks, [
    'Atom WorkItem проходит StepAtomDraft validation',
    'intent/index.bvc актуален',
    'Свидетельства записаны перед переводом в done',
  ]);

  return {
    name: atomNameFromWorkId(seed.workId),
    profile: 'work_item',
    basis: normalizeTextList(seed.basis),
    vector: normalizeTextList(seed.vector),
    goal: normalizeTextList(seed.goal),
    checks,
    ...(existingItem?.evidence?.length ? { evidence: existingItem.evidence } : {}),
    labels: buildLabels(seed, existingItem, dependsOn, targetFiles),
  };
}

function buildLabels(seed, existingItem, dependsOn, targetFiles) {
  return {
    'atom.profile': 'work_item',
    'work.id': seed.workId,
    'work.title': seed.title,
    'work.status': existingItem?.status ?? 'backlog',
    'work.owner_role': seed.ownerRole ?? existingItem?.ownerRole ?? 'integration_architect',
    'work.department': seed.department ?? existingItem?.department ?? 'agent-platform',
    'work.priority': seed.priority ?? existingItem?.priority ?? 'medium',
    'work.risk': existingItem?.risk ?? 'medium',
    'work.next_action': DEFAULT_NEXT_ACTION,
    'migration.strategy': seed.migrationStrategy ?? existingItem?.labels?.['migration.strategy'] ?? 'rebuild',
    'trace.status': existingItem?.labels?.['trace.status'] ?? 'pending',
    ...(dependsOn.length > 0 ? { 'work.depends_on': dependsOn.join(', ') } : {}),
    ...(targetFiles.length > 0 ? { 'work.target_files': targetFiles.join(', ') } : {}),
    ...copyExtraLabels(existingItem?.labels),
  };
}

function copyExtraLabels(labels = {}) {
  const extra = {};
  for (const [key, value] of Object.entries(labels)) {
    if (key.startsWith('migration.') || key.startsWith('guid') || key.startsWith('intake.')) {
      extra[key] = value;
    }
  }
  return extra;
}

function buildDraftFromRusify(existingItem) {
  const basis = rusifyStringList(toLines(existingItem.basis));
  const vector = rusifyStringList(toLines(existingItem.vector));
  const goal = rusifyStringList(toLines(existingItem.goal));
  const checks = existingItem.checks?.length
    ? rusifyStringList(existingItem.checks)
    : undefined;

  const labels = {
    ...(existingItem.labels ?? {}),
    'work.title': rusifyTitle(existingItem.title, existingItem.id),
    'work.next_action': rusifyNextAction(existingItem.nextAction, existingItem.id),
  };

  return {
    name: atomNameFromWorkId(existingItem.id),
    profile: 'work_item',
    basis,
    vector,
    goal,
    ...(checks ? { checks } : {}),
    ...(existingItem.evidence?.length ? { evidence: rusifyStringList(existingItem.evidence) } : {}),
    labels,
  };
}

function toLines(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [String(value)] : [];
}

async function writeTextAtomically(path, text) {
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, text, 'utf8');
  await rename(tempPath, path);
}

async function main() {
  const cwd = process.cwd();
  const items = await readWorkItemsFromRepo({ cwd });
  let updated = 0;
  let catalog = 0;
  let rusified = 0;

  for (const summary of items) {
    const source = await readWorkItemAtomFromRepo(summary.id, { cwd });
    const [existingItem] = parseWorkItems(source.text);
    if (!existingItem) {
      console.warn(`skip ${summary.id}: parse failed`);
      continue;
    }

    const seed = CATALOG_BY_ID.get(summary.id);
    let draft;
    try {
      if (seed) {
        catalog += 1;
        draft = buildDraftFromCatalog(seed, existingItem);
      } else {
        rusified += 1;
        draft = buildDraftFromRusify(existingItem);
      }
      const atomText = `${formatStepAtomDraft(draft)}\n`;
      await writeTextAtomically(source.path, atomText);
      updated += 1;
    } catch (error) {
      console.error(`fail ${summary.id}:`, error.message);
      throw error;
    }
  }

  console.log(JSON.stringify({
    schema: 'workgraph.rusify-all-work-items.v1',
    total: items.length,
    updated,
    fromCatalog: catalog,
    autoRusified: rusified,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
