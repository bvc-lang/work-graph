import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWorkItemContractV1,
  pickPrimaryMatrixRow,
  resolveMatrixRowsForWorkId,
  tierLetterFromMatrixRow,
} from '../src/workItemContractProjection.mjs';
import {
  evaluateWorkItemReadyForDone,
  hasTierACommandEvidence,
  validateEvidenceForContract,
} from '../src/workItemReadyForDone.mjs';
import { VERIFICATION_MATRIX } from '../src/verificationLoop.mjs';

function fixtureItem(overrides = {}) {
  return {
    id: 'implement-step-code-trace-link-validator',
    title: 'Trace links validator',
    status: 'doing',
    dependsOn: ['implement-step-atom-formatter'],
    targetFiles: ['src/traceLinksValidator.mjs'],
    checks: ['tests green'],
    basis: ['trace-links v1 spec'],
    vector: ['implement validator'],
    goal: ['validator works'],
    evidence: [],
    labels: {},
    ...overrides,
  };
}

describe('workItemContractProjection', () => {
  it('resolves matrix rows for gate task id', () => {
    const rows = resolveMatrixRowsForWorkId('implement-step-code-trace-link-validator');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'trace-links-v1');
  });

  it('picks highest tier when workId appears in multiple rows', () => {
    const rows = resolveMatrixRowsForWorkId('implement-workgraph-minimal-runtime');
    assert.ok(rows.length >= 2);
    const primary = pickPrimaryMatrixRow(rows);
    assert.equal(tierLetterFromMatrixRow(primary), 'A');
    assert.equal(primary.id, 'workgraph-runtime');
  });

  it('builds work-item-contract.v1 for gate task', () => {
    const contract = buildWorkItemContractV1(fixtureItem());
    assert.equal(contract.schema, 'work-item-contract.v1');
    assert.equal(contract.verification.tier, 'A');
    assert.equal(contract.verification.matrixRowId, 'trace-links-v1');
    assert.deepEqual(contract.input.targetFiles, ['src/traceLinksValidator.mjs']);
    assert.ok(contract.output.evidenceRequired.some((entry) => entry.cmd === 'npm run test:deterministic'));
  });

  it('returns null tier for non-gate subtask', () => {
    const contract = buildWorkItemContractV1(fixtureItem({
      id: 'implement-mcp-get-work-contract',
      title: 'MCP get_work_contract',
    }));
    assert.equal(contract.verification.tier, null);
    assert.deepEqual(contract.verification.matrixRowIds, []);
  });
});

describe('workItemReadyForDone', () => {
  it('flags missing evidence', () => {
    const result = evaluateWorkItemReadyForDone(fixtureItem());
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((violation) => violation.code === 'missing_evidence'));
  });

  it('accepts legacy npm test evidence for tier A gate task', () => {
    const item = fixtureItem({ evidence: ['npm run test:deterministic passed'] });
    const result = evaluateWorkItemReadyForDone(item, { allItems: [item] });
    assert.equal(result.ok, true);
  });

  it('requires command evidence for tier A when legacy line is too weak', () => {
    const item = fixtureItem({ evidence: ['started work'] });
    const contract = buildWorkItemContractV1(item);
    assert.equal(hasTierACommandEvidence(item, contract), false);
    const result = evaluateWorkItemReadyForDone(item, { allItems: [item] });
    assert.ok(result.violations.some((violation) => violation.code === 'structured_evidence_required'));
  });

  it('validates structured evidence JSON', () => {
    const contract = buildWorkItemContractV1(fixtureItem());
    const okResult = validateEvidenceForContract({
      type: 'command',
      taskId: contract.workId,
      status: 'succeeded',
      command: 'npm run test:deterministic',
      exitCode: 0,
    }, contract, contract.workId);
    assert.equal(okResult.ok, true);

    const badResult = validateEvidenceForContract({
      type: 'command',
      taskId: contract.workId,
      status: 'succeeded',
      command: 'npm run test:deterministic',
      exitCode: 1,
    }, contract, contract.workId);
    assert.equal(badResult.ok, false);
    assert.ok(badResult.violations.some((violation) => violation.code === 'non_zero_exit_code'));
  });

  it('does not require tier A structured evidence for non-gate task', () => {
    const item = fixtureItem({
      id: 'implement-mcp-get-work-contract',
      evidence: ['manual review ok'],
    });
    const result = evaluateWorkItemReadyForDone(item, { allItems: [item] });
    assert.equal(result.ok, true);
  });
});

describe('verification matrix fixture sanity', () => {
  it('has trace-links gate row', () => {
    assert.ok(VERIFICATION_MATRIX.some((row) => row.id === 'trace-links-v1'));
  });
});
