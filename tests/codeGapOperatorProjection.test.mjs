import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CODE_GAP_PROJECTION_SCHEMA,
  buildCodeGapOperatorProjection,
  readCodeGapReport,
} from '../src/codeGapOperatorProjection.mjs';

describe('readCodeGapReport', () => {
  it('reads fixture report from tests/fixtures', async () => {
    const report = await readCodeGapReport();

    assert.equal(report.schema, 'code-gap.report.v1');
    assert.ok(Array.isArray(report.entries));
    assert.ok(report.entries.length >= 1);
  });

  it('returns empty report when file is missing', async () => {
    const report = await readCodeGapReport({ reportPath: 'tests/fixtures/missing-code-gap.json' });

    assert.equal(report.summary.total, 0);
    assert.deepEqual(report.entries, []);
  });
});

describe('buildCodeGapOperatorProjection', () => {
  it('maps report to operator projection with reviewable suggestions', async () => {
    const projection = await buildCodeGapOperatorProjection();

    assert.equal(projection.schema, CODE_GAP_PROJECTION_SCHEMA);
    assert.ok(projection.suggestionCount >= 1);
    assert.equal(projection.reviewRequired, true);
    assert.equal(projection.promotionProtocol, 'protocols/workgraph-draft-intake.bvc');
    assert.equal(projection.suggestions[0].reviewRequired, true);
    assert.equal(projection.suggestions[0].provenance.source, 'code-gap-analyzer');
  });
});
