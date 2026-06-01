#!/usr/bin/env node
/**
 * Pre-flight checks before `npm publish` for @bvc/spec.
 */
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '../packages/bvc-spec');
const pkgJson = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf8'));

/** @type {Array<{ ok: boolean, label: string, hint?: string }>} */
const checks = [];

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return null;
  }
}

const whoami = run('npm whoami');
checks.push({
  ok: Boolean(whoami),
  label: `npm login (npm whoami)`,
  hint: whoami ? `logged in as ${whoami}` : 'npm config set //registry.npmjs.org/:_authToken=TOKEN  или  npm login --auth-type=web',
});

const existing = run(`npm view "${pkgJson.name}" version`);
checks.push({
  ok: existing === null,
  label: `package ${pkgJson.name} not yet on registry`,
  hint: existing ? `already published: ${existing}` : 'ok to publish first version',
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
  console.log('\nСм. packages/bvc-spec/PUBLISH-RU.md');
  process.exit(1);
}

console.log('\nReady. Run: cd packages/bvc-spec && npm publish --access public');
