import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import {
  formatBvcFileContent,
  isBvcReadablePath,
  isLegacyStepPath,
  swapBvcExtension,
} from './bvcFileFormat.mjs';

/**
 * @param {string} target
 * @param {{
 *   cwd?: string,
 *   out?: string,
 *   stdout?: boolean,
 *   inPlace?: boolean,
 * }} [options]
 * @returns {Promise<number>}
 */
export async function runBvcFormat(target, options = {}) {
  if (!target) {
    throw new TypeError('runBvcFormat requires target file path');
  }

  const cwd = options.cwd ?? process.cwd();
  const filePath = resolve(cwd, target);
  if (!isBvcReadablePath(filePath)) {
    const error = new Error(`Not a BVC file (expected .bvc or .bvc): ${target}`);
    error.code = 'E_BVC_FORMAT_INVALID_PATH';
    throw error;
  }

  const content = await readFile(filePath, 'utf8');
  const formatted = formatBvcFileContent(content, { filePath });

  if (options.stdout) {
    process.stdout.write(formatted);
    return 0;
  }

  let outPath = filePath;
  if (options.out) {
    outPath = resolve(cwd, options.out);
  } else if (options.inPlace === false && isLegacyStepPath(filePath)) {
    outPath = swapBvcExtension(filePath);
  } else if (isLegacyStepPath(filePath) && options.inPlace !== true) {
    outPath = swapBvcExtension(filePath);
  }

  await writeFile(outPath, formatted, 'utf8');
  const displayOut = relative(cwd, outPath) || outPath;
  console.log(`ok formatted ${target} -> ${displayOut}`);
  return 0;
}
