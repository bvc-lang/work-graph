import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  emptyRegistry,
  normalizeRegistry,
  readWorkspaceRegistry,
  registerWorkspace,
  resolveWorkspaceRoot,
  setActiveWorkspace,
  writeWorkspaceRegistry,
} from '../src/workspaceRegistry.mjs';

describe('workspaceRegistry', () => {
  it('register is idempotent for the same project id', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-registry-'));
    const registryPath = join(dir, 'workspaces.json');

    try {
      await registerWorkspace({ id: 'alpha', root: join(dir, 'alpha'), label: 'Alpha' }, { registryPath });
      await registerWorkspace({ id: 'alpha', root: join(dir, 'alpha'), label: 'Alpha updated' }, { registryPath });
      const registry = await readWorkspaceRegistry({ registryPath });

      assert.equal(registry.workspaces.length, 1);
      assert.equal(registry.workspaces[0].label, 'Alpha updated');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('resolve returns absolute root and switch updates active project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-registry-switch-'));
    const registryPath = join(dir, 'workspaces.json');
    const rootA = join(dir, 'project-a');
    const rootB = join(dir, 'project-b');

    try {
      await registerWorkspace({ id: 'a', root: rootA, label: 'A' }, { registryPath });
      await registerWorkspace({ id: 'b', root: rootB, label: 'B' }, { registryPath });
      const switched = await setActiveWorkspace('b', { registryPath });

      assert.equal(switched.activeProjectId, 'b');
      assert.equal(resolveWorkspaceRoot(switched, 'b'), rootB);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('normalizeRegistry picks first workspace when active id missing', () => {
    const registry = normalizeRegistry({
      schema: 'workspaces.v1',
      activeProjectId: 'missing',
      workspaces: [
        { id: 'z', root: '/tmp/z', label: 'Z' },
        { id: 'a', root: '/tmp/a', label: 'A' },
      ],
    });

    assert.equal(registry.activeProjectId, 'a');
  });

  it('emptyRegistry has workspaces schema', () => {
    assert.deepEqual(emptyRegistry(), {
      schema: 'workspaces.v1',
      activeProjectId: null,
      workspaces: [],
    });
  });

  it('writeWorkspaceRegistry round-trips json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-registry-write-'));
    const registryPath = join(dir, 'nested', 'workspaces.json');

    try {
      await writeWorkspaceRegistry({
        schema: 'workspaces.v1',
        activeProjectId: 'demo',
        workspaces: [{ id: 'demo', root: dir, label: 'Demo' }],
      }, { registryPath });
      const registry = await readWorkspaceRegistry({ registryPath });
      assert.equal(registry.workspaces[0].root, dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
