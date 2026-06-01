import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { syncOnebaseParityEvidence } from '../src/onebaseParityEvidenceSync.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const result = await syncOnebaseParityEvidence({ repoRoot });

console.log(JSON.stringify({
  ok: result.ok,
  outputPath: result.outputPath,
  evidenceLine: result.payload.evidenceLine,
  cliProbe: result.probe,
  parityRows: result.payload.parity.rows.filter((row) => row.cliCommand),
}, null, 2));
