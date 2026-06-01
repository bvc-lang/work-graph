import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  applyAtomInspectorProposalToBacklogFile,
  buildAtomInspectorProposal,
  importStepAtomDraftForWorkItem,
  replaceWorkItemAtomInBacklogText,
} from '../src/atomInspector.mjs';
import {
  executeAtomInspectorApply,
  executeAtomInspectorProposal,
  readAtomInspectorDraftResponse,
} from '../src/atomInspectorApi.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_BACKLOG = `#Задача_edit_me<[
Базис:
  Original basis.
Вектор:
  Original vector.
Цель:
  Original goal.

Метки:
  atom.profile: work_item
  work.id: edit-me
  work.title: Edit Me
  work.status: backlog
  work.owner_role: engineer
  work.priority: high
]>
`;

describe('importStepAtomDraftForWorkItem', () => {
  it('imports a work item atom as StepAtomDraft', () => {
    const imported = importStepAtomDraftForWorkItem(SAMPLE_BACKLOG, 'edit-me');

    assert.equal(imported.draft.profile, 'work_item');
    assert.equal(imported.draft.labels['work.id'], 'edit-me');
    assert.equal(imported.validationErrors.length, 0);
    assert.deepEqual(imported.draft.basis, ['Original basis.']);
  });
});

describe('buildAtomInspectorProposal', () => {
  it('returns generated step for valid draft', () => {
    const imported = importStepAtomDraftForWorkItem(SAMPLE_BACKLOG, 'edit-me');
    const proposal = buildAtomInspectorProposal(imported.draft);

    assert.equal(proposal.ok, true);
    assert.match(proposal.generatedStep, /Original basis\./u);
    assert.equal(proposal.validationErrors.length, 0);
  });

  it('blocks invalid draft without generated step', () => {
    const proposal = buildAtomInspectorProposal({
      profile: 'work_item',
      name: 'bad name',
      basis: [],
      vector: ['ok'],
      goal: ['ok'],
      labels: { 'work.id': 'x' },
    });

    assert.equal(proposal.ok, false);
    assert.equal(proposal.generatedStep, null);
    assert.ok(proposal.validationErrors.length > 0);
  });
});

describe('applyAtomInspectorProposalToBacklogFile', () => {
  it('replaces atom block through validator and formatter', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-atom-inspector-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const imported = importStepAtomDraftForWorkItem(SAMPLE_BACKLOG, 'edit-me');
      const draft = {
        ...imported.draft,
        basis: ['Updated basis.'],
        labels: {
          ...imported.draft.labels,
          'work.status': 'ready',
        },
      };

      const result = await applyAtomInspectorProposalToBacklogFile({
        workId: 'edit-me',
        draft,
        backlogPath,
        backlogText: SAMPLE_BACKLOG,
      });

      assert.equal(result.ok, true);
      assert.equal(result.persistedBacklog, true);

      const after = await readFile(backlogPath, 'utf8');
      assert.match(after, /Updated basis\./u);
      assert.match(after, /work\.status: ready/u);

      const items = parseWorkItems(after);
      assert.equal(items.find((item) => item.id === 'edit-me')?.status, 'ready');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('atomInspector API', () => {
  it('reads draft and applies proposal through server helpers', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-atom-inspector-api-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const draftResponse = await readAtomInspectorDraftResponse({
        cwd,
        backlogPath: 'backlog.bvc',
        workId: 'edit-me',
      });

      assert.equal(draftResponse.schema, 'atom-inspector.draft.v1');
      assert.equal(draftResponse.draft.labels['work.id'], 'edit-me');

      const proposal = await executeAtomInspectorProposal({
        cwd,
        backlogPath: 'backlog.bvc',
        body: {
          workId: 'edit-me',
          draft: {
            ...draftResponse.draft,
            vector: ['Edited vector.'],
          },
        },
      });

      assert.equal(proposal.ok, true);
      assert.match(proposal.generatedStep, /Edited vector\./u);

      const applyResult = await executeAtomInspectorApply({
        cwd,
        backlogPath: 'backlog.bvc',
        body: {
          workId: 'edit-me',
          draft: proposal.draft,
        },
      });

      assert.equal(applyResult.ok, true);
      assert.equal(applyResult.persistedBacklog, true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('rejects apply when work.id mismatches request', async () => {
    const imported = importStepAtomDraftForWorkItem(SAMPLE_BACKLOG, 'edit-me');
    const result = await applyAtomInspectorProposalToBacklogFile({
      workId: 'other-id',
      draft: imported.draft,
      backlogPath: join(tmpdir(), 'unused.backlog.bvc'),
      backlogText: SAMPLE_BACKLOG,
      persistBacklog: false,
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'work_id_mismatch');
  });
});

describe('replaceWorkItemAtomInBacklogText', () => {
  it('replaces only the targeted atom', () => {
    const backlog = `${SAMPLE_BACKLOG}\n#Задача_other<[\nМетки:\n  atom.profile: work_item\n  work.id: other\n  work.title: Other\n  work.status: backlog\n]>\n`;
    const imported = importStepAtomDraftForWorkItem(backlog, 'edit-me');
    const proposal = buildAtomInspectorProposal({
      ...imported.draft,
      goal: ['New goal.'],
    });
    const next = replaceWorkItemAtomInBacklogText(backlog, 'edit-me', proposal.generatedStep);

    assert.match(next, /New goal\./u);
    assert.match(next, /work\.id: other/u);
    assert.doesNotMatch(next, /Original goal\./u);
  });
});
