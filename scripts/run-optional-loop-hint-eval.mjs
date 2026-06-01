import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runLoopHintRepeatToolEval } from '../src/loopHintRepeatToolEval.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const result = await runLoopHintRepeatToolEval({ cwd: repoRoot });

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
