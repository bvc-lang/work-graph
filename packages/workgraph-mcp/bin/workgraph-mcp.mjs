#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

function resolveMcpEntry() {
  try {
    const cliPkg = require.resolve('@work-graph/cli/package.json');
    const cliRoot = dirname(cliPkg);
    const vendorEntry = join(cliRoot, 'vendor/packages/workgraph-mcp/src/index.mjs');
    return pathToFileURL(vendorEntry).href;
  } catch {
    // monorepo dev
    const localEntry = new URL('../src/index.mjs', import.meta.url).href;
    return localEntry;
  }
}

await import(resolveMcpEntry());
