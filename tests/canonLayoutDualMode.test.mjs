import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  CANON_LAYOUT_DOT_CANON,
  CANON_LAYOUT_ROOT_INTENT,
  resolveCanonPathsFromRepo,
} from '../src/canonPaths.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const dotCanonFixtureRoot = resolve(__dirname, 'fixtures/canon-layout-dot-canon');

describe('canon layout dual-mode regression', () => {
  it('root-intent: resolves canon at repo root and reads WG backlog items', async () => {
    const paths = resolveCanonPathsFromRepo(repoRoot);
    assert.equal(paths.canonLayout, CANON_LAYOUT_ROOT_INTENT);
    assert.equal(paths.readCwd, repoRoot);

    const items = await readWorkItemsFromRepo({ repoRoot });
    assert.ok(items.length > 0);
    assert.ok(items.some((item) => item.id === 'implement-canon-paths-resolver-v1'));
  });

  it('dot-canon: resolves .work-graph/canon read cwd and reads fixture task', async () => {
    const paths = resolveCanonPathsFromRepo(dotCanonFixtureRoot);
    assert.equal(paths.canonLayout, CANON_LAYOUT_DOT_CANON);
    assert.equal(paths.readCwd, join(dotCanonFixtureRoot, '.work-graph/canon'));

    const items = await readWorkItemsFromRepo({ repoRoot: dotCanonFixtureRoot });
    assert.deepEqual(items.map((item) => item.id), ['dot-canon-fixture-task']);
  });
});
