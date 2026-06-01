import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  evaluateAuditGapMatrixSync,
  formatAuditGapMatrixSyncReport,
} from '../src/auditGapMatrixRefresh.mjs';

describe('evaluateAuditGapMatrixSync', () => {
  it('passes on repository docs', async () => {
    const report = await evaluateAuditGapMatrixSync();
    assert.equal(report.schema, 'workgraph.audit-gap-matrix.sync.v1');
    assert.equal(report.ok, true, formatAuditGapMatrixSyncReport(report));
  });

  it('fails when rebuild plan omits reconcile procedure', async () => {
    const matrixText = await readFile('docs/plan-iohasc-rebuild-audit-gap-matrix.md', 'utf8');
    const report = await evaluateAuditGapMatrixSync({
      rebuildPlanText: '# plan\n',
      matrixText,
    });

    assert.equal(report.ok, false);
    assert.ok(report.checks.some((check) => check.id === 'reconcile-procedure-documented' && !check.met));
  });
});
