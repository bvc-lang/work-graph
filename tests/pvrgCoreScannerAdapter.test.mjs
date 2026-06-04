import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAdapterFactsFromScan,
  mergePvrgScanFactsWithBatch,
  parsePvrgCoreScanOutput,
} from '../src/pvrgCoreScannerAdapter.mjs';

const FIXTURE = {
  schema: 'pvrg.core.scan.v1',
  root: '/repo',
  files: [
    { path: 'src/runtime.mjs', language: 'javascript', symbolCount: 2 },
  ],
  symbols: [
    { name: 'parseWorkItems', kind: 'function', line: 10, path: 'src/runtime.mjs' },
    { name: 'buildSnapshot', kind: 'function', line: 42, path: 'src/runtime.mjs' },
  ],
};

describe('pvrgCoreScannerAdapter', () => {
  it('parses scan output and builds adapter facts', () => {
    const scan = parsePvrgCoreScanOutput(FIXTURE);
    const adapter = buildAdapterFactsFromScan(scan, { workId: 'trace-task' });

    assert.equal(adapter.facts.length, 1);
    assert.equal(adapter.facts[0].symbols.length, 2);
    assert.equal(adapter.facts[0].domainMetadata.workId, 'trace-task');
  });

  it('merges scan facts into language batch', () => {
    const scan = parsePvrgCoreScanOutput(FIXTURE);
    const adapter = buildAdapterFactsFromScan(scan);
    const merged = mergePvrgScanFactsWithBatch({ schema: 'workgraph.language-file-facts.batch.v1', facts: [] }, adapter);

    assert.equal(merged.facts.length, 1);
    assert.equal(merged.summary.pvrgCoreAugmented, 1);
  });
});
