import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readRunnerQueueProjectionFromRepo,
  syncRunnerQueueProjectionToSqlite,
} from '../src/workGraphRunnerQueueProjection.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');

function parseArgs(argv) {
  const options = {
    backlogPath: 'work/backlog.bvc',
    journalPath: 'work/worker-runs.jsonl',
    outPath: 'work/runner-queue.projection.json',
    sqlitePath: '',
    syncSqlite: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sqlite') {
      options.syncSqlite = true;
      options.sqlitePath = options.sqlitePath || 'work/runner-queue.sqlite';
      continue;
    }
    if (arg === '--out') {
      options.outPath = argv[index + 1] ?? options.outPath;
      index += 1;
      continue;
    }
    if (arg === '--sqlite-path') {
      options.sqlitePath = argv[index + 1] ?? options.sqlitePath;
      options.syncSqlite = true;
      index += 1;
    }
  }

  return options;
}

async function main() {
  const cli = parseArgs(process.argv);
  const projection = await readRunnerQueueProjectionFromRepo({
    cwd: repoRoot,
    backlogPath: cli.backlogPath,
    journalPath: cli.journalPath,
  });

  const outAbsolute = resolve(repoRoot, cli.outPath);
  await mkdir(dirname(outAbsolute), { recursive: true });
  await writeFile(outAbsolute, `${JSON.stringify(projection, null, 2)}\n`, 'utf8');

  let sqliteResult = null;
  if (cli.syncSqlite) {
    const sqliteAbsolute = resolve(repoRoot, cli.sqlitePath);
    await mkdir(dirname(sqliteAbsolute), { recursive: true });
    sqliteResult = await syncRunnerQueueProjectionToSqlite(projection, { dbPath: sqliteAbsolute });
  }

  console.log(JSON.stringify({
    ok: true,
    schema: projection.schema,
    outPath: cli.outPath,
    summary: projection.summary,
    sqlite: sqliteResult,
  }, null, 2));
}

await main();
