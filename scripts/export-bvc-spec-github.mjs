#!/usr/bin/env node
/**
 * Export packages/bvc-spec + governance links for initial bvc-lang/spec repo push.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const sourceDir = join(repoRoot, 'packages/bvc-spec');
const outDir = join(repoRoot, 'dist/bvc-spec-github');

function copyPackage() {
  mkdirSync(outDir, { recursive: true });
  for (const entry of ['index.js', 'package.json', 'README.md', 'LICENSE', 'LICENSE-SPEC', 'PUBLISH.md']) {
    cpSync(join(sourceDir, entry), join(outDir, entry));
  }
  cpSync(join(sourceDir, 'dialects'), join(outDir, 'dialects'), { recursive: true });
  cpSync(join(sourceDir, 'schemas'), join(outDir, 'schemas'), { recursive: true });
  cpSync(join(sourceDir, 'spec'), join(outDir, 'spec'), { recursive: true });
}

function writeRootReadme() {
  const pkg = JSON.parse(readFileSync(join(sourceDir, 'package.json'), 'utf8'));
  const body = `# bvc-lang/spec

Public specification repository for **BVC** (Basis · Vector · Goal).

- npm: [\`@bvc-lang/spec\`](https://www.npmjs.com/package/@bvc-lang/spec) v${pkg.version}
- Extension: \`.bvc\`

## Contents

This export mirrors \`packages/bvc-spec\` from the Work Graph pilot implementation.

See \`README.md\` in package root and \`spec/overview.md\`.

## License

Apache-2.0 (package). Specification text CC BY 4.0.
`;
  writeFileSync(join(outDir, 'README.github-root.md'), body, 'utf8');
}

function main() {
  copyPackage();
  writeRootReadme();
  console.log(JSON.stringify({
    schema: 'workgraph.export-bvc-spec-github.v1',
    outDir,
    next: 'Push dist/bvc-spec-github to github.com/bvc-lang/spec — see packages/bvc-spec/PUBLISH.md',
  }, null, 2));
}

main();
