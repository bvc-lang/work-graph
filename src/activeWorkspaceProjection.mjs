import { resolve } from 'node:path';

import { resolveCanonPathsFromRepo } from './canonPaths.mjs';
import {
  defaultRegistryPath,
  findWorkspace,
  readWorkspaceRegistry,
} from './workspaceRegistry.mjs';

export const ACTIVE_WORKSPACE_SCHEMA = 'workgraph.workspace.active.v1';

export function resolveRegistryPathFromEnv(env = process.env, options = {}) {
  const custom = String(env.WORKGRAPH_REGISTRY_PATH ?? '').trim();
  if (custom !== '') {
    return resolve(custom);
  }
  return options.registryPath ?? defaultRegistryPath(options);
}

export async function buildActiveWorkspaceProjection(options = {}) {
  const env = options.env ?? process.env;
  const registryPath = resolveRegistryPathFromEnv(env, options);
  const registry = await readWorkspaceRegistry({ registryPath });
  const effectiveRepoRoot = resolve(options.effectiveRepoRoot ?? process.cwd());
  const activeWorkspace = findWorkspace(registry, registry.activeProjectId);
  const activeRepoRoot = activeWorkspace?.root ?? null;
  const alignedWithRegistry = activeRepoRoot
    ? resolve(activeRepoRoot) === effectiveRepoRoot
    : null;

  let canonPaths = null;
  try {
    const resolved = resolveCanonPathsFromRepo(effectiveRepoRoot);
    canonPaths = {
      canonLayout: resolved.canonLayout,
      canonRoot: resolved.canonRoot,
      readCwd: resolved.readCwd,
      intentIndexPath: resolved.intentIndexPath,
    };
  } catch {
    canonPaths = null;
  }

  return {
    schema: ACTIVE_WORKSPACE_SCHEMA,
    readOnly: true,
    registryPath,
    registrySchema: registry.schema,
    activeProjectId: registry.activeProjectId,
    activeRepoRoot,
    activeWorkspaceLabel: activeWorkspace?.label ?? null,
    effectiveRepoRoot,
    env: {
      WORKGRAPH_ROOT: String(env.WORKGRAPH_ROOT ?? '').trim() || null,
      WG_PROJECT_ROOT: String(env.WG_PROJECT_ROOT ?? '').trim() || null,
    },
    alignedWithRegistry,
    workspaceCount: registry.workspaces.length,
    workspaces: registry.workspaces.map((entry) => ({
      id: entry.id,
      root: entry.root,
      label: entry.label,
      lastOpenedAt: entry.lastOpenedAt ?? null,
    })),
    canonPaths,
  };
}
