import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEPRECATED_ENGINE_ROOT =
  '[work-graph] config.engineRoot устарел — используйте npm install @work-graph/cli или WORKGRAPH_ENGINE_ROOT для разработки WG';

export function defaultEngineRootFromCliModule(cliModuleUrl) {
  return resolve(dirname(fileURLToPath(cliModuleUrl)), '../../..');
}

function pathExists(path) {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function isNpmCliPackageRoot(installRoot) {
  return pathExists(join(installRoot, 'vendor/src/workGraphBacklogUiServer.mjs'));
}

export function resolveEngineRoot(options = {}) {
  const { projectRoot, config, cliModuleUrl } = options;

  if (process.env.WORKGRAPH_ENGINE_ROOT) {
    return resolve(process.env.WORKGRAPH_ENGINE_ROOT);
  }

  if (config?.engineRoot) {
    console.warn(DEPRECATED_ENGINE_ROOT);
    return resolve(config.engineRoot);
  }

  if (projectRoot) {
    const fromProject = resolveEngineRootFromNodeModules(projectRoot);
    if (fromProject) {
      return fromProject;
    }
  }

  if (cliModuleUrl) {
    const fromCli = defaultEngineRootFromCliModule(cliModuleUrl);
    if (pathExists(join(fromCli, 'src/workGraphBacklogUiServer.mjs'))) {
      return fromCli;
    }
    const cliPkgRoot = dirname(fileURLToPath(cliModuleUrl));
    const npmRoot = resolve(cliPkgRoot, '..');
    if (isNpmCliPackageRoot(npmRoot)) {
      return npmRoot;
    }
  }

  throw new Error(
    'Не удалось найти Work Graph engine. Выполните: npm install -D @work-graph/cli @work-graph/mcp '
    + 'или задайте WORKGRAPH_ENGINE_ROOT для разработки WG.',
  );
}

export function resolveEngineRootFromNodeModules(projectRoot) {
  const pkgJsonPath = join(resolve(projectRoot), 'package.json');
  if (!pathExists(pkgJsonPath)) {
    return null;
  }
  try {
    const require = createRequire(pkgJsonPath);
    const cliPkgJson = require.resolve('@work-graph/cli/package.json');
    return dirname(cliPkgJson);
  } catch {
    return null;
  }
}

export function resolveBacklogUiServerModule(installRoot) {
  const root = resolve(installRoot);
  const hit = firstExistingPath([
    join(root, 'vendor/src/workGraphBacklogUiServer.mjs'),
    join(root, 'src/workGraphBacklogUiServer.mjs'),
  ]);
  if (!hit) {
    throw new Error(`workGraphBacklogUiServer.mjs не найден в ${root}`);
  }
  return hit;
}

export function resolveMcpEntryModule(installRoot) {
  const root = resolve(installRoot);
  const hit = firstExistingPath([
    join(root, 'vendor/packages/workgraph-mcp/src/index.mjs'),
    join(root, 'packages/workgraph-mcp/src/index.mjs'),
  ]);
  if (!hit) {
    throw new Error(`workgraph-mcp entry не найден в ${root}`);
  }
  return hit;
}

export async function importBacklogUiServer(installRoot) {
  const modulePath = resolveBacklogUiServerModule(installRoot);
  return import(pathToFileURL(modulePath).href);
}

export async function importMcpServer(installRoot) {
  const modulePath = resolveMcpEntryModule(installRoot);
  return import(pathToFileURL(modulePath).href);
}

export function buildDoctorReport({ projectRoot, config, engineRoot }) {
  const root = resolve(projectRoot);
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  add('config', Boolean(config), config ? '.work-graph/config.json' : 'нет config — выполните work-graph init');
  add('intent-index', pathExists(join(root, 'intent/index.bvc')), 'intent/index.bvc');
  add('engine-root', Boolean(engineRoot), engineRoot ?? 'не резолвится');
  if (engineRoot) {
    add('ui-module', pathExists(resolveBacklogUiServerModule(engineRoot)), 'workGraphBacklogUiServer.mjs');
    add('mcp-module', pathExists(resolveMcpEntryModule(engineRoot)), 'workgraph-mcp entry');
  }
  add('npm-cli', Boolean(resolveEngineRootFromNodeModules(root)), '@work-graph/cli в node_modules');

  const ok = checks.every((item) => item.ok);
  return { ok, schema: 'workgraph.doctor.v1', projectRoot: root, engineRoot, checks };
}
