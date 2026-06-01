import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';

export const WORKSPACES_SCHEMA = 'workspaces.v1';
export const DEFAULT_REGISTRY_DIR = resolve(homedir(), '.work-graph');
export const DEFAULT_REGISTRY_PATH = resolve(DEFAULT_REGISTRY_DIR, 'workspaces.json');

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'ru', { sensitivity: 'variant' });
}

export function defaultRegistryPath(options = {}) {
  return resolve(options.registryPath ?? DEFAULT_REGISTRY_PATH);
}

export function normalizeWorkspaceRoot(root) {
  return resolve(String(root ?? '').trim());
}

export function slugFromRoot(root) {
  const base = basename(normalizeWorkspaceRoot(root));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/^-+|-+$/gu, '')
    || 'project';
}

export function emptyRegistry() {
  return {
    schema: WORKSPACES_SCHEMA,
    activeProjectId: null,
    workspaces: [],
  };
}

export function normalizeRegistry(raw) {
  const registry = raw && typeof raw === 'object' ? raw : emptyRegistry();
  const workspaces = Array.isArray(registry.workspaces)
    ? registry.workspaces.map((entry) => ({
      id: String(entry.id ?? '').trim(),
      root: normalizeWorkspaceRoot(entry.root),
      label: String(entry.label ?? entry.id ?? '').trim(),
      lastOpenedAt: entry.lastOpenedAt ? String(entry.lastOpenedAt) : null,
    })).filter((entry) => entry.id !== '' && entry.root !== '')
    : [];

  workspaces.sort((left, right) => compareText(left.label || left.id, right.label || right.id));

  const activeProjectId = String(registry.activeProjectId ?? '').trim() || null;
  const activeExists = activeProjectId && workspaces.some((entry) => entry.id === activeProjectId);

  return {
    schema: WORKSPACES_SCHEMA,
    activeProjectId: activeExists ? activeProjectId : (workspaces[0]?.id ?? null),
    workspaces,
  };
}

export async function readWorkspaceRegistry(options = {}) {
  const registryPath = defaultRegistryPath(options);

  try {
    const text = await readFile(registryPath, 'utf8');
    return normalizeRegistry(JSON.parse(text));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return emptyRegistry();
    }
    throw error;
  }
}

export async function writeWorkspaceRegistry(registry, options = {}) {
  const registryPath = defaultRegistryPath(options);
  await mkdir(dirname(registryPath), { recursive: true });
  const normalized = normalizeRegistry(registry);
  const tempPath = `${registryPath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  await rename(tempPath, registryPath);
  return normalized;
}

export function findWorkspace(registry, projectId) {
  const id = String(projectId ?? '').trim();
  return registry.workspaces.find((entry) => entry.id === id) ?? null;
}

export function resolveWorkspaceRoot(registry, projectId) {
  const workspace = findWorkspace(registry, projectId);
  return workspace?.root ?? null;
}

export async function registerWorkspace(input = {}, options = {}) {
  const root = normalizeWorkspaceRoot(input.root ?? input.path ?? options.cwd);
  const id = String(input.id ?? input.projectId ?? slugFromRoot(root)).trim();
  const label = String(input.label ?? input.name ?? basename(root)).trim() || id;
  const registry = await readWorkspaceRegistry(options);
  const now = new Date().toISOString();
  const existing = findWorkspace(registry, id);

  const nextEntry = {
    id,
    root,
    label,
    lastOpenedAt: now,
  };

  const workspaces = existing
    ? registry.workspaces.map((entry) => (entry.id === id ? { ...entry, ...nextEntry } : entry))
    : [...registry.workspaces, nextEntry];

  return writeWorkspaceRegistry({
    ...registry,
    workspaces,
    activeProjectId: registry.activeProjectId ?? id,
  }, options);
}

export async function setActiveWorkspace(projectId, options = {}) {
  const id = String(projectId ?? '').trim();
  if (id === '') {
    throw new Error('projectId is required');
  }

  const registry = await readWorkspaceRegistry(options);
  const workspace = findWorkspace(registry, id);
  if (!workspace) {
    throw new Error(`unknown projectId: ${id}`);
  }

  const now = new Date().toISOString();
  return writeWorkspaceRegistry({
    ...registry,
    activeProjectId: id,
    workspaces: registry.workspaces.map((entry) => (
      entry.id === id ? { ...entry, lastOpenedAt: now } : entry
    )),
  }, options);
}

export async function listWorkspaces(options = {}) {
  const registry = await readWorkspaceRegistry(options);
  return {
    schema: 'workgraph.workspaces.list.v1',
    activeProjectId: registry.activeProjectId,
    workspaces: registry.workspaces,
  };
}
