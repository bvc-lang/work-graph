import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapGapEntryToWorkItemDraft } from '../src/codeGapBacklogFeeder.mjs';
import {
  buildCodeGapBacklogCandidateList,
  buildCodeGapDraftProposal,
} from '../src/codeGapDraftIntakeApi.mjs';
import { buildCodeGapOperatorProjection } from '../src/codeGapOperatorProjection.mjs';
import {
  DRAFT_INTAKE_PROMOTION_EVAL_SCHEMA,
  evaluateDraftIntakePromotion,
} from '../src/draftIntakePromotionRules.mjs';

const FIXTURE_ENTRY = {
  kind: 'untracked_export',
  filePath: 'src/runtime.mjs',
  symbol: 'parseWorkItems',
  reason: 'export without step coverage',
};

describe('evaluateDraftIntakePromotion', () => {
  it('marks validated code-gap proposal as backlog candidate', () => {
    const suggestion = mapGapEntryToWorkItemDraft(FIXTURE_ENTRY, { idPrefix: 'gap-rules' });
    const proposal = buildCodeGapDraftProposal({ suggestion });

    assert.equal(proposal.ok, true);
    assert.equal(proposal.promotionEvaluation.schema, DRAFT_INTAKE_PROMOTION_EVAL_SCHEMA);
    assert.equal(proposal.promotionEvaluation.status, 'candidate');
    assert.equal(proposal.promotionEvaluation.eligible, true);
    assert.equal(proposal.promotionEvaluation.workId, proposal.codeGapDraft.suggestedWorkId);
  });

  it('rejects proposal when work.id already exists in backlog', () => {
    const suggestion = mapGapEntryToWorkItemDraft(FIXTURE_ENTRY, { idPrefix: 'gap-dup' });
    const proposal = buildCodeGapDraftProposal({ suggestion }, {
      existingWorkIds: [proposalWorkId(suggestion)],
    });

    assert.equal(proposal.promotionEvaluation.status, 'rejected');
    assert.ok(proposal.promotionEvaluation.failedCheckIds.includes('duplicate_work_id'));
  });

  it('rejects missing suggestion without candidacy', () => {
    const proposal = buildCodeGapDraftProposal({});

    assert.equal(proposal.ok, false);
    assert.equal(proposal.promotionEvaluation.status, 'rejected');
    assert.ok(proposal.promotionEvaluation.failedCheckIds.includes('proposal_validation'));
  });

  it('rejects low-confidence suggestions by default', () => {
    const suggestion = {
      ...mapGapEntryToWorkItemDraft({ kind: 'orphaned_tur', filePath: 'src/foo.mjs' }, { idPrefix: 'gap-low' }),
      confidence: 'low',
    };
    const proposal = buildCodeGapDraftProposal({ suggestion });

    assert.equal(proposal.promotionEvaluation.status, 'rejected');
    assert.ok(proposal.promotionEvaluation.failedCheckIds.includes('confidence_gate'));
  });
});

describe('buildCodeGapBacklogCandidateList', () => {
  it('partitions fixture feed into candidates and rejected rows', async () => {
    const projection = await buildCodeGapOperatorProjection({
      reportPath: 'tests/fixtures/code-gap-report.v1.json',
    });

    assert.ok(projection.promotionCandidates);
    assert.equal(projection.promotionCandidates.schema, 'workgraph.draft-intake.candidate-list.v1');
    assert.ok(projection.promotionCandidates.candidateCount >= 1);
    assert.equal(
      projection.promotionCandidates.candidateCount + projection.promotionCandidates.rejectedCount,
      projection.suggestions.length,
    );

    const list = buildCodeGapBacklogCandidateList(projection);
    assert.equal(list.candidateCount, projection.promotionCandidates.candidateCount);
    assert.ok(list.candidates.every((row) => row.evaluation.status === 'candidate'));
  });
});

function proposalWorkId(suggestion) {
  const proposal = buildCodeGapDraftProposal({ suggestion });
  return proposal.codeGapDraft.suggestedWorkId;
}

describe('evaluateDraftIntakePromotion direct', () => {
  it('exposes per-check diagnostics for operator review', () => {
    const evaluation = evaluateDraftIntakePromotion({
      ok: false,
      validationErrors: ['missing basis'],
      codeGapDraft: null,
    });

    assert.equal(evaluation.eligible, false);
    assert.ok(evaluation.checks.length >= 5);
    assert.ok(evaluation.checks.every((check) => typeof check.passed === 'boolean'));
  });
});
