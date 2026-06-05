#!/usr/bin/env node
import { resolve } from 'node:path';

import { migrateRootIntentToDotCanon } from '../src/canonLayoutMigration.mjs';

function parseArgs(argv) {
  const args = [...argv];
  const flags = {
    dryRun: false,
    removeSource: false,
  };
  const positionals = [];

  while (args.length > 0) {
    const token = args.shift();
    if (token === '--dry-run') {
      flags.dryRun = true;
      continue;
    }
    if (token === '--remove-source') {
      flags.removeSource = true;
      continue;
    }
    if (token?.startsWith('--')) {
      throw new Error(`unknown flag: ${token}`);
    }
    positionals.push(token);
  }

  return {
    flags,
    projectRoot: resolve(positionals[0] ?? process.cwd()),
  };
}

async function main() {
  const { flags, projectRoot } = parseArgs(process.argv.slice(2));
  const result = await migrateRootIntentToDotCanon({
    repoRoot: projectRoot,
    dryRun: flags.dryRun,
    removeSource: flags.removeSource,
    migrationScript: 'scripts/migrate-root-intent-to-dot-canon.mjs',
  });
  console.log(JSON.stringify(result, null, 2));
}

await main();
