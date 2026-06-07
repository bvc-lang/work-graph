#!/usr/bin/env node
import { readFile, readdir, readFile as rf } from 'node:fs/promises';
import { join } from 'node:path';

import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const GRipe_ROOT = process.argv[2] ?? 'D:/Work/04 Gripe';
const ENGINE_ROOT = process.cwd();

const gripePath = /^(app\/|config\/(catalog|avito)|packages\/marketplace-core|resources\/(views|js)|tests\/(Feature|Unit)\/Catalog)/;

function isGripeAppTarget(file) {
  const normalized = String(file ?? '').replace(/\\/g, '/');
  return gripePath.test(normalized);
}

function isMisplaced(item) {
  const targets = item.targetFiles ?? [];
  if (targets.length === 0) return false;
  const gripeTargets = targets.filter(isGripeAppTarget);
  const wgTargets = targets.filter((file) => {
    const normalized = String(file).replace(/\\/g, '/');
    return normalized.startsWith('src/')
      || normalized.startsWith('packages/design-tokens')
      || normalized.startsWith('packages/atomic-spec')
      || normalized.startsWith('tests/design-tokens')
      || normalized.startsWith('tests/workGraph');
  });
  return gripeTargets.length > 0 && wgTargets.length === 0;
}

async function loadIds(root) {
  const items = await readWorkItemsFromRepo({ cwd: root });
  return new Set(items.map((item) => item.id));
}

const engineItems = await readWorkItemsFromRepo({ cwd: ENGINE_ROOT });
const gripeIds = await loadIds(GRipe_ROOT);
const misplaced = engineItems.filter(isMisplaced);

const report = misplaced.map((item) => ({
  id: item.id,
  status: item.status,
  title: item.title,
  inGripe: gripeIds.has(item.id),
  path: item.sourcePath ?? null,
  targetFiles: item.targetFiles,
}));

console.log(JSON.stringify({
  schema: 'workgraph.misplaced-gripe-work-items.v1',
  engineRoot: ENGINE_ROOT,
  gripeRoot: GRipe_ROOT,
  count: report.length,
  onlyInEngine: report.filter((entry) => !entry.inGripe).map((entry) => entry.id),
  duplicates: report.filter((entry) => entry.inGripe).map((entry) => entry.id),
  items: report,
}, null, 2));
