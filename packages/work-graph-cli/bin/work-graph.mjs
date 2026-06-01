#!/usr/bin/env node
import { accessSync, constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cliModuleUrl = import.meta.url;
const cliDir = dirname(fileURLToPath(cliModuleUrl));
const packageRoot = resolve(cliDir, '..');

function pathExists(path) {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveRuntimeModule(relativePath) {
  const vendorPath = join(packageRoot, 'vendor', relativePath);
  if (pathExists(vendorPath)) {
    return pathToFileURL(vendorPath).href;
  }
  const monorepoPath = join(packageRoot, '../..', relativePath);
  if (pathExists(monorepoPath)) {
    return pathToFileURL(monorepoPath).href;
  }
  throw new Error(`Work Graph runtime module not found: ${relativePath}`);
}

async function loadProjectInit() {
  return import(resolveRuntimeModule('src/workGraphProjectInit.mjs'));
}

async function loadWorkspaceRegistry() {
  return import(resolveRuntimeModule('src/workspaceRegistry.mjs'));
}

async function loadEngineRoot() {
  return import(resolveRuntimeModule('src/workGraphEngineRoot.mjs'));
}

async function loadBacklogUi() {
  return import(resolveRuntimeModule('src/workGraphBacklogUiServer.mjs'));
}

function usage() {
  console.log(`Work Graph CLI

Usage:
  work-graph init [path]       установить WG в проект (канон + npm deps + MCP + rule)
  work-graph ui [path]         backlog UI для текущего или указанного проекта
  work-graph doctor [path]     проверить установку WG в проекте
  work-graph register [path]   (опционально) добавить проект в общий хост ~/.work-graph/

Options:
  --engine <path>              dev-only: путь к clone WG (WORKGRAPH_ENGINE_ROOT)
  --id <projectId>             id проекта
  --label <name>               отображаемое имя
  --port <number>              порт UI (по умолчанию 4177)
  --no-mcp                     не трогать .cursor/mcp.json
  --no-package                 не трогать package.json
  --no-rule                    не создавать .cursor/rules/work-graph-project.mdc
  --register-host              после init зарегистрировать проект в multiproject-хосте
  --legacy-engine-config       записать engineRoot в config (dev-first, deprecated)
`);
}

function parseArgs(argv) {
  const args = [...argv];
  const flags = {
    mergeMcp: true,
    mergePackageJson: true,
    writeCursorRule: true,
    registerHost: false,
    legacyEngineConfig: false,
  };
  const positionals = [];

  while (args.length > 0) {
    const token = args.shift();
    if (token === '--id') {
      flags.id = args.shift();
      continue;
    }
    if (token === '--label') {
      flags.label = args.shift();
      continue;
    }
    if (token === '--port') {
      flags.port = Number(args.shift());
      continue;
    }
    if (token === '--engine') {
      flags.engine = args.shift();
      continue;
    }
    if (token === '--no-mcp') {
      flags.mergeMcp = false;
      continue;
    }
    if (token === '--no-package') {
      flags.mergePackageJson = false;
      continue;
    }
    if (token === '--no-rule') {
      flags.writeCursorRule = false;
      continue;
    }
    if (token === '--register-host') {
      flags.registerHost = true;
      continue;
    }
    if (token === '--legacy-engine-config') {
      flags.legacyEngineConfig = true;
      continue;
    }
    if (token?.startsWith('--')) {
      throw new Error(`unknown flag: ${token}`);
    }
    positionals.push(token);
  }

  return { flags, positionals };
}

async function cmdInit(targetPath, flags) {
  const { defaultEngineRootFromCliModule, initWorkGraphProject } = await loadProjectInit();
  const devEngineRoot = defaultEngineRootFromCliModule(cliModuleUrl);
  const root = resolve(targetPath ?? process.cwd());
  const useLegacyEngine = Boolean(flags.engine || flags.legacyEngineConfig);
  const result = await initWorkGraphProject({
    projectRoot: root,
    engineRoot: useLegacyEngine ? resolve(flags.engine ?? devEngineRoot) : undefined,
    npmFirst: !useLegacyEngine,
    cliModuleUrl,
    id: flags.id,
    label: flags.label,
    uiPort: flags.port,
    mergeMcp: flags.mergeMcp,
    mergePackageJson: flags.mergePackageJson,
    writeCursorRule: flags.writeCursorRule,
  });

  if (flags.registerHost) {
    const { registerWorkspace, setActiveWorkspace } = await loadWorkspaceRegistry();
    const registry = await registerWorkspace({
      id: result.projectId,
      root: result.projectRoot,
      label: result.label,
    });
    await setActiveWorkspace(result.projectId);
    result.hostRegistry = {
      activeProjectId: registry.activeProjectId,
      workspaceCount: registry.workspaces.length,
    };
  }

  console.log(JSON.stringify(result, null, 2));
}

async function cmdRegister(targetPath, flags) {
  const { registerWorkspace } = await loadWorkspaceRegistry();
  const root = resolve(targetPath ?? process.cwd());
  const registry = await registerWorkspace({
    id: flags.id,
    root,
    label: flags.label,
  });
  const entry = registry.workspaces.find((item) => resolve(item.root) === root);
  console.log(JSON.stringify({
    ok: true,
    schema: 'workgraph.cli.register.v1',
    workspace: entry,
    activeProjectId: registry.activeProjectId,
    note: 'Опционально: для power-user с одним UI на N проектов. Основной путь — work-graph init в каждом репо.',
  }, null, 2));
}

async function cmdDoctor(targetPath) {
  const { runWorkGraphDoctor } = await loadProjectInit();
  const cwd = resolve(targetPath ?? process.cwd());
  const report = await runWorkGraphDoctor({ cwd, cliModuleUrl });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

async function cmdUi(targetPath, flags) {
  const { defaultEngineRootFromCliModule, startProjectUiFromCwd } = await loadProjectInit();
  const devEngineRoot = defaultEngineRootFromCliModule(cliModuleUrl);
  const cwd = resolve(targetPath ?? process.cwd());

  try {
    const { host, port } = await startProjectUiFromCwd({ cwd, port: flags.port, cliModuleUrl });
    console.log(`Work Graph UI: http://${host}:${port}/`);
    return;
  } catch {
    // fallback: запуск из репозитория движка (разработка WG)
  }

  const { resolveEngineRoot } = await loadEngineRoot();
  const { startBacklogUiServer } = await loadBacklogUi();
  const engineRoot = resolveEngineRoot({ cliModuleUrl }) ?? devEngineRoot;
  const { host, port } = await startBacklogUiServer({
    hostRoot: engineRoot,
    cwd: engineRoot,
    port: flags.port,
  });
  console.log(`Work Graph UI (engine): http://${host}:${port}/`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    usage();
    return;
  }

  const { flags, positionals } = parseArgs(rest);

  if (command === 'init') {
    await cmdInit(positionals[0], flags);
    return;
  }
  if (command === 'register') {
    await cmdRegister(positionals[0], flags);
    return;
  }
  if (command === 'doctor') {
    await cmdDoctor(positionals[0]);
    return;
  }
  if (command === 'ui') {
    await cmdUi(positionals[0], flags);
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
