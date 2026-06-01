import { resolve } from 'node:path';

import {
  defaultRegistryPath,
  findWorkspace,
  listWorkspaces,
  readWorkspaceRegistry,
  registerWorkspace,
  resolveWorkspaceRoot,
  setActiveWorkspace,
  slugFromRoot,
} from './workspaceRegistry.mjs';

export function createWorkGraphHostState(options = {}) {
  const hostRoot = resolve(options.hostRoot ?? options.cwd ?? process.cwd());
  return {
    hostRoot,
    registryPath: options.registryPath ?? defaultRegistryPath(options),
    activeProjectId: null,
    initialized: false,
  };
}

export function resolveRepoRootFromEnv() {
  const fromEnv = String(process.env.WG_PROJECT_ROOT ?? '').trim();
  return fromEnv === '' ? null : resolve(fromEnv);
}

export async function ensureHostStateInitialized(hostState, options = {}) {
  if (hostState.initialized) {
    return hostState;
  }

  const hostRoot = hostState.hostRoot;
  let registry = await readWorkspaceRegistry({ registryPath: hostState.registryPath });

  const hostSlug = slugFromRoot(hostRoot);
  if (!findWorkspace(registry, hostSlug)) {
    registry = await registerWorkspace({
      id: hostSlug,
      root: hostRoot,
      label: options.hostLabel ?? 'Work Graph',
    }, { registryPath: hostState.registryPath });
  }

  const envRoot = resolveRepoRootFromEnv();
  if (envRoot) {
    const envId = slugFromRoot(envRoot);
    registry = await registerWorkspace({
      id: envId,
      root: envRoot,
      label: options.envLabel ?? basenameOrSlug(envRoot),
    }, { registryPath: hostState.registryPath });
    registry = await setActiveWorkspace(envId, { registryPath: hostState.registryPath });
  }

  hostState.activeProjectId = registry.activeProjectId
    ?? findWorkspace(registry, hostSlug)?.id
    ?? hostSlug;
  hostState._registryCache = registry;
  hostState.initialized = true;
  return hostState;
}

function basenameOrSlug(root) {
  const parts = resolve(root).split(/[\\/]/u);
  return parts[parts.length - 1] || slugFromRoot(root);
}

export function resolveWorkGraphRequestContext(hostState, url, options = {}) {
  if (!hostState?.initialized) {
    throw new Error('hostState is not initialized');
  }

  const queryProjectId = url?.searchParams?.get('projectId')?.trim() || null;
  const queryRepoRoot = url?.searchParams?.get('repoRoot')?.trim() || null;
  const projectId = queryProjectId || hostState.activeProjectId;
  let repoRoot = queryRepoRoot ? resolve(queryRepoRoot) : null;

  if (!repoRoot && projectId) {
    const registry = hostState._registryCache ?? { workspaces: [] };
    repoRoot = resolveWorkspaceRoot(registry, projectId);
  }

  if (!repoRoot) {
    repoRoot = hostState.hostRoot;
  }

  return {
    hostRoot: hostState.hostRoot,
    registryPath: hostState.registryPath,
    activeProjectId: hostState.activeProjectId,
    projectId: projectId ?? slugFromRoot(repoRoot),
    repoRoot,
    backlogPath: options.backlogPath,
    journalPath: options.journalPath,
    auditPath: options.auditPath,
  };
}

export async function refreshHostRegistryCache(hostState) {
  const registry = await readWorkspaceRegistry({ registryPath: hostState.registryPath });
  hostState._registryCache = registry;
  hostState.activeProjectId = registry.activeProjectId ?? hostState.activeProjectId;
  return registry;
}

export async function buildWorkspacesApiResponse(hostState) {
  await refreshHostRegistryCache(hostState);
  const payload = await listWorkspaces({ registryPath: hostState.registryPath });
  const active = findWorkspace(
    { workspaces: payload.workspaces },
    hostState.activeProjectId,
  );
  return {
    ...payload,
    activeProjectId: hostState.activeProjectId,
    activeRepoRoot: active?.root ?? hostState.hostRoot,
    hostRoot: hostState.hostRoot,
  };
}

export async function switchHostWorkspace(hostState, projectId) {
  const registry = await setActiveWorkspace(projectId, { registryPath: hostState.registryPath });
  hostState._registryCache = registry;
  hostState.activeProjectId = registry.activeProjectId;
  const active = findWorkspace(registry, hostState.activeProjectId);
  return {
    ok: true,
    schema: 'workgraph.workspace.switch.v1',
    activeProjectId: hostState.activeProjectId,
    activeRepoRoot: active?.root ?? hostState.hostRoot,
  };
}

export async function registerHostWorkspace(hostState, input = {}) {
  const registry = await registerWorkspace(input, { registryPath: hostState.registryPath });
  hostState._registryCache = registry;
  if (!hostState.activeProjectId) {
    hostState.activeProjectId = registry.activeProjectId;
  }
  const entry = findWorkspace(registry, String(input.id ?? input.projectId ?? slugFromRoot(input.root ?? input.path)));
  return {
    ok: true,
    schema: 'workgraph.workspace.register.v1',
    workspace: entry,
    activeProjectId: hostState.activeProjectId,
  };
}
