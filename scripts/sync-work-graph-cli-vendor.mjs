#!/usr/bin/env node
/**
 * Copy runtime into packages/work-graph-cli/vendor for npm publish.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(repoRoot, 'packages/work-graph-cli/vendor');

function copyDir(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

function main() {
  rmSync(vendorDir, { recursive: true, force: true });
  mkdirSync(vendorDir, { recursive: true });

  copyDir(join(repoRoot, 'src'), join(vendorDir, 'src'));
  copyDir(join(repoRoot, 'public'), join(vendorDir, 'public'));
  copyDir(
    join(repoRoot, 'packages/design-tokens/generated'),
    join(vendorDir, 'packages/design-tokens/generated'),
  );
  copyDir(join(repoRoot, 'packages/workgraph-mcp'), join(vendorDir, 'packages/workgraph-mcp'));
  copyDir(join(repoRoot, 'packages/bvc-dialects'), join(vendorDir, 'packages/bvc-dialects'));

  console.log(JSON.stringify({
    schema: 'workgraph.sync-work-graph-cli-vendor.v1',
    vendorDir,
    copied: ['src', 'public', 'packages/design-tokens/generated', 'packages/workgraph-mcp', 'packages/bvc-dialects'],
  }, null, 2));
}

main();
