import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  buildIntentGraphGbcSliceBoundary,
  buildIntentGraphGbcSlicePilotReport,
  evaluateIntentGraphGbcMvpIndependence,
  INTENT_GRAPH_GBC_SOURCE_INPUTS,
} from '../src/intentGraphGbcSliceBoundary.mjs';

describe('buildIntentGraphGbcSliceBoundary', () => {
  it('defines source inputs, consumers and deferred derived outputs', () => {
    const boundary = buildIntentGraphGbcSliceBoundary();

    assert.equal(boundary.schema, 'intent.graph.gbc.slice.boundary.v1');
    assert.equal(boundary.sourceInputs.length, INTENT_GRAPH_GBC_SOURCE_INPUTS.length);
    assert.ok(boundary.sourceInputs.some((entry) => entry.path === 'intent/index.bvc'));
    assert.ok(boundary.derivedOutputs.every((entry) => entry.required === false));
    assert.ok(boundary.consumers.length >= 3);
    assert.ok(boundary.returnTriggers.length >= 3);
    assert.equal(boundary.policy.interchangeFirst, 'json-snapshot-v1');
  });

  it('confirms no mandatory MVP gate depends on GBC slice', () => {
    const boundary = buildIntentGraphGbcSliceBoundary();
    const independence = evaluateIntentGraphGbcMvpIndependence(boundary);

    assert.equal(boundary.mvpIndependence.blocksMandatoryGate, false);
    assert.equal(independence.ok, true);
    assert.equal(independence.gbcRequiredOutputCount, 0);
    assert.ok(boundary.mvpIndependence.mandatoryGateIds.includes('ci-mandatory-bundle'));
  });

  it('builds pilot report from sample fixture when donor cache is absent', async () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const report = await buildIntentGraphGbcSlicePilotReport({
      cwd: repoRoot,
      donorRoot: 'tests/fixtures/missing-donor-cache',
      sampleRoot: 'tests/fixtures/gbc-pilot',
    });

    assert.equal(report.schema, 'intent.graph.gbc.slice.pilot.v1');
    assert.equal(report.status, 'sample');
    assert.equal(report.source, 'sample-fixture');
    assert.equal(report.blocksMandatoryGate, false);
    assert.equal(report.moduleRegistrySummary?.moduleCount, 1);
    assert.ok(report.probe.foundCount >= 1);
  });
});
