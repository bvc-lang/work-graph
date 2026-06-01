import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runLocalWorker, buildWorkerInputFromTask } from '../src/agentWorkerLocalRunner.mjs';
import {
  GVM_VERIFY_ENV,
  isGvmVerifyEnabled,
  probeGvmWasmArtifacts,
  runGvmVerifyPreflight,
} from '../src/gvmVerifyWorkerGate.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_TASK = parseWorkItems(`#Задача_ready<[
Метки:
  atom.profile: work_item
  work.id: ready-gvm
  work.title: Ready GVM
  work.status: ready
]>`)[0];

describe('runGvmVerifyPreflight', () => {
  it('skips when IOHASC_GVM_VERIFY is unset', () => {
    const result = runGvmVerifyPreflight({ env: {} });

    assert.equal(result.status, 'skipped');
    assert.equal(result.skipped, true);
    assert.match(result.reason, /not set/);
  });

  it('skips with stub reason when wasm artifacts are missing', () => {
    const result = runGvmVerifyPreflight({
      env: { [GVM_VERIFY_ENV]: '1' },
      cwd: 'tests/fixtures/missing-passport',
    });

    assert.equal(result.status, 'skipped');
    assert.equal(result.skipped, true);
    assert.match(result.reason, /wasm\/module slice missing/);
    assert.equal(result.evidence.length, 1);
  });

  it('isGvmVerifyEnabled respects env flag', () => {
    assert.equal(isGvmVerifyEnabled({ env: {} }), false);
    assert.equal(isGvmVerifyEnabled({ env: { [GVM_VERIFY_ENV]: '1' } }), true);
  });
});

describe('local worker gvm gate hook', () => {
  it('does not add gvm evidence when gate is inactive', () => {
    const input = buildWorkerInputFromTask(SAMPLE_TASK, { runId: 'gvm-off' });
    const output = runLocalWorker(input);

    assert.equal(output.status, 'succeeded');
    assert.ok(!output.evidence.some((entry) => entry.kind === 'gvm_verify'));
  });

  it('adds gvm skip evidence when IOHASC_GVM_VERIFY=1 without wasm', () => {
    const input = buildWorkerInputFromTask(SAMPLE_TASK, {
      runId: 'gvm-on',
      providerHints: { env: { [GVM_VERIFY_ENV]: '1' }, cwd: 'tests/fixtures/missing-passport' },
    });
    const output = runLocalWorker(input);

    assert.equal(output.status, 'succeeded');
    assert.ok(output.evidence.some((entry) => entry.kind === 'gvm_verify'));
    assert.match(output.patchSummary.summary, /GVM preflight/);
  });
});

describe('probeGvmWasmArtifacts', () => {
  it('reports zero wasm files on empty fixture cwd', () => {
    const probe = probeGvmWasmArtifacts({ cwd: 'tests/fixtures/missing-passport' });
    assert.equal(probe.foundCount, 0);
    assert.equal(probe.wasmPresent, false);
  });
});
