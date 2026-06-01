import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildClaudeMessagesRequestFromInput,
  normalizeClaudeWorkerOutput,
  parseClaudeResponsePayload,
  resolveClaudeProviderEnv,
  runClaudeSdkApiWorker,
  validateClaudeStructuredOutput,
} from '../src/agentWorkerClaudeProvider.mjs';
import { createWorkerInputFromBacklogText } from '../src/agentWorkerLocalRunner.mjs';
import { resolveWorkerProvider, runWorkerWithProvider } from '../src/workGraphWorkerProvider.mjs';

const SAMPLE_BACKLOG = `#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Run claude worker.
Цель:
  Produce output.

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.owner_role: feature_engineer
  work.target_files: src/agentWorkerClaudeProvider.mjs
  work.next_action: claude-worker
  trace.status: pending

критерии_готовности:
  - produces Worker Output v1
]>
`;

describe('resolveClaudeProviderEnv', () => {
  it('is disabled by default and enabled with IOHASC_CLAUDE_WORKER=1', () => {
    assert.equal(resolveClaudeProviderEnv({ env: {} }).enabled, false);
    assert.equal(resolveClaudeProviderEnv({ env: { IOHASC_CLAUDE_WORKER: '1' } }).enabled, true);
    assert.equal(resolveClaudeProviderEnv({ env: { IOHASC_CLAUDE_MODEL: 'claude-test' } }).model, 'claude-test');
  });
});

describe('buildClaudeMessagesRequestFromInput', () => {
  it('maps Worker Input v1 into Anthropic messages request envelope', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-claude' });
    const request = buildClaudeMessagesRequestFromInput(input);

    assert.equal(request.schema, 'claude-sdk-api.worker.request.v1');
    assert.equal(request.runId, 'run-claude');
    assert.equal(request.taskId, 'ready-task');
    assert.match(request.system, /Work Graph agent worker adapter/u);
    assert.equal(request.messages.length, 1);
    assert.match(request.messages[0].content, /ready-task/u);
  });
});

describe('parseClaudeResponsePayload', () => {
  it('extracts text blocks from Anthropic response payload', () => {
    const text = parseClaudeResponsePayload({
      content: [{ type: 'text', text: '{"status":"succeeded"}' }],
    });
    assert.equal(text, '{"status":"succeeded"}');
  });
});

describe('validateClaudeStructuredOutput', () => {
  it('requires Worker Output v1 fields', () => {
    const errors = validateClaudeStructuredOutput({ schema: 'agent-worker.output.v1', status: 'succeeded' });
    assert.ok(errors.length >= 3);
    assert.ok(errors.some((entry) => entry.includes('runId')));
  });

  it('accepts valid Worker Output v1 object', () => {
    const errors = validateClaudeStructuredOutput({
      schema: 'agent-worker.output.v1',
      runId: 'run-1',
      taskId: 'ready-task',
      status: 'succeeded',
      patchSummary: { changedFiles: [], summary: 'ok' },
      transitionRequest: { status: 'verify', reason: 'ok' },
    });
    assert.deepEqual(errors, []);
  });
});

describe('runClaudeSdkApiWorker', () => {
  it('skips live path when IOHASC_CLAUDE_WORKER is not set', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-skip' });
    const output = await runClaudeSdkApiWorker(input, { env: {} });

    assert.equal(output.status, 'failed');
    assert.match(output.failureReason, /IOHASC_CLAUDE_WORKER=1/);
    assert.equal(output.evidence[0].failureClass, 'skipped');
    assert.equal(output.evidence[0].source, 'claude-sdk-api');
  });

  it('parses model JSON via mock fetch when live path enabled', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-live' });
    const modelJson = JSON.stringify({
      schema: 'agent-worker.output.v1',
      runId: 'run-live',
      taskId: 'ready-task',
      status: 'succeeded',
      patchSummary: { changedFiles: [], summary: 'Claude long-context plan ready.' },
      transitionRequest: { status: 'verify', reason: 'model plan ready' },
      evidence: [{ kind: 'worker_run', source: 'claude-sdk-api', result: 'succeeded', summary: 'ok' }],
      logs: [{ level: 'info', message: 'mock claude' }],
      failureReason: '',
      retryAdvice: '',
    });

    const fetch = async () => ({
      ok: true,
      async json() {
        return { content: [{ type: 'text', text: modelJson }] };
      },
    });

    const output = await runClaudeSdkApiWorker(input, {
      env: {
        IOHASC_CLAUDE_WORKER: '1',
        IOHASC_CLAUDE_API_KEY: 'test-key',
        IOHASC_CLAUDE_MODEL: 'claude-mock',
      },
      fetch,
    });

    assert.equal(output.status, 'succeeded');
    assert.equal(output.transitionRequest.status, 'verify');
    assert.match(output.patchSummary.summary, /long-context plan ready/u);
    assert.equal(output.evidence[0].source, 'claude-sdk-api');
  });

  it('maps invalid structured output to model_failure', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-bad-json' });
    const fetch = async () => ({
      ok: true,
      async json() {
        return { content: [{ type: 'text', text: '{"status":"succeeded"}' }] };
      },
    });

    const output = await runClaudeSdkApiWorker(input, {
      env: { IOHASC_CLAUDE_WORKER: '1', IOHASC_CLAUDE_API_KEY: 'test-key' },
      fetch,
    });

    assert.equal(output.status, 'failed');
    assert.match(output.failureReason, /structured output validation failed/i);
    assert.equal(output.evidence[0].failureClass, 'model_failure');
  });
});

describe('normalizeClaudeWorkerOutput', () => {
  it('rewrites evidence source to claude-sdk-api', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-normalize' });
    const output = normalizeClaudeWorkerOutput({
      schema: 'agent-worker.output.v1',
      runId: 'run-normalize',
      taskId: 'ready-task',
      status: 'succeeded',
      patchSummary: { changedFiles: [], summary: 'ok' },
      transitionRequest: { status: 'verify', reason: 'ok' },
    }, input);

    assert.equal(output.evidence[0].source, 'claude-sdk-api');
  });
});

describe('provider registry integration', () => {
  it('registers claude-sdk-api as implemented selectable provider', () => {
    const provider = resolveWorkerProvider('claude');
    assert.equal(provider.id, 'claude-sdk-api');
    assert.equal(provider.implementationStatus, 'implemented');
  });

  it('runs claude-sdk-api through runWorkerWithProvider using mock fetch', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-provider' });
    const result = await runWorkerWithProvider(input, {
      provider: 'claude-sdk-api',
      providerOptions: {
        env: { IOHASC_CLAUDE_WORKER: '1', IOHASC_CLAUDE_API_KEY: 'test-key' },
        fetch: async () => ({
          ok: true,
          async json() {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  schema: 'agent-worker.output.v1',
                  runId: 'run-provider',
                  taskId: 'ready-task',
                  status: 'succeeded',
                  patchSummary: { changedFiles: [], summary: 'provider path ok' },
                  transitionRequest: { status: 'verify', reason: 'provider path ok' },
                }),
              }],
            };
          },
        }),
      },
    });

    assert.equal(result.providerId, 'claude-sdk-api');
    assert.equal(result.output.status, 'succeeded');
  });
});
