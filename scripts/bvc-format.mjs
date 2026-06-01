#!/usr/bin/env node
/**
 * BVC formatter CLI — canonical `.bvc` writer with atom.lang preservation.
 * Usage: node scripts/bvc-format.mjs <file.bvc|file.bvc> [--out path.bvc] [--stdout]
 */
import { runBvcFormat } from '../src/bvcFormatCli.mjs';

function parseArgs(argv) {
  const positional = [];
  let out;
  let stdout = false;
  let inPlace = undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--stdout') {
      stdout = true;
      continue;
    }
    if (token === '--in-place') {
      inPlace = true;
      continue;
    }
    if (token === '--out') {
      out = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith('--out=')) {
      out = token.slice('--out='.length);
      continue;
    }
    positional.push(token);
  }

  return { target: positional[0], out, stdout, inPlace };
}

async function main() {
  const { target, out, stdout, inPlace } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error('Usage: node scripts/bvc-format.mjs <path.bvc|path.bvc> [--out path.bvc] [--stdout] [--in-place]');
    process.exit(2);
  }

  try {
    process.exit(await runBvcFormat(target, { out, stdout, inPlace }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

main();
