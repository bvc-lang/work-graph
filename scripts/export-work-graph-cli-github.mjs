#!/usr/bin/env node
/**
 * Export packages/work-graph-cli for github.com/work-graph/cli mirror.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(repoRoot, 'packages/work-graph-cli');
const outDir = join(repoRoot, 'dist/work-graph-cli-github');

function main() {
  execSync('node scripts/sync-work-graph-cli-vendor.mjs', { cwd: repoRoot, stdio: 'inherit' });
  mkdirSync(outDir, { recursive: true });

  for (const entry of ['package.json', 'README.md']) {
    cpSync(join(sourceDir, entry), join(outDir, entry));
  }
  cpSync(join(repoRoot, 'LICENSE'), join(outDir, 'LICENSE'));
  cpSync(join(sourceDir, 'bin'), join(outDir, 'bin'), { recursive: true });
  cpSync(join(sourceDir, 'vendor'), join(outDir, 'vendor'), { recursive: true });

  const pkg = JSON.parse(readFileSync(join(sourceDir, 'package.json'), 'utf8'));
  writeFileSync(join(outDir, 'README.github-root.md'), `# work-graph/cli

npm: [\`@work-graph/cli\`](https://www.npmjs.com/package/@work-graph/cli) v${pkg.version}

Website: [workgraph.ru/en](https://workgraph.ru/en/)

Monorepo: [bvc-lang/work-graph](https://github.com/bvc-lang/work-graph)

## Install

\`\`\`bash
npx @work-graph/cli init .
npm install
npm run workgraph:ui
\`\`\`

Apache-2.0 — see LICENSE.
`, 'utf8');

  console.log(JSON.stringify({
    schema: 'workgraph.export-work-graph-cli-github.v1',
    outDir,
    version: pkg.version,
  }, null, 2));
}

main();
