import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const CANON_LAYOUT_ROOT_INTENT = 'root-intent';
export const CANON_LAYOUT_DOT_CANON = 'dot-canon';
export const DEFAULT_CANON_ROOT_REL = '.work-graph/canon';
export const DEFAULT_INTENT_INDEX_REL = 'intent/index.bvc';
export const DEFAULT_INTENT_TREE_ROOT = 'intent/';
export const DEFAULT_CHARTER_ROOT = 'charter/';
export const DEFAULT_ARCHITECTURE_ROOT = 'architecture/';

export function normalizeCanonLayout(value) {
  const normalized = String(value ?? '').trim();
  return normalized === CANON_LAYOUT_DOT_CANON
    ? CANON_LAYOUT_DOT_CANON
    : CANON_LAYOUT_ROOT_INTENT;
}

export function resolveCanonPaths(input = {}) {
  const repoRoot = resolve(input.repoRoot ?? process.cwd());
  const config = input.config ?? null;
  const canonLayout = normalizeCanonLayout(config?.canonLayout);
  const canonRootRel = String(config?.canonRoot ?? DEFAULT_CANON_ROOT_REL).trim() || DEFAULT_CANON_ROOT_REL;
  const canonRoot = canonLayout === CANON_LAYOUT_DOT_CANON
    ? resolve(repoRoot, canonRootRel)
    : repoRoot;

  return {
    repoRoot,
    canonRoot,
    canonLayout,
    canonRootRel: canonLayout === CANON_LAYOUT_DOT_CANON ? canonRootRel : '',
    intentIndexPath: DEFAULT_INTENT_INDEX_REL,
    intentTreeRoot: DEFAULT_INTENT_TREE_ROOT,
    charterRoot: DEFAULT_CHARTER_ROOT,
    architectureRoot: DEFAULT_ARCHITECTURE_ROOT,
    readCwd: canonRoot,
  };
}

export function readProjectConfigSync(repoRoot, options = {}) {
  const configPath = join(resolve(repoRoot), '.work-graph', 'config.json');
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    if (options.optional === true && error && typeof error === 'object' && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export function resolveCanonPathsFromRepo(repoRoot, options = {}) {
  const normalizedRepoRoot = resolve(repoRoot ?? process.cwd());
  const config = options.config ?? readProjectConfigSync(normalizedRepoRoot, { optional: true });
  return resolveCanonPaths({ repoRoot: normalizedRepoRoot, config });
}

export function resolveCanonReadOptions(options = {}) {
  if (options.backlogText !== undefined || options.backlogPath) {
    return { ...options };
  }

  if (options._canonResolved === true) {
    return options;
  }

  const repoRoot = resolve(options.repoRoot ?? options.cwd ?? process.cwd());
  const canonPaths = options.canonPaths ?? resolveCanonPathsFromRepo(repoRoot, {
    config: options.config,
  });

  return {
    ...options,
    repoRoot,
    canonPaths,
    cwd: options.cwd ?? canonPaths.readCwd,
    intentIndexPath: options.intentIndexPath ?? canonPaths.intentIndexPath,
    _canonResolved: true,
  };
}
