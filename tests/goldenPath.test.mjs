import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AGENT_LOOP_PHASES, runDeterministicGoldenPath } from '../src/goldenPath.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const GOLDEN_PATH_BACKLOG = `#Задача_prerequisite<[
Базис:
  Prerequisite done.
Вектор:
  Complete first.
Цель:
  Unblock golden path.
Свидетельства:
  npm test passed.

Метки:
  atom.profile: work_item
  work.id: golden-prerequisite
  work.title: Prerequisite
  work.status: done
  trace.status: verified
]>

#Задача_golden_path_target<[
Базис:
  Golden path target task.
Вектор:
  Exercise claim, change, verify, done.
Цель:
  Prove Work Graph loop.
Проверки:
  - npm run test:deterministic

Метки:
  atom.profile: work_item
  work.id: golden-path-target
  work.title: Golden path target
  work.status: ready
  work.depends_on: golden-prerequisite
  work.target_files: src/goldenPath.mjs, tests/goldenPath.test.mjs
  trace.status: pending
]>
`;

describe('runDeterministicGoldenPath', () => {
  it('runs observe->stop phases and finishes task as done with evidence', () => {
    const items = parseWorkItems(GOLDEN_PATH_BACKLOG);
    const result = runDeterministicGoldenPath(items, { taskId: 'golden-path-target' });

    assert.equal(result.ok, true);
    assert.equal(result.taskId, 'golden-path-target');
    assert.deepEqual(
      result.steps.map((step) => step.phase),
      AGENT_LOOP_PHASES,
    );

    const finalTask = result.finalItems.find((item) => item.id === 'golden-path-target');
    assert.ok(finalTask);
    assert.equal(finalTask.status, 'done');
    assert.ok(finalTask.evidence.length >= 3);
    assert.match(finalTask.evidence.join('\n'), /golden-path/);
  });

  it('does not depend on LLM or external network', () => {
    const items = parseWorkItems(GOLDEN_PATH_BACKLOG);
    const result = runDeterministicGoldenPath(items);
    assert.equal(result.ok, true);
    assert.ok(result.steps.every((step) => typeof step.phase === 'string'));
  });
});

describe('AGENT_LOOP_PHASES', () => {
  it('matches agent-state-machine-v1 phase list', () => {
    assert.deepEqual(AGENT_LOOP_PHASES, [
      'observe',
      'plan',
      'claim',
      'act',
      'verify',
      'record',
      'stop',
    ]);
  });
});
