import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatOnebaseCliResult,
  resolveDefaultOnebaseProjectRoot,
  runOnebaseCheck,
} from '../src/onebaseCliRunner.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const projectRoot = resolveDefaultOnebaseProjectRoot({ repoRoot });

const result = runOnebaseCheck({ projectRoot, cwd: projectRoot, repoRoot });

if (result.failureClass === 'cli_command_unavailable' || result.failureClass === 'cli_missing') {
  console.log(JSON.stringify({
    schema: 'onebase.config-check.result.v1',
    status: 'skipped',
    reason: result.failureClass,
    message: result.message,
    projectRoot,
    command: result.command,
  }, null, 2));
  process.exit(0);
}

console.log(formatOnebaseCliResult(result));
process.exit(result.ok ? 0 : 1);
