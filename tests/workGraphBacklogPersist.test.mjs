import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  findWorkItemAtomSpan,
  patchWorkItemAtomBody,
  patchWorkItemInBacklogText,
} from '../src/workGraphBacklogPersist.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_BACKLOG = `#Задача_ready_task<[
Базис:
  Ready task.
Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
]>
`;

describe('workGraphBacklogPersist', () => {
  it('finds work item atom by work.id', () => {
    const span = findWorkItemAtomSpan(SAMPLE_BACKLOG, 'ready-task');
    assert.ok(span);
    assert.match(span.atomName, /ready_task/u);
    assert.match(span.body, /work\.status: ready/u);
  });

  it('patches status, blocker, closed_at and evidence in atom body', () => {
    const patched = patchWorkItemAtomBody(SAMPLE_BACKLOG.match(/<\[([\s\S]*)\n\]>/u)[1], {
      id: 'ready-task',
      status: 'done',
      closedAt: '2026-06-04T12:00:00.000Z',
      labels: { 'work.closed_at': '2026-06-04T12:00:00.000Z' },
      evidence: ['worker-run runId=abc status=failed'],
    });

    assert.match(patched, /work\.status: done/u);
    assert.match(patched, /work\.closed_at: 2026-06-04T12:00:00.000Z/u);
    assert.match(patched, /Свидетельства:/u);
    assert.match(patched, /worker-run runId=abc status=failed/u);
  });

  it('patches status, blocker and evidence in atom body', () => {
    const patched = patchWorkItemAtomBody(SAMPLE_BACKLOG.match(/<\[([\s\S]*)\n\]>/u)[1], {
      id: 'ready-task',
      status: 'blocked',
      blocker: 'worker failed',
      evidence: ['worker-run runId=abc status=failed'],
    });

    assert.match(patched, /work\.status: blocked/u);
    assert.match(patched, /work\.blocker: worker failed/u);
    assert.match(patched, /Свидетельства:/u);
    assert.match(patched, /worker-run runId=abc status=failed/u);
  });

  it('patches one work item in backlog text without touching others', () => {
    const backlog = `${SAMPLE_BACKLOG}

#Задача_other_task<[
Метки:
  atom.profile: work_item
  work.id: other-task
  work.title: Other Task
  work.status: ready
]>`;

    const patched = patchWorkItemInBacklogText(backlog, {
      id: 'ready-task',
      status: 'verify',
      blocker: '',
      evidence: ['worker-run runId=live-loop-ready-task status=succeeded'],
    });

    const items = parseWorkItems(patched);
    assert.equal(items.find((item) => item.id === 'ready-task')?.status, 'verify');
    assert.equal(items.find((item) => item.id === 'other-task')?.status, 'ready');
    assert.match(patched, /worker-run runId=live-loop-ready-task status=succeeded/u);
  });
});
