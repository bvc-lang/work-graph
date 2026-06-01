#!/usr/bin/env node
/**
 * Init git in a bundle dir, commit, push to GitHub.
 * Usage: node scripts/push-git-bundle.mjs --dir=dist/foo --remote=https://github.com/org/repo.git --message="..." [--tag=v0.2.3]
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function arg(name, fallback) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3) ?? fallback;
}

const bundleDir = arg('dir');
const remote = arg('remote');
const message = arg('message', 'chore: sync from Work Graph monorepo');
const tag = arg('tag');

if (!bundleDir || !remote) {
  console.error('Usage: --dir=... --remote=https://github.com/org/repo.git [--message=...] [--tag=vX.Y.Z]');
  process.exit(1);
}

const absDir = join(process.cwd(), bundleDir);
const gitIdentity = '-c user.name=diflux -c user.email=sergiodiflux@gmail.com';

function run(cmd) {
  execSync(cmd, {
    cwd: absDir,
    stdio: 'inherit',
    shell: true,
  });
}

if (!existsSync(absDir)) {
  console.error(`Missing bundle dir: ${absDir}`);
  process.exit(1);
}

const gitDir = join(absDir, '.git');
if (!existsSync(gitDir)) {
  run('git init');
  run('git branch -M main');
}

run('git add -A');
try {
  run(`git diff --cached --quiet || git ${gitIdentity} commit -m "${message.replace(/"/g, '\\"')}"`);
} catch {
  // nothing to commit
}

try {
  run('git remote get-url origin');
} catch {
  run(`git remote add origin "${remote}"`);
}

run('git push -u origin main');
if (tag) {
  run(`git tag -f "${tag}"`);
  run(`git push -f origin "${tag}"`);
}

console.log(JSON.stringify({
  schema: 'workgraph.push-git-bundle.v1',
  dir: bundleDir,
  remote,
  tag: tag ?? null,
  ok: true,
}, null, 2));
