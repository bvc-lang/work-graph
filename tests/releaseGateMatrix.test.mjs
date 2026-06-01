import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildReleaseGateMatrix, RELEASE_GATE_TIERS } from '../src/releaseGateMatrix.mjs';
import { VERIFICATION_MATRIX } from '../src/verificationLoop.mjs';

describe('buildReleaseGateMatrix', () => {
  it('defines mandatory and optional release gate tiers', () => {
    const matrix = buildReleaseGateMatrix();

    assert.equal(matrix.schema, 'workgraph.release.gate.matrix.v1');
    assert.deepEqual(matrix.tiers, RELEASE_GATE_TIERS);
    assert.ok(matrix.byTier.mandatory.length >= 3);
    assert.ok(matrix.byTier['mandatory-integration'].length >= 2);
    assert.ok(matrix.byTier['optional-env'].length >= 1);
    assert.ok(matrix.byTier['optional-llm'].length >= 1);
    assert.equal(matrix.policy.modelQualityNeverBlocksMandatory, true);
    assert.equal(matrix.verificationMatrix.length, VERIFICATION_MATRIX.length);
  });

  it('includes ci:mandatory and lint:backlog commands', () => {
    const matrix = buildReleaseGateMatrix();
    const ids = matrix.rows.map((row) => row.id);

    assert.ok(ids.includes('backlog-schema-lint'));
    assert.ok(ids.includes('ci-mandatory-bundle'));
    assert.ok(ids.includes('daemon-live-loop-integration'));
    assert.ok(ids.includes('compiler-roundtrip-fixture'));
    assert.ok(ids.includes('code-gap-analyzer-fixture'));
  });

  it('lists optional LLM eval commands in optional-llm tier', () => {
    const matrix = buildReleaseGateMatrix();
    const optionalLlmIds = matrix.byTier['optional-llm'].map((row) => row.id);

    assert.ok(optionalLlmIds.includes('golden-path-llm-optional'));
    assert.ok(optionalLlmIds.includes('optional-llm-claim-no-eligible'));
    assert.ok(optionalLlmIds.includes('optional-llm-loop-hint'));
    assert.ok(optionalLlmIds.includes('optional-llm-live-eval'));
    assert.deepEqual(matrix.policy.optionalLlmCommands, [
      'npm run test:optional:golden-path-llm',
      'npm run eval:optional:claim-no-eligible',
      'npm run eval:optional:loop-hint',
      'npm run eval:live-llm',
    ]);
  });

  it('documents operator dashboard E2E as optional-env gate', () => {
    const matrix = buildReleaseGateMatrix();
    const row = matrix.rows.find((candidate) => candidate.id === 'operator-dashboard-e2e');

    assert.ok(row);
    assert.equal(row.tier, 'optional-env');
    assert.equal(row.command, 'npm run test:e2e');
    assert.equal(matrix.policy.optionalE2eCommand, 'npm run test:e2e');
  });

  it('documents phase-11 optional GBC/GVM pilot gates', () => {
    const matrix = buildReleaseGateMatrix();
    const gvmRow = matrix.rows.find((candidate) => candidate.id === 'optional-gvm-verify');
    const gbcRow = matrix.rows.find((candidate) => candidate.id === 'gbc-module-slice-pilot');
    const blockedGoRow = matrix.rows.find((candidate) => candidate.id === 'optional-blocked-onebase-go-preflight');

    assert.ok(gvmRow);
    assert.equal(gvmRow.command, 'npm run eval:optional:gvm-verify');
    assert.match(matrix.policy.optionalGvmVerifyEnv, /IOHASC_GVM_VERIFY=1/);
    assert.ok(gbcRow);
    assert.equal(gbcRow.command, 'npm run probe:gbc-module-slice-pilot');
    assert.ok(blockedGoRow);
    assert.equal(blockedGoRow.command, 'npm run eval:optional:blocked-onebase-go');
    assert.match(matrix.policy.optionalBlockedOnebaseGoEnv, /Deterministic stub/);
  });
});
