#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { BACKLOG_ITEMS } from './all-phases-backlog-items.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadSeedTitles() {
  const map = new Map();
  const scriptsDir = join(repoRoot, 'scripts');
  const files = (await readdir(scriptsDir)).filter((name) => name.startsWith('seed') && name.endsWith('.mjs'));
  const pairRe = /workId:\s*['"]([^'"]+)['"][\s\S]{0,600}?title:\s*['"]([^'"]+)['"]/g;
  for (const file of files) {
    const text = await readFile(join(scriptsDir, file), 'utf8');
    for (const match of text.matchAll(pairRe)) {
      map.set(match[1], match[2]);
    }
  }
  for (const item of BACKLOG_ITEMS) {
    if (item.workId && item.title) map.set(item.workId, item.title);
  }
  return map;
}

const seedMap = await loadSeedTitles();
const items = await readWorkItemsFromRepo({ cwd: repoRoot });
const unseeded = items.filter((i) => !seedMap.has(i.id));
console.log('unseeded', unseeded.length);
for (const i of unseeded) console.log(i.id, '|', i.title);
