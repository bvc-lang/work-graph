import { buildGraphRagContextForWorkerInput } from './graphRagContextSlice.mjs';
import { queryIntentPlane } from './queryIntentPlane.mjs';
import { executeSemanticSearchFromRepo } from './semanticSearchWorkflow.mjs';

export const SEMANTIC_DRIFT_RESULT_SCHEMA = 'semantic.drift.result.v1';
export const SEMANTIC_FIELD_RESULT_SCHEMA = 'semantic.field.result.v1';
export const CONTEXT_SLICE_RESULT_SCHEMA = 'semantic.context.slice.v1';

function tokenize(value) {
  return String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9\u0400-\u04ff]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function basename(path) {
  return String(path ?? '').split(/[/\\]/u).pop() ?? '';
}

export function detectSemanticDrift(items, workId) {
  const task = items.find((item) => item.id === workId);
  if (!task) {
    throw new Error(`unknown work id: ${workId}`);
  }

  const goalTokens = new Set([
    ...tokenize(task.goal),
    ...tokenize(task.vector),
  ]);
  const codeTokens = new Set([
    ...(task.targetFiles ?? []).flatMap((path) => tokenize(basename(path))),
    ...tokenize((task.labels?.['trace.code_refs'] ?? '')),
  ]);

  const overlap = [...goalTokens].filter((token) => codeTokens.has(token)).length;
  const evidenceBonus = (task.evidence?.length ?? 0) > 0 || task.traceStatus === 'verified' ? 0.15 : 0;
  const alignment = goalTokens.size === 0
    ? 0.5
    : Math.min(1, overlap / goalTokens.size + evidenceBonus);
  const drift = 1 - alignment;

  /** @type {Array<{ code: string, message: string, weight: number }>} */
  const reasons = [];
  if ((task.targetFiles ?? []).length === 0) {
    reasons.push({ code: 'no_target_files', message: 'No work.target_files declared', weight: 0.5 });
  }
  if (overlap === 0 && goalTokens.size > 0) {
    reasons.push({ code: 'low_goal_overlap', message: 'Goal tokens do not overlap target file names', weight: 0.4 });
  }
  if ((task.evidence ?? []).length === 0 && task.traceStatus !== 'verified') {
    reasons.push({ code: 'missing_evidence', message: 'No verified evidence or trace', weight: 0.3 });
  }

  return {
    schema: SEMANTIC_DRIFT_RESULT_SCHEMA,
    workId,
    alignment_score: Number(alignment.toFixed(3)),
    drift_score: Number(drift.toFixed(3)),
    reasons,
  };
}

export async function querySemanticField(items, args = {}, options = {}) {
  const q = String(args.q ?? args.query ?? '').trim();
  const limit = Number.isInteger(args.limit) ? args.limit : 12;
  const scopeWorkId = args.scope?.workId ?? args.workId ?? null;

  const search = await executeSemanticSearchFromRepo({
    cwd: options.cwd,
    items,
    query: q,
    limit,
    ...(args.mode ? { mode: args.mode } : {}),
  });

  const plane = scopeWorkId
    ? queryIntentPlane(items, { startNode: { id: scopeWorkId }, depth: args.depth ?? 1 }, options)
    : null;

  return {
    schema: SEMANTIC_FIELD_RESULT_SCHEMA,
    query: q,
    scopeWorkId,
    hits: (search.hits ?? []).map((hit) => ({
      id: hit.id,
      kind: hit.kind ?? 'work_item',
      score: hit.score,
      label: hit.label,
      workId: hit.workId ?? null,
    })),
    plane,
  };
}

export async function getContextSlice(items, args = {}, options = {}) {
  const workId = String(args.workId ?? '').trim();
  if (workId === '') {
    throw new TypeError('workId is required');
  }

  const task = items.find((item) => item.id === workId);
  if (!task) {
    throw new Error(`unknown work id: ${workId}`);
  }

  const graphRag = buildGraphRagContextForWorkerInput(task, items, options);
  const drift = detectSemanticDrift(items, workId);
  const field = args.q
    ? await querySemanticField(items, { q: args.q, scope: { workId }, limit: 8 }, options)
    : null;

  return {
    schema: CONTEXT_SLICE_RESULT_SCHEMA,
    workId,
    maxTokens: args.maxTokens ?? 4000,
    graphRag,
    drift,
    field,
  };
}
