import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  CANON_LAYOUT_DOT_CANON,
  CANON_LAYOUT_ROOT_INTENT,
  DEFAULT_CANON_ROOT_REL,
  normalizeCanonLayout,
  readProjectConfigSync,
  resolveCanonPaths,
  resolveCanonPathsFromRepo,
  resolveCanonReadOptions,
} from '../src/canonPaths.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dotCanonFixtureRoot = resolve(__dirname, 'fixtures/canon-layout-dot-canon');
const repoRoot = resolve(__dirname, '..');

describe('resolveCanonPaths', () => {
  it('defaults to root-intent when config is missing', () => {
    const paths = resolveCanonPaths({ repoRoot: '/tmp/my-project' });
    assert.equal(paths.canonLayout, CANON_LAYOUT_ROOT_INTENT);
    assert.equal(paths.canonRoot, resolve('/tmp/my-project'));
    assert.equal(paths.readCwd, resolve('/tmp/my-project'));
    assert.equal(paths.intentIndexPath, 'intent/index.bvc');
  });

  it('resolves dot-canon layout from config', () => {
    const paths = resolveCanonPaths({
      repoRoot: dotCanonFixtureRoot,
      config: {
        canonLayout: CANON_LAYOUT_DOT_CANON,
        canonRoot: DEFAULT_CANON_ROOT_REL,
      },
    });
    assert.equal(paths.canonLayout, CANON_LAYOUT_DOT_CANON);
    assert.equal(
      paths.canonRoot,
      join(dotCanonFixtureRoot, DEFAULT_CANON_ROOT_REL),
    );
    assert.equal(paths.readCwd, paths.canonRoot);
    assert.equal(paths.canonRootRel, DEFAULT_CANON_ROOT_REL);
  });

  it('normalizes unknown layout values to root-intent', () => {
    assert.equal(normalizeCanonLayout('dual-read'), CANON_LAYOUT_ROOT_INTENT);
    assert.equal(normalizeCanonLayout(CANON_LAYOUT_DOT_CANON), CANON_LAYOUT_DOT_CANON);
  });

  it('reads project config from fixture and resolves paths', () => {
    const config = readProjectConfigSync(dotCanonFixtureRoot);
    assert.equal(config.canonLayout, CANON_LAYOUT_DOT_CANON);
    const paths = resolveCanonPathsFromRepo(dotCanonFixtureRoot);
    assert.equal(paths.canonLayout, CANON_LAYOUT_DOT_CANON);
    assert.match(paths.canonRoot, /\.work-graph[\\/]canon$/u);
  });

  it('resolveCanonReadOptions maps repoRoot to dot-canon read cwd', () => {
    const options = resolveCanonReadOptions({ repoRoot: dotCanonFixtureRoot });
    assert.equal(options._canonResolved, true);
    assert.equal(options.cwd, join(dotCanonFixtureRoot, DEFAULT_CANON_ROOT_REL));
    assert.equal(options.intentIndexPath, 'intent/index.bvc');
  });
});

describe('readWorkItemsFromRepo canon layout wiring', () => {
  it('reads work items from root-intent layout in this repo', async () => {
    const items = await readWorkItemsFromRepo({ repoRoot });
    assert.ok(items.some((item) => item.id === 'implement-canon-paths-resolver-v1'));
  });

  it('reads work items from dot-canon fixture tree', async () => {
    const items = await readWorkItemsFromRepo({ repoRoot: dotCanonFixtureRoot });
    assert.deepEqual(items.map((item) => item.id), ['dot-canon-fixture-task']);
  });
});
