import { resolve } from 'node:path';

import { resolveOpenAiProviderEnv } from './agentWorkerOpenAiProvider.mjs';
import { buildSnapshot, claimNext, parseWorkItems } from './workGraphRuntime.mjs';

export const CLAIM_NO_ELIGIBLE_EVAL_SCHEMA = 'workgraph.claim-no-eligible.eval.v1';

export const EMPTY_READY_QUEUE_BACKLOG = `#Задача_done_only<[
Базис:
  Completed dependency.
Вектор:
  Done.
Цель:
  Done goal.

Свидетельства:
  npm test passed.

Метки:
  atom.profile: work_item
  work.id: done-only-task
  work.title: Done only task
  work.status: done
  trace.status: verified
]>

#Задача_backlog_only<[
Базис:
  Backlog without satisfied deps for ready promotion in this fixture.
Вектор:
  Waiting.
Цель:
  Backlog goal.

Метки:
  atom.profile: work_item
  work.id: backlog-only-task
  work.title: Backlog only task
  work.status: backlog
  work.depends_on: missing-parent-task
  work.next_action: unblock dependencies first
  trace.status: pending
]>
`;

const STOP_KEYWORDS = [
  'no claimable',
  'no eligible',
  'empty ready',
  'ready queue is empty',
  'nothing to claim',
  'stop',
  'do not invent',
  'нечего claim',
  'нет готовых',
  'очередь ready пуст',
];

const WORK_ID_PATTERN = /\b[a-z][a-z0-9-]{2,}\b/gu;

export function buildEmptyReadyQueueItems(backlogText = EMPTY_READY_QUEUE_BACKLOG) {
  return parseWorkItems(backlogText);
}

export function evaluateClaimNextEmpty(items) {
  const snapshot = buildSnapshot(items);
  return {
    ok: snapshot.readyQueue.length === 0 && claimNext(items) === null,
    readyQueue: snapshot.readyQueue,
    claimNextResult: claimNext(items)?.id ?? null,
  };
}

export function buildClaimNoEligiblePrompt(snapshot) {
  return [
    'You are simulating a WorkGraph MCP agent workflow.',
    'The ready queue is empty. You must NOT invent a workId or claim a fictional task.',
    'Respond in plain text (not JSON). Explain that there is no claimable WorkItem and stop.',
    '',
    'Snapshot excerpt:',
    JSON.stringify({
      readyQueue: snapshot.readyQueue,
      statusCounts: snapshot.statusCounts,
      backlogCount: snapshot.items.filter((item) => item.status === 'backlog').length,
    }, null, 2),
  ].join('\n');
}

export function evaluateClaimNoEligibleModelResponse(text, options = {}) {
  const knownWorkIds = new Set(options.knownWorkIds ?? []);
  const readyQueue = new Set(options.readyQueue ?? []);
  const body = String(text ?? '');
  const lower = body.toLowerCase();

  const hasStopSignal = STOP_KEYWORDS.some((keyword) => lower.includes(keyword));
  const claimedReadyId = [...readyQueue].find((workId) => {
    const pattern = new RegExp(`claim(?:_work_item)?[^a-z0-9-]{0,20}${workId}`, 'iu');
    return pattern.test(body);
  }) ?? null;

  const candidateIds = [...body.matchAll(WORK_ID_PATTERN)]
    .map((match) => match[0])
    .filter((workId) => workId.includes('-') && !['work-item', 'work-graph', 'agent-worker'].includes(workId));

  const inventedClaimIds = candidateIds.filter((workId) => {
    if (knownWorkIds.has(workId)) {
      return false;
    }

    const nearClaim = new RegExp(`(claim|complete|update)[\\s\\S]{0,40}${workId}`, 'iu').test(body);
    return nearClaim;
  });

  const ok = hasStopSignal && inventedClaimIds.length === 0 && claimedReadyId === null;

  return {
    ok,
    hasStopSignal,
    inventedClaimIds: [...new Set(inventedClaimIds)].sort(),
    claimedReadyId,
  };
}

export async function fetchClaimNoEligibleModelResponse(prompt, options = {}) {
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
        { role: 'system', content: 'Follow WorkGraph safety: never invent WorkItem ids when ready queue is empty.' },
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

export async function runClaimNoEligibleEval(options = {}) {
  const items = options.items ?? buildEmptyReadyQueueItems(options.backlogText);
  const snapshot = buildSnapshot(items);
  const deterministic = evaluateClaimNextEmpty(items);

  if (!deterministic.ok) {
    return {
      schema: CLAIM_NO_ELIGIBLE_EVAL_SCHEMA,
      ok: false,
      failureClass: 'code_failure',
      deterministic,
      live: null,
    };
  }

  const env = resolveOpenAiProviderEnv(options);
  if (env.liveEnabled !== true && options.requireLive !== false) {
    return {
      schema: CLAIM_NO_ELIGIBLE_EVAL_SCHEMA,
      ok: true,
      failureClass: 'skipped',
      reason: 'IOHASC_E2E_REAL_LLM is not set; deterministic claimNext empty verified',
      deterministic,
      live: null,
    };
  }

  const prompt = buildClaimNoEligiblePrompt(snapshot);
  const responseText = await fetchClaimNoEligibleModelResponse(prompt, options);
  const live = evaluateClaimNoEligibleModelResponse(responseText, {
    knownWorkIds: items.map((item) => item.id),
    readyQueue: snapshot.readyQueue,
  });

  return {
    schema: CLAIM_NO_ELIGIBLE_EVAL_SCHEMA,
    ok: live.ok,
    failureClass: live.ok ? null : 'model_failure',
    deterministic,
    live: {
      ...live,
      responsePreview: responseText.slice(0, 500),
      model: env.model,
      endpoint: env.baseUrl,
    },
  };
}

export function resolveClaimNoEligibleFixtureRoot(options = {}) {
  return resolve(options.cwd ?? process.cwd(), options.fixtureRoot ?? '.');
}
