import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
  buildDoctorReport,
  defaultEngineRootFromCliModule,
  resolveBacklogUiServerModule,
  resolveEngineRoot,
  resolveMcpEntryModule,
} from '../src/workGraphEngineRoot.mjs';

test('defaultEngineRootFromCliModule указывает на корень monorepo', () => {
  const root = defaultEngineRootFromCliModule(new URL('../packages/work-graph-cli/bin/work-graph.mjs', import.meta.url).href);
  assert.ok(resolveBacklogUiServerModule(root).endsWith('workGraphBacklogUiServer.mjs'));
});

test('resolveEngineRoot: WORKGRAPH_ENGINE_ROOT имеет приоритет', () => {
  const prev = process.env.WORKGRAPH_ENGINE_ROOT;
  process.env.WORKGRAPH_ENGINE_ROOT = 'D:/custom/engine';
  try {
    assert.equal(resolveEngineRoot({ config: { engineRoot: 'D:/legacy' } }), resolve('D:/custom/engine'));
  } finally {
    if (prev === undefined) {
      delete process.env.WORKGRAPH_ENGINE_ROOT;
    } else {
      process.env.WORKGRAPH_ENGINE_ROOT = prev;
    }
  }
});

test('resolveEngineRoot: legacy config.engineRoot с warning', () => {
  const prev = process.env.WORKGRAPH_ENGINE_ROOT;
  delete process.env.WORKGRAPH_ENGINE_ROOT;
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    const root = resolveEngineRoot({ config: { engineRoot: 'D:/legacy' } });
    assert.equal(root, resolve('D:/legacy'));
    assert.ok(warnings.some((line) => line.includes('engineRoot')));
  } finally {
    console.warn = originalWarn;
    if (prev !== undefined) {
      process.env.WORKGRAPH_ENGINE_ROOT = prev;
    }
  }
});

test('resolveEngineRoot: cliModuleUrl fallback для monorepo dev', () => {
  const prev = process.env.WORKGRAPH_ENGINE_ROOT;
  delete process.env.WORKGRAPH_ENGINE_ROOT;
  try {
    const cliUrl = new URL('../packages/work-graph-cli/bin/work-graph.mjs', import.meta.url).href;
    const root = resolveEngineRoot({ cliModuleUrl: cliUrl });
    assert.ok(resolveBacklogUiServerModule(root));
    assert.ok(resolveMcpEntryModule(root));
  } finally {
    if (prev !== undefined) {
      process.env.WORKGRAPH_ENGINE_ROOT = prev;
    }
  }
});

test('buildDoctorReport сообщает об отсутствии config', () => {
  const report = buildDoctorReport({ projectRoot: '/tmp/x', config: null, engineRoot: null });
  assert.equal(report.ok, false);
  assert.ok(report.checks.some((item) => item.name === 'config' && !item.ok));
});

test('init npm-first config v2 без engineRoot', async () => {
  const { initWorkGraphProject } = await import('../src/workGraphProjectInit.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'wg-npm-'));
  try {
    const result = await initWorkGraphProject({
      projectRoot: join(dir, 'project'),
      npmFirst: true,
      label: 'Npm Project',
      id: 'npm-project',
    });
    assert.equal(result.npmFirst, true);
    assert.equal(result.schema, 'workgraph.cli.init.v2');

    const config = JSON.parse(await readFile(result.configPath, 'utf8'));
    assert.equal(config.schema, 'workgraph.project.config.v2');
    assert.equal(config.engineRoot, undefined);

    const pkg = JSON.parse(await readFile(join(dir, 'project/package.json'), 'utf8'));
    assert.ok(pkg.devDependencies['@work-graph/cli']);
    assert.ok(pkg.devDependencies['@work-graph/mcp']);
    assert.equal(pkg.scripts['workgraph:doctor'], 'work-graph doctor');

    const mcp = JSON.parse(await readFile(join(dir, 'project/.cursor/mcp.json'), 'utf8'));
    assert.equal(mcp.mcpServers.workgraph.command, 'npx');
    assert.deepEqual(mcp.mcpServers.workgraph.args, ['-y', '@work-graph/mcp']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
