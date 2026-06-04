import { validateIrFlow } from './validateIrFlow.mjs';

export const LLM_IR_NORMALIZER_SCHEMA = 'ir.flow.normalizer.result.v1';

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'step';
}

function extractStepsFromProse(prose) {
  const lines = String(prose ?? '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  const steps = [];
  for (const line of lines) {
    const match = line.match(/^(?:\d+[.)]|[-*])\s+(.*)$/u);
    if (match) {
      steps.push(match[1].trim());
      continue;
    }
    if (steps.length === 0 && line.length > 0) {
      steps.push(line);
    }
  }

  return steps.length > 0 ? steps : ['Execute workflow'];
}

export function normalizeLlmIrDraft(input = {}) {
  const prose = input.prose ?? input.text ?? '';
  const taskId = String(input.taskId ?? 'workflow').trim() || 'workflow';
  const steps = extractStepsFromProse(prose);

  const nodes = [
    { id: 'start', kind: 'start', goal: taskId },
  ];
  const edges = [];

  let previousId = 'start';
  steps.forEach((step, index) => {
    const actionId = `action-${index + 1}`;
    nodes.push({
      id: actionId,
      kind: 'action',
      goal: step,
      basis: step,
    });
    edges.push({ from: previousId, to: actionId });
    previousId = actionId;
  });

  const endId = `end-${slugify(taskId)}`;
  nodes.push({ id: endId, kind: 'end', goal: 'complete' });
  edges.push({ from: previousId, to: endId });

  const flow = {
    schema: 'ir.flow.v1',
    taskId,
    nodes,
    edges,
  };

  const validation = validateIrFlow(flow);

  return {
    schema: LLM_IR_NORMALIZER_SCHEMA,
    mode: input.provider ? 'provider' : 'deterministic-stub',
    flow,
    validation,
    summary: `normalized ${steps.length} step(s) from prose`,
  };
}
