import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
  buildCursorRuleContent,
  buildProjectConfig,
  buildRunMcpScriptContent,
  buildRunUiScriptContent,
  initWorkGraphProject,
  mergeCursorMcpConfig,
  mergePackageJsonScripts,
  readProjectConfig,
  resolveInitCanonTreeRoot,
  slugFromPath,
} from '../src/workGraphProjectInit.mjs';
import { CANON_LAYOUT_DOT_CANON } from '../src/canonPaths.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { fileURLToPath } from 'node:url';

const cliModuleUrl = new URL('../packages/work-graph-cli/bin/work-graph.mjs', import.meta.url).href;

test('slugFromPath нормализует имя каталога', () => {
  assert.equal(slugFromPath('D:/Work/My Project'), 'my-project');
});

test('buildProjectConfig v2 без engineRoot', () => {
  const config = buildProjectConfig({
    projectRoot: '/tmp/alpha',
    label: 'Alpha',
    schemaVersion: 2,
  });
  assert.equal(config.schema, 'workgraph.project.config.v2');
  assert.equal(config.label, 'Alpha');
  assert.equal(config.engineRoot, undefined);
});

test('buildProjectConfig v1 legacy с engineRoot', () => {
  const config = buildProjectConfig({
    projectRoot: '/tmp/alpha',
    engineRoot: '/tmp/work-graph',
    label: 'Alpha',
    schemaVersion: 1,
  });
  assert.equal(config.schema, 'workgraph.project.config.v1');
  assert.equal(config.engineRoot, resolve('/tmp/work-graph'));
});

test('mergePackageJsonScripts добавляет workgraph:ui и devDependencies', () => {
  const merged = mergePackageJsonScripts('{"name":"x","scripts":{"test":"node test"}}', {
    'workgraph:ui': 'node .work-graph/run-ui.mjs',
  }, {
    '@work-graph/cli': '^0.2.0',
  });
  const pkg = JSON.parse(merged);
  assert.equal(pkg.scripts.test, 'node test');
  assert.equal(pkg.scripts['workgraph:ui'], 'node .work-graph/run-ui.mjs');
  assert.equal(pkg.devDependencies['@work-graph/cli'], '^0.2.0');
});

test('mergeCursorMcpConfig npm-first добавляет npx @work-graph/mcp', () => {
  const merged = mergeCursorMcpConfig(JSON.stringify({
    mcpServers: { other: { command: 'echo' } },
  }), { useNpxMcp: true });
  const cfg = JSON.parse(merged);
  assert.ok(cfg.mcpServers.other);
  assert.equal(cfg.mcpServers.workgraph.command, 'npx');
  assert.deepEqual(cfg.mcpServers.workgraph.args, ['-y', '@work-graph/mcp']);
});

test('buildProjectConfig v3 dot-canon добавляет canonLayout и canonRoot', () => {
  const config = buildProjectConfig({
    projectRoot: '/tmp/alpha',
    label: 'Alpha',
    canonLayout: CANON_LAYOUT_DOT_CANON,
  });
  assert.equal(config.schema, 'workgraph.project.config.v3');
  assert.equal(config.canonLayout, CANON_LAYOUT_DOT_CANON);
  assert.equal(config.canonRoot, '.work-graph/canon');
});

test('resolveInitCanonTreeRoot maps dot-canon under .work-graph/canon', () => {
  const root = resolve('/tmp/project');
  assert.equal(resolveInitCanonTreeRoot(root, CANON_LAYOUT_DOT_CANON), join(root, '.work-graph/canon'));
  assert.equal(resolveInitCanonTreeRoot(root, 'root-intent'), root);
});

test('initWorkGraphProject dot-canon пишет starter-kit под .work-graph/canon', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wg-init-dot-'));
  try {
    const projectRoot = join(dir, 'project');
    const result = await initWorkGraphProject({
      projectRoot,
      cliModuleUrl,
      npmFirst: true,
      label: 'Dot Canon',
      id: 'dot-canon-project',
      canonLayout: CANON_LAYOUT_DOT_CANON,
      mergeMcp: false,
      mergePackageJson: false,
      writeCursorRule: false,
    });

    assert.equal(result.ok, true);
    assert.equal(result.canonLayout, CANON_LAYOUT_DOT_CANON);
    assert.equal(result.canonTreeRoot, join(projectRoot, '.work-graph/canon'));

    const config = JSON.parse(await readFile(result.configPath, 'utf8'));
    assert.equal(config.schema, 'workgraph.project.config.v3');
    assert.equal(config.canonLayout, CANON_LAYOUT_DOT_CANON);

    const indexPath = join(projectRoot, '.work-graph/canon/intent/index.bvc');
    const archPath = join(projectRoot, '.work-graph/canon/architecture/main.bvc');
    await readFile(indexPath, 'utf8');
    await readFile(archPath, 'utf8');

    const items = await readWorkItemsFromRepo({ repoRoot: projectRoot });
    assert.ok(items.some((item) => item.id === 'starter-sample-task'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('initWorkGraphProject legacy создаёт engineRoot v1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wg-init-'));
  const engine = join(dir, 'engine');
  try {
    const result = await initWorkGraphProject({
      projectRoot: join(dir, 'project'),
      cliModuleUrl,
      engineRoot: engine,
      npmFirst: false,
      label: 'Тестовый проект',
      id: 'test-project',
    });

    assert.equal(result.ok, true);
    assert.equal(result.projectId, 'test-project');
    assert.equal(result.schema, 'workgraph.cli.init.v1');

    const config = JSON.parse(await readFile(result.configPath, 'utf8'));
    assert.equal(config.engineRoot, engine);
    assert.equal(config.label, 'Тестовый проект');

    const runUi = await readFile(join(dir, 'project/.work-graph/run-ui.mjs'), 'utf8');
    assert.match(runUi, /startBacklogUiServer/u);
    assert.match(buildRunMcpScriptContent(), /workgraph-mcp/u);

    const pkg = JSON.parse(await readFile(join(dir, 'project/package.json'), 'utf8'));
    assert.equal(pkg.scripts['workgraph:ui'], 'node .work-graph/run-ui.mjs');
    assert.equal(pkg.devDependencies?.['@work-graph/cli'], undefined);

    const mcp = JSON.parse(await readFile(join(dir, 'project/.cursor/mcp.json'), 'utf8'));
    assert.ok(mcp.mcpServers.workgraph);

    const rule = await readFile(join(dir, 'project/.cursor/rules/work-graph-project.mdc'), 'utf8');
    assert.match(rule, /Work Graph в проекте/u);
    assert.match(buildCursorRuleContent({ label: 'X' }), /intent/u);

    const loaded = await readProjectConfig(join(dir, 'project'));
    assert.equal(loaded.projectId, 'test-project');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
