import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorSdkAgentRequestFromInput,
  normalizeCursorSdkWorkerOutput,
  resolveCursorSdkProviderEnv,
  runCursorSdkWorker,
} from '../src/agentWorkerCursorSdkProvider.mjs';
import { createWorkerInputFromBacklogText } from '../src/agentWorkerLocalRunner.mjs';
import { resolveWorkerProvider, runWorkerWithProvider } from '../src/workGraphWorkerProvider.mjs';

const SAMPLE_BACKLOG = `#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Run cursor sdk worker.
Цель:
  Produce output.

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.owner_role: feature_engineer
  work.target_files: src/agentWorkerCursorSdkProvider.mjs
  work.next_action: cursor-sdk-worker
  trace.status: pending

критерии_готовности:
  - produces Worker Output v1
]>
`;

describe('resolveCursorSdkProviderEnv', () => {
  it('is disabled by default and enabled with IOHASC_CURSOR_SDK_WORKER=1', () => {
    assert.equal(resolveCursorSdkProviderEnv({ env: {} }).enabled, false);
    assert.equal(resolveCursorSdkProviderEnv({ env: { IOHASC_CURSOR_SDK_WORKER: '1' } }).enabled, true);
  });
});

describe('buildCursorSdkAgentRequestFromInput', () => {
  it('maps Worker Input v1 into cursor-sdk request envelope', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-cursor' });
    const request = buildCursorSdkAgentRequestFromInput(input, { workspaceRoot: 'D:/repo' });

    assert.equal(request.schema, 'cursor-sdk.worker.request.v1');
    assert.equal(request.runId, 'run-cursor');
    assert.equal(request.taskId, 'ready-task');
    assert.equal(request.workspaceRoot, 'D:/repo');
    assert.equal(request.providerHints.provider, 'cursor-sdk');
    assert.equal(request.prompt.schema, 'agent-worker.prompt.v1');
  });
});

describe('runCursorSdkWorker', () => {
  it('skips live path when IOHASC_CURSOR_SDK_WORKER is not set', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-skip' });
    const output = await runCursorSdkWorker(input, { env: {} });

    assert.equal(output.status, 'failed');
    assert.match(output.failureReason, /IOHASC_CURSOR_SDK_WORKER=1/);
    assert.equal(output.evidence[0].failureClass, 'skipped');
    assert.equal(output.evidence[0].source, 'cursor-sdk');
  });

  it('normalizes mock adapter output into Worker Output v1', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-live' });
    const output = await runCursorSdkWorker(input, {
      env: { IOHASC_CURSOR_SDK_WORKER: '1' },
      runAgent: async () => ({
        status: 'succeeded',
        patchSummary: {
          changedFiles: ['src/agentWorkerCursorSdkProvider.mjs'],
          summary: 'Cursor SDK mock plan ready.',
        },
        transitionRequest: { status: 'verify', reason: 'mock adapter completed' },
      }),
    });

    assert.equal(output.schema, 'agent-worker.output.v1');
    assert.equal(output.status, 'succeeded');
    assert.equal(output.taskId, 'ready-task');
    assert.equal(output.transitionRequest.status, 'verify');
    assert.match(output.patchSummary.summary, /mock plan ready/u);
  });
});

describe('normalizeCursorSdkWorkerOutput', () => {
  it('rewrites evidence source to cursor-sdk', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-normalize' });
    const output = normalizeCursorSdkWorkerOutput({
      status: 'succeeded',
      patchSummary: { changedFiles: [], summary: 'ok' },
      transitionRequest: { status: 'verify', reason: 'ok' },
    }, input);

    assert.equal(output.evidence[0].source, 'cursor-sdk');
  });
});

describe('provider registry integration', () => {
  it('registers cursor-sdk as implemented selectable provider', () => {
    const provider = resolveWorkerProvider('cursor-sdk');
    assert.equal(provider.id, 'cursor-sdk');
    assert.equal(provider.implementationStatus, 'implemented');
    assert.equal(typeof provider.runWorker, 'function');
  });

  it('runs cursor-sdk through runWorkerWithProvider using mock adapter', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-provider' });
    const result = await runWorkerWithProvider(input, {
      provider: 'cursor-sdk',
      providerOptions: {
        env: { IOHASC_CURSOR_SDK_WORKER: '1' },
        runAgent: async () => ({
          status: 'succeeded',
          patchSummary: { changedFiles: [], summary: 'provider path ok' },
          transitionRequest: { status: 'verify', reason: 'provider path ok' },
        }),
      },
    });

    assert.equal(result.providerId, 'cursor-sdk');
    assert.equal(result.output.status, 'succeeded');
  });
});
