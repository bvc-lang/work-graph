#!/usr/bin/env node
/**
 * Export packages/workgraph-mcp for github.com/work-graph/mcp mirror.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(repoRoot, 'packages/workgraph-mcp');
const outDir = join(repoRoot, 'dist/work-graph-mcp-github');

function main() {
  mkdirSync(outDir, { recursive: true });

  for (const entry of ['package.json', 'README.md']) {
    cpSync(join(sourceDir, entry), join(outDir, entry));
  }
  cpSync(join(repoRoot, 'LICENSE'), join(outDir, 'LICENSE'));
  cpSync(join(sourceDir, 'bin'), join(outDir, 'bin'), { recursive: true });
  cpSync(join(sourceDir, 'src'), join(outDir, 'src'), { recursive: true });

  const pkg = JSON.parse(readFileSync(join(sourceDir, 'package.json'), 'utf8'));
  writeFileSync(join(outDir, 'README.github-root.md'), `# work-graph/mcp

npm: [\`@work-graph/mcp\`](https://www.npmjs.com/package/@work-graph/mcp) v${pkg.version}

Monorepo: [bvc-lang/work-graph](https://github.com/bvc-lang/work-graph)

\`\`\`bash
WORKGRAPH_ROOT=/path/to/project npx @work-graph/mcp
\`\`\`

Apache-2.0 — see LICENSE.
`, 'utf8');

  console.log(JSON.stringify({
    schema: 'workgraph.export-work-graph-mcp-github.v1',
    outDir,
    version: pkg.version,
  }, null, 2));
}

main();
