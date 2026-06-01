import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { swapBvcExtension } from './bvcFileFormat.mjs';

const DEFAULT_SCAN_ROOTS = Object.freeze([
  'architecture',
  'charter',
  'protocols',
  'intent',
  'work',
  'rules',
  'ui',
  'domains',
  'plans',
  'skills',
  'tests',
]);

/** @type {Set<string>} */
export const STEP_RENAME_SKIP_RELATIVE_PATHS = new Set([
  'tests/conformance/minimal.en.step',
]);

/**
 * @param {string} filePath
 */
export function isStepMigrationCandidate(filePath) {
  return String(filePath).toLowerCase().endsWith('.step');
}

/**
 * @param {string} filePath
 * @param {{ preferCanon?: boolean }} [options]
 */
export function stepToBvcTargetPath(filePath, options = {}) {
  if (!isStepMigrationCandidate(filePath)) {
    return null;
  }
  return swapBvcExtension(filePath, options);
}

/**
 * @param {string[]} filePaths
 * @param {{ preferCanon?: boolean }} [options]
 */
export function buildStepToBvcMigrationPlan(filePaths, options = {}) {
  /** @type {Array<{ from: string, to: string }>} */
  const renames = [];

  for (const filePath of filePaths) {
    const to = stepToBvcTargetPath(filePath, options);
    if (to === null || to === filePath) {
      continue;
    }
    renames.push({ from: filePath, to });
  }

  renames.sort((left, right) => left.from.localeCompare(right.from, 'en', { sensitivity: 'variant' }));
  return renames;
}

/**
 * @param {string} directory
 * @param {{ cwd?: string, roots?: string[] }} [options]
 */
export async function collectStepFilesUnderRoots(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const roots = options.roots ?? DEFAULT_SCAN_ROOTS;
  /** @type {string[]} */
  const files = [];

  async function walk(relativeDir) {
    const absoluteDir = join(cwd, relativeDir);
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relativePath = join(relativeDir, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          continue;
        }
        await walk(relativePath);
        continue;
      }
      if (entry.isFile() && isStepMigrationCandidate(relativePath)) {
        if (STEP_RENAME_SKIP_RELATIVE_PATHS.has(relativePath)) {
          continue;
        }
        files.push(relativePath);
      }
    }
  }

  for (const root of roots) {
    const absoluteRoot = join(cwd, root);
    try {
      const rootStat = await stat(absoluteRoot);
      if (!rootStat.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    await walk(root);
  }

  files.sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'variant' }));
  return files;
}

/**
 * @param {string} cwd
 * @param {{ roots?: string[], paths?: string[] }} [options]
 */
export async function buildDefaultStepToBvcMigrationPlan(cwd, options = {}) {
  const explicitPaths = (options.paths ?? [])
    .map((entry) => relative(cwd, entry).replace(/\\/g, '/'))
    .filter((entry) => entry && !entry.startsWith('..'));

  const filePaths = explicitPaths.length > 0
    ? explicitPaths
    : await collectStepFilesUnderRoots({ cwd, roots: options.roots });

  return buildStepToBvcMigrationPlan(filePaths);
}

export { DEFAULT_SCAN_ROOTS };
