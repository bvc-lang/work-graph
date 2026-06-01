import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { buildEvidenceReadModelFromItems } from '../src/evidenceReadModel.mjs';
import { readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';
import {
  appendMemoryRecordJournal,
  buildMemoryRecordCandidatesFromItems,
  buildMemoryRecordFromWorkItem,
  mergeMemoryJournalWithCandidates,
  readMemoryRecordJournal,
  validateMemoryJournalTransition,
} from '../src/memoryRecordWriter.mjs';

describe('buildMemoryRecordFromWorkItem', () => {
  it('maps done work item fields to memory-record.v1', () => {
    const record = buildMemoryRecordFromWorkItem({
      id: 'done-task',
      title: 'Done task',
      status: 'done',
      goal: 'Ship feature',
      basis: 'Need feature',
      vector: 'Implement',
      targetFiles: ['src/runtime.mjs'],
      dependsOn: ['base-task'],
      evidence: ['npm test passed'],
    });

    assert.equal(record.schema, 'memory-record.v1');
    assert.equal(record.sourceWorkItem, 'done-task');
    assert.equal(record.status, 'draft');
    assert.deepEqual(record.relatedFiles, ['src/runtime.mjs']);
    assert.equal(record.evidenceIds[0], 'done-task:legacy-evidence:1');
  });
});

describe('buildMemoryRecordCandidatesFromItems', () => {
  it('dedupes candidates from done tasks only', () => {
    const candidates = buildMemoryRecordCandidatesFromItems([
      { id: 'a', status: 'done', title: 'A', goal: 'Goal A', evidence: ['evidence'] },
      { id: 'b', status: 'ready', title: 'B', goal: 'Goal B', evidence: [] },
      { id: 'c', status: 'done', title: 'C', goal: 'Goal C', evidence: ['evidence'] },
    ]);

    assert.equal(candidates.count, 2);
    assert.ok(candidates.records.every((record) => record.reviewRequired));
  });

  it('builds candidates from current intent tree done items', async () => {
    const items = await readWorkItemsFromIntentTree();
    const candidates = buildMemoryRecordCandidatesFromItems(items);
    assert.ok(candidates.count > 0);
  });
});

describe('buildEvidenceReadModelFromItems', () => {
  it('projects legacy evidence strings into evidence-record.v1', () => {
    const model = buildEvidenceReadModelFromItems([
      {
        id: 'task-a',
        evidence: ['npm test passed', 'worker dry-run succeeded'],
      },
    ]);

    assert.equal(model.schema, 'evidence.read-model.v1');
    assert.equal(model.count, 2);
    assert.equal(model.records[0].type, 'test');
    assert.equal(model.records[1].type, 'worker-run');
    assert.equal(model.compatibility.legacyStringEvidence, true);
  });
});

describe('memory record journal persist', () => {
  it('blocks append without policy-gated done/verified transition', async () => {
    const record = buildMemoryRecordFromWorkItem({
      id: 'task-a',
      status: 'done',
      title: 'Task A',
      goal: 'Goal A',
      evidence: ['evidence'],
    });

    await assert.rejects(
      () => appendMemoryRecordJournal([record], 'memory-records.jsonl', {
        cwd: tmpdir(),
        transition: {
          kind: 'work-item-status',
          sourceWorkItem: 'task-a',
          fromStatus: 'in-progress',
          toStatus: 'ready',
        },
      }),
      /done or verified/,
    );
  });

  it('appends and reads journal entries from temp dir', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'memory-journal-'));
    const journalPath = 'memory-records.jsonl';

    try {
      const record = buildMemoryRecordFromWorkItem({
        id: 'task-a',
        status: 'done',
        title: 'Task A',
        goal: 'Goal A',
        evidence: ['evidence'],
      }, { status: 'active', reviewRequired: false });

      const appendResult = await appendMemoryRecordJournal([record], journalPath, {
        cwd: tempDir,
        transition: {
          kind: 'work-item-status',
          sourceWorkItem: 'task-a',
          fromStatus: 'verify',
          toStatus: 'done',
        },
      });

      assert.equal(appendResult.appended, 1);
      assert.equal(appendResult.entries[0].schema, 'memory-record.journal.v1');

      const fileText = await readFile(join(tempDir, journalPath), 'utf8');
      assert.match(fileText, /memory-record\.journal\.v1/);

      const readResult = await readMemoryRecordJournal({ cwd: tempDir, journalPath });
      assert.equal(readResult.entryCount, 1);
      assert.equal(readResult.records.length, 1);
      assert.equal(readResult.records[0].status, 'active');
      assert.equal(readResult.records[0].sourceWorkItem, 'task-a');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('merges journal records over derived candidates by id', () => {
    const derived = buildMemoryRecordCandidatesFromItems([
      { id: 'task-a', status: 'done', title: 'Task A', goal: 'Goal A', evidence: [] },
    ]).records;

    const journalRecord = {
      ...derived[0],
      summary: 'Updated from journal',
      status: 'active',
    };

    const merged = mergeMemoryJournalWithCandidates(derived, [journalRecord]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].summary, 'Updated from journal');
    assert.equal(merged[0].status, 'active');
  });

  it('validates transition contract', () => {
    assert.throws(
      () => validateMemoryJournalTransition({ kind: 'chat', sourceWorkItem: 'x', toStatus: 'done' }),
      /unsupported memory journal transition kind/,
    );
  });
});
