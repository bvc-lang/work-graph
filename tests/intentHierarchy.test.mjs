import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildCatalogPassportAlignment,
  buildIntentHierarchySnapshot,
  classifyIntentNode,
  resolveIntentPathFromIndex,
} from '../src/intentHierarchy.mjs';
import { buildIntentTreeEntries } from '../src/intentTreeMigration.mjs';

describe('classifyIntentNode', () => {
  it('classifies OneBase domain tasks', () => {
    const node = classifyIntentNode({
      id: 'onebase-artifact-mapping',
      title: 'OneBase mapping',
      department: 'agent-platform',
      ownerRole: 'architect',
      nextAction: 'map',
      targetFiles: ['domains/onebase/golden-path.bvc'],
      dependsOn: [],
      evidence: [],
      checks: [],
      labels: {},
    });

    assert.equal(node.layer, 'domain');
    assert.equal(node.feature, 'onebase');
    assert.match(node.path, /^intent\/domains\/onebase\/work\//);
    assert.equal(node.projectedLabels['intent.domain'], 'domain');
  });

  it('classifies UI dashboard tasks', () => {
    const node = classifyIntentNode({
      id: 'design-workgraph-backlog-ui',
      title: 'UI board',
      department: 'frontend-ui',
      ownerRole: 'ui',
      nextAction: 'design',
      targetFiles: ['src/workGraphBacklogUiServer.mjs'],
      dependsOn: [],
      evidence: [],
      checks: [],
      labels: {},
    });

    assert.equal(node.domain, 'ui/dashboard');
  });
});

describe('buildIntentHierarchySnapshot', () => {
  it('builds domain buckets from intent tree entries', async () => {
    const intentText = await readAllIntentWorkFiles();
    const entries = buildIntentTreeEntries(intentText);
    const snapshot = buildIntentHierarchySnapshot(entries);

    assert.equal(snapshot.schema, 'intent.hierarchy.snapshot.v1');
    assert.equal(snapshot.count, entries.length);
    assert.ok(snapshot.domains.length >= 5);
    assert.ok(snapshot.nodes.every((node) => node.workId && node.path.endsWith('.work.bvc')));
  });
});

describe('resolveIntentPathFromIndex', () => {
  it('resolves work id paths from intent index manifest', () => {
    const indexText = readFileSync(fileURLToPath(new URL('../intent/index.bvc', import.meta.url)), 'utf8');
    const path = resolveIntentPathFromIndex(indexText, 'phase-3-step-canon-intent-graph');

    assert.match(path, /phase-3-step-canon-intent-graph\.work\.bvc$/);
  });
});

describe('buildCatalogPassportAlignment', () => {
  it('emits workId to intentPath mappings', async () => {
    const intentText = await readAllIntentWorkFiles();
    const entries = buildIntentTreeEntries(intentText).slice(0, 3);
    const alignment = buildCatalogPassportAlignment(entries);

    assert.equal(alignment.schema, 'catalog-passport.intent-alignment.v1');
    assert.equal(alignment.mappings.length, 3);
    assert.ok(alignment.mappings.every((row) => row.workId && row.intentPath && row.traceRefs.length >= 2));
  });
});

async function readAllIntentWorkFiles() {
  const root = fileURLToPath(new URL('../intent/', import.meta.url));
  const paths = await listWorkStepFiles(root);
  return (await Promise.all(paths.map((path) => readFile(path, 'utf8')))).join('\n');
}

async function listWorkStepFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return listWorkStepFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.work.bvc') ? [entryPath] : [];
    }),
  );

  return nested.flat().sort();
}
