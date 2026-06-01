import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { mapGapEntryToWorkItemDraft } from '../src/codeGapBacklogFeeder.mjs';
import {
  buildCodeGapDraftProposal,
  buildWorkItemDraftFromCodeGapSuggestion,
  executeCodeGapDraftApply,
  executeCodeGapDraftProposal,
  CODE_GAP_DRAFT_PROPOSAL_SCHEMA,
} from '../src/codeGapDraftIntakeApi.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const FIXTURE_ENTRY = {
  kind: 'untracked_export',
  filePath: 'src/runtime.mjs',
  symbol: 'parseWorkItems',
  reason: 'export without step coverage',
};

const EMPTY_BACKLOG = '#Charter<[\nБазис:\n  Seed.\n]>\n';

describe('buildWorkItemDraftFromCodeGapSuggestion', () => {
  it('maps suggestion to StepAtomDraft with code-gap provenance labels', () => {
    const suggestion = mapGapEntryToWorkItemDraft(FIXTURE_ENTRY);
    const intakeDraft = buildWorkItemDraftFromCodeGapSuggestion(suggestion, {
      sourceReportPath: 'tests/fixtures/code-gap-report.v1.json',
    });

    assert.equal(intakeDraft.schema, 'code-gap.draft-intake.draft.v1');
    assert.equal(intakeDraft.draft.labels['intake.source_kind'], 'code-gap-analyzer');
    assert.equal(intakeDraft.draft.labels['intake.review_status'], 'pending');
    assert.match(intakeDraft.draft.labels['work.target_files'], /src\/runtime\.mjs/);
  });
});

describe('buildCodeGapDraftProposal', () => {
  it('returns validated proposal for fixture suggestion', () => {
    const suggestion = mapGapEntryToWorkItemDraft(FIXTURE_ENTRY);
    const proposal = buildCodeGapDraftProposal({ suggestion });

    assert.equal(proposal.schema, CODE_GAP_DRAFT_PROPOSAL_SCHEMA);
    assert.equal(proposal.ok, true);
    assert.match(proposal.formattedAtom, /intake\.source_kind: code-gap-analyzer/u);
    assert.equal(proposal.promotionProtocol, 'protocols/workgraph-draft-intake.bvc');
    assert.equal(proposal.promotionEvaluation.status, 'candidate');
  });

  it('rejects missing suggestion without mutating backlog', () => {
    const proposal = buildCodeGapDraftProposal({});

    assert.equal(proposal.ok, false);
    assert.equal(proposal.error, 'suggestion_required');
  });
});

describe('executeCodeGapDraftApply', () => {
  it('appends promoted work item to temp backlog with approved intake labels', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-code-gap-intake-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await writeFile(backlogPath, EMPTY_BACKLOG, 'utf8');

    const suggestion = mapGapEntryToWorkItemDraft(FIXTURE_ENTRY, { idPrefix: 'gap-test' });
    const proposal = await executeCodeGapDraftProposal({ body: { suggestion } });
    assert.equal(proposal.ok, true);

    const applyResult = await executeCodeGapDraftApply({
      cwd,
      backlogPath: 'backlog.bvc',
      body: { proposal },
    });

    assert.equal(applyResult.ok, true);
    assert.equal(applyResult.intakeSourceKind, 'code-gap-analyzer');

    const backlogText = await readFile(backlogPath, 'utf8');
    assert.match(backlogText, /intake\.review_status: approved/u);
    assert.match(backlogText, /intake\.source_kind: code-gap-analyzer/u);

    const items = parseWorkItems(backlogText);
    assert.ok(items.some((item) => item.id === applyResult.workId));

    await rm(cwd, { recursive: true, force: true });
  });

  it('blocks duplicate work.id without second write', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-code-gap-intake-dup-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await writeFile(backlogPath, EMPTY_BACKLOG, 'utf8');

    const suggestion = mapGapEntryToWorkItemDraft(FIXTURE_ENTRY, { idPrefix: 'gap-dup' });
    const proposal = buildCodeGapDraftProposal({ suggestion });
    assert.equal(proposal.ok, true);

    const first = await executeCodeGapDraftApply({
      cwd,
      backlogPath: 'backlog.bvc',
      body: { proposal },
    });
    assert.equal(first.ok, true);

    const second = await executeCodeGapDraftApply({
      cwd,
      backlogPath: 'backlog.bvc',
      body: { proposal },
    });
    assert.equal(second.ok, false);
    assert.equal(second.error, 'duplicate_work_id');

    const backlogText = await readFile(backlogPath, 'utf8');
    const items = parseWorkItems(backlogText);
    assert.equal(items.filter((item) => item.id === first.workId).length, 1);

    await rm(cwd, { recursive: true, force: true });
  });
});
