import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, afterEach } from 'node:test';

import {
  buildAppVersionInstallResponse,
  buildAppVersionResponse,
  buildNpmExecInvocation,
  buildNpmRegistryLatestUrl,
  clearNpmVersionCache,
  fetchNpmLatestVersion,
  isVersionNewer,
  parseSemverCore,
  readLocalAppVersion,
  resolveCliPackageJsonPath,
  runAppVersionProjectUpdate,
  seedNpmVersionCache,
} from '../src/appVersionApi.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('buildNpmExecInvocation', () => {
  it('uses shell on Windows so npm resolves from PATH', () => {
    const invocation = buildNpmExecInvocation(['update', '@work-graph/cli']);
    assert.equal(invocation.file, 'npm');
    assert.deepEqual(invocation.args, ['update', '@work-graph/cli']);
    if (process.platform === 'win32') {
      assert.equal(invocation.options.shell, true);
    } else {
      assert.equal(invocation.options.shell, undefined);
    }
  });
});

describe('buildNpmRegistryLatestUrl', () => {
  it('uses scoped package path for @work-graph/cli', () => {
    assert.equal(
      buildNpmRegistryLatestUrl('@work-graph/cli'),
      'https://registry.npmjs.org/@work-graph%2Fcli/latest',
    );
  });
});

describe('parseSemverCore / isVersionNewer', () => {
  it('compares semver tuples', () => {
    assert.deepEqual(parseSemverCore('0.2.9'), [0, 2, 9]);
    assert.equal(isVersionNewer('0.3.0', '0.2.9'), true);
    assert.equal(isVersionNewer('0.2.9', '0.2.9'), false);
    assert.equal(isVersionNewer('0.2.8', '0.2.9'), false);
  });
});

describe('resolveCliPackageJsonPath', () => {
  it('prefers monorepo cli package in dev repo', () => {
    const resolved = resolveCliPackageJsonPath({ cwd: repoRoot });
    assert.equal(resolved.source, 'monorepo-cli-package');
    assert.match(resolved.packageJsonPath, /packages[\\/]work-graph-cli[\\/]package\.json$/);
  });

  it('reads npm package from node_modules layout', async () => {
    const tempRoot = join(repoRoot, 'tests', '.tmp-app-version-npm');
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, 'node_modules', '@work-graph', 'cli'), { recursive: true });
    await writeFile(join(tempRoot, 'package.json'), JSON.stringify({ name: 'user-app', version: '9.9.9' }), 'utf8');
    await writeFile(
      join(tempRoot, 'node_modules', '@work-graph', 'cli', 'package.json'),
      JSON.stringify({ name: '@work-graph/cli', version: '0.2.9' }),
      'utf8',
    );

    try {
      const resolved = resolveCliPackageJsonPath({ cwd: tempRoot });
      assert.equal(resolved.source, 'npm-cli-package');
      const info = await readLocalAppVersion({ cwd: tempRoot });
      assert.equal(info.version, '0.2.9');
      assert.equal(info.source, 'npm-cli-package');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('readLocalAppVersion', () => {
  it('reads version from cli package.json in monorepo', async () => {
    const info = await readLocalAppVersion({ cwd: repoRoot });
    assert.equal(info.schema, 'workgraph.app-version.v1');
    assert.match(info.version, /^\d+\.\d+\.\d+$/);
    assert.equal(info.npmPackage, '@work-graph/cli');
    assert.equal(info.source, 'monorepo-cli-package');
  });
});

describe('buildAppVersionResponse', () => {
  afterEach(() => {
    clearNpmVersionCache();
  });

  it('uses mock fetch for npm latest check', async () => {
    const local = await readLocalAppVersion({ cwd: repoRoot });
    const payload = await buildAppVersionResponse({
      cwd: repoRoot,
      checkUpdate: true,
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { version: '9.9.9' };
        },
      }),
    });
    assert.equal(payload.latestVersion, '9.9.9');
    assert.equal(payload.updateAvailable, true);
    assert.match(payload.installCommand, /^npm update @work-graph\/cli @work-graph\/mcp$/);
    assert.match(payload.installCommandGlobal, /^npm i -g @work-graph\/cli@latest$/);
    assert.notEqual(local.version, '9.9.9');
  });

  it('falls back to npm view when registry fetch fails', async () => {
    const result = await fetchNpmLatestVersion('@work-graph/cli', {
      bypassCache: true,
      fetchImpl: async () => {
        throw new Error('fetch failed');
      },
      execFileSyncImpl: () => '"0.2.11"\n',
    });
    assert.equal(result.latestVersion, '0.2.11');
    assert.equal(result.source, 'npm-cli');
  });

  it('serves npm latest from cache within ttl', async () => {
    seedNpmVersionCache('@work-graph/cli', { latestVersion: '1.0.0' });
    let fetchCalls = 0;
    const payload = await buildAppVersionResponse({
      cwd: repoRoot,
      checkUpdate: true,
      fetchImpl: async () => {
        fetchCalls += 1;
        return {
          ok: true,
          async json() {
            return { version: '2.0.0' };
          },
        };
      },
    });
    assert.equal(fetchCalls, 0);
    assert.equal(payload.latestVersion, '1.0.0');
    assert.equal(payload.fromCache, true);
  });

  it('bypasses npm cache when bypassCache is true', async () => {
    seedNpmVersionCache('@work-graph/cli', { latestVersion: '1.0.0' });
    let fetchCalls = 0;
    const payload = await buildAppVersionResponse({
      cwd: repoRoot,
      checkUpdate: true,
      bypassCache: true,
      fetchImpl: async () => {
        fetchCalls += 1;
        return {
          ok: true,
          async json() {
            return { version: '2.0.0' };
          },
        };
      },
    });
    assert.equal(fetchCalls, 1);
    assert.equal(payload.latestVersion, '2.0.0');
    assert.equal(payload.fromCache, false);
  });
});

describe('runAppVersionProjectUpdate / buildAppVersionInstallResponse', () => {
  afterEach(() => {
    clearNpmVersionCache();
  });

  it('runs npm update in npm-installed project layout', async () => {
    const tempRoot = join(repoRoot, 'tests', '.tmp-app-version-install');
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, 'node_modules', '@work-graph', 'cli'), { recursive: true });
    await writeFile(join(tempRoot, 'package.json'), JSON.stringify({ name: 'user-app', version: '9.9.9' }), 'utf8');
    await writeFile(
      join(tempRoot, 'node_modules', '@work-graph', 'cli', 'package.json'),
      JSON.stringify({ name: '@work-graph/cli', version: '0.2.9' }),
      'utf8',
    );

    let command = '';
    try {
      const result = await runAppVersionProjectUpdate({
        cwd: tempRoot,
        execFileImpl: async (file, args, execOptions = {}) => {
          command = `${file} ${args.join(' ')}`;
          if (process.platform === 'win32') {
            assert.equal(execOptions.shell, true);
          }
          await writeFile(
            join(tempRoot, 'node_modules', '@work-graph', 'cli', 'package.json'),
            JSON.stringify({ name: '@work-graph/cli', version: '0.2.14' }),
            'utf8',
          );
          return { stdout: 'updated', stderr: '' };
        },
      });
      assert.equal(command, 'npm update @work-graph/cli @work-graph/mcp');
      assert.equal(result.version, '0.2.14');
      assert.equal(result.needsUiRestart, true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects install when update is not available', async () => {
    await assert.rejects(
      () => buildAppVersionInstallResponse({
        cwd: repoRoot,
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return { version: '0.0.1' };
          },
        }),
      }),
      /update_not_available/,
    );
  });

  it('rejects install from monorepo dev layout', async () => {
    await assert.rejects(
      () => buildAppVersionInstallResponse({
        cwd: repoRoot,
        fetchImpl: async () => ({
          ok: true,
          async json() {
            return { version: '9.9.9' };
          },
        }),
      }),
      /project_update_requires_npm_install/,
    );
  });
});
