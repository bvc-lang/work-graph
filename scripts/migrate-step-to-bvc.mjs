#!/usr/bin/env node
/**
 * Dry-run (default) or apply rename .bvc → .bvc under charter/protocols/intent/work/rules.
 *
 * Usage:
 *   node scripts/migrate-step-to-bvc.mjs
 *   node scripts/migrate-step-to-bvc.mjs --apply
 *   node scripts/migrate-step-to-bvc.mjs path/to/file.bvc
 */
import { rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { buildDefaultStepToBvcMigrationPlan } from '../src/migrateStepToBvc.mjs';

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const paths = argv.filter((entry) => !entry.startsWith('--'));
  return { apply, paths };
}

async function main() {
  const { apply, paths } = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const plan = await buildDefaultStepToBvcMigrationPlan(cwd, { paths: paths.map((entry) => resolve(cwd, entry)) });

  if (plan.length === 0) {
    console.log('No .bvc files to rename.');
    return;
  }

  console.log(`${apply ? 'apply' : 'dry-run'}: ${plan.length} rename(s)`);
  for (const entry of plan) {
    console.log(`${entry.from} -> ${entry.to}`);
  }

  if (!apply) {
    console.log('\nPass --apply to execute git mv/rename.');
    return;
  }

  for (const entry of plan) {
    await rename(join(cwd, entry.from), join(cwd, entry.to));
  }

  console.log(`Renamed ${plan.length} file(s). Review with git status before commit.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
