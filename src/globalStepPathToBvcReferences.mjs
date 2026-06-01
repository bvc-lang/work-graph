import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

/** Files that must keep literal `.step` for legacy dual-read API/tests. */
export const STEP_PATH_REPLACE_SKIP_FILES = new Set([
  'src/bvcFileFormat.mjs',
  'src/migrateStepToBvc.mjs',
  'tests/bvcDualExtension.test.mjs',
  'tests/migrateStepToBvc.test.mjs',
  'tests/bvcSpecPackage.test.mjs',
  'tests/bvcFormatCli.test.mjs',
  'tests/conformance/minimal.en.step',
  'tests/conformance/minimal.en.bvc',
  'src/globalStepPathToBvcReferences.mjs',
  'packages/bvc-spec/index.js',
  'dist/bvc-spec-github/index.js',
]);

export const STEP_PATH_REPLACE_SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'playwright-report',
  'test-results',
]);

const TEXT_EXTENSIONS = new Set([
  '.bvc',
  '.step',
  '.md',
  '.mdc',
  '.mjs',
  '.js',
  '.json',
  '.jsonl',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
  '.txt',
]);

/**
 * Replace filesystem path suffix `.step` → `.bvc` in prose and labels.
 * Preserves ../project/* paths (ioHasC sibling repo still on .step).
 * @param {string} text
 */
export function replaceStepPathReferencesInText(text) {
  /** @type {string[]} */
  const externalStepPaths = [];
  let out = String(text).replace(/(\.\.\/project[^\s'"),#\]]*?)\.step\b/g, (match) => {
    const token = `__EXTERNAL_STEP_PATH_${externalStepPaths.length}__`;
    externalStepPaths.push(match);
    return token;
  });

  /** Protect prose mentions of the legacy extension before path rewrites. */
  const legacyExtTokens = [];
  out = out.replace(/\blegacy \.step\b/gi, () => {
    const token = `__LEGACY_EXT_${legacyExtTokens.length}__`;
    legacyExtTokens.push('legacy .step');
    return token;
  });
  out = out.replace(/`\.step`/g, () => {
    const token = `__LEGACY_EXT_${legacyExtTokens.length}__`;
    legacyExtTokens.push('`.step`');
    return token;
  });

  out = out.replace(/\.work\.step\b/g, '.work.bvc');
  out = out.replace(/\.intent\.step\b/g, '.intent.bvc');
  out = out.replace(/\.compiler\.step\b/g, '.compiler.bvc');
  out = out.replace(/\.step\b/g, '.bvc');

  for (let index = 0; index < legacyExtTokens.length; index += 1) {
    const restored = legacyExtTokens[index];
    out = out.replace(`__LEGACY_EXT_${index}__`, restored);
  }

  for (let index = 0; index < externalStepPaths.length; index += 1) {
    out = out.replace(`__EXTERNAL_STEP_PATH_${index}__`, externalStepPaths[index]);
  }

  return out;
}

/**
 * @param {string} cwd
 * @param {{ apply?: boolean, roots?: string[] }} [options]
 */
export async function collectTextFilesForStepPathReplace(cwd, options = {}) {
  const roots = options.roots ?? ['.'];
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
      const base = relativePath.replace(/^\.\//, '');

      if (entry.isDirectory()) {
        if (STEP_PATH_REPLACE_SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(relativePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (STEP_PATH_REPLACE_SKIP_FILES.has(base)) {
        continue;
      }

      const ext = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.')) : '';
      if (!TEXT_EXTENSIONS.has(ext)) {
        continue;
      }

      files.push(base);
    }
  }

  for (const root of roots) {
    const absoluteRoot = join(cwd, root);
    try {
      const rootStat = await stat(absoluteRoot);
      if (!rootStat.isDirectory() && root !== '.') {
        continue;
      }
    } catch {
      continue;
    }
    await walk(root === '.' ? '.' : root);
  }

  files.sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'variant' }));
  return files;
}

/**
 * @param {string} cwd
 * @param {{ apply?: boolean, roots?: string[] }} [options]
 */
export async function runGlobalStepPathToBvcReferences(cwd, options = {}) {
  const apply = options.apply === true;
  const files = await collectTextFilesForStepPathReplace(cwd, options);
  /** @type {Array<{ path: string, changed: boolean }>} */
  const report = [];

  for (const filePath of files) {
    const absolutePath = join(cwd, filePath);
    const before = await readFile(absolutePath, 'utf8');
    const after = replaceStepPathReferencesInText(before);
    const changed = before !== after;
    report.push({ path: filePath, changed });
    if (changed && apply) {
      await writeFile(absolutePath, after, 'utf8');
    }
  }

  return {
    schema: 'global-step-path-to-bvc-references.v1',
    apply,
    scanned: files.length,
    changed: report.filter((entry) => entry.changed).length,
    files: report.filter((entry) => entry.changed),
  };
}

/**
 * Extended rename roots for residual `.bvc` artifacts.
 */
export const FULL_BVC_RENAME_ROOTS = Object.freeze([
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
