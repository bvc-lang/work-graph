#!/usr/bin/env node
/**
 * Export architecture.snapshot.v1 to static formats (mermaid).
 *
 * Usage:
 *   node scripts/architecture-export.mjs [--format mermaid] [--out path] [--cwd repoRoot]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readArchitectureSnapshot } from '../src/workGraphBacklogUiServer.mjs';
import { exportArchitectureSnapshotMermaid } from '../src/architectureViewsProjection.mjs';

function parseArgs(argv) {
  const options = {
    format: 'mermaid',
    out: '',
    cwd: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--format' && argv[index + 1]) {
      options.format = argv[index + 1];
      index += 1;
    } else if (arg === '--out' && argv[index + 1]) {
      options.out = argv[index + 1];
      index += 1;
    } else if (arg === '--cwd' && argv[index + 1]) {
      options.cwd = resolve(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = await readArchitectureSnapshot({ cwd: options.cwd });

  if (options.format !== 'mermaid') {
    throw new Error(`Unsupported format: ${options.format}`);
  }

  const content = exportArchitectureSnapshotMermaid(snapshot);

  if (options.out) {
    const outPath = resolve(options.cwd, options.out);
    writeFileSync(outPath, content, 'utf8');
    console.log(JSON.stringify({ schema: 'architecture-export.v1', format: 'mermaid', out: outPath, blocks: snapshot.blocks.length }, null, 2));
    return;
  }

  process.stdout.write(content);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
