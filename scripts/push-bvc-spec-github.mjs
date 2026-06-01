#!/usr/bin/env node
/**
 * Init git in dist/bvc-spec-github and push to GitHub.
 * Requires: remote repo exists + git credentials (HTTPS or SSH).
 *
 * Usage:
 *   node scripts/push-bvc-spec-github.mjs
 *   node scripts/push-bvc-spec-github.mjs --remote https://github.com/bvc-lang/spec.git
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();
const bundleDir = join(cwd, 'dist/bvc-spec-github');
const remoteArg = process.argv.find((arg) => arg.startsWith('--remote='));
const remote = remoteArg?.slice('--remote='.length) ?? 'https://github.com/bvc-lang/spec.git';

function run(cmd, options = {}) {
  execSync(cmd, { cwd: options.cwd ?? bundleDir, stdio: 'inherit', shell: true });
}

if (!existsSync(bundleDir)) {
  console.error('Missing bundle. Run: npm run export:bvc-spec-github');
  process.exit(1);
}

const gitDir = join(bundleDir, '.git');
if (!existsSync(gitDir)) {
  run('git init');
  run('git add .');
  run('git commit -m "chore: initial @bvc-lang/spec placeholder v0.0.0"');
  run('git branch -M main');
}

try {
  run(`git remote get-url origin`);
} catch {
  run(`git remote add origin "${remote}"`);
}

run('git push -u origin main');
console.log(JSON.stringify({ schema: 'workgraph.push-bvc-spec-github.v1', remote, ok: true }, null, 2));
