import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWorkerInputFromTask,
  createWorkerInputFromBacklogText,
  runLocalWorker,
} from '../src/agentWorkerLocalRunner.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_BACKLOG = `#Задача_done_task<[
Базис:
  Done task.
Вектор:
  Finish dependency.
Цель:
  Dependency done.
Свидетельства:
  Dependency evidence.

Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
  trace.status: verified
]>

#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Run local worker.
Цель:
  Produce output.

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.depends_on: done-task
  work.target_files: src/agentWorkerLocalRunner.mjs, tests/agentWorkerLocalRunner.test.mjs
  work.next_action: dry-run-local-worker
  trace.status: pending

критерии_готовности:
  - produces Worker Output v1
]>
`;

describe('buildWorkerInputFromTask', () => {
  it('builds a provider-neutral Worker Input v1-like payload', () => {
    const task = parseWorkItems(SAMPLE_BACKLOG).find((item) => item.id === 'ready-task');
    const input = buildWorkerInputFromTask(task, { runId: 'run-1' });

    assert.equal(input.schema, 'agent-worker.input.v1');
    assert.equal(input.runId, 'run-1');
    assert.equal(input.task.id, 'ready-task');
    assert.deepEqual(input.task.checks, ['produces Worker Output v1']);
    assert.deepEqual(input.allowedTools, []);
    assert.deepEqual(input.targetFiles, ['src/agentWorkerLocalRunner.mjs', 'tests/agentWorkerLocalRunner.test.mjs']);
    assert.deepEqual(input.policy, {
      mode: 'dry-run',
      allowShell: false,
      allowNetwork: false,
      allowFileWrite: false,
      timeoutMs: 0,
    });
    assert.equal(input.providerHints.provider, 'local-runner');
  });
});

describe('createWorkerInputFromBacklogText', () => {
  it('selects an explicit task id from backlog text', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });

    assert.equal(input.task.id, 'ready-task');
  });

  it('selects the next claimable ready task when task id is omitted', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG);

    assert.equal(input.task.id, 'ready-task');
  });
});

describe('runLocalWorker', () => {
  it('returns Worker Output v1-like success result in dry-run mode', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task', runId: 'run-success' });
    const output = runLocalWorker(input);

    assert.equal(output.schema, 'agent-worker.output.v1');
    assert.equal(output.runId, 'run-success');
    assert.equal(output.taskId, 'ready-task');
    assert.equal(output.status, 'succeeded');
    assert.equal(output.transitionRequest.status, 'verify');
    assert.deepEqual(output.patchSummary.changedFiles, []);
    assert.equal(output.evidence[0].kind, 'worker_run');
    assert.equal(output.evidence[0].result, 'succeeded');
    assert.match(output.logs[0].message, /Prepared task ready-task/);
  });

  it('returns failure output and retry advice for denied policy', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, {
      taskId: 'ready-task',
      policy: { allowShell: true },
    });
    const output = runLocalWorker(input);

    assert.equal(output.status, 'failed');
    assert.equal(output.transitionRequest.status, 'blocked');
    assert.match(output.failureReason, /requires shell, network and file writes to be disabled/);
    assert.match(output.retryAdvice, /current Work Graph snapshot/);
  });
});
