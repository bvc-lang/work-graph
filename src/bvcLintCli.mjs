import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseBvcFileContent, isBvcReadablePath } from './bvcFileFormat.mjs';

/**
 * @param {string} target
 * @param {{ cwd?: string }} [options]
 * @returns {Promise<number>} exit code
 */
export async function runBvcLint(target, options = {}) {
  if (!target) {
    throw new TypeError('runBvcLint requires target file path');
  }

  const cwd = options.cwd ?? process.cwd();
  const filePath = resolve(cwd, target);
  if (!isBvcReadablePath(filePath)) {
    const error = new Error(`Not a BVC file (expected .bvc or .bvc): ${target}`);
    error.code = 'E_BVC_LINT_INVALID_PATH';
    throw error;
  }

  const content = await readFile(filePath, 'utf8');
  const parsed = parseBvcFileContent(content, { filePath });

  let exitCode = 0;
  for (const lint of parsed.lints) {
    const prefix = lint.code.startsWith('E_') ? 'error' : 'warning';
    console.log(`${prefix} [${lint.code}] ${lint.message}`);
    if (prefix === 'error') {
      exitCode = 1;
    }
  }

  for (const atom of parsed.atoms) {
    for (const error of atom.errors ?? []) {
      console.log(`error [E_BVC_ATOM_INVALID] ${error}`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log(`ok ${target} atoms=${parsed.atoms.length}`);
  }

  return exitCode;
}
