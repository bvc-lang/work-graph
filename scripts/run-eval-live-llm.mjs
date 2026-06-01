import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatLiveLlmEnvHelp,
  validateLiveLlmEnv,
} from '../src/evalLiveLlmEnv.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const evalScript = resolve(repoRoot, 'scripts/run-optional-golden-path-llm-eval.mjs');

async function main() {
  const taskId = process.argv[2];
  const validation = validateLiveLlmEnv(process.env);

  if (!validation.ok) {
    console.error(formatLiveLlmEnvHelp(validation));
    console.error('');
    console.error(JSON.stringify({
      ok: false,
      failureClass: 'env_blocker',
      errors: validation.errors,
      hints: validation.hints,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const args = [evalScript];
  if (taskId) {
    args.push(taskId);
  }

  const child = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    env: {
      ...process.env,
      ...validation.config,
    },
  });

  if (child.stdout) {
    process.stdout.write(child.stdout);
  }

  if (child.stderr) {
    process.stderr.write(child.stderr);
  }

  process.exitCode = child.status ?? 1;
}

await main();
