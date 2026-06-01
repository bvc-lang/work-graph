import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildOneBaseMcpParityMatrix,
  buildOneBaseWorkItemDraft,
  ONEBASE_WORKITEM_TEMPLATE_V1,
} from '../src/onebaseWorkItemTemplate.mjs';

describe('buildOneBaseWorkItemDraft', () => {
  it('builds a reusable OneBase work item draft with verification labels', () => {
    const draft = buildOneBaseWorkItemDraft({
      workId: 'onebase-example-change',
      document: 'РеализацияТоваров',
      rule: 'example-rule',
      targetFiles: [
        '../onebase/examples/trade/registers/валовая_прибыль.yaml',
        '../onebase/examples/trade/src/реализациятоваров.posting.os',
      ],
      rollbackNotes: 'Revert register schema and posting movement changes.',
      restEvidenceRefs: ['/documents/РеализацияТоваров'],
    });

    assert.equal(draft.schema, 'onebase.workitem.draft.v1');
    assert.equal(draft.labels['domain.id'], 'onebase');
    assert.equal(draft.labels['verification.cwd'], '../onebase');
    assert.match(draft.labels['work.target_files'], /реализациятоваров\.posting\.os/u);
    assert.ok(draft.sections.checks.length >= 4);
    assert.equal(draft.dependsOn.includes('onebase-posting-rule-golden-path'), true);
  });

  it('requires workId', () => {
    assert.throws(() => buildOneBaseWorkItemDraft({}), /workId is required/u);
  });
});

describe('buildOneBaseMcpParityMatrix', () => {
  it('defines built-in, MCP and CLI responsibilities', () => {
    const matrix = buildOneBaseMcpParityMatrix();
    assert.equal(matrix.schema, 'onebase.access.parity.v1');
    assert.ok(matrix.rows.some((row) => row.capability === 'deterministic_verify' && row.ciGate === true));
    assert.ok(matrix.rows.some((row) => row.mcpTool === 'list_metadata'));
    assert.ok(matrix.rows.some((row) => row.capability === 'describe_config' && row.mcpTool === 'describe_config'));
    assert.ok(matrix.rows.some((row) => row.capability === 'check_config' && row.workGraphCli === 'onebase check'));
    assert.equal(ONEBASE_WORKITEM_TEMPLATE_V1.domainId, 'onebase');
  });
});
