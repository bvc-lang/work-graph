import assert from 'node:assert/strict';
import { accessSync, constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { execSync } from 'node:child_process';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = join(repoRoot, 'packages/work-graph-cli/vendor');

function pathExists(path) {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

describe('sync-work-graph-cli-vendor', () => {
  it('copies UI locales and starter templates into vendor bundle', () => {
    execSync('node scripts/sync-work-graph-cli-vendor.mjs', {
      cwd: repoRoot,
      stdio: 'pipe',
    });

    assert.equal(pathExists(join(vendorDir, 'locales/en/ui.json')), true);
    assert.equal(pathExists(join(vendorDir, 'templates/starter/architecture/main.bvc')), true);
    assert.equal(pathExists(join(vendorDir, 'src/ui/i18n/uiCatalog.mjs')), true);
  });
});
