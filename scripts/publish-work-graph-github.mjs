#!/usr/bin/env node
/**
 * Export + push Work Graph to GitHub (monorepo + package mirrors).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const pkg = JSON.parse(readFileSync(join(repoRoot, 'packages/work-graph-cli/package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

const MONOREPO_REMOTE = process.env.WG_GITHUB_MONOREPO_REMOTE
  ?? 'https://github.com/bvc-lang/work-graph.git';
const CLI_REMOTE = process.env.WG_GITHUB_CLI_REMOTE
  ?? 'https://github.com/bvc-lang/work-graph-cli.git';
const MCP_REMOTE = process.env.WG_GITHUB_MCP_REMOTE
  ?? 'https://github.com/bvc-lang/work-graph-mcp.git';
const gitIdentity = '-c user.name=diflux -c user.email=sergiodiflux@gmail.com';

function run(cmd, options = {}) {
  execSync(cmd, { cwd: options.cwd ?? repoRoot, stdio: 'inherit', shell: true });
}

function ensureMonorepoGit() {
  if (!existsSync(join(repoRoot, '.git'))) {
    run('git init');
    run('git branch -M main');
  }
  run('git add -A');
  try {
    run(`git diff --cached --quiet || git ${gitIdentity} commit -m "chore: public Work Graph monorepo ${tag}"`);
  } catch {
    // ignore
  }
  try {
    run('git remote get-url origin');
  } catch {
    run(`git remote add origin "${MONOREPO_REMOTE}"`);
  }
}

function main() {
  console.log(JSON.stringify({
    schema: 'workgraph.publish-work-graph-github.v1',
    version,
    monorepo: MONOREPO_REMOTE,
    cli: CLI_REMOTE,
    mcp: MCP_REMOTE,
  }, null, 2));

  run('node scripts/export-work-graph-cli-github.mjs');
  run('node scripts/export-work-graph-mcp-github.mjs');

  ensureMonorepoGit();
  run(`git push -u origin main`);
  run(`git tag -f "${tag}"`);
  run(`git push -f origin "${tag}"`);

  run(`node scripts/push-git-bundle.mjs --dir=dist/work-graph-cli-github --remote="${CLI_REMOTE}" --message="release: @work-graph/cli ${tag}" --tag="${tag}"`);
  run(`node scripts/push-git-bundle.mjs --dir=dist/work-graph-mcp-github --remote="${MCP_REMOTE}" --message="release: @work-graph/mcp ${tag}" --tag="${tag}"`);

  console.log(JSON.stringify({ ok: true, tag, github: 'https://github.com/bvc-lang/work-graph' }, null, 2));
}

main();
