import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  evaluateCanonWriteDiff,
  CANON_WRITE_BOUNDARY_FIX_HINT,
  isAuthorizedCanonWrite,
  buildWorkGraphWriteAuditLabels,
  WORKGRAPH_MCP_CHANNEL,
} from '../src/workGraphWriteAudit.mjs';
import { formatCanonWriteBoundaryReport } from '../src/canonWriteBoundaryLint.mjs';
import { isCanonWorkItemRelativePath } from '../src/canonWriteBoundaryLint.mjs';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures', 'bypass-an77');

describe('AN-77 bypass regression fixtures', () => {
  it('covers intent and .work-graph/canon path patterns', () => {
    assert.equal(isCanonWorkItemRelativePath('intent/system/runtime/work/foo.work.bvc'), true);
    assert.equal(isCanonWorkItemRelativePath('.work-graph/canon/intent/ui/work/foo.work.bvc'), true);
    assert.equal(isCanonWorkItemRelativePath('src/foo.mjs'), false);
  });

  it('rejects bypass-direct-status.patch fixture (AN-77 failure mode)', async () => {
    const patchText = await readFile(join(FIXTURES, 'bypass-direct-status.patch'), 'utf8');
    const result = evaluateCanonWriteDiff({
      path: 'intent/ui/dashboard/work/example.work.bvc',
      patchText,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'unauthorized_canon_write');
    assert.match(result.fix, /create_work_item/u);
  });

  it('accepts authorized-mcp-claim.patch fixture (green path)', async () => {
    const patchText = await readFile(join(FIXTURES, 'authorized-mcp-claim.patch'), 'utf8');
    const result = evaluateCanonWriteDiff({
      path: 'intent/ui/dashboard/work/example.work.bvc',
      patchText,
    });
    assert.equal(result.ok, true);
  });

  it('lint report includes actionable MCP guidance', () => {
    const report = formatCanonWriteBoundaryReport({
      ok: false,
      checkedPaths: ['intent/foo.work.bvc'],
      violationCount: 1,
      violations: [{
        code: 'unauthorized_canon_write',
        path: 'intent/foo.work.bvc',
        message: 'Canon write diff must include audit marker',
        fix: CANON_WRITE_BOUNDARY_FIX_HINT,
      }],
    });
    assert.match(report, /create_work_item/u);
    assert.match(report, /fix:/u);
  });

  it('MCP audit labels authorize canon write', () => {
    const labels = buildWorkGraphWriteAuditLabels({
      channel: WORKGRAPH_MCP_CHANNEL,
      operation: 'create',
      at: '2026-06-05T12:00:00.000Z',
    });
    assert.equal(isAuthorizedCanonWrite(labels), true);
  });
});
