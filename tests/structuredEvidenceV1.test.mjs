import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractStructuredEvidenceRecords,
  formatStructuredEvidenceStorageLine,
  prepareWorkItemEvidenceAppend,
  validateStructuredEvidenceDraftArray,
  validateStructuredEvidenceShape,
} from '../src/structuredEvidenceV1.mjs';
import { buildWorkItemContractV1 } from '../src/workItemContractProjection.mjs';

const GATE_ITEM = {
  id: 'implement-step-code-trace-link-validator',
  status: 'doing',
  evidence: [],
  labels: {},
  targetFiles: [],
  dependsOn: [],
};

describe('structuredEvidenceV1', () => {
  it('validateStructuredEvidenceDraftArray accepts valid command record', () => {
    const errors = validateStructuredEvidenceDraftArray([{
      type: 'command',
      status: 'succeeded',
      command: 'npm test',
      exitCode: 0,
    }]);
    assert.deepEqual(errors, []);
  });

  it('validateStructuredEvidenceDraftArray rejects invalid type', () => {
    const errors = validateStructuredEvidenceDraftArray([{ type: 'unknown', status: 'succeeded' }]);
    assert.ok(errors.some((error) => error.includes('invalid_evidence_type')));
  });

  it('formatStructuredEvidenceStorageLine normalizes command fields', () => {
    const line = formatStructuredEvidenceStorageLine({
      type: 'command',
      status: 'succeeded',
      cmd: 'npm run test:deterministic',
      exit_code: 0,
    }, 'task-a');
    const parsed = JSON.parse(line);
    assert.equal(parsed.command, 'npm run test:deterministic');
    assert.equal(parsed.exitCode, 0);
    assert.equal(parsed.taskId, 'task-a');
  });

  it('prepareWorkItemEvidenceAppend rejects weak prose on Tier A gate', () => {
    const contract = buildWorkItemContractV1(GATE_ITEM);
    assert.equal(contract.verification.tier, 'A');
    const result = prepareWorkItemEvidenceAppend(GATE_ITEM, { evidence: 'notes only' }, { contract });
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((violation) => violation.code === 'structured_evidence_required'));
  });

  it('prepareWorkItemEvidenceAppend accepts structured command on Tier A gate', () => {
    const contract = buildWorkItemContractV1(GATE_ITEM);
    const result = prepareWorkItemEvidenceAppend(GATE_ITEM, {
      structuredEvidence: {
        type: 'command',
        status: 'succeeded',
        command: 'npm run test:deterministic',
        exitCode: 0,
      },
    }, { contract });
    assert.equal(result.ok, true);
    assert.equal(result.structured, true);
    assert.ok(result.lines.some((line) => line.startsWith('{')));
  });

  it('extractStructuredEvidenceRecords parses JSON lines from evidence', () => {
    const jsonLine = formatStructuredEvidenceStorageLine({
      type: 'command',
      status: 'succeeded',
      command: 'npm test',
      exitCode: 0,
    }, 'task-a');
    const records = extractStructuredEvidenceRecords({
      evidence: ['prose line', jsonLine],
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].command, 'npm test');
  });

  it('validateStructuredEvidenceShape requires command for test type', () => {
    const violations = validateStructuredEvidenceShape({ type: 'test', status: 'succeeded' });
    assert.ok(violations.some((violation) => violation.code === 'missing_command'));
  });
});
