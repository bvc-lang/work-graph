#!/usr/bin/env node
/**
 * @bvc-lang/cli — lint and format for .bvc files.
 */
import { runBvcLint } from '../lib/bvcLintCli.mjs';
import { runBvcFormat } from '../lib/bvcFormatCli.mjs';

const USAGE = `Usage:
  bvc lint <file.bvc>
  bvc format <file.bvc> [--out path.bvc] [--stdout] [--in-place]

Commands:
  lint    Parse and lint a BVC file
  format  Write canonical .bvc (--in-place or --out / --stdout)
`;

async function main() {
  const [, , command, target, ...rest] = process.argv;

  if (!command) {
    console.error(USAGE.trim());
    process.exit(2);
  }

  if (command === 'lint') {
    if (!target || rest.length > 0) {
      console.error('Usage: bvc lint <path.bvc>');
      process.exit(2);
    }
    try {
      process.exit(await runBvcLint(target));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(2);
    }
  }

  if (command === 'format') {
    if (!target) {
      console.error('Usage: bvc format <path.bvc> [--out path.bvc] [--stdout] [--in-place]');
      process.exit(2);
    }
    const outFlag = rest.find((entry) => entry.startsWith('--out='));
    const out = outFlag?.slice('--out='.length) ?? (rest[0] === '--out' ? rest[1] : undefined);
    const formatRest = out && rest[0] === '--out' ? rest.slice(2) : rest;
    try {
      process.exit(await runBvcFormat(target, {
        out,
        stdout: formatRest.includes('--stdout'),
        inPlace: formatRest.includes('--in-place') ? true : undefined,
      }));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(2);
    }
  }

  console.error(`Unknown command: ${command}\n\n${USAGE.trim()}`);
  process.exit(2);
}

main();
