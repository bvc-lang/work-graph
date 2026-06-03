import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  assertTaskReadyForDone,
  addWorkItemEvidence,
  completeWorkItem,
  getWorkContract,
  validateEvidence,
} from '../packages/workgraph-mcp/src/handlers.mjs';

const GATE_TASK = `#Задача_gate_task<[
Базис:
  Gate task fixture.
Вектор:
  Gate vector.
Цель:
  Gate goal.
Проверки:
  npm test green

Метки:
  atom.profile: work_item
  work.id: implement-step-code-trace-link-validator
  work.title: Trace links gate fixture
  work.status: doing
  work.owner_role: engineer
  work.department: agent-platform
  work.priority: high
  trace.status: pending
]>
`;

const READY_TASK = `#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Ready vector.
Цель:
  Ready goal.

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready task
  work.status: ready
  work.owner_role: engineer
  work.department: agent-platform
  work.priority: high
  trace.status: pending
]>
`;

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'wg-contract-mcp-'));
  const intentDir = join(root, 'intent/system/runtime/work');
  await mkdir(intentDir, { recursive: true });
  await writeFile(join(intentDir, 'implement-step-code-trace-link-validator.work.bvc'), GATE_TASK, 'utf8');
  await writeFile(join(intentDir, 'ready-task.work.bvc'), READY_TASK, 'utf8');
  await writeFile(join(root, 'intent/index.bvc'), `intent_tree:
  work_items:
  - implement-step-code-trace-link-validator: intent/system/runtime/work/implement-step-code-trace-link-validator.work.bvc
  - ready-task: intent/system/runtime/work/ready-task.work.bvc
`, 'utf8');
  return root;
}

describe('work contract MCP handlers', () => {
  it('get_work_contract returns tier A projection for gate task', async () => {
    const root = await createFixture();
    try {
      const contract = await getWorkContract({ workId: 'implement-step-code-trace-link-validator' }, { root });
      assert.equal(contract.schema, 'work-item-contract.v1');
      assert.equal(contract.verification.tier, 'A');
      assert.equal(contract.verification.matrixRowId, 'trace-links-v1');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('assert_task_ready_for_done returns violations without evidence', async () => {
    const root = await createFixture();
    try {
      const result = await assertTaskReadyForDone({ workId: 'implement-step-code-trace-link-validator' }, { root });
      assert.equal(result.ok, false);
      assert.ok(result.violations.some((violation) => violation.code === 'missing_evidence'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('validate_evidence accepts structured command payload', async () => {
    const root = await createFixture();
    try {
      const result = await validateEvidence({
        workId: 'implement-step-code-trace-link-validator',
        evidenceJson: {
          type: 'command',
          taskId: 'implement-step-code-trace-link-validator',
          status: 'succeeded',
          command: 'npm run test:deterministic',
          exitCode: 0,
        },
      }, { root });
      assert.equal(result.ok, true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('complete_work_item returns violations instead of throw when gate evidence weak', async () => {
    const root = await createFixture();
    try {
      const result = await completeWorkItem({
        workId: 'implement-step-code-trace-link-validator',
        evidence: 'notes only',
      }, { root });
      assert.equal(result.ok, false);
      assert.ok(result.violations.some((violation) => violation.code === 'structured_evidence_required'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('complete_work_item succeeds for non-gate task with prose evidence', async () => {
    const root = await createFixture();
    try {
      const result = await completeWorkItem({
        workId: 'ready-task',
        evidence: 'final verification passed',
      }, { root });
      assert.equal(result.ok, true);
      assert.equal(result.newStatus, 'done');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('add_work_item_evidence rejects weak prose on Tier A gate task', async () => {
    const root = await createFixture();
    try {
      const result = await addWorkItemEvidence({
        workId: 'implement-step-code-trace-link-validator',
        evidence: 'notes only',
      }, { root });
      assert.equal(result.ok, false);
      assert.ok(result.violations.some((violation) => violation.code === 'structured_evidence_required'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('add_work_item_evidence persists structured command evidence on Tier A gate task', async () => {
    const root = await createFixture();
    try {
      const result = await addWorkItemEvidence({
        workId: 'implement-step-code-trace-link-validator',
        structuredEvidence: {
          type: 'command',
          status: 'succeeded',
          command: 'npm run test:deterministic',
          exitCode: 0,
        },
      }, { root });
      assert.equal(result.ok, true);
      assert.equal(result.structured, true);
      assert.ok(result.evidenceCount >= 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
