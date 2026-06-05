import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  DEFAULT_MEMORY_RECORDS_LIMIT,
  MEMORY_RECORDS_API_SCHEMA,
  assignMemoryRecordKeys,
  buildMemoryRecordsApiResponse,
  filterMemoryRecords,
  loadMergedMemoryRecords,
} from '../src/memoryPanelProjection.mjs';
import { appendMemoryRecordJournal, buildMemoryRecordFromWorkItem } from '../src/memoryRecordWriter.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_ITEMS = parseWorkItems(`#Задача_done_task<[
Базис:
  Done task.
Вектор:
  Done vector.
Цель:
  Done goal.

Свидетельства:
  - npm test passed

Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
  trace.status: verified
]>

#Задача_other_done<[
Базис:
  Other done.
Вектор:
  Other vector.
Цель:
  Other goal.

Метки:
  atom.profile: work_item
  work.id: other-done
  work.title: Other Done
  work.status: done
  trace.status: verified
]>
`);

describe('assignMemoryRecordKeys', () => {
  it('assigns stable MEM keys by updatedAt then id', () => {
    const records = [
      { id: 'mem-b', updatedAt: '2026-06-02T00:00:00.000Z' },
      { id: 'mem-a', updatedAt: '2026-06-01T00:00:00.000Z' },
    ];

    const keyed = assignMemoryRecordKeys(records);
    assert.deepEqual(
      keyed.map((record) => ({ id: record.id, key: record.key })),
      [
        { id: 'mem-b', key: 'MEM-2' },
        { id: 'mem-a', key: 'MEM-1' },
      ],
    );
  });

  it('preserves explicit record.key when present', () => {
    const keyed = assignMemoryRecordKeys([
      { id: 'mem-a', key: 'MEM-CUSTOM', updatedAt: '2026-06-01T00:00:00.000Z' },
    ]);
    assert.equal(keyed[0].key, 'MEM-CUSTOM');
  });
});

describe('filterMemoryRecords', () => {
  it('filters by workId and applies limit', () => {
    const records = [
      { id: 'mem-1', sourceWorkItem: 'done-task', summary: 'A' },
      { id: 'mem-2', sourceWorkItem: 'other-done', summary: 'B' },
      { id: 'mem-3', sourceWorkItem: 'done-task', summary: 'C' },
    ];

    const filtered = filterMemoryRecords(records, { workId: 'done-task', limit: 1 });
    assert.equal(filtered.records.length, 1);
    assert.equal(filtered.truncated, true);
    assert.equal(filtered.workId, 'done-task');
  });
});

describe('buildMemoryRecordsApiResponse', () => {
  it('returns bounded records for workId filter', async () => {
    const payload = await buildMemoryRecordsApiResponse({
      items: SAMPLE_ITEMS,
      includeJournal: false,
      workId: 'done-task',
      limit: 5,
    });

    assert.equal(payload.schema, MEMORY_RECORDS_API_SCHEMA);
    assert.ok(payload.count >= 1);
    assert.ok(payload.records.every((record) => record.sourceWorkItem === 'done-task'));
    assert.ok(payload.records.every((record) => /^MEM-\d+$/.test(record.key)));
    assert.equal(payload.limit, 5);
  });

  it('merges journal records when present on disk', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'memory-records-api-'));
    const journalPath = 'memory-records.jsonl';

    try {
      const record = buildMemoryRecordFromWorkItem({
        id: 'done-task',
        status: 'done',
        title: 'Done Task',
        goal: 'Journal goal',
        targetFiles: [],
        evidence: ['journal evidence'],
      }, { status: 'active', reviewRequired: false });

      await appendMemoryRecordJournal([record], journalPath, {
        cwd: tempDir,
        transition: {
          kind: 'work-item-status',
          sourceWorkItem: 'done-task',
          fromStatus: 'verify',
          toStatus: 'done',
        },
      });

      const payload = await buildMemoryRecordsApiResponse({
        cwd: tempDir,
        items: SAMPLE_ITEMS,
        journalPath,
        workId: 'done-task',
        limit: DEFAULT_MEMORY_RECORDS_LIMIT,
      });

      assert.ok(payload.records.some((entry) => entry.summary === 'Journal goal'));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('loadMergedMemoryRecords', () => {
  it('returns derived candidates without journal when includeJournal=false', async () => {
    const records = await loadMergedMemoryRecords({
      items: SAMPLE_ITEMS,
      includeJournal: false,
    });

    assert.ok(records.length >= 2);
  });
});
