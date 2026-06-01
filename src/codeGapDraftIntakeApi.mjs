import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  appendWorkItemAtomToBacklogText,
  findWorkItemAtomSpan,
  writeBacklogTextAtomically,
} from './workGraphBacklogPersist.mjs';
import {
  appendWorkItemAtomToIntentTree,
  readWorkItemAtomFromRepo,
} from './intentTreeWorkItems.mjs';
import { formatStepAtomDraft, validateStepAtomDraft } from './stepAtomFormatter.mjs';
import {
  evaluateDraftIntakePromotion,
  partitionDraftIntakeCandidates,
} from './draftIntakePromotionRules.mjs';
import { DEFAULT_CODE_GAP_REPORT_PATH } from './codeGapOperatorProjection.mjs';

export const CODE_GAP_DRAFT_PROPOSAL_SCHEMA = 'code-gap.draft-intake.proposal.v1';
export const CODE_GAP_DRAFT_APPLY_SCHEMA = 'code-gap.draft-intake.apply.response.v1';
export const CODE_GAP_DRAFT_SCHEMA = 'code-gap.draft-intake.draft.v1';

function atomNameFromWorkId(workId) {
  const safe = String(workId ?? '').trim().replace(/-/g, '_');
  return `Задача_${safe}`;
}

function priorityForConfidence(confidence) {
  if (confidence === 'high') {
    return 'high';
  }

  if (confidence === 'low') {
    return 'low';
  }

  return 'medium';
}

export function buildWorkItemDraftFromCodeGapSuggestion(suggestion, options = {}) {
  if (!suggestion || typeof suggestion !== 'object') {
    throw new TypeError('suggestion is required');
  }

  const workId = String(suggestion.suggestedWorkId ?? '').trim();
  if (workId === '') {
    throw new TypeError('suggestion.suggestedWorkId is required');
  }

  const title = String(suggestion.title ?? workId).trim();
  const targetFiles = [...(suggestion.targetFiles ?? [])];
  const provenance = suggestion.provenance ?? {};
  const sourceReportPath = String(
    options.sourceReportPath ?? options.intakeSourcePath ?? DEFAULT_CODE_GAP_REPORT_PATH,
  ).trim();

  const draft = {
    name: atomNameFromWorkId(workId),
    profile: 'work_item',
    basis: [
      `Code-gap analyzer обнаружил ${suggestion.gapKind ?? 'gap'}: ${suggestion.reason ?? title}.`,
      provenance.symbol ? `Symbol: ${provenance.symbol}.` : '',
      provenance.stepGuid ? `Step GUID: ${provenance.stepGuid}.` : '',
    ].filter(Boolean),
    vector: [
      'Оформить WorkItem из code-gap suggestion через reviewed draft intake.',
      'Связать задачу с target files и закрыть gap после verification.',
    ],
    goal: [title],
    checks: [
      'draft проходит StepAtomDraft validation',
      'operator подтвердил explicit apply в backlog',
      'duplicate work.id отсутствует',
    ],
    labels: {
      'atom.profile': 'work_item',
      'work.id': workId,
      'work.title': title,
      'work.status': 'backlog',
      'work.owner_role': options.ownerRole ?? 'integration_architect',
      'work.department': options.department ?? 'memory',
      'work.priority': priorityForConfidence(suggestion.confidence),
      'work.risk': 'medium',
      'work.next_action': options.nextAction ?? 'review draft и promote в ready',
      'work.target_files': targetFiles.join(', '),
      'intake.source_kind': 'code-gap-analyzer',
      'intake.review_status': 'pending',
      'intake.source_path': sourceReportPath,
      'intake.promoted_work.id': workId,
      'trace.status': 'pending',
      'migration.strategy': 'rebuild',
    },
  };

  return {
    schema: CODE_GAP_DRAFT_SCHEMA,
    suggestedWorkId: workId,
    reviewRequired: suggestion.reviewRequired !== false,
    gapKind: suggestion.gapKind ?? '',
    confidence: suggestion.confidence ?? 'medium',
    targetFiles,
    provenance,
    draft,
  };
}

export function buildCodeGapDraftProposal(body, options = {}) {
  const suggestion = body?.suggestion;

  if (!suggestion || typeof suggestion !== 'object') {
    const emptyProposal = {
      ok: false,
      error: 'suggestion_required',
      validationErrors: ['suggestion is required'],
      codeGapDraft: null,
    };

    return {
      schema: CODE_GAP_DRAFT_PROPOSAL_SCHEMA,
      ...emptyProposal,
      reviewRequired: true,
      promotionProtocol: 'protocols/workgraph-draft-intake.bvc',
      promotionEvaluation: evaluateDraftIntakePromotion(emptyProposal, options),
    };
  }

  const codeGapDraft = buildWorkItemDraftFromCodeGapSuggestion(suggestion, {
    ...options,
    sourceReportPath: body.sourceReportPath ?? options.sourceReportPath,
  });

  const validationErrors = validateStepAtomDraft(codeGapDraft.draft);
  let formattedAtom = null;

  if (validationErrors.length === 0) {
    try {
      formattedAtom = formatStepAtomDraft(codeGapDraft.draft);
    } catch (error) {
      validationErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    schema: CODE_GAP_DRAFT_PROPOSAL_SCHEMA,
    ok: validationErrors.length === 0,
    error: validationErrors.length === 0 ? null : 'validation_failed',
    codeGapDraft,
    formattedAtom,
    validationErrors,
    reviewRequired: true,
    promotionProtocol: 'protocols/workgraph-draft-intake.bvc',
    promotionEvaluation: evaluateDraftIntakePromotion({
      ok: validationErrors.length === 0,
      validationErrors,
      codeGapDraft,
    }, options),
  };
}

export function parseCodeGapDraftIntakeRequestBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    return {};
  }

  if (typeof rawBody === 'string' && rawBody.trim() === '') {
    return {};
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('code-gap draft intake body must be a JSON object');
  }

  return body;
}

export async function executeCodeGapDraftProposal(options = {}) {
  const body = parseCodeGapDraftIntakeRequestBody(options.body ?? {});
  return buildCodeGapDraftProposal(body, options);
}

export function buildCodeGapBacklogCandidateList(feedOrProjection, options = {}) {
  const suggestions = Array.isArray(feedOrProjection?.suggestions)
    ? feedOrProjection.suggestions
    : [];

  const entries = suggestions.map((suggestion) => ({
    suggestion,
    proposal: buildCodeGapDraftProposal(
      {
        suggestion,
        sourceReportPath: feedOrProjection?.sourceReportPath ?? options.sourceReportPath,
      },
      options,
    ),
  }));

  return partitionDraftIntakeCandidates(entries, options);
}

export async function executeCodeGapDraftApply(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const body = parseCodeGapDraftIntakeRequestBody(options.body ?? {});

  const proposal = body.proposal ?? buildCodeGapDraftProposal(body, options);

  if (!proposal.ok || !proposal.codeGapDraft?.draft) {
    return {
      schema: CODE_GAP_DRAFT_APPLY_SCHEMA,
      ok: false,
      error: proposal.error ?? 'invalid_proposal',
      workId: null,
      persistedBacklog: false,
      validationErrors: proposal.validationErrors ?? [],
    };
  }

  const workId = String(proposal.codeGapDraft.suggestedWorkId ?? '').trim();
  const draft = {
    ...proposal.codeGapDraft.draft,
    labels: {
      ...proposal.codeGapDraft.draft.labels,
      'intake.review_status': 'approved',
      'intake.promoted_work.id': workId,
    },
  };

  let formattedAtom = proposal.formattedAtom;
  try {
    formattedAtom = formatStepAtomDraft(draft);
  } catch (error) {
    return {
      schema: CODE_GAP_DRAFT_APPLY_SCHEMA,
      ok: false,
      error: 'validation_failed',
      workId,
      persistedBacklog: false,
      validationErrors: [error instanceof Error ? error.message : String(error)],
    };
  }

  if (options.backlogText !== undefined || options.backlogPath) {
    const backlogPath = resolve(cwd, options.backlogPath ?? 'work/backlog.bvc');
    const backlogText = options.backlogText ?? await readFile(backlogPath, 'utf8');

    if (findWorkItemAtomSpan(backlogText, workId)) {
      return {
        schema: CODE_GAP_DRAFT_APPLY_SCHEMA,
        ok: false,
        error: 'duplicate_work_id',
        workId,
        persistedBacklog: false,
        validationErrors: [`work.id already exists: ${workId}`],
      };
    }

    const nextText = appendWorkItemAtomToBacklogText(backlogText, formattedAtom);

    if (options.persistBacklog !== false) {
      await writeBacklogTextAtomically(backlogPath, nextText);
    }

    return {
      schema: CODE_GAP_DRAFT_APPLY_SCHEMA,
      ok: true,
      error: null,
      workId,
      persistedBacklog: options.persistBacklog !== false,
      validationErrors: [],
      formattedAtom,
      intakeSourceKind: 'code-gap-analyzer',
    };
  }

  try {
    await readWorkItemAtomFromRepo(workId, { ...options, cwd });
    return {
      schema: CODE_GAP_DRAFT_APPLY_SCHEMA,
      ok: false,
      error: 'duplicate_work_id',
      workId,
      persistedBacklog: false,
      validationErrors: [`work.id already exists: ${workId}`],
    };
  } catch (error) {
    if (!String(error instanceof Error ? error.message : error).includes('not found')) {
      throw error;
    }
  }

  if (options.persistBacklog !== false) {
    await appendWorkItemAtomToIntentTree(formattedAtom, { ...options, cwd });
  }

  return {
    schema: CODE_GAP_DRAFT_APPLY_SCHEMA,
    ok: true,
    error: null,
    workId,
    persistedBacklog: options.persistBacklog !== false,
    validationErrors: [],
    formattedAtom,
    intakeSourceKind: 'code-gap-analyzer',
  };
}
