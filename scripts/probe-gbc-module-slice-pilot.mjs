import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIntentGraphGbcSlicePilotReport } from '../src/intentGraphGbcSliceBoundary.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const report = await buildIntentGraphGbcSlicePilotReport({
  cwd: repoRoot,
  sampleRoot: 'tests/fixtures/gbc-pilot',
});

console.log(JSON.stringify(report, null, 2));
process.exit(0);
