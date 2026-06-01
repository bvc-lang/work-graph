#!/usr/bin/env node

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { executeSemanticSearchFromRepo } from '../src/semanticSearchWorkflow.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');

function parseArgs(argv) {
  const args = {
    query: '',
    limit: 12,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--limit' && argv[index + 1]) {
      args.limit = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (token === '--json') {
      args.json = true;
      continue;
    }

    if (!token.startsWith('-')) {
      args.query = args.query ? `${args.query} ${token}` : token;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const query = args.query.trim();

  if (query === '') {
    console.error('Usage: npm run semantic:search -- "<query>" [--limit N] [--json]');
    process.exitCode = 1;
    return;
  }

  const result = await executeSemanticSearchFromRepo({
    cwd: repoRoot,
    query,
    limit: Number.isInteger(args.limit) && args.limit > 0 ? args.limit : 12,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (result.hitCount === 0) {
    console.log(`Нет результатов для: ${result.query}`);
    return;
  }

  for (const hit of result.hits) {
    console.log(`${hit.score}\t${hit.kind}\t${hit.label}`);
    console.log(`  refs: ${hit.traceRefs.join(', ')}`);
    if (hit.summary) {
      console.log(`  ${hit.summary}`);
    }
  }

  if (result.truncated) {
    console.log(`\n… обрезано (limit=${args.limit})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
