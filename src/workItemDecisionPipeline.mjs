import {
  applyAtomInspectorProposalToBacklogFile,
  importStepAtomDraftForWorkItem,
} from './atomInspector.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';

export const WORK_PIPELINE_SCHEMA = 'workgraph.work-item.pipeline.v1';
export const PIPELINE_STAGES = ['intake', 'analyzed', 'decided', 'ready', 'executing', 'closed'];
export const PIPELINE_VERDICTS = ['useful', 'harmful', 'defer'];

export function normalizePipelineLines(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }

  return String(value)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function inferPipelineStage(item) {
  const explicit = String(item?.labels?.['work.pipeline_stage'] ?? '').trim();
  if (explicit !== '' && PIPELINE_STAGES.includes(explicit)) {
    return explicit;
  }

  const verdict = String(item?.labels?.['work.decision.verdict'] ?? '').trim();
  if (verdict !== '') {
    return 'decided';
  }

  if (normalizePipelineLines(item?.analysis).length > 0) {
    return 'analyzed';
  }

  if (item?.status === 'ready' || item?.status === 'claimed' || item?.status === 'doing' || item?.status === 'verify') {
    return item.status === 'ready' ? 'ready' : 'executing';
  }

  if (item?.status === 'done' || item?.status === 'blocked') {
    return 'closed';
  }

  return 'intake';
}

export function buildWorkItemPipelineView(item) {
  if (!item) {
    throw new TypeError('item is required');
  }

  const analysis = normalizePipelineLines(item.analysis);
  const decision = normalizePipelineLines(item.decision);
  const stage = inferPipelineStage(item);
  const verdict = String(item.labels?.['work.decision.verdict'] ?? '').trim();

  return {
    schema: WORK_PIPELINE_SCHEMA,
    workId: item.id,
    stage,
    verdict: PIPELINE_VERDICTS.includes(verdict) ? verdict : null,
    analysis,
    decision,
    analysisAt: item.labels?.['work.analysis.at'] ?? null,
    decisionAt: item.labels?.['work.decision.at'] ?? null,
    status: item.status,
  };
}

function mergeDraftWithPipelineFields(draft, patch) {
  const next = {
    ...draft,
    labels: { ...(draft.labels ?? {}), ...(patch.labels ?? {}) },
  };

  if (patch.analysis !== undefined) {
    next.analysis = normalizePipelineLines(patch.analysis);
  }

  if (patch.decision !== undefined) {
    next.decision = normalizePipelineLines(patch.decision);
  }

  return next;
}

function applyVerdictToDraftLabels(draft, verdict, notes) {
  const now = new Date().toISOString();
  const labels = {
    ...(draft.labels ?? {}),
    'work.pipeline_stage': 'decided',
    'work.decision.verdict': verdict,
    'work.decision.at': now,
  };

  if (verdict === 'useful') {
    labels['work.next_action'] = 'promote в ready после depends_on, затем claim/execute';
    if (labels['work.blocker']) {
      delete labels['work.blocker'];
    }
  } else if (verdict === 'harmful') {
    labels['work.status'] = 'blocked';
    labels['work.blocker'] = 'pipeline verdict harmful';
    labels['work.next_action'] = 'review rejection; не исполнять';
  } else if (verdict === 'defer') {
    labels['work.next_action'] = 'defer: дождаться критериев пересмотра из анализа';
  }

  return mergeDraftWithPipelineFields(draft, {
    labels,
    decision: notes,
  });
}

async function importWorkItemSource(workId, options) {
  const { readWorkItemAtomFromRepo } = await import('./intentTreeWorkItems.mjs');
  return readWorkItemAtomFromRepo(workId, options);
}

export async function applyWorkItemAnalysisToRepo(workId, analysisLines, options = {}) {
  const sourceAtom = await importWorkItemSource(workId, options);
  const source = importStepAtomDraftForWorkItem(sourceAtom.atomText, workId);

  const now = new Date().toISOString();
  const draft = mergeDraftWithPipelineFields(source.draft, {
    analysis: analysisLines,
    labels: {
      'work.pipeline_stage': 'analyzed',
      'work.analysis.at': now,
      'work.analysis.source': options.analysisSource ?? 'cursor',
      'work.next_action': options.nextAction ?? 'Cursor: record_work_item_decision (useful/harmful/defer)',
    },
  });

  return applyAtomInspectorProposalToBacklogFile({
    ...options,
    workId,
    draft,
  });
}

export async function applyWorkItemDecisionToRepo(workId, verdict, options = {}) {
  if (!PIPELINE_VERDICTS.includes(verdict)) {
    throw new Error(`unsupported pipeline verdict: ${verdict}`);
  }

  const notes = normalizePipelineLines(options.notes);
  if (notes.length === 0) {
    throw new Error('decision notes are required — write them in Cursor and pass via record_work_item_decision');
  }

  const sourceAtom = await importWorkItemSource(workId, options);
  const source = importStepAtomDraftForWorkItem(sourceAtom.atomText, workId);
  const draft = applyVerdictToDraftLabels(source.draft, verdict, notes);

  return applyAtomInspectorProposalToBacklogFile({
    ...options,
    workId,
    draft,
  });
}

export async function recordWorkItemAnalysis(options = {}) {
  const workId = String(options.workId ?? '').trim();
  if (workId === '') {
    return { schema: WORK_PIPELINE_SCHEMA, ok: false, error: 'work_id_required' };
  }

  const analysisText = String(options.analysis ?? '').trim();
  if (analysisText === '') {
    return {
      schema: WORK_PIPELINE_SCHEMA,
      ok: false,
      error: 'analysis_required',
      message: 'analysis is required — produce it in Cursor (your connected LLM) and pass the full text',
      workId,
    };
  }

  const items = await readWorkItemsFromRepo(options);
  const item = items.find((entry) => entry.id === workId);
  if (!item) {
    return { schema: WORK_PIPELINE_SCHEMA, ok: false, error: 'work_item_not_found', workId };
  }

  const analysisLines = normalizePipelineLines(analysisText);
  const applyResult = await applyWorkItemAnalysisToRepo(workId, analysisLines, {
    ...options,
    analysisSource: options.analysisSource ?? 'cursor',
  });

  if (!applyResult.ok) {
    return {
      schema: WORK_PIPELINE_SCHEMA,
      ok: false,
      error: applyResult.error ?? 'apply_failed',
      workId,
      applyResult,
    };
  }

  const refreshed = (await readWorkItemsFromRepo(options)).find((entry) => entry.id === workId);
  return {
    schema: WORK_PIPELINE_SCHEMA,
    ok: true,
    action: 'record_analysis',
    workId,
    pipeline: buildWorkItemPipelineView(refreshed),
    path: applyResult.path,
  };
}

export async function recordWorkItemDecision(options = {}) {
  const workId = String(options.workId ?? '').trim();
  const verdict = String(options.verdict ?? '').trim();

  if (workId === '') {
    return { schema: WORK_PIPELINE_SCHEMA, ok: false, error: 'work_id_required' };
  }

  if (!PIPELINE_VERDICTS.includes(verdict)) {
    return {
      schema: WORK_PIPELINE_SCHEMA,
      ok: false,
      error: 'invalid_verdict',
      message: 'verdict must be useful | harmful | defer',
      workId,
    };
  }

  const notesText = String(options.notes ?? options.decision ?? '').trim();
  if (notesText === '') {
    return {
      schema: WORK_PIPELINE_SCHEMA,
      ok: false,
      error: 'decision_notes_required',
      message: 'notes/decision text is required — justify the verdict in Cursor before recording',
      workId,
    };
  }

  const items = await readWorkItemsFromRepo(options);
  const item = items.find((entry) => entry.id === workId);
  if (!item) {
    return { schema: WORK_PIPELINE_SCHEMA, ok: false, error: 'work_item_not_found', workId };
  }

  const applyResult = await applyWorkItemDecisionToRepo(workId, verdict, {
    ...options,
    notes: notesText,
  });

  if (!applyResult.ok) {
    return {
      schema: WORK_PIPELINE_SCHEMA,
      ok: false,
      error: applyResult.error ?? 'apply_failed',
      workId,
      applyResult,
    };
  }

  const refreshed = (await readWorkItemsFromRepo(options)).find((entry) => entry.id === workId);
  return {
    schema: WORK_PIPELINE_SCHEMA,
    ok: true,
    action: 'record_decision',
    workId,
    verdict,
    pipeline: buildWorkItemPipelineView(refreshed),
    path: applyResult.path,
  };
}
