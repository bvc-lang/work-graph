#!/usr/bin/env node
/**
 * BVC linter CLI — dual-read .bvc and .bvc (legacy).
 * Usage: node scripts/bvc-lint.mjs <file.bvc|file.bvc>
 */
import { runBvcLint } from '../src/bvcLintCli.mjs';

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/bvc-lint.mjs <path.bvc|path.bvc>');
    process.exit(2);
  }

  try {
    process.exit(await runBvcLint(target));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

main();
