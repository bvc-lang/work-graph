import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  buildDoctorReport,
  defaultEngineRootFromCliModule,
  importBacklogUiServer,
  importMcpServer,
  resolveEngineRoot,
} from './workGraphEngineRoot.mjs';

export {
  buildDoctorReport,
  defaultEngineRootFromCliModule,
  importBacklogUiServer,
  importMcpServer,
  resolveEngineRoot,
};

const CONFIG_SCHEMA_V1 = 'workgraph.project.config.v1';
const CONFIG_SCHEMA_V2 = 'workgraph.project.config.v2';
const DEFAULT_CLI_VERSION = '0.2.3';
const DEFAULT_MCP_VERSION = '0.2.3';

const INDEX_STUB = `#Index<[
WorkItems:
]>
`;
const MAIN_BVC_STUB = `#Architecture_Main<[
Базис:
  Каркас architecture/main.bvc создан через work-graph init.
]>
`;

export function buildProjectConfig({ projectRoot, engineRoot, label, id, uiPort, schemaVersion = 2 } = {}) {
  const root = resolve(projectRoot);
  const config = {
    schema: schemaVersion === 1 ? CONFIG_SCHEMA_V1 : CONFIG_SCHEMA_V2,
    projectRoot: root,
    projectId: id ?? slugFromPath(root),
    label: label ?? basename(root),
    uiPort: uiPort ?? 4177,
    createdAt: new Date().toISOString(),
  };
  if (schemaVersion === 1 && engineRoot) {
    config.engineRoot = resolve(engineRoot);
  }
  return config;
}

export function slugFromPath(root) {
  const name = basename(resolve(root));
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'project';
}

export function buildRunUiScriptContent() {
  return `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(projectRoot, '.work-graph/config.json'), 'utf8'));

process.env.WG_PROJECT_ROOT = projectRoot;
process.env.WORKGRAPH_ROOT = projectRoot;

function resolveInstallRoot() {
  if (process.env.WORKGRAPH_ENGINE_ROOT) {
    return resolve(process.env.WORKGRAPH_ENGINE_ROOT);
  }
  if (config.engineRoot) {
    console.warn('[work-graph] config.engineRoot устарел — используйте npm packages');
    return resolve(config.engineRoot);
  }
  const require = createRequire(join(projectRoot, 'package.json'));
  const cliPkg = require.resolve('@work-graph/cli/package.json');
  return dirname(cliPkg);
}

function resolveUiModule(installRoot) {
  const candidates = [
    join(installRoot, 'vendor/src/workGraphBacklogUiServer.mjs'),
    join(installRoot, 'src/workGraphBacklogUiServer.mjs'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('workGraphBacklogUiServer.mjs не найден — npm install -D @work-graph/cli');
}

const installRoot = resolveInstallRoot();
const { startBacklogUiServer } = await import(pathToFileURL(resolveUiModule(installRoot)).href);

const port = Number(process.env.WORKGRAPH_BACKLOG_UI_PORT ?? config.uiPort ?? 4177);
const { host, port: boundPort } = await startBacklogUiServer({
  hostRoot: projectRoot,
  cwd: projectRoot,
  hostLabel: config.label,
  port,
});

console.log(\`Work Graph UI (\${config.label ?? projectRoot}): http://\${host}:\${boundPort}/\`);
`;
}

export function buildRunMcpScriptContent() {
  return `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(projectRoot, '.work-graph/config.json'), 'utf8'));

process.env.WG_PROJECT_ROOT = projectRoot;
process.env.WORKGRAPH_ROOT = projectRoot;

function resolveInstallRoot() {
  if (process.env.WORKGRAPH_ENGINE_ROOT) {
    return resolve(process.env.WORKGRAPH_ENGINE_ROOT);
  }
  if (config.engineRoot) {
    console.warn('[work-graph] config.engineRoot устарел — используйте npm packages');
    return resolve(config.engineRoot);
  }
  const require = createRequire(join(projectRoot, 'package.json'));
  const cliPkg = require.resolve('@work-graph/cli/package.json');
  return dirname(cliPkg);
}

function resolveMcpModule(installRoot) {
  const candidates = [
    join(installRoot, 'vendor/packages/workgraph-mcp/src/index.mjs'),
    join(installRoot, 'packages/workgraph-mcp/src/index.mjs'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('workgraph-mcp entry не найден — npm install -D @work-graph/mcp');
}

const installRoot = resolveInstallRoot();
await import(pathToFileURL(resolveMcpModule(installRoot)).href);
`;
}

export function buildCursorRuleContent({ label } = {}) {
  const projectLabel = label ?? 'этот проект';
  return `---
description: Work Graph — канон и бэклог в intent/ (${projectLabel})
alwaysApply: true
---

# Work Graph в проекте

- Канон задач: \`intent/**/work/*.work.bvc\`, индекс \`intent/index.bvc\`.
- Trackable work — только через \`work.id\`; не дублировать в чат-todo.
- Перед закрытием задачи — \`Свидетельства:\` в atom и проверки из \`Проверки:\`.
- UI: \`npm run workgraph:ui\` → http://127.0.0.1:4177/
- MCP: сервер \`workgraph\` в \`.cursor/mcp.json\` (если настроен при init).

Установка: \`npx @work-graph/cli init .\` или «установи Work Graph в этот проект».
`;
}

export function mergePackageJsonScripts(existingJson, scripts, devDependencies = {}) {
  const pkg = existingJson ? JSON.parse(existingJson) : { name: 'project', version: '0.0.0', private: true };
  pkg.scripts = { ...(pkg.scripts ?? {}), ...scripts };
  if (Object.keys(devDependencies).length > 0) {
    pkg.devDependencies = { ...(pkg.devDependencies ?? {}), ...devDependencies };
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export function mergeCursorMcpConfig(existingJson, {
  projectRootVar = '${workspaceFolder}',
  useNpxMcp = true,
} = {}) {
  const base = existingJson ? JSON.parse(existingJson) : { mcpServers: {} };
  if (!base.mcpServers || typeof base.mcpServers !== 'object') {
    base.mcpServers = {};
  }
  if (useNpxMcp) {
    base.mcpServers.workgraph = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@work-graph/mcp'],
      env: {
        WORKGRAPH_ROOT: projectRootVar,
        WG_PROJECT_ROOT: projectRootVar,
      },
    };
  } else {
    base.mcpServers.workgraph = {
      type: 'stdio',
      command: 'node',
      args: [`${projectRootVar}/.work-graph/run-mcp.mjs`],
      env: {
        WORKGRAPH_ROOT: projectRootVar,
        WG_PROJECT_ROOT: projectRootVar,
      },
    };
  }
  return `${JSON.stringify(base, null, 2)}\n`;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeIfMissing(path, content) {
  if (await pathExists(path)) {
    return { path, written: false };
  }
  await writeFile(path, content, 'utf8');
  return { path, written: true };
}

export async function readProjectConfig(projectRoot) {
  const configPath = join(resolve(projectRoot), '.work-graph/config.json');
  if (!(await pathExists(configPath))) {
    return null;
  }
  const raw = await readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

export async function initWorkGraphProject(options = {}) {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const label = options.label ?? basename(projectRoot);
  const projectId = options.id ?? slugFromPath(projectRoot);
  const npmFirst = options.npmFirst !== false && !options.engineRoot;
  const engineRoot = options.engineRoot
    ? resolve(options.engineRoot)
    : (options.cliModuleUrl ? defaultEngineRootFromCliModule(options.cliModuleUrl) : null);

  await mkdir(join(projectRoot, 'intent'), { recursive: true });
  await mkdir(join(projectRoot, 'charter'), { recursive: true });
  await mkdir(join(projectRoot, 'architecture'), { recursive: true });
  await mkdir(join(projectRoot, '.work-graph'), { recursive: true });
  await mkdir(join(projectRoot, '.cursor/rules'), { recursive: true });

  const config = buildProjectConfig({
    projectRoot,
    engineRoot: npmFirst ? undefined : engineRoot,
    label,
    id: projectId,
    uiPort: options.uiPort,
    schemaVersion: npmFirst ? 2 : 1,
  });

  const configPath = join(projectRoot, '.work-graph/config.json');
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const runUiPath = join(projectRoot, '.work-graph/run-ui.mjs');
  const runMcpPath = join(projectRoot, '.work-graph/run-mcp.mjs');
  await writeFile(runUiPath, buildRunUiScriptContent(), 'utf8');
  await writeFile(runMcpPath, buildRunMcpScriptContent(), 'utf8');

  const canonWrites = [];
  canonWrites.push(await writeIfMissing(join(projectRoot, 'intent/index.bvc'), INDEX_STUB));
  canonWrites.push(await writeIfMissing(join(projectRoot, 'architecture/main.bvc'), MAIN_BVC_STUB));

  const cliVersion = options.cliVersion ?? DEFAULT_CLI_VERSION;
  const mcpVersion = options.mcpVersion ?? DEFAULT_MCP_VERSION;

  const pkgPath = join(projectRoot, 'package.json');
  const pkgScripts = {
    'workgraph:ui': 'node .work-graph/run-ui.mjs',
    'workgraph:mcp': 'node .work-graph/run-mcp.mjs',
    'workgraph:doctor': 'work-graph doctor',
  };
  let packageJsonWritten = false;
  if (options.mergePackageJson !== false) {
    const existingPkg = (await pathExists(pkgPath)) ? await readFile(pkgPath, 'utf8') : null;
    const devDeps = npmFirst
      ? { '@work-graph/cli': `^${cliVersion}`, '@work-graph/mcp': `^${mcpVersion}` }
      : {};
    await writeFile(pkgPath, mergePackageJsonScripts(existingPkg, pkgScripts, devDeps), 'utf8');
    packageJsonWritten = true;
  }

  const mcpPath = join(projectRoot, '.cursor/mcp.json');
  let mcpWritten = false;
  if (options.mergeMcp !== false) {
    const existingMcp = (await pathExists(mcpPath)) ? await readFile(mcpPath, 'utf8') : null;
    await writeFile(mcpPath, mergeCursorMcpConfig(existingMcp, { useNpxMcp: npmFirst }), 'utf8');
    mcpWritten = true;
  }

  const rulePath = join(projectRoot, '.cursor/rules/work-graph-project.mdc');
  let ruleWritten = false;
  if (options.writeCursorRule !== false) {
    const wrote = await writeIfMissing(rulePath, buildCursorRuleContent({ label }));
    ruleWritten = wrote.written;
  }

  const nextSteps = npmFirst
    ? [
      'npm install',
      'npm run workgraph:ui',
      'Открыть http://127.0.0.1:4177/',
      'Перезагрузить MCP в Cursor (workgraph)',
    ]
    : [
      'npm run workgraph:ui',
      'Открыть http://127.0.0.1:4177/',
      'Перезагрузить MCP в Cursor (workgraph)',
    ];

  return {
    ok: true,
    schema: npmFirst ? 'workgraph.cli.init.v2' : 'workgraph.cli.init.v1',
    npmFirst,
    projectRoot,
    engineRoot: engineRoot ?? null,
    configPath,
    projectId,
    label,
    packageJsonWritten,
    mcpWritten,
    ruleWritten,
    canonWrites,
    nextSteps,
  };
}

export async function startProjectUiFromCwd(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const config = await readProjectConfig(cwd);
  if (!config) {
    throw new Error('нет .work-graph/config.json — сначала выполните work-graph init');
  }

  const projectRoot = resolve(config.projectRoot ?? cwd);
  const engineRoot = resolveEngineRoot({
    projectRoot,
    config,
    cliModuleUrl: options.cliModuleUrl,
  });

  process.env.WG_PROJECT_ROOT = projectRoot;
  process.env.WORKGRAPH_ROOT = projectRoot;

  const { startBacklogUiServer } = await importBacklogUiServer(engineRoot);

  const port = Number(options.port ?? process.env.WORKGRAPH_BACKLOG_UI_PORT ?? config.uiPort ?? 4177);
  return startBacklogUiServer({
    hostRoot: projectRoot,
    cwd: projectRoot,
    hostLabel: config.label,
    port,
  });
}

export async function runWorkGraphDoctor(options = {}) {
  const projectRoot = resolve(options.cwd ?? process.cwd());
  const config = await readProjectConfig(projectRoot);
  let engineRoot = null;
  try {
    engineRoot = resolveEngineRoot({
      projectRoot,
      config: config ?? {},
      cliModuleUrl: options.cliModuleUrl,
    });
  } catch {
    engineRoot = null;
  }
  return buildDoctorReport({ projectRoot, config, engineRoot });
}
