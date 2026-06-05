import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWorkGraphWriteAuditLabels,
  evaluateCanonWriteDiff,
  isAuthorizedCanonWrite,
  WORKGRAPH_MCP_CHANNEL,
} from '../src/workGraphWriteAudit.mjs';

describe('workGraphWriteAudit', () => {
  it('builds MCP write audit labels', () => {
    const labels = buildWorkGraphWriteAuditLabels({
      channel: WORKGRAPH_MCP_CHANNEL,
      operation: 'create',
      runId: 'run-1',
      at: '2026-06-05T12:00:00.000Z',
    });

    assert.equal(labels['work.updated_by'], WORKGRAPH_MCP_CHANNEL);
    assert.equal(labels['work.write.operation'], 'create');
    assert.equal(labels['work.write.at'], '2026-06-05T12:00:00.000Z');
    assert.equal(labels['work.write.run_id'], 'run-1');
    assert.equal(isAuthorizedCanonWrite(labels), true);
  });

  it('accepts migration marker as authorized write', () => {
    const labels = buildWorkGraphWriteAuditLabels({
      migration: 'scripts/migrate-an77-epic-hierarchy.mjs',
      at: '2026-06-05T12:00:00.000Z',
    });
    assert.equal(isAuthorizedCanonWrite(labels), true);
  });

  it('flags canon write diff without audit marker and includes fix hint', () => {
    const result = evaluateCanonWriteDiff({
      path: 'intent/system/runtime/work/foo.work.bvc',
      patchText: '+  work.status: doing\n',
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'unauthorized_canon_write');
    assert.match(result.fix, /create_work_item/u);
  });

  it('passes canon write diff with audit marker', () => {
    const result = evaluateCanonWriteDiff({
      path: 'intent/system/runtime/work/foo.work.bvc',
      patchText: '+  work.status: doing\n+  work.updated_by: workgraph-mcp\n+  work.write.at: 2026-06-05T12:00:00.000Z\n',
    });
    assert.equal(result.ok, true);
  });

  it('skips non-write diffs', () => {
    const result = evaluateCanonWriteDiff({
      path: 'intent/system/runtime/work/foo.work.bvc',
      patchText: '+  Базис:\n+  Updated basis text.\n',
    });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
  });
});
