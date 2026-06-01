import { PIPELINE_VERDICTS } from './workItemDecisionPipeline.mjs';

const EXECUTION_TARGET_STATUSES = new Set(['ready', 'claimed', 'doing', 'in_progress']);

export function hasWorkItemAnalysis(item) {
  return String(item?.analysis ?? '').trim().length > 0;
}

export function workItemDecisionVerdict(item) {
  const verdict = String(item?.labels?.['work.decision.verdict'] ?? '').trim();
  return PIPELINE_VERDICTS.includes(verdict) ? verdict : null;
}

export function evaluateWorkItemExecutionGate(item) {
  if (!item) {
    return {
      allowed: false,
      code: 'work_item_missing',
      message: 'WorkItem not found',
    };
  }

  if (!hasWorkItemAnalysis(item)) {
    return {
      allowed: false,
      code: 'missing_analysis',
      message:
        'Нет анализа в атоме задачи. В Cursor: get_work_item → анализ целесообразности (до исполнения) → record_work_item_analysis.',
    };
  }

  const verdict = workItemDecisionVerdict(item);
  if (verdict === null) {
    return {
      allowed: false,
      code: 'missing_decision',
      message:
        'Нет утверждения (useful/harmful/defer). В Cursor: record_work_item_decision после анализа.',
    };
  }

  if (verdict === 'defer') {
    return {
      allowed: false,
      code: 'verdict_defer',
      message: 'Задача отложена (defer). Исполнение запрещено до пересмотра и нового useful.',
    };
  }

  if (verdict === 'harmful') {
    return {
      allowed: false,
      code: 'verdict_harmful',
      message: 'Задача отклонена (harmful). Исполнение запрещено.',
    };
  }

  return {
    allowed: true,
    code: 'ok',
    message: '',
    verdict,
  };
}

export function assertWorkItemExecutionAllowed(item) {
  const gate = evaluateWorkItemExecutionGate(item);
  if (!gate.allowed) {
    const error = new Error(gate.message);
    error.code = gate.code;
    throw error;
  }
  return gate;
}

export function statusChangeRequiresExecutionGate(status) {
  return EXECUTION_TARGET_STATUSES.has(String(status ?? '').trim());
}
