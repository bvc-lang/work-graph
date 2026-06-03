#!/usr/bin/env node
/**
 * Копирует docs/cursor-rules/*.mdc → .cursor/rules/ (воспроизводимый канон WG).
 */
import { cp, mkdir, readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(repoRoot, 'docs/cursor-rules');
const targetDir = join(repoRoot, '.cursor/rules');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = (await readdir(sourceDir)).filter((name) => name.endsWith('.mdc'));
  if (files.length === 0) {
    throw new Error(`No .mdc files in ${sourceDir}`);
  }

  if (!dryRun) {
    await mkdir(targetDir, { recursive: true });
  }

  const copied = [];
  for (const file of files.sort()) {
    const from = join(sourceDir, file);
    const to = join(targetDir, file);
    if (dryRun) {
      await readFile(from, 'utf8');
    } else {
      await cp(from, to);
    }
    copied.push(file);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.sync-cursor-wg-rules.v1',
    dryRun,
    sourceDir: 'docs/cursor-rules',
    targetDir: '.cursor/rules',
    copied,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
