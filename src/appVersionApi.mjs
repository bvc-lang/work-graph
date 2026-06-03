import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const APP_VERSION_SCHEMA = 'workgraph.app-version.v1';
export const DEFAULT_NPM_PACKAGE = '@work-graph/cli';

export async function readLocalAppVersion(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const pkgPath = join(cwd, options.packageJsonPath ?? 'package.json');
  const text = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(text);
  return {
    schema: APP_VERSION_SCHEMA,
    version: String(pkg.version ?? '0.0.0'),
    packageName: String(pkg.name ?? 'work-graph-rebuild'),
    npmPackage: options.npmPackage ?? DEFAULT_NPM_PACKAGE,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchNpmLatestVersion(packageName, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetch is not available');
  }
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`npm registry HTTP ${response.status}`);
  }
  const payload = await response.json();
  return String(payload.version ?? '');
}

export async function buildAppVersionResponse(options = {}) {
  const local = await readLocalAppVersion(options);
  const npmPackage = options.npmPackage ?? local.npmPackage;
  let latestVersion = null;
  let updateAvailable = false;
  let checkError = null;

  if (options.checkUpdate === true) {
    try {
      latestVersion = await fetchNpmLatestVersion(npmPackage, options);
      updateAvailable = latestVersion !== '' && latestVersion !== local.version;
    } catch (error) {
      checkError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    ...local,
    npmPackage,
    latestVersion,
    updateAvailable,
    checkError,
    installCommand: `npm i -g ${npmPackage}@latest`,
  };
}
