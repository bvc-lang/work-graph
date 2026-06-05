import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateCanonWriteDiff } from '../src/workGraphWriteAudit.mjs';

const BYPASS_PATCH = `
+  work.status: doing
+  work.next_action: patch directly
`.trim();

const AUTHORIZED_PATCH = `
+  work.status: doing
+  work.updated_by: workgraph-mcp
+  work.write.operation: claim
+  work.write.at: 2026-06-05T12:00:00.000Z
`.trim();

describe('canon write boundary AN-77 bypass scenario', () => {
  it('rejects ApplyPatch-style status change without audit marker', () => {
    const result = evaluateCanonWriteDiff({
      path: 'intent/ui/dashboard/work/wire-settings-font-scale-slider.work.bvc',
      patchText: BYPASS_PATCH,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'unauthorized_canon_write');
  });

  it('accepts MCP claim path with audit marker in the same diff', () => {
    const result = evaluateCanonWriteDiff({
      path: 'intent/ui/dashboard/work/wire-settings-font-scale-slider.work.bvc',
      patchText: AUTHORIZED_PATCH,
    });
    assert.equal(result.ok, true);
  });
});
