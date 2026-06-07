import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, afterEach } from 'node:test';

import { buildPromptRulesProjection } from '../src/promptRulesProjection.mjs';
import { createWorkGraphHostState, ensureHostStateInitialized, resolveWorkGraphRequestContext } from '../src/workGraphProjectHost.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('prompts nav visibility data', () => {
  const tempRoot = join(repoRoot, 'tests', '.tmp-prompts-nav-empty');

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('returns zero prompt rules for product-like repo without protocols/rules', async () => {
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(join(tempRoot, 'intent'), { recursive: true });
    await writeFile(join(tempRoot, 'package.json'), JSON.stringify({ name: 'product-app' }), 'utf8');

    const projection = await buildPromptRulesProjection({ cwd: tempRoot });
    assert.equal(projection.summary.total, 0);

    const hostState = createWorkGraphHostState({ hostRoot: tempRoot, cwd: tempRoot });
    await ensureHostStateInitialized(hostState, { hostLabel: 'Product' });
    const ctx = resolveWorkGraphRequestContext(
      hostState,
      new URL(`http://localhost/api/prompt-rules-projection?repoRoot=${encodeURIComponent(tempRoot)}`),
    );
    const hostProjection = await buildPromptRulesProjection({ cwd: ctx.repoRoot });
    assert.equal(hostProjection.summary.total, 0);
  });
});
