import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  appendWorkerRunJournal,
  runAgentWorkerLiveLoopFromBacklogFile,
} from '../src/agentWorkerLiveLoop.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const DEFAULT_TASK_ID = 'onebase-implement-gross-profit-warehouse-dimension';

function printContract() {
  console.log('Optional LLM golden path eval (Tier B, non-blocking CI)');
  console.log('Scenario: domains/onebase/golden-path.bvc');
  console.log('Protocol: protocols/golden-path-test-v1.bvc §Optional_LLM_Eval_Command_V1');
  console.log('Live loop: npm run worker:live-loop');
  console.log('OneBase gate: npm run test:optional:onebase');
  console.log('');
  console.log('Set IOHASC_E2E_REAL_LLM=1 to run live-loop + optional OneBase verification.');
}

export function isLiveLlmWorkerSuccess(result) {
  if (!result || result.providerResult?.usedFallback) {
    return false;
  }

  const providerId = result.providerResult?.providerId ?? '';
  if (providerId !== 'openai' && providerId !== 'openai-compatible') {
    return false;
  }

  const status = result.workerOutput?.status;
  return status === 'succeeded' || status === 'needs_human';
}

async function main() {
  const taskId = process.argv[2] || DEFAULT_TASK_ID;
  const liveEnabled = process.env.IOHASC_E2E_REAL_LLM === '1';

  if (!liveEnabled) {
    printContract();
    console.log(JSON.stringify({
      ok: true,
      failureClass: 'skipped',
      reason: 'IOHASC_E2E_REAL_LLM is not set; optional eval contract only',
      taskId,
    }, null, 2));
    return;
  }

  const liveLoopResult = await runAgentWorkerLiveLoopFromBacklogFile({
    cwd: repoRoot,
    taskId,
    provider: 'openai',
    enableFallback: false,
  });

  const liveLoopOk = isLiveLlmWorkerSuccess(liveLoopResult);
  const liveLoopJson = {
    ok: liveLoopOk,
    taskId: liveLoopResult.taskId,
    error: liveLoopResult.error,
    appliedTransition: liveLoopResult.appliedTransition,
    transitionProposal: liveLoopResult.transitionProposal,
    workerRunSummary: liveLoopResult.workerRunSummary,
    providerId: liveLoopResult.providerResult?.providerId ?? null,
    workerStatus: liveLoopResult.workerOutput?.status ?? null,
    usedFallback: liveLoopResult.providerResult?.usedFallback ?? false,
    steps: liveLoopResult.steps?.map((step) => step.phase),
  };

  const onebase = spawnSync('npm', ['run', 'test:optional:onebase'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: true,
  });

  const endpoint = process.env.IOHASC_LLM_BASE_URL ?? 'http://127.0.0.1:1234/v1';
  const model = process.env.IOHASC_LLM_MODEL ?? 'unknown';

  const summary = {
    runId: `optional-golden-path-llm-${taskId}`,
    taskId,
    status: liveLoopOk && onebase.status === 0 ? 'succeeded' : 'failed',
    provider: 'optional-llm-eval',
    summary: liveLoopOk
      ? (onebase.status === 0
        ? `live OpenAI-compatible worker (${model} @ ${endpoint}) and OneBase optional gate passed`
        : 'OneBase optional gate failed after live worker response')
      : `live worker did not reach openai provider success (status=${liveLoopJson.workerStatus ?? 'unknown'})`,
    recordedAt: new Date().toISOString(),
    failureClass: liveLoopOk
      ? (onebase.status === 0 ? null : 'code_failure')
      : 'model_failure',
    liveEndpoint: endpoint,
    liveModel: model,
  };

  await appendWorkerRunJournal(summary);

  console.log(JSON.stringify({
    ok: summary.status === 'succeeded',
    taskId,
    workerRunSummary: summary,
    liveLoop: liveLoopJson,
    onebaseExitCode: onebase.status,
    failureClass: summary.failureClass,
  }, null, 2));

  if (summary.status !== 'succeeded') {
    process.exitCode = 1;
  }
}

await main();
