import { claimNext, recordEvidence, transitionStatus } from './workGraphRuntime.mjs';

/** Agent loop phases aligned with protocols/agent-state-machine-v1.bvc */
export const AGENT_LOOP_PHASES = [
  'observe',
  'plan',
  'claim',
  'act',
  'verify',
  'record',
  'stop',
];

/**
 * Deterministic golden path: claim ready task -> act evidence -> verify -> done.
 * No LLM, no filesystem — exercises Work Graph runtime policy only.
 *
 * @param {Array<{ id: string, status: string, evidence?: string[], targetFiles?: string[], labels?: object, dependsOn?: string[] }>} items
 * @param {{ taskId?: string }} [options]
 */
export function runDeterministicGoldenPath(items, options = {}) {
  const steps = [];
  let pool = items.map((item) => ({ ...item, evidence: [...(item.evidence || [])], labels: { ...item.labels } }));

  steps.push({ phase: 'observe', detail: 'read snapshot', itemCount: pool.length });

  const target = options.taskId
    ? pool.find((item) => item.id === options.taskId)
    : claimNext(pool);

  if (!target) {
    return { ok: false, steps, error: 'no_claimable_task', finalItems: pool };
  }

  steps.push({ phase: 'plan', detail: 'select task ' + target.id, taskId: target.id });

  let current = transitionStatus(target, 'claimed');
  pool = replaceItem(pool, target.id, current);
  steps.push({ phase: 'claim', detail: 'transition to claimed', taskId: current.id, status: current.status });

  current = recordEvidence(current, 'change: updated ' + (current.targetFiles?.[0] || 'artifact') + ' for golden path');
  pool = replaceItem(pool, current.id, current);
  steps.push({ phase: 'act', detail: 'record change evidence', evidenceCount: current.evidence.length });

  current = transitionStatus(current, 'verify', {
    evidence: 'verify: npm run test:deterministic scheduled for golden path task',
  });
  pool = replaceItem(pool, current.id, current);
  steps.push({ phase: 'verify', detail: 'transition to verify', status: current.status });

  current = transitionStatus(current, 'done', {
    evidence: 'test: npm run test:deterministic exit_code=0 golden-path',
  });
  pool = replaceItem(pool, current.id, current);
  steps.push({ phase: 'record', detail: 'transition to done with verification evidence', status: current.status });
  steps.push({ phase: 'stop', detail: 'golden path complete', taskId: current.id });

  return {
    ok: current.status === 'done' && current.evidence.length >= 3,
    steps,
    finalItems: pool,
    taskId: current.id,
  };
}

/** @param {typeof items} pool @param {string} id @param {object} nextItem */
function replaceItem(pool, id, nextItem) {
  return pool.map((item) => (item.id === id ? nextItem : item));
}
