#!/usr/bin/env node
/**
 * Pre-flight checks before `npm publish` for @bvc-lang/cli.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(repoRoot, 'packages/bvc-cli');
const pkgJson = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf8'));

/** @type {Array<{ ok: boolean, label: string, hint?: string }>} */
const checks = [];

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
  } catch {
    return null;
  }
}

execSync('node scripts/sync-bvc-cli-lib.mjs', { cwd: repoRoot, stdio: 'pipe' });
checks.push({
  ok: existsSync(join(pkgDir, 'lib/bvcLintCli.mjs')),
  label: 'lib/ synced (bvcLintCli.mjs)',
  hint: 'node scripts/sync-bvc-cli-lib.mjs',
});

const whoami = run('npm whoami');
checks.push({
  ok: Boolean(whoami),
  label: 'npm login (npm whoami)',
  hint: whoami ? `logged in as ${whoami}` : 'npm login --auth-type=web',
});

const existing = run(`npm view "${pkgJson.name}" version`);
checks.push({
  ok: existing === null || existing !== pkgJson.version,
  label: `package ${pkgJson.name}@${pkgJson.version} publishable`,
  hint: existing === pkgJson.version
    ? `version ${existing} already on registry — bump package.json`
    : existing ? `registry has ${existing}, publishing ${pkgJson.version}` : 'first publish ok',
});

try {
  execSync('npm pack --dry-run', { cwd: pkgDir, stdio: 'pipe' });
  checks.push({ ok: true, label: 'npm pack --dry-run' });
} catch (error) {
  checks.push({
    ok: false,
    label: 'npm pack --dry-run',
    hint: error instanceof Error ? error.message : String(error),
  });
}

let failed = 0;
for (const check of checks) {
  const mark = check.ok ? 'ok' : 'FAIL';
  console.log(`${mark}  ${check.label}${check.hint ? ` — ${check.hint}` : ''}`);
  if (!check.ok) {
    failed += 1;
  }
}

if (failed > 0) {
  console.log('\nСм. packages/bvc-cli/PUBLISH.md');
  process.exit(1);
}

console.log(`\nReady. Run: cd packages/bvc-cli && npm publish --access public`);
