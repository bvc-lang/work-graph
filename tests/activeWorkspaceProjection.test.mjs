import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  ACTIVE_WORKSPACE_SCHEMA,
  buildActiveWorkspaceProjection,
} from '../src/activeWorkspaceProjection.mjs';
import { registerWorkspace, setActiveWorkspace } from '../src/workspaceRegistry.mjs';
import { readWorkGraphResource } from '../packages/workgraph-mcp/src/handlers.mjs';

describe('buildActiveWorkspaceProjection', () => {
  it('returns registry active repoRoot and alignment with effective root', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-active-ws-'));
    const registryPath = join(dir, 'workspaces.json');
    const rootA = join(dir, 'alpha');
    const rootB = join(dir, 'beta');
    try {
      await registerWorkspace({ id: 'alpha', root: rootA, label: 'Alpha' }, { registryPath });
      await registerWorkspace({ id: 'beta', root: rootB, label: 'Beta' }, { registryPath });
      await setActiveWorkspace('beta', { registryPath });

      const projection = await buildActiveWorkspaceProjection({
        registryPath,
        effectiveRepoRoot: rootB,
      });

      assert.equal(projection.schema, ACTIVE_WORKSPACE_SCHEMA);
      assert.equal(projection.activeProjectId, 'beta');
      assert.equal(projection.activeRepoRoot, resolve(rootB));
      assert.equal(projection.effectiveRepoRoot, resolve(rootB));
      assert.equal(projection.alignedWithRegistry, true);
      assert.equal(projection.workspaceCount, 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('marks misalignment when MCP effective root differs from registry active', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-active-ws-'));
    const registryPath = join(dir, 'workspaces.json');
    const rootA = join(dir, 'alpha');
    const rootB = join(dir, 'beta');
    try {
      await registerWorkspace({ id: 'alpha', root: rootA, label: 'Alpha' }, { registryPath });
      await registerWorkspace({ id: 'beta', root: rootB, label: 'Beta' }, { registryPath });
      await setActiveWorkspace('beta', { registryPath });

      const projection = await buildActiveWorkspaceProjection({
        registryPath,
        effectiveRepoRoot: rootA,
      });

      assert.equal(projection.alignedWithRegistry, false);
      assert.equal(projection.activeRepoRoot, resolve(rootB));
      assert.equal(projection.effectiveRepoRoot, resolve(rootA));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('readWorkGraphResource workspace/active', () => {
  it('serves workgraph://workspace/active through MCP handler', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-active-ws-mcp-'));
    const registryPath = join(dir, 'workspaces.json');
    const root = join(dir, 'project');
    try {
      await registerWorkspace({ id: 'project', root, label: 'Project' }, { registryPath });

      const resource = await readWorkGraphResource('workgraph://workspace/active', {
        root,
        registryPath,
      });

      assert.equal(resource.schema, ACTIVE_WORKSPACE_SCHEMA);
      assert.equal(resource.activeProjectId, 'project');
      assert.equal(resource.effectiveRepoRoot, resolve(root));
      assert.equal(resource.alignedWithRegistry, true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
