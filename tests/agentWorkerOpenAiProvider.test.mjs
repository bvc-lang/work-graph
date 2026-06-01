import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildOpenAiChatCompletionRequestBody,
  buildOpenAiWorkerToolDefinitions,
  buildWorkerPromptFromInput,
  normalizeWorkerOutput,
  parseWorkerOutputFromModelText,
  parseWorkerOutputFromToolCalls,
  resolveOpenAiProviderEnv,
  resolveWorkerNativeToolCallsEnabled,
  runOpenAiCompatibleWorker,
} from '../src/agentWorkerOpenAiProvider.mjs';
import { createWorkerInputFromBacklogText } from '../src/agentWorkerLocalRunner.mjs';

const SAMPLE_BACKLOG = `#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Run openai worker.
Цель:
  Produce output.

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.owner_role: feature_engineer
  work.target_files: src/agentWorkerOpenAiProvider.mjs
  work.next_action: openai-worker
  trace.status: pending

критерии_готовности:
  - produces Worker Output v1
]>
`;

describe('buildWorkerPromptFromInput', () => {
  it('builds system and user messages from Worker Input v1', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const prompt = buildWorkerPromptFromInput(input);

    assert.equal(prompt.schema, 'agent-worker.prompt.v1');
    assert.equal(prompt.messages.length, 2);
    assert.match(prompt.messages[1].content, /ready-task/);
    assert.match(prompt.messages[1].content, /produces Worker Output v1/);
  });

  it('includes behavior rules prompt slice in system message when provided', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, {
      taskId: 'ready-task',
      providerHints: {
        behaviorRulesPrompt: '[worker-tool-policy]\nБазис: test',
        behaviorRuleIds: ['worker-tool-policy'],
      },
    });
    const prompt = buildWorkerPromptFromInput(input);

    assert.match(prompt.messages[0].content, /Behavior rules/);
    assert.match(prompt.messages[0].content, /worker-tool-policy/);
  });
});

describe('runOpenAiCompatibleWorker', () => {
  it('skips live path when IOHASC_E2E_REAL_LLM is not set', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-skip' });
    const output = await runOpenAiCompatibleWorker(input, { env: {} });

    assert.equal(output.status, 'failed');
    assert.match(output.failureReason, /IOHASC_E2E_REAL_LLM=1/);
    assert.equal(output.evidence[0].failureClass, 'skipped');
  });

  it('parses model JSON via mock fetch when live path enabled', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-live' });
    const modelJson = JSON.stringify({
      schema: 'agent-worker.output.v1',
      runId: 'run-live',
      taskId: 'ready-task',
      status: 'succeeded',
      patchSummary: { changedFiles: [], summary: 'Planned OneBase slice review.' },
      transitionRequest: { status: 'verify', reason: 'model plan ready' },
      evidence: [{ kind: 'worker_run', source: 'openai-compatible', result: 'succeeded', summary: 'ok' }],
      logs: [{ level: 'info', message: 'mock model' }],
      failureReason: '',
      retryAdvice: '',
    });

    const fetch = async () => ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: modelJson } }] };
      },
    });

    const output = await runOpenAiCompatibleWorker(input, {
      env: { IOHASC_E2E_REAL_LLM: '1', IOHASC_LLM_BASE_URL: 'http://127.0.0.1:9999/v1', IOHASC_LLM_MODEL: 'mock' },
      fetch,
    });

    assert.equal(output.status, 'succeeded');
    assert.equal(output.transitionRequest.status, 'verify');
    assert.match(output.patchSummary.summary, /OneBase slice review/);
  });

  it('passes native tools to chat completions when IOHASC_WORKER_NATIVE_TOOL_CALLS=1', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-tools' });
    let capturedBody = null;

    const fetch = async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      const output = normalizeWorkerOutput({
        status: 'succeeded',
        patchSummary: { summary: 'via tool call' },
        transitionRequest: { status: 'verify', reason: 'tool path' },
      }, input);

      return {
        ok: true,
        async json() {
          return {
            choices: [{
              message: {
                tool_calls: [{
                  id: 'call-1',
                  type: 'function',
                  function: {
                    name: 'submit_worker_output',
                    arguments: JSON.stringify({ output }),
                  },
                }],
              },
            }],
          };
        },
      };
    };

    const output = await runOpenAiCompatibleWorker(input, {
      env: {
        IOHASC_E2E_REAL_LLM: '1',
        IOHASC_WORKER_NATIVE_TOOL_CALLS: '1',
        IOHASC_LLM_BASE_URL: 'http://127.0.0.1:9999/v1',
        IOHASC_LLM_MODEL: 'mock',
      },
      fetch,
    });

    assert.ok(Array.isArray(capturedBody.tools));
    assert.ok(capturedBody.tools.some((tool) => tool.function?.name === 'submit_worker_output'));
    assert.equal(capturedBody.tool_choice, 'auto');
    assert.equal(output.status, 'succeeded');
    assert.match(output.patchSummary.summary, /via tool call/);
  });
});

describe('parseWorkerOutputFromModelText', () => {
  it('coerces WorkItem-like status values from local models to succeeded', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-coerce' });
    const output = normalizeWorkerOutput({
      status: 'ready',
      patchSummary: 'planned next step',
      transitionRequest: { status: 'verify', reason: 'model plan ready' },
    }, input);

    assert.equal(output.status, 'succeeded');
    assert.equal(output.patchSummary.summary, 'planned next step');
  });

  it('extracts the first JSON object when trailing text follows', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-trailing' });
    const payload = JSON.stringify(normalizeWorkerOutput({
      status: 'succeeded',
      patchSummary: { summary: 'parsed' },
      transitionRequest: { status: 'verify', reason: 'ok' },
    }, input));
    const text = `${payload}\n\nExtra commentary from the model.`;

    const output = parseWorkerOutputFromModelText(text, input);
    assert.equal(output.status, 'succeeded');
    assert.equal(output.runId, 'run-trailing');
  });

  it('extracts JSON object from fenced model text', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-parse' });
    const text = `Here is the result:\n${JSON.stringify(normalizeWorkerOutput({
      status: 'succeeded',
      patchSummary: { summary: 'parsed' },
      transitionRequest: { status: 'verify', reason: 'ok' },
    }, input))}`;

    const output = parseWorkerOutputFromModelText(text, input);
    assert.equal(output.status, 'succeeded');
    assert.equal(output.runId, 'run-parse');
  });
});

describe('resolveOpenAiProviderEnv', () => {
  it('defaults base URL and model from env contract', () => {
    const env = resolveOpenAiProviderEnv({ env: { IOHASC_LLM_MODEL: 'qwen-test' } });
    assert.equal(env.baseUrl, 'http://127.0.0.1:1234/v1');
    assert.equal(env.model, 'qwen-test');
    assert.equal(env.liveEnabled, false);
    assert.equal(env.nativeToolCallsEnabled, false);
  });

  it('enables native tool calls from IOHASC_WORKER_NATIVE_TOOL_CALLS', () => {
    assert.equal(resolveWorkerNativeToolCallsEnabled({ env: { IOHASC_WORKER_NATIVE_TOOL_CALLS: '1' } }), true);
    const env = resolveOpenAiProviderEnv({ env: { IOHASC_WORKER_NATIVE_TOOL_CALLS: 'true' } });
    assert.equal(env.nativeToolCallsEnabled, true);
  });
});

describe('buildOpenAiChatCompletionRequestBody', () => {
  it('omits tools without native flag', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const prompt = buildWorkerPromptFromInput(input);
    const body = buildOpenAiChatCompletionRequestBody(prompt, { input, env: { IOHASC_LLM_MODEL: 'mock', nativeToolCallsEnabled: false } });

    assert.equal(body.tools, undefined);
  });

  it('includes bounded tool definitions when native flag enabled', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const prompt = buildWorkerPromptFromInput(input);
    const body = buildOpenAiChatCompletionRequestBody(prompt, {
      input,
      env: resolveOpenAiProviderEnv({ env: { IOHASC_WORKER_NATIVE_TOOL_CALLS: '1', IOHASC_LLM_MODEL: 'mock' } }),
    });

    const names = body.tools.map((tool) => tool.function.name);
    assert.ok(names.includes('submit_worker_output'));
    assert.ok(names.includes('read_target_file'));
  });
});

describe('parseWorkerOutputFromToolCalls', () => {
  it('normalizes submit_worker_output tool call arguments', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-tool-parse' });
    const output = parseWorkerOutputFromToolCalls({
      tool_calls: [{
        id: 'call-1',
        type: 'function',
        function: {
          name: 'submit_worker_output',
          arguments: JSON.stringify({
            output: {
              status: 'succeeded',
              patchSummary: { summary: 'from tools' },
              transitionRequest: { status: 'verify', reason: 'ok' },
            },
          }),
        },
      }],
    }, input);

    assert.equal(output.status, 'succeeded');
    assert.equal(output.runId, 'run-tool-parse');
    assert.match(output.patchSummary.summary, /from tools/);
  });
});
