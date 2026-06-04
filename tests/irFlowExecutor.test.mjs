import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { executeIrFlowCfg } from '../src/irFlow/executeIrFlowCfg.mjs';
import { validateIrFlow } from '../src/irFlow/validateIrFlow.mjs';

const SAMPLE_FLOW = {
  schema: 'ir.flow.v1',
  nodes: [
    { id: 'start', kind: 'start' },
    { id: 'validate', kind: 'action', goal: 'Validate inputs' },
    { id: 'gate', kind: 'decision', goal: 'Run verify gate' },
    { id: 'pass', kind: 'action', goal: 'Record evidence' },
    { id: 'fail', kind: 'action', goal: 'Stop pipeline' },
    { id: 'end-ok', kind: 'end' },
    { id: 'end-fail', kind: 'end' },
  ],
  edges: [
    { from: 'start', to: 'validate' },
    { from: 'validate', to: 'gate' },
    { from: 'gate', to: 'pass', condition: 'verify_pass' },
    { from: 'gate', to: 'fail', condition: 'verify_fail' },
    { from: 'pass', to: 'end-ok' },
    { from: 'fail', to: 'end-fail' },
  ],
};

describe('irFlow executor', () => {
  it('validates sample flow', () => {
    const result = validateIrFlow(SAMPLE_FLOW);
    assert.equal(result.ok, true);
  });

  it('executes happy path with decision context', () => {
    const result = executeIrFlowCfg(SAMPLE_FLOW, { decisions: { verify_pass: true } });
    assert.equal(result.status, 'completed');
    assert.equal(result.endNodeId, 'end-ok');
    assert.ok(result.trace.some((step) => step.nodeId === 'pass'));
  });

  it('rejects invalid flow', () => {
    assert.throws(() => executeIrFlowCfg({ schema: 'ir.flow.v1', nodes: [], edges: [] }));
  });
});
