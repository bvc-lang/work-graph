import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { buildAppVersionResponse, readLocalAppVersion } from '../src/appVersionApi.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('readLocalAppVersion', () => {
  it('reads version from package.json', async () => {
    const info = await readLocalAppVersion({ cwd: repoRoot });
    assert.equal(info.schema, 'workgraph.app-version.v1');
    assert.match(info.version, /^\d+\.\d+\.\d+$|^0\.0\.0$/);
    assert.equal(info.npmPackage, '@work-graph/cli');
  });
});

describe('buildAppVersionResponse', () => {
  it('uses mock fetch for npm latest check', async () => {
    const local = await readLocalAppVersion({ cwd: repoRoot });
    const payload = await buildAppVersionResponse({
      cwd: repoRoot,
      checkUpdate: true,
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return { version: local.version === '9.9.9' ? '9.9.9' : '9.9.9' };
        },
      }),
    });
    assert.equal(payload.latestVersion, '9.9.9');
    assert.equal(typeof payload.updateAvailable, 'boolean');
    assert.match(payload.installCommand, /^npm i -g @work-graph\/cli@latest$/);
  });
});
