import { validateStepAtomDraft } from './stepAtomFormatter.mjs';

export const DRAFT_INTAKE_PROMOTION_EVAL_SCHEMA = 'workgraph.draft-intake.promotion-eval.v1';
export const DRAFT_INTAKE_CANDIDATE_LIST_SCHEMA = 'workgraph.draft-intake.candidate-list.v1';

const ALLOWED_MIGRATION_STRATEGIES = new Set(['port', 'rebuild', 'replace', 'defer']);
const ALLOWED_INTAKE_SOURCE_KINDS = new Set([
  'code-gap-analyzer',
  'suggestion',
  'llm_draft',
  'manual',
]);

/**
 * Deterministic promotion gates from protocols/workgraph-draft-intake.bvc.
 * No silent backlog mutation — eligible drafts become operator-reviewed candidates only.
 */
export const DRAFT_INTAKE_PROMOTION_RULES = Object.freeze([
  {
    id: 'proposal_validation',
    description: 'StepAtomDraft validation and formatter pass without errors.',
  },
  {
    id: 'work_id_present',
    description: 'Draft carries non-empty work.id / suggestedWorkId.',
  },
  {
    id: 'migration_strategy',
    description: 'Draft labels include allowed migration.strategy.',
  },
  {
    id: 'intake_provenance',
    description: 'Draft includes intake.source_kind, intake.source_path, intake.review_status=pending.',
  },
  {
    id: 'target_files',
    description: 'Code-gap drafts reference at least one target file.',
  },
  {
    id: 'duplicate_work_id',
    description: 'Suggested work.id is absent from canonical backlog / existingWorkIds.',
  },
  {
    id: 'confidence_gate',
    description: 'Suggestion confidence is not low unless explicitly allowed.',
  },
]);

function normalizeWorkIdSet(existingWorkIds) {
  if (existingWorkIds instanceof Set) {
    return existingWorkIds;
  }

  if (Array.isArray(existingWorkIds)) {
    return new Set(existingWorkIds.map((value) => String(value).trim()).filter(Boolean));
  }

  return new Set();
}

function buildCheck(id, passed, message) {
  return { id, passed, message };
}

/**
 * @param {{
 *   ok?: boolean,
 *   validationErrors?: string[],
 *   codeGapDraft?: { suggestedWorkId?: string, confidence?: string, targetFiles?: string[], draft?: { labels?: Record<string, string> } },
 * }} proposal
 * @param {{ existingWorkIds?: Iterable<string>, allowLowConfidence?: boolean, requireTargetFiles?: boolean }} [options]
 */
export function evaluateDraftIntakePromotion(proposal, options = {}) {
  if (!proposal || typeof proposal !== 'object') {
    throw new TypeError('proposal is required');
  }

  const draft = proposal.codeGapDraft?.draft ?? {};
  const labels = draft.labels ?? {};
  const workId = String(proposal.codeGapDraft?.suggestedWorkId ?? labels['work.id'] ?? '').trim();
  const validationErrors = [...(proposal.validationErrors ?? [])];
  const existingWorkIds = normalizeWorkIdSet(options.existingWorkIds);
  const requireTargetFiles = options.requireTargetFiles !== false;
  const allowLowConfidence = options.allowLowConfidence === true;

  const checks = [
    buildCheck(
      'proposal_validation',
      proposal.ok === true && validationErrors.length === 0,
      proposal.ok === true && validationErrors.length === 0
        ? 'Proposal validation passed.'
        : `Proposal validation failed: ${validationErrors.join('; ') || proposal.error || 'unknown'}`,
    ),
    buildCheck(
      'work_id_present',
      workId !== '',
      workId !== '' ? `work.id ${workId} present.` : 'work.id is missing.',
    ),
    buildCheck(
      'migration_strategy',
      ALLOWED_MIGRATION_STRATEGIES.has(String(labels['migration.strategy'] ?? '').trim()),
      ALLOWED_MIGRATION_STRATEGIES.has(String(labels['migration.strategy'] ?? '').trim())
        ? `migration.strategy=${labels['migration.strategy']}.`
        : 'migration.strategy missing or unsupported.',
    ),
    buildCheck(
      'intake_provenance',
      ALLOWED_INTAKE_SOURCE_KINDS.has(String(labels['intake.source_kind'] ?? '').trim())
        && String(labels['intake.source_path'] ?? '').trim() !== ''
        && String(labels['intake.review_status'] ?? '').trim() === 'pending',
      ALLOWED_INTAKE_SOURCE_KINDS.has(String(labels['intake.source_kind'] ?? '').trim())
        && String(labels['intake.source_path'] ?? '').trim() !== ''
        && String(labels['intake.review_status'] ?? '').trim() === 'pending'
        ? 'intake provenance labels complete and review_status=pending.'
        : 'intake provenance incomplete or review_status is not pending.',
    ),
    buildCheck(
      'target_files',
      !requireTargetFiles || (proposal.codeGapDraft?.targetFiles?.length ?? 0) > 0 || String(labels['work.target_files'] ?? '').trim() !== '',
      requireTargetFiles
        ? 'At least one target file is referenced.'
        : 'Target files optional for this intake kind.',
    ),
    buildCheck(
      'duplicate_work_id',
      workId === '' || !existingWorkIds.has(workId),
      workId !== '' && existingWorkIds.has(workId)
        ? `work.id already exists: ${workId}`
        : 'No duplicate work.id in canonical backlog.',
    ),
    buildCheck(
      'confidence_gate',
      allowLowConfidence || proposal.codeGapDraft?.confidence !== 'low',
      allowLowConfidence || proposal.codeGapDraft?.confidence !== 'low'
        ? 'Confidence gate passed.'
        : 'Low-confidence suggestions require explicit operator review before candidacy.',
    ),
  ];

  const failedChecks = checks.filter((check) => !check.passed);

  return {
    schema: DRAFT_INTAKE_PROMOTION_EVAL_SCHEMA,
    eligible: failedChecks.length === 0,
    status: failedChecks.length === 0 ? 'candidate' : 'rejected',
    workId: workId || null,
    failedCheckIds: failedChecks.map((check) => check.id),
    checks,
    promotionProtocol: 'protocols/workgraph-draft-intake.bvc',
    reviewRequired: true,
  };
}

export function evaluateDraftIntakePromotionFromDraft(draft, options = {}) {
  const validationErrors = validateStepAtomDraft(draft);
  const proposal = {
    ok: validationErrors.length === 0,
    validationErrors,
    codeGapDraft: {
      suggestedWorkId: draft.labels?.['work.id'] ?? '',
      confidence: options.confidence ?? 'medium',
      targetFiles: String(draft.labels?.['work.target_files'] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      draft,
    },
  };

  return evaluateDraftIntakePromotion(proposal, options);
}

/**
 * @param {Array<{ proposal: object, suggestion?: object }>} entries
 */
export function partitionDraftIntakeCandidates(entries, options = {}) {
  const candidates = [];
  const rejected = [];

  for (const entry of entries) {
    const evaluation = evaluateDraftIntakePromotion(entry.proposal, options);
    const row = {
      workId: evaluation.workId,
      evaluation,
      proposal: entry.proposal,
      suggestion: entry.suggestion ?? null,
    };

    if (evaluation.eligible) {
      candidates.push(row);
    } else {
      rejected.push(row);
    }
  }

  return {
    schema: DRAFT_INTAKE_CANDIDATE_LIST_SCHEMA,
    candidateCount: candidates.length,
    rejectedCount: rejected.length,
    candidates,
    rejected,
    promotionProtocol: 'protocols/workgraph-draft-intake.bvc',
    rules: DRAFT_INTAKE_PROMOTION_RULES.map((rule) => rule.id),
  };
}
