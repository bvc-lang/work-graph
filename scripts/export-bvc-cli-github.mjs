#!/usr/bin/env node
/**
 * Export packages/bvc-cli for initial bvc-lang/cli repo push.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const sourceDir = join(repoRoot, 'packages/bvc-cli');
const outDir = join(repoRoot, 'dist/bvc-cli-github');

function ensureLibSynced() {
  execSync('node scripts/sync-bvc-cli-lib.mjs', { cwd: repoRoot, stdio: 'pipe' });
}

function copyPackage() {
  mkdirSync(outDir, { recursive: true });
  for (const entry of ['package.json', 'README.md', 'LICENSE', 'PUBLISH.github.md']) {
    cpSync(join(sourceDir, entry), join(outDir, entry === 'PUBLISH.github.md' ? 'PUBLISH.md' : entry));
  }
  cpSync(join(sourceDir, 'bin'), join(outDir, 'bin'), { recursive: true });
  cpSync(join(sourceDir, 'lib'), join(outDir, 'lib'), { recursive: true });
}

function writeRootReadme() {
  const pkg = JSON.parse(readFileSync(join(sourceDir, 'package.json'), 'utf8'));
  const body = `# bvc-lang/cli

Command-line tools for **BVC** (Basis · Vector · Goal).

- npm: [\`@bvc-lang/cli\`](https://www.npmjs.com/package/@bvc-lang/cli) v${pkg.version}
- Depends on: [\`@bvc-lang/spec\`](https://www.npmjs.com/package/@bvc-lang/spec)

## Install

\`\`\`bash
npm install -g @bvc-lang/cli
bvc lint path/to/file.bvc
bvc format path/to/file.bvc --stdout
\`\`\`

## License

Apache-2.0 — see LICENSE.
`;
  writeFileSync(join(outDir, 'README.github-root.md'), body, 'utf8');
}

function main() {
  ensureLibSynced();
  if (!existsSync(join(sourceDir, 'lib/bvcLintCli.mjs'))) {
    throw new Error('lib/ missing after sync');
  }
  copyPackage();
  writeRootReadme();
  console.log(JSON.stringify({
    schema: 'workgraph.export-bvc-cli-github.v1',
    outDir,
    next: 'Push dist/bvc-cli-github to github.com/bvc-lang/cli — see packages/bvc-cli/PUBLISH.md',
  }, null, 2));
}

main();
