import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { accessSync, constants, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { isNpmCliPackageRoot, resolveEngineRootFromNodeModules } from './workGraphEngineRoot.mjs';

export const APP_VERSION_SCHEMA = 'workgraph.app-version.v1';
export const APP_VERSION_INSTALL_SCHEMA = 'workgraph.app-version.install.v1';
export const DEFAULT_NPM_PACKAGE = '@work-graph/cli';
export const DEFAULT_MCP_PACKAGE = '@work-graph/mcp';
export const NPM_VERSION_CACHE_TTL_MS = 60 * 60 * 1000;
export const NPM_REGISTRY_FETCH_TIMEOUT_MS = 15_000;
export const NPM_UPDATE_TIMEOUT_MS = 5 * 60 * 1000;
export const NPM_REGISTRY_USER_AGENT = 'work-graph-app-version-check';

const execFileAsync = promisify(execFile);

/**
 * @param {string} packageName
 * @param {string} [registryBase]
 */
export function buildNpmRegistryLatestUrl(packageName, registryBase = process.env.WORKGRAPH_NPM_REGISTRY ?? 'https://registry.npmjs.org') {
  const base = String(registryBase).replace(/\/$/u, '');
  const name = String(packageName ?? '').trim();
  if (name.startsWith('@')) {
    const slash = name.indexOf('/');
    if (slash > 1) {
      const scope = name.slice(0, slash);
      const pkg = name.slice(slash + 1);
      return `${base}/${scope}%2F${encodeURIComponent(pkg)}/latest`;
    }
  }
  return `${base}/${encodeURIComponent(name)}/latest`;
}

/**
 * @param {string} packageName
 * @param {{ execFileSyncImpl?: typeof execFileSync, timeoutMs?: number }} [options]
 */
export function fetchNpmLatestVersionViaCli(packageName, options = {}) {
  const execImpl = options.execFileSyncImpl ?? execFileSync;
  const timeoutMs = options.timeoutMs ?? NPM_REGISTRY_FETCH_TIMEOUT_MS;
  const raw = execImpl('npm', ['view', packageName, 'version', '--json'], {
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed = JSON.parse(String(raw).trim());
  const latestVersion = typeof parsed === 'string' ? parsed : String(parsed?.version ?? parsed ?? '');
  if (!latestVersion) {
    throw new Error('npm view returned empty version');
  }
  return latestVersion;
}

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

/**
 * @param {string} packageName
 * @param {number} now
 * @param {{ latestVersion: string, fetchedAt: number }} cached
 */
function cacheHit(cached, now) {
  return {
    latestVersion: cached.latestVersion,
    fromCache: true,
    checkedAt: new Date(cached.fetchedAt).toISOString(),
  };
}

export async function fetchNpmLatestVersion(packageName, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = Date.now();
  const ttlMs = options.cacheTtlMs ?? NPM_VERSION_CACHE_TTL_MS;
  const cached = npmVersionCache.get(packageName);
  if (cached && now - cached.fetchedAt < ttlMs && options.bypassCache !== true) {
    return cacheHit(cached, now);
  }

  const url = buildNpmRegistryLatestUrl(packageName, options.registryBase);
  const timeoutMs = options.timeoutMs ?? NPM_REGISTRY_FETCH_TIMEOUT_MS;
  const signal = options.signal
    ?? (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined);

  let latestVersion = '';
  let source = 'registry-fetch';

  if (typeof fetchImpl === 'function') {
    try {
      const response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': NPM_REGISTRY_USER_AGENT,
        },
        signal,
      });
      if (!response.ok) {
        throw new Error(`npm registry HTTP ${response.status}`);
      }
      const payload = await response.json();
      latestVersion = String(payload.version ?? '');
      if (!latestVersion) {
        throw new Error('npm registry returned empty version');
      }
    } catch (error) {
      if (cached) {
        return { ...cacheHit(cached, now), stale: true };
      }
      try {
        latestVersion = fetchNpmLatestVersionViaCli(packageName, options);
        source = 'npm-cli';
      } catch (cliError) {
        const fetchMsg = error instanceof Error ? error.message : String(error);
        const cliMsg = cliError instanceof Error ? cliError.message : String(cliError);
        throw new Error(`${fetchMsg}; npm view: ${cliMsg}`);
      }
    }
  } else {
    latestVersion = fetchNpmLatestVersionViaCli(packageName, options);
    source = 'npm-cli';
  }

  npmVersionCache.set(packageName, { latestVersion, fetchedAt: now });
  return {
    latestVersion,
    fromCache: false,
    checkedAt: new Date(now).toISOString(),
    source,
  };
}

export async function buildAppVersionResponse(options = {}) {
  const local = await readLocalAppVersion(options);
  const npmPackage = options.npmPackage ?? local.npmPackage;
  let latestVersion = null;
  let updateAvailable = false;
  let checkError = null;
  let checkedAt = null;
  let fromCache = false;
  let updateCheckSource = null;

  if (options.checkUpdate === true) {
    try {
      const npmResult = await fetchNpmLatestVersion(npmPackage, {
        ...options,
        bypassCache: options.bypassCache === true,
      });
      latestVersion = npmResult.latestVersion;
      checkedAt = npmResult.checkedAt;
      fromCache = npmResult.fromCache === true;
      updateCheckSource = npmResult.source ?? (npmResult.stale ? 'cache-stale' : null);
      updateAvailable = isVersionNewer(latestVersion, local.version);
    } catch (error) {
      checkError = error instanceof Error ? error.message : String(error);
    }
  }

  const installCommandProject = `npm update ${npmPackage} ${DEFAULT_MCP_PACKAGE}`;
  const installCommandGlobal = `npm i -g ${npmPackage}@latest`;
  const canInstallFromUi = local.source === 'npm-cli-package';

  return {
    ...local,
    npmPackage,
    latestVersion,
    updateAvailable,
    checkError,
    checkedAt,
    fromCache,
    updateCheckSource,
    installCommand: installCommandProject,
    installCommandProject,
    installCommandGlobal,
    canInstallFromUi,
  };
}

/**
 * @param {{
 *   cwd?: string,
 *   npmPackage?: string,
 *   execFileImpl?: typeof execFile,
 *   timeoutMs?: number,
 * }} [options]
 */
export async function runAppVersionProjectUpdate(options = {}) {
  const projectRoot = options.cwd ?? process.cwd();
  const npmPackage = options.npmPackage ?? DEFAULT_NPM_PACKAGE;
  const resolved = resolveCliPackageJsonPath({ cwd: projectRoot, installRoot: options.installRoot });
  if (resolved.source !== 'npm-cli-package') {
    throw new Error('project_update_requires_npm_install');
  }

  const args = ['update', npmPackage, DEFAULT_MCP_PACKAGE];
  const execImpl = options.execFileImpl ?? execFileAsync;
  const timeoutMs = options.timeoutMs ?? NPM_UPDATE_TIMEOUT_MS;
  const { stdout, stderr } = await execImpl('npm', args, {
    cwd: projectRoot,
    timeout: timeoutMs,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });

  clearNpmVersionCache();
  const local = await readLocalAppVersion({ cwd: projectRoot, installRoot: options.installRoot });

  return {
    schema: APP_VERSION_INSTALL_SCHEMA,
    ok: true,
    version: local.version,
    npmPackage,
    command: `npm ${args.join(' ')}`,
    stdout: String(stdout ?? '').slice(0, 4000),
    stderr: String(stderr ?? '').slice(0, 4000),
    needsUiRestart: true,
  };
}

/**
 * @param {{
 *   cwd?: string,
 *   installRoot?: string,
 *   npmPackage?: string,
 *   execFileImpl?: typeof execFile,
 *   fetchImpl?: typeof fetch,
 * }} [options]
 */
export async function buildAppVersionInstallResponse(options = {}) {
  const check = await buildAppVersionResponse({
    ...options,
    checkUpdate: true,
    bypassCache: true,
  });

  if (check.checkError) {
    throw new Error(check.checkError);
  }
  if (check.updateAvailable !== true) {
    throw new Error('update_not_available');
  }
  if (check.canInstallFromUi !== true) {
    throw new Error('project_update_requires_npm_install');
  }

  const install = await runAppVersionProjectUpdate(options);
  const after = await readLocalAppVersion(options);

  return {
    ...install,
    previousVersion: check.version,
    latestVersion: check.latestVersion,
    version: after.version,
    updateApplied: !isVersionNewer(String(check.latestVersion ?? ''), after.version),
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
