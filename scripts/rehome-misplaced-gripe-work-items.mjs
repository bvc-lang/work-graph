#!/usr/bin/env node
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { buildIntentIndexStep } from '../src/intentTreeMigration.mjs';
import {
  appendWorkItemAtomToIntentTree,
  parseIntentIndexEntries,
  readWorkItemAtomFromRepo,
  readWorkItemsFromRepo,
} from '../src/intentTreeWorkItems.mjs';
import { readBvcTextFile } from '../src/bvcFileFormat.mjs';

const GRipe_ROOT = process.argv[2] ?? 'D:/Work/04 Gripe';
const ENGINE_ROOT = process.argv[3] ?? process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');

const gripePath = /^(app\/|config\/(catalog|avito)|packages\/marketplace-core|resources\/(views|js)|tests\/(Feature|Unit)\/Catalog)/;

function isGripeAppTarget(file) {
  const normalized = String(file ?? '').replace(/\\/g, '/');
  return gripePath.test(normalized);
}

function isWorkGraphEngineTarget(file) {
  const normalized = String(file).replace(/\\/g, '/');
  return normalized.startsWith('src/')
    || normalized.startsWith('packages/design-tokens')
    || normalized.startsWith('packages/atomic-spec')
    || normalized.startsWith('tests/design-tokens')
    || normalized.startsWith('tests/workGraph');
}

function isMisplaced(item) {
  const targets = item.targetFiles ?? [];
  if (targets.length === 0) {
    return false;
  }
  const gripeTargets = targets.filter(isGripeAppTarget);
  const wgTargets = targets.filter(isWorkGraphEngineTarget);
  return gripeTargets.length > 0 && wgTargets.length === 0;
}

function expandWithParentClosure(allItems, seedItems) {
  const selected = new Set(seedItems.map((item) => item.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of allItems) {
      const parentId = String(item.parentId ?? '').trim();
      if (parentId && selected.has(parentId) && !selected.has(item.id)) {
        selected.add(item.id);
        changed = true;
      }
    }
  }
  return allItems
    .filter((item) => selected.has(item.id))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function loadGripeIds(root) {
  const items = await readWorkItemsFromRepo({ cwd: root });
  return new Set(items.map((item) => item.id));
}

async function removeWorkItemsFromIntentTree(workIds, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const indexRel = options.intentIndexPath ?? 'intent/index.bvc';
  const indexPath = resolve(cwd, indexRel);
  const indexText = await readBvcTextFile(indexRel, { cwd });
  const entries = parseIntentIndexEntries(indexText);
  const removeSet = new Set(workIds);
  const kept = entries.filter((entry) => !removeSet.has(entry.id));
  const removed = entries.filter((entry) => removeSet.has(entry.id));

  if (!DRY_RUN) {
    for (const entry of removed) {
      await rm(resolve(cwd, entry.path), { force: true });
    }
    await writeTextAtomically(indexPath, buildIntentIndexStep(kept.map((entry) => ({
      id: entry.id,
      path: entry.path,
    }))));
  }

  return {
    removed: removed.map((entry) => entry.id),
    keptCount: kept.length,
  };
}

async function writeTextAtomically(path, text) {
  const tempPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(tempPath, text, 'utf8');
  await rename(tempPath, path);
}

const engineItems = await readWorkItemsFromRepo({ cwd: ENGINE_ROOT });
const seedMisplaced = engineItems.filter(isMisplaced);
const toRehome = expandWithParentClosure(engineItems, seedMisplaced);
const gripeIds = await loadGripeIds(GRipe_ROOT);

const imported = [];
const skippedDuplicate = [];
const removedFromEngine = [];

for (const item of toRehome) {
  const source = await readWorkItemAtomFromRepo(item.id, { cwd: ENGINE_ROOT });
  const relativePath = source.relativePath ?? source.path;

  if (gripeIds.has(item.id)) {
    skippedDuplicate.push(item.id);
  } else if (!DRY_RUN) {
    await appendWorkItemAtomToIntentTree(source.atomText, {
      cwd: GRipe_ROOT,
      path: relativePath,
      skipGitSnapshot: true,
    });
    gripeIds.add(item.id);
    imported.push({ id: item.id, path: relativePath });
  } else {
    imported.push({ id: item.id, path: relativePath, dryRun: true });
  }
}

const engineRemoval = await removeWorkItemsFromIntentTree(
  toRehome.map((item) => item.id),
  { cwd: ENGINE_ROOT },
);
removedFromEngine.push(...engineRemoval.removed);

const verifyEngine = (await readWorkItemsFromRepo({ cwd: ENGINE_ROOT }))
  .filter(isMisplaced);
const verifyGripeCount = (await readWorkItemsFromRepo({ cwd: GRipe_ROOT })).length;

console.log(JSON.stringify({
  schema: 'workgraph.rehome-misplaced-gripe-work-items.v1',
  dryRun: DRY_RUN,
  engineRoot: ENGINE_ROOT,
  gripeRoot: GRipe_ROOT,
  rehomedCount: toRehome.length,
  rehomedIds: toRehome.map((item) => item.id),
  imported,
  skippedDuplicate,
  removedFromEngine,
  remainingMisplacedInEngine: verifyEngine.map((item) => item.id),
  gripeWorkItemCount: verifyGripeCount,
}, null, 2));

if (verifyEngine.length > 0) {
  process.exitCode = 1;
}
