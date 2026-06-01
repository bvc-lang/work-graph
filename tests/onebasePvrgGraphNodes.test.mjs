import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildOnebasePvrgGraphFromProjectRoot,
  buildOnebasePvrgGraphNodes,
  parseOnebaseYamlSummary,
  scanOnebaseMetadataSync,
} from '../src/onebasePvrgGraphNodes.mjs';
import { resolveOnebaseMetadataScanRoot } from '../src/onebaseCliCapabilityProbe.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const fixtureRoot = path.join(repoRoot, 'tests/fixtures/onebase');

describe('parseOnebaseYamlSummary', () => {
  it('extracts document metadata from yaml text', () => {
    const summary = parseOnebaseYamlSummary(`name: РеализацияТоваров\nposting: true\n`, 'documents/РеализацияТоваров.yaml');
    assert.equal(summary.kind, 'document');
    assert.equal(summary.name, 'РеализацияТоваров');
    assert.equal(summary.posting, true);
  });
});

describe('scanOnebaseMetadataSync', () => {
  it('finds catalog and document fixtures with posting script link', () => {
    const entries = scanOnebaseMetadataSync(fixtureRoot);
    assert.ok(entries.some((entry) => entry.kind === 'document' && entry.name === 'РеализацияТоваров'));
    assert.ok(entries.some((entry) => entry.kind === 'catalog' && entry.name === 'Номенклатура'));

    const document = entries.find((entry) => entry.name === 'РеализацияТоваров');
    assert.equal(document.postingOsPath, 'src/РеализацияТоваров.posting.os');
  });
});

describe('buildOnebasePvrgGraphNodes', () => {
  it('builds catalog/document nodes and posting edge on fixture scan', () => {
    const metadataEntries = scanOnebaseMetadataSync(fixtureRoot);
    const graph = buildOnebasePvrgGraphNodes(metadataEntries, { repoRoot, projectRoot: fixtureRoot });

    assert.equal(graph.schema, 'onebase.pvrg_graph_nodes.v1');
    assert.ok(graph.nodes.some((node) => node.onebaseKind === 'document' && node.title === 'РеализацияТоваров'));
    assert.ok(graph.nodes.some((node) => node.onebaseKind === 'catalog' && node.title === 'Номенклатура'));
    assert.ok(graph.nodes.some((node) => node.onebaseKind === 'posting_script'));
    assert.ok(graph.edges.some((edge) => edge.type === 'onebase_posting'));
  });

  it('resolves default fixture root from repo', () => {
    const scanRoot = resolveOnebaseMetadataScanRoot({ repoRoot });
    assert.equal(scanRoot, fixtureRoot);

    const graph = buildOnebasePvrgGraphFromProjectRoot({ repoRoot });
    assert.ok(graph.counts.documents >= 1);
    assert.ok(graph.counts.catalogs >= 1);
  });
});
