import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertAllowlistedCliCommand,
  executeAllowlistedCliCommand,
  resolveAllowlistedVerificationCommand,
  resolveLocalCliProviderEnv,
  runLocalCliWorker,
} from '../src/agentWorkerLocalCliProvider.mjs';
import { createWorkerInputFromBacklogText } from '../src/agentWorkerLocalRunner.mjs';
import { resolveWorkerProvider, runWorkerWithProvider } from '../src/workGraphWorkerProvider.mjs';

const SAMPLE_BACKLOG = `#Задача_golden_path<[
Базис:
  Golden path task.
Вектор:
  Run allowlisted verification.
Цель:
  Verify.

Метки:
  atom.profile: work_item
  work.id: golden-path-test
  work.title: Golden Path Test
  work.status: ready
  work.owner_role: qa_automation
  work.next_action: verify
  trace.status: pending
]>
`;

describe('resolveLocalCliProviderEnv', () => {
  it('is disabled by default and enabled with IOHASC_LOCAL_CLI_WORKER=1', () => {
    assert.equal(resolveLocalCliProviderEnv({ env: {} }).enabled, false);
    assert.equal(resolveLocalCliProviderEnv({ env: { IOHASC_LOCAL_CLI_WORKER: '1' } }).enabled, true);
  });
});

describe('resolveAllowlistedVerificationCommand', () => {
  it('returns verification matrix row for gated task id', () => {
    const row = resolveAllowlistedVerificationCommand({ id: 'golden-path-test' });
    assert.equal(row?.id, 'golden-path-runtime');
    assert.equal(row?.command, 'npm run test:deterministic');
  });
});

describe('assertAllowlistedCliCommand', () => {
  it('rejects commands outside verification matrix allowlist', () => {
    assert.throws(
      () => assertAllowlistedCliCommand('rm -rf /'),
      /not in verification allowlist/u,
    );
  });
});

describe('runLocalCliWorker', () => {
  it('skips when IOHASC_LOCAL_CLI_WORKER is not set', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, {
      taskId: 'golden-path-test',
      runId: 'run-skip',
      policy: { allowShell: true },
    });
    const output = await runLocalCliWorker(input, { env: {} });

    assert.equal(output.status, 'failed');
    assert.match(output.failureReason, /IOHASC_LOCAL_CLI_WORKER=1/);
    assert.equal(output.evidence[0].failureClass, 'skipped');
  });

  it('blocks when allowShell is false', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, {
      taskId: 'golden-path-test',
      runId: 'run-blocked',
    });
    const output = await runLocalCliWorker(input, {
      env: { IOHASC_LOCAL_CLI_WORKER: '1' },
    });

    assert.equal(output.status, 'failed');
    assert.match(output.failureReason, /allowShell must be true/u);
    assert.equal(output.evidence[0].failureClass, 'blocked');
  });

  it('runs mock allowlisted command and returns Worker Output v1 evidence', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, {
      taskId: 'golden-path-test',
      runId: 'run-cli',
      policy: { allowShell: true, allowNetwork: false, allowFileWrite: false, mode: 'verify-only' },
    });

    const output = await runLocalCliWorker(input, {
      env: { IOHASC_LOCAL_CLI_WORKER: '1' },
      runCommand: () => ({ exitCode: 0, stdout: 'ok', stderr: '', signal: null }),
    });

    assert.equal(output.status, 'succeeded');
    assert.equal(output.transitionRequest.status, 'verify');
    assert.equal(output.evidence[0].source, 'local-cli');
    assert.equal(output.evidence[0].verificationId, 'golden-path-runtime');
  });

  it('maps non-zero command exit to failed Worker Output', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, {
      taskId: 'golden-path-test',
      runId: 'run-fail',
      policy: { allowShell: true },
    });

    const output = await runLocalCliWorker(input, {
      env: { IOHASC_LOCAL_CLI_WORKER: '1' },
      runCommand: () => ({ exitCode: 1, stdout: '', stderr: 'fail', signal: null }),
    });

    assert.equal(output.status, 'failed');
    assert.match(output.failureReason, /Allowlisted command failed/u);
  });
});

describe('executeAllowlistedCliCommand', () => {
  it('delegates to injectable runner for allowlisted command', () => {
    const result = executeAllowlistedCliCommand('npm run test:deterministic', {
      runCommand: (command) => ({ exitCode: 0, stdout: command, stderr: '', signal: null }),
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'npm run test:deterministic');
  });
});

describe('provider registry integration', () => {
  it('registers local-cli as implemented selectable provider', () => {
    const provider = resolveWorkerProvider('cli');
    assert.equal(provider.id, 'local-cli');
    assert.equal(provider.implementationStatus, 'implemented');
  });

  it('runs local-cli through runWorkerWithProvider using mock runner', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, {
      taskId: 'golden-path-test',
      runId: 'run-provider',
      policy: { allowShell: true },
    });

    const result = await runWorkerWithProvider(input, {
      provider: 'local-cli',
      providerOptions: {
        env: { IOHASC_LOCAL_CLI_WORKER: '1' },
        runCommand: () => ({ exitCode: 0, stdout: 'ok', stderr: '', signal: null }),
      },
    });

    assert.equal(result.providerId, 'local-cli');
    assert.equal(result.output.status, 'succeeded');
  });
});
