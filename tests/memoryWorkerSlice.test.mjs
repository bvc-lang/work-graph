import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { buildWorkerInputFromTask } from '../src/agentWorkerLocalRunner.mjs';
import { buildWorkerPromptFromInput } from '../src/agentWorkerOpenAiProvider.mjs';
import {
  MEMORY_WORKER_SLICE_SCHEMA,
  buildMemoryWorkerSliceForTask,
  buildMemoryWorkerSliceForTaskWithJournal,
  formatMemoryWorkerSliceForPrompt,
  selectMemoryRecordsForTask,
} from '../src/memoryWorkerSlice.mjs';
import { appendMemoryRecordJournal, buildMemoryRecordFromWorkItem } from '../src/memoryRecordWriter.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_ITEMS = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace basis.
Вектор:
  Link runtime.
Цель:
  Ship trace scope.

Свидетельства:
  - npm test graph slice passed

Метки:
  atom.profile: work_item
  work.id: trace-task
  work.title: Trace task
  work.status: ready
  work.target_files: src/runtime.mjs
  work.depends_on: base-task
  trace.status: linked
]>

#Задача_base_task<[
Базис:
  Base basis.
Вектор:
  Base vector.
Цель:
  Base goal.

Свидетельства:
  - decision: keep dependency chain deterministic

Метки:
  atom.profile: work_item
  work.id: base-task
  work.title: Base task
  work.status: done
  work.target_files: src/base.mjs
  work.owner_role: engineer
]>
`);

describe('selectMemoryRecordsForTask', () => {
  it('selects records linked to task, dependencies and target file overlap', () => {
    const selection = selectMemoryRecordsForTask(SAMPLE_ITEMS, 'trace-task');

    assert.ok(selection.records.length >= 1);
    assert.ok(selection.records.some((record) => record.sourceWorkItem === 'base-task'));
  });

  it('applies type priority and char budget', () => {
    const records = [
      {
        id: 'mem:a:evidence-summary:low',
        type: 'evidence-summary',
        summary: 'low priority summary',
        status: 'draft',
        confidence: 'low',
        sourceWorkItem: 'base-task',
        relatedFiles: [],
        relatedTasks: ['trace-task'],
        reviewRequired: true,
      },
      {
        id: 'mem:a:decision:high',
        type: 'decision',
        summary: 'high priority decision',
        status: 'active',
        confidence: 'high',
        sourceWorkItem: 'base-task',
        relatedFiles: [],
        relatedTasks: ['trace-task'],
        reviewRequired: false,
      },
    ];

    const selection = selectMemoryRecordsForTask(SAMPLE_ITEMS, 'trace-task', {
      memoryRecords: records,
      maxRecords: 1,
    });

    assert.equal(selection.records.length, 1);
    assert.equal(selection.records[0].type, 'decision');
    assert.equal(selection.truncated, true);
  });
});

describe('buildMemoryWorkerSliceForTask', () => {
  it('builds bounded worker slice entry', () => {
    const slice = buildMemoryWorkerSliceForTask(SAMPLE_ITEMS, 'trace-task', { maxRecords: 8 });

    assert.equal(slice.schema, MEMORY_WORKER_SLICE_SCHEMA);
    assert.equal(slice.taskId, 'trace-task');
    assert.ok(slice.recordCount >= 1);
    assert.match(formatMemoryWorkerSliceForPrompt(slice), /Project memory slice/);
    assert.match(formatMemoryWorkerSliceForPrompt(slice), /base-task/);
  });

  it('wires into worker input alongside graph rag context', () => {
    const task = SAMPLE_ITEMS.find((item) => item.id === 'trace-task');
    const input = buildWorkerInputFromTask(task, {
      runId: 'run-memory',
      workGraphItems: SAMPLE_ITEMS,
      graphRag: { maxNodes: 16 },
    });

    assert.equal(input.memorySlice.length, 2);
    assert.equal(input.memorySlice[0].schema, MEMORY_WORKER_SLICE_SCHEMA);
    assert.equal(input.memorySlice[1].schema, 'pvrg.graph_rag.context.v1');

    const prompt = buildWorkerPromptFromInput(input);
    assert.match(prompt.messages[1].content, /Project memory slice/);
    assert.match(prompt.messages[1].content, /Graph RAG context/);
  });

  it('prefers journal records over derived candidates', async () => {
    const derivedRecord = buildMemoryRecordFromWorkItem({
      id: 'base-task',
      status: 'done',
      title: 'Base task',
      goal: 'Base goal',
      targetFiles: ['src/base.mjs'],
      evidence: ['legacy evidence'],
    });

    const journalRecord = {
      ...derivedRecord,
      summary: 'Journal override summary',
      status: 'active',
    };

    const selection = selectMemoryRecordsForTask(SAMPLE_ITEMS, 'trace-task', {
      journalRecords: [journalRecord],
    });

    assert.ok(selection.records.some((record) => record.summary === 'Journal override summary'));
    assert.ok(selection.records.some((record) => record.status === 'active'));
  });

  it('loads journal from disk when journalPath is provided', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'memory-worker-journal-'));
    const journalPath = 'memory-records.jsonl';

    try {
      const record = buildMemoryRecordFromWorkItem({
        id: 'base-task',
        status: 'done',
        title: 'Base task',
        goal: 'Journal loaded goal',
        targetFiles: ['src/base.mjs'],
        evidence: ['journal evidence'],
      }, { status: 'active', reviewRequired: false });

      await appendMemoryRecordJournal([record], journalPath, {
        cwd: tempDir,
        transition: {
          kind: 'work-item-status',
          sourceWorkItem: 'base-task',
          fromStatus: 'verify',
          toStatus: 'done',
        },
      });

      const slice = await buildMemoryWorkerSliceForTaskWithJournal(SAMPLE_ITEMS, 'trace-task', {
        cwd: tempDir,
        journalPath,
      });

      assert.ok(slice.sourceInputs.includes('memory-record.journal.v1'));
      assert.ok(slice.records.some((entry) => entry.summary === 'Journal loaded goal'));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
