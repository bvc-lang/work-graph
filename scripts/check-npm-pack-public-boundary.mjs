#!/usr/bin/env node
/**
 * Fail if npm pack would include private paths (AN-42 CI guard).
 *
 * Usage: node scripts/check-npm-pack-public-boundary.mjs
 */
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const PACKAGES = [
  'packages/bvc-spec',
  'packages/bvc-cli',
  'packages/ir-spec',
  'packages/pvrg-spec',
  'packages/work-graph-cli',
  'packages/workgraph-mcp',
];

/** @type {RegExp[]} */
const FORBIDDEN_PATTERNS = [
  /tests\/fixtures\/eval\//,
  /tests\/fixtures\/customer\//,
  /\.env$/,
  /\/\.cursor\//,
  /charter\/\.iohasc\//,
  /work\/analytics-records\.jsonl$/,
];

/** @type {Array<{ pkg: string, ok: boolean, detail?: string }>} */
const results = [];

for (const pkgRel of PACKAGES) {
  const pkgDir = join(repoRoot, pkgRel);
  let pkgJson;
  try {
    pkgJson = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf8'));
  } catch {
    results.push({ pkg: pkgRel, ok: false, detail: 'missing package.json' });
    continue;
  }

  if (!pkgJson.license) {
    results.push({ pkg: pkgRel, ok: false, detail: 'missing license field' });
    continue;
  }

  let listing = '';
  try {
    listing = execSync('npm pack --dry-run --silent', { cwd: pkgDir, encoding: 'utf8' });
  } catch (error) {
    results.push({
      pkg: pkgRel,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    continue;
  }

  const hit = FORBIDDEN_PATTERNS.find((pattern) => pattern.test(listing));
  if (hit) {
    results.push({ pkg: pkgRel, ok: false, detail: `forbidden path in pack: ${hit}` });
    continue;
  }

  results.push({ pkg: pkgRel, ok: true });
}

const failed = results.filter((entry) => !entry.ok);
for (const entry of results) {
  console.log(`${entry.ok ? 'ok' : 'FAIL'}  ${entry.pkg}${entry.detail ? ` — ${entry.detail}` : ''}`);
}

console.log(JSON.stringify({
  schema: 'workgraph.check-npm-pack-public-boundary.v1',
  packages: results.length,
  failed: failed.length,
}, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
