#!/usr/bin/env node
/**
 * Replace legacy `.bvc` path suffixes with `.bvc` across repo text (tasks, docs, code strings).
 *
 * Usage:
 *   node scripts/global-step-path-to-bvc-references.mjs
 *   node scripts/global-step-path-to-bvc-references.mjs --apply
 */
import { runGlobalStepPathToBvcReferences } from '../src/globalStepPathToBvcReferences.mjs';

function parseArgs(argv) {
  return { apply: argv.includes('--apply') };
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const report = await runGlobalStepPathToBvcReferences(process.cwd(), { apply });
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    scanned: report.scanned,
    changed: report.changed,
    sample: report.files.slice(0, 24).map((entry) => entry.path),
  }, null, 2));

  if (!apply && report.changed > 0) {
    console.log('\nPass --apply to write changes.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
