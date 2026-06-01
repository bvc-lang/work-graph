import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runGvmVerifyPreflight } from '../src/gvmVerifyWorkerGate.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const result = runGvmVerifyPreflight({
  cwd: repoRoot,
  env: process.env,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
