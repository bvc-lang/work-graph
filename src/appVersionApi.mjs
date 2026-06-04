import { accessSync, constants, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { isNpmCliPackageRoot, resolveEngineRootFromNodeModules } from './workGraphEngineRoot.mjs';

export const APP_VERSION_SCHEMA = 'workgraph.app-version.v1';
export const DEFAULT_NPM_PACKAGE = '@work-graph/cli';
export const NPM_VERSION_CACHE_TTL_MS = 60 * 60 * 1000;

/** @type {Map<string, { latestVersion: string, fetchedAt: number }>} */
const npmVersionCache = new Map();

function pathExists(path) {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} version
 * @returns {[number, number, number] | null}
 */
export function parseSemverCore(version) {
  const match = String(version ?? '').trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * @param {string} latest
 * @param {string} current
 */
export function isVersionNewer(latest, current) {
  const a = parseSemverCore(latest);
  const b = parseSemverCore(current);
  if (!a || !b) {
    return latest !== '' && latest !== current;
  }
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

export function clearNpmVersionCache() {
  npmVersionCache.clear();
}

/**
 * @param {string} packageName
 * @param {{ latestVersion: string, fetchedAt?: number }} entry
 */
export function seedNpmVersionCache(packageName, entry) {
  npmVersionCache.set(packageName, {
    latestVersion: entry.latestVersion,
    fetchedAt: entry.fetchedAt ?? Date.now(),
  });
}

/**
 * @param {{
 *   cwd?: string,
 *   installRoot?: string,
 * }} [options]
 */
export function resolveCliPackageJsonPath(options = {}) {
  const projectRoot = options.cwd ?? process.cwd();

  const fromNodeModules = resolveEngineRootFromNodeModules(projectRoot);
  if (fromNodeModules) {
    return {
      packageJsonPath: join(fromNodeModules, 'package.json'),
      installRoot: fromNodeModules,
      source: 'npm-cli-package',
    };
  }

  if (options.installRoot && isNpmCliPackageRoot(options.installRoot)) {
    return {
      packageJsonPath: join(options.installRoot, 'package.json'),
      installRoot: options.installRoot,
      source: 'npm-cli-package',
    };
  }

  const monorepoCliPath = join(projectRoot, 'packages/work-graph-cli/package.json');
  if (pathExists(monorepoCliPath)) {
    return {
      packageJsonPath: monorepoCliPath,
      installRoot: dirname(monorepoCliPath),
      source: 'monorepo-cli-package',
    };
  }

  return {
    packageJsonPath: join(projectRoot, 'package.json'),
    installRoot: projectRoot,
    source: 'project-fallback',
  };
}

export async function readLocalAppVersion(options = {}) {
  const resolved = resolveCliPackageJsonPath(options);
  const text = await readFile(resolved.packageJsonPath, 'utf8');
  const pkg = JSON.parse(text);
  const npmPackage = options.npmPackage ?? DEFAULT_NPM_PACKAGE;
  return {
    schema: APP_VERSION_SCHEMA,
    version: String(pkg.version ?? '0.0.0'),
    packageName: String(pkg.name ?? npmPackage),
    npmPackage,
    installRoot: resolved.installRoot,
    source: resolved.source,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchNpmLatestVersion(packageName, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetch is not available');
  }

  const now = Date.now();
  const ttlMs = options.cacheTtlMs ?? NPM_VERSION_CACHE_TTL_MS;
  const cached = npmVersionCache.get(packageName);
  if (cached && now - cached.fetchedAt < ttlMs && options.bypassCache !== true) {
    return { latestVersion: cached.latestVersion, fromCache: true, checkedAt: new Date(cached.fetchedAt).toISOString() };
  }

  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: options.signal,
  });
  if (!response.ok) {
    if (cached) {
      return { latestVersion: cached.latestVersion, fromCache: true, checkedAt: new Date(cached.fetchedAt).toISOString(), stale: true };
    }
    throw new Error(`npm registry HTTP ${response.status}`);
  }
  const payload = await response.json();
  const latestVersion = String(payload.version ?? '');
  npmVersionCache.set(packageName, { latestVersion, fetchedAt: now });
  return { latestVersion, fromCache: false, checkedAt: new Date(now).toISOString() };
}

export async function buildAppVersionResponse(options = {}) {
  const local = await readLocalAppVersion(options);
  const npmPackage = options.npmPackage ?? local.npmPackage;
  let latestVersion = null;
  let updateAvailable = false;
  let checkError = null;
  let checkedAt = null;
  let fromCache = false;

  if (options.checkUpdate === true) {
    try {
      const npmResult = await fetchNpmLatestVersion(npmPackage, options);
      latestVersion = npmResult.latestVersion;
      checkedAt = npmResult.checkedAt;
      fromCache = npmResult.fromCache === true;
      updateAvailable = isVersionNewer(latestVersion, local.version);
    } catch (error) {
      checkError = error instanceof Error ? error.message : String(error);
    }
  }

  const installCommandProject = `npm update ${npmPackage} @work-graph/mcp`;
  const installCommandGlobal = `npm i -g ${npmPackage}@latest`;

  return {
    ...local,
    npmPackage,
    latestVersion,
    updateAvailable,
    checkError,
    checkedAt,
    fromCache,
    installCommand: installCommandProject,
    installCommandProject,
    installCommandGlobal,
  };
}

export function readLocalAppVersionSync(options = {}) {
  const resolved = resolveCliPackageJsonPath(options);
  const text = readFileSync(resolved.packageJsonPath, 'utf8');
  const pkg = JSON.parse(text);
  const npmPackage = options.npmPackage ?? DEFAULT_NPM_PACKAGE;
  return {
    schema: APP_VERSION_SCHEMA,
    version: String(pkg.version ?? '0.0.0'),
    packageName: String(pkg.name ?? npmPackage),
    npmPackage,
    installRoot: resolved.installRoot,
    source: resolved.source,
  };
}
