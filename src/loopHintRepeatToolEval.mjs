import { resolveOpenAiProviderEnv } from './agentWorkerOpenAiProvider.mjs';
import {
  createAgentToolLoopTracker,
  formatAgentToolDuplicateInvocationLoopHint,
} from './agentToolLoopGuard.mjs';

export const LOOP_HINT_REPEAT_TOOL_EVAL_SCHEMA = 'workgraph.loop-hint-repeat-tool.eval.v1';

const STOP_KEYWORDS = [
  'loop_hint',
  'loop hint',
  'change strategy',
  'different tool',
  'stop repeating',
  'не повторя',
  'смени стратег',
  'другой инструмент',
  'зацикл',
];

export function buildRepeatToolCallFixture() {
  return {
    toolName: 'get_work_item',
    args: { workId: 'ready-eval' },
    repeats: 3,
  };
}

export function evaluateRepeatToolCallLoopDeterministic(fixture = buildRepeatToolCallFixture()) {
  const tracker = createAgentToolLoopTracker();
  let lastRecord = null;

  for (let index = 0; index < fixture.repeats; index += 1) {
    lastRecord = tracker.record(fixture.toolName, fixture.args);
  }

  return {
    ok: lastRecord?.loopAborted === true && String(lastRecord.loopHint ?? '').includes('LOOP_HINT'),
    lastRecord,
    counts: tracker.snapshot(),
  };
}

export function buildLoopHintPrompt(loopHintText) {
  return [
    'You are simulating a WorkGraph MCP agent workflow.',
    'The tool executor returned LOOP_HINT because you repeated the same tool call.',
    'Respond in plain text. Acknowledge LOOP_HINT and stop repeating the same tool with the same arguments.',
    'Do not call get_work_item again in this response.',
    '',
    'Tool result:',
    loopHintText,
  ].join('\n');
}

export function evaluateLoopHintModelResponse(text, options = {}) {
  const body = String(text ?? '');
  const lower = body.toLowerCase();
  const repeatedSameTool = /\bget_work_item\b/u.test(body)
    && /\bready-eval\b/u.test(body)
    && /\b(call|invoke|claim|execute|вызов)/iu.test(body);
  const hasStopSignal = STOP_KEYWORDS.some((keyword) => lower.includes(keyword));

  return {
    ok: hasStopSignal && !repeatedSameTool,
    hasStopSignal,
    repeatedSameTool,
  };
}

export async function fetchLoopHintModelResponse(prompt, options = {}) {
  const env = resolveOpenAiProviderEnv(options);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const url = `${env.baseUrl}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (env.apiKey) {
    headers.Authorization = `Bearer ${env.apiKey}`;
  }

  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: env.model,
      messages: [
        { role: 'system', content: 'Follow LOOP_HINT: stop repeating identical tool calls.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`live LLM request failed (${response.status}): ${errorText.slice(0, 400)}`);
  }

  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content ?? '').trim();
}

export async function runLoopHintRepeatToolEval(options = {}) {
  const fixture = options.fixture ?? buildRepeatToolCallFixture();
  const deterministic = evaluateRepeatToolCallLoopDeterministic(fixture);

  if (!deterministic.ok) {
    return {
      schema: LOOP_HINT_REPEAT_TOOL_EVAL_SCHEMA,
      ok: false,
      failureClass: 'code_failure',
      deterministic,
      live: null,
    };
  }

  const env = resolveOpenAiProviderEnv(options);
  if (env.liveEnabled !== true && options.requireLive !== false) {
    return {
      schema: LOOP_HINT_REPEAT_TOOL_EVAL_SCHEMA,
      ok: true,
      failureClass: 'skipped',
      reason: 'IOHASC_E2E_REAL_LLM is not set; deterministic LOOP_HINT guard verified',
      deterministic,
      live: null,
      rubric: {
        deterministic: 'same tool+args >= threshold → loopAborted + LOOP_HINT text',
        liveOptional: 'model acknowledges LOOP_HINT and does not repeat identical tool call',
      },
    };
  }

  const loopHintText = formatAgentToolDuplicateInvocationLoopHint(fixture.toolName, deterministic.lastRecord.loopStreak);
  const prompt = buildLoopHintPrompt(loopHintText);
  const responseText = await fetchLoopHintModelResponse(prompt, options);
  const live = evaluateLoopHintModelResponse(responseText);

  return {
    schema: LOOP_HINT_REPEAT_TOOL_EVAL_SCHEMA,
    ok: live.ok,
    failureClass: live.ok ? null : 'model_failure',
    deterministic,
    live: {
      ...live,
      responsePreview: responseText.slice(0, 500),
      model: env.model,
      endpoint: env.baseUrl,
    },
    rubric: {
      deterministic: 'same tool+args >= threshold → loopAborted + LOOP_HINT text',
      liveOptional: 'model acknowledges LOOP_HINT and does not repeat identical tool call',
    },
  };
}
