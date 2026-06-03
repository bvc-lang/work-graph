#!/usr/bin/env node
/**
 * Предупреждение если docs/cursor-rules и .cursor/rules расходятся.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonDir = join(repoRoot, 'docs/cursor-rules');
const liveDir = join(repoRoot, '.cursor/rules');

async function hashFile(path) {
  const text = await readFile(path, 'utf8');
  return createHash('sha256').update(text).digest('hex');
}

async function main() {
  const canonFiles = (await readdir(canonDir)).filter((name) => name.endsWith('.mdc')).sort();
  const drift = [];

  for (const file of canonFiles) {
    const canonPath = join(canonDir, file);
    const livePath = join(liveDir, file);
    try {
      const [canonHash, liveHash] = await Promise.all([hashFile(canonPath), hashFile(livePath)]);
      if (canonHash !== liveHash) {
        drift.push(file);
      }
    } catch {
      drift.push(`${file} (missing in .cursor/rules)`);
    }
  }

  if (drift.length > 0) {
    console.warn(JSON.stringify({
      schema: 'workgraph.lint-cursor-rules-drift.v1',
      ok: false,
      drift,
      hint: 'Run npm run sync:cursor-rules',
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.lint-cursor-rules-drift.v1',
    ok: true,
    files: canonFiles.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
