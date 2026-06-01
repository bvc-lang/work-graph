import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateOnebaseVectorDslCodegenReadiness,
  ONEBASE_CODEGEN_PILOT_WORK_ID,
} from '../src/onebaseVectorDslCodegenReadiness.mjs';

describe('evaluateOnebaseVectorDslCodegenReadiness', () => {
  it('reports keep-deferred until codegen pilot WorkItem is approved', async () => {
    const report = await evaluateOnebaseVectorDslCodegenReadiness();
    assert.equal(report.schema, 'onebase.vector-dsl.codegen-readiness.v1');
    assert.equal(report.recommendation, 'keep-deferred');
    assert.equal(report.readyToReopenCodegen, false);
    assert.ok(report.triggers.some((trigger) => trigger.id === 'codegen-pilot-approved' && !trigger.met));
  });

  it('recommends reopen when all return triggers are met', async () => {
    const items = [
      {
        id: 'phase-7-onebase-vertical',
        status: 'done',
        labels: { 'migration.strategy': 'port' },
      },
      {
        id: 'onebase-posting-rule-golden-path',
        status: 'done',
        labels: { 'migration.strategy': 'port' },
      },
      {
        id: ONEBASE_CODEGEN_PILOT_WORK_ID,
        status: 'ready',
        labels: { 'migration.strategy': 'port' },
      },
    ];

    const releaseGateRows = [
      { id: 'compiler-roundtrip-fixture', command: 'npm run compiler:roundtrip' },
      { id: 'onebase-go-optional', command: 'npm run test:optional:onebase' },
    ];

    const report = await evaluateOnebaseVectorDslCodegenReadiness({
      items,
      releaseGateRows,
    });

    assert.equal(report.recommendation, 'reopen-codegen-pilot');
    assert.equal(report.readyToReopenCodegen, true);
    assert.equal(report.metCount, report.triggerCount);
  });
});
