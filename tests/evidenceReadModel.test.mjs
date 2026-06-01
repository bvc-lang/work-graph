import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEvidenceReadModelForTask,
  buildEvidenceTimelineForTask,
} from '../src/evidenceReadModel.mjs';
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
  - decision: keep timeline deterministic

Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
  trace.status: verified
]>
`);

describe('buildEvidenceTimelineForTask', () => {
  it('sorts legacy evidence before timed worker transitions', () => {
    const timeline = buildEvidenceTimelineForTask(SAMPLE_ITEMS, 'done-task', {
      workerRuns: [
        {
          runId: 'run-1',
          taskId: 'done-task',
          status: 'succeeded',
          appliedTransition: 'verify',
          recordedAt: '2026-05-29T12:00:00.000Z',
        },
      ],
    });

    assert.equal(timeline.schema, 'evidence.timeline.v1');
    assert.equal(timeline.count, 3);
    assert.equal(timeline.events[0].kind, 'evidence');
    assert.equal(timeline.events.at(-1).kind, 'transition');
    assert.match(timeline.events.at(-1).summary, /verify/u);
  });

  it('returns empty timeline for unknown task', () => {
    const timeline = buildEvidenceTimelineForTask(SAMPLE_ITEMS, 'missing-task');
    assert.equal(timeline.count, 0);
    assert.deepEqual(timeline.events, []);
  });
});

describe('buildEvidenceReadModelForTask', () => {
  it('keeps compatibility with legacy evidence strings', () => {
    const model = buildEvidenceReadModelForTask(SAMPLE_ITEMS, 'done-task');
    assert.equal(model.count, 2);
    assert.ok(model.records.some((record) => record.type === 'test'));
  });
});
