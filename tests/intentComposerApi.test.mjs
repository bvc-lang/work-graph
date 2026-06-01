import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildIntentComposerProposal,
  buildIntentDraftFromMessage,
  executeIntentComposerApply,
  executeIntentComposerProposal,
  INTENT_COMPOSER_PROPOSAL_SCHEMA,
} from '../src/intentComposerApi.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const EMPTY_BACKLOG = '#Charter<[\nБазис:\n  Seed.\n]>\n';

describe('buildIntentDraftFromMessage', () => {
  it('builds a reviewable work item draft', () => {
    const draft = buildIntentDraftFromMessage('Добавить вкладку памяти');

    assert.equal(draft.schema, 'intent-composer.draft.v1');
    assert.match(draft.suggestedWorkId, /^intent-/u);
    assert.equal(draft.draft.profile, 'work_item');
    assert.equal(draft.draft.labels['intake.source_kind'], 'intent-composer');
    assert.equal(draft.reviewRequired, true);
  });
});

describe('buildIntentComposerProposal', () => {
  it('returns proposal schema for valid message', () => {
    const proposal = buildIntentComposerProposal({ message: 'Сделать API для замысла' });

    assert.equal(proposal.schema, INTENT_COMPOSER_PROPOSAL_SCHEMA);
    assert.equal(proposal.ok, true);
    assert.match(proposal.formattedAtom, /#Задача_/u);
    assert.equal(proposal.distinctFromAgentRun, true);
  });

  it('rejects empty message', () => {
    const proposal = buildIntentComposerProposal({ message: '   ' });

    assert.equal(proposal.ok, false);
    assert.equal(proposal.error, 'message_required');
  });
});

describe('executeIntentComposerApply', () => {
  it('appends a new work item atom to temp backlog', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-intent-composer-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await writeFile(backlogPath, EMPTY_BACKLOG, 'utf8');

    const proposal = await executeIntentComposerProposal({
      body: { message: 'Добавить smoke test для intent composer' },
    });
    assert.equal(proposal.ok, true);

    const applyResult = await executeIntentComposerApply({
      cwd,
      backlogPath: 'backlog.bvc',
      body: { proposal },
    });

    assert.equal(applyResult.ok, true);
    assert.ok(applyResult.workId);

    const backlogText = await readFile(backlogPath, 'utf8');
    const items = parseWorkItems(backlogText);
    assert.ok(items.some((item) => item.id === applyResult.workId));

    await rm(cwd, { recursive: true, force: true });
  });

  it('returns duplicate conflict without writing backlog', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-intent-composer-dup-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await writeFile(backlogPath, EMPTY_BACKLOG, 'utf8');

    const proposal = buildIntentComposerProposal({
      message: 'Повторяющийся work id',
      workId: 'intent-dup-test',
    });
    assert.equal(proposal.ok, true);

    const first = await executeIntentComposerApply({
      cwd,
      backlogPath: 'backlog.bvc',
      body: { proposal },
    });
    assert.equal(first.ok, true);

    const second = await executeIntentComposerApply({
      cwd,
      backlogPath: 'backlog.bvc',
      body: { proposal },
    });
    assert.equal(second.ok, false);
    assert.equal(second.error, 'duplicate_work_id');

    await rm(cwd, { recursive: true, force: true });
  });
});
