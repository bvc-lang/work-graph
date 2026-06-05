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
  onebaseCheckConfig,
  onebaseDescribeConfig,
  onebaseListMetadata,
  onebaseReadConfigFile,
  onebaseRestGet,
  onebaseRestWriteExecute,
  onebaseRestWritePrepare,
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

describe('MCP write convenience prompts', () => {
  it('create_work_item_from_analytics references MCP tools not file patch', async () => {
    const { toMcpPromptResult } = await import('../packages/workgraph-mcp/src/prompts.mjs');
    const result = toMcpPromptResult('create_work_item_from_analytics', {
      analyticsKey: 'AN-77',
      analyticsBodyPath: 'work/analytics/workgraph-agent-mcp-bypass-install-boundary-incident.md',
    });
    assert.match(result.messages[0].content.text, /create_work_item/u);
    assert.match(result.messages[0].content.text, /do NOT edit .work.bvc/iu);
  });
});

describe('OneBase MCP handlers', () => {
  it('lists and reads bounded OneBase config files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-onebase-mcp-'));
    try {
      await mkdir(join(root, 'catalogs'), { recursive: true });
      await writeFile(join(root, 'catalogs', 'item.yaml'), 'name: Номенклатура\n', 'utf8');

      const listed = await onebaseListMetadata({ onebaseRoot: root }, { root });
      assert.equal(listed.toolId, 'onebase.listMetadata');
      assert.equal(listed.summary.total, 1);

      const read = await onebaseReadConfigFile({
        onebaseRoot: root,
        relativePath: 'catalogs/item.yaml',
      }, { root });
      assert.equal(read.toolId, 'onebase.readConfigFile');
      assert.equal(read.ok, true);
      assert.match(read.text, /Номенклатура/u);

      const blocked = await onebaseReadConfigFile({
        onebaseRoot: root,
        relativePath: '../secret.txt',
      }, { root });
      assert.equal(blocked.ok, false);
      assert.match(blocked.error, /inside onebase root/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('maps onebase describe/check CLI results to evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-onebase-mcp-cli-'));
    const spawnSyncImpl = (_binary, args) => {
      const subcommand = args[0];
      if (subcommand === 'describe') {
        return {
          status: 0,
          stdout: JSON.stringify({
            documents: [{ name: 'РеализацияТоваров', posting: true }],
            catalogs: [{ name: 'Номенклатура' }],
            registers: [],
            reports: [],
            widgets: [],
          }),
          stderr: '',
        };
      }
      return { status: 0, stdout: 'ok', stderr: '' };
    };

    try {
      const described = await onebaseDescribeConfig({
        onebaseRoot: root,
        taskId: 'mcp-task',
      }, {
        root,
        env: { ONEBASE_CLI: 'onebase' },
        spawnSyncImpl,
      });
      assert.equal(described.toolId, 'onebase.describeCli');
      assert.equal(described.ok, true);
      assert.ok(described.evidenceRecords.some((record) => record.summary.includes('onebase describe')));

      const checked = await onebaseCheckConfig({
        onebaseRoot: root,
        taskId: 'mcp-task',
      }, {
        root,
        env: { ONEBASE_CLI: 'onebase' },
        spawnSyncImpl,
      });
      assert.equal(checked.toolId, 'onebase.checkCli');
      assert.equal(checked.ok, true);
      assert.ok(checked.evidenceRecords.some((record) => record.summary.includes('onebase check passed')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns REST-read evidence through MCP handler', async () => {
    const result = await onebaseRestGet({
      path: '/catalogs/Номенклатура',
      baseUrl: 'http://onebase.local',
      taskId: 'rest-mcp-task',
    }, {
      root: process.cwd(),
      fetchImpl: async (_url, options) => {
        assert.equal(options.method, 'GET');
        return {
          ok: true,
          status: 200,
          text: async () => '{"ok":true}',
        };
      },
    });

    assert.equal(result.schema, 'onebase.rest-get.result.v1');
    assert.equal(result.ok, true);
    assert.equal(result.evidenceRecords[0].taskId, 'rest-mcp-task');
  });

  it('prepares and executes confirmed REST-write through MCP handler', async () => {
    const body = { reason: 'mcp-test' };
    const prepared = await onebaseRestWritePrepare({
      path: '/documents/РеализацияТоваров/123/post',
      body,
      taskId: 'write-mcp-task',
    }, { root: process.cwd() });

    assert.equal(prepared.ok, true);
    assert.match(prepared.confirmToken, /^[a-f0-9]{16}$/u);

    const blocked = await onebaseRestWriteExecute({
      path: '/documents/РеализацияТоваров/123/post',
      body,
      confirmToken: 'wrong-token',
      baseUrl: 'http://onebase.local',
      taskId: 'write-mcp-task',
    }, { root: process.cwd() });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.blocked, true);

    const executed = await onebaseRestWriteExecute({
      path: '/documents/РеализацияТоваров/123/post',
      body,
      confirmToken: prepared.confirmToken,
      confirmedBy: 'operator',
      baseUrl: 'http://onebase.local',
      taskId: 'write-mcp-task',
    }, {
      root: process.cwd(),
      fetchImpl: async (_url, options) => {
        assert.equal(options.method, 'POST');
        return {
          ok: true,
          status: 200,
          text: async () => '{"posted":true}',
        };
      },
    });

    assert.equal(executed.ok, true);
    assert.equal(executed.evidenceRecords[0].details.confirmedBy, 'operator');
  });
});
