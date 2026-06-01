import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildAgentRunResponse,
  executeAgentRun,
  parseAgentRunRequestBody,
  readAgentRunJournalResponse,
  readWorkerProviderCatalogResponse,
  resolveAgentRunProvider,
} from '../src/agentRunApi.mjs';

const SAMPLE_BACKLOG = `#Задача_done_task<[
Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
]>

#Задача_ready_task<[
Базис:
  Ready
Вектор:
  Ready
Цель:
  Ready
Анализ:
  Fixture analysis
Решение:
  Verdict: useful
Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.depends_on: done-task
  work.target_files: src/agentRunApi.mjs
  work.decision.verdict: useful
]>
`;

describe('resolveAgentRunProvider', () => {
  it('maps auto to undefined provider selection', () => {
    assert.equal(resolveAgentRunProvider('auto'), undefined);
    assert.equal(resolveAgentRunProvider(undefined), undefined);
  });

  it('maps explicit providers', () => {
    assert.equal(resolveAgentRunProvider('local'), 'local');
    assert.equal(resolveAgentRunProvider('openai'), 'openai');
    assert.equal(resolveAgentRunProvider('openai-compatible'), 'openai');
  });
});

describe('executeAgentRun', () => {
  it('persists backlog transitions after a successful agent run', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-agent-run-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    const journalPath = join(cwd, 'worker-runs.jsonl');
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const response = await executeAgentRun({
        cwd,
        backlogPath: 'backlog.bvc',
        journalPath,
        body: { taskId: 'ready-task', provider: 'local' },
      });

      assert.equal(response.schema, 'operator.agent-run.response.v1');
      assert.equal(response.ok, true);
      assert.equal(response.taskId, 'ready-task');
      assert.equal(response.appliedTransition, 'verify');
      assert.equal(response.persistedBacklog, true);
      assert.equal(response.persistBacklogError, null);
      assert.equal(response.workerRunSummary.provider, 'local');
      assert.equal(response.workerRunSummary.explicitProvider, true);

      const after = await readFile(backlogPath, 'utf8');
      assert.match(after, /work\.status: verify/u);
      assert.notEqual(after, SAMPLE_BACKLOG);

      const journal = await readAgentRunJournalResponse({ cwd, journalPath });
      assert.equal(journal.entries.length, 1);
      assert.equal(journal.entries[0].taskId, 'ready-task');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('skips backlog persistence when persistBacklog is false', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-agent-run-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    const journalPath = join(cwd, 'worker-runs.jsonl');
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const before = await readFile(backlogPath, 'utf8');
      const response = await executeAgentRun({
        cwd,
        backlogPath: 'backlog.bvc',
        journalPath,
        body: { taskId: 'ready-task', provider: 'local', persistBacklog: false },
      });

      assert.equal(response.persistedBacklog, false);
      const after = await readFile(backlogPath, 'utf8');
      assert.equal(after, before);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('readWorkerProviderCatalogResponse', () => {
  it('returns implemented and planned providers', () => {
    const catalog = readWorkerProviderCatalogResponse();
    assert.equal(catalog.schema, 'workgraph.worker.provider.catalog.v1');
    assert.ok(catalog.providers.some((entry) => entry.id === 'local'));
    assert.ok(catalog.providers.some((entry) => entry.id === 'cursor-sdk'));
    assert.ok(catalog.providers.some((entry) => entry.id === 'claude-sdk-api'));
    assert.ok(catalog.providers.some((entry) => entry.id === 'local-cli'));
    assert.equal(catalog.plannedProviders.length, 0);
  });
});

describe('parseAgentRunRequestBody', () => {
  it('accepts empty body', () => {
    assert.deepEqual(parseAgentRunRequestBody(''), {});
  });
});

describe('buildAgentRunResponse', () => {
  it('reflects persistedBacklog flag from result', () => {
    const persisted = buildAgentRunResponse({ ok: true, taskId: 'ready-task', steps: [], persistedBacklog: true });
    assert.equal(persisted.persistedBacklog, true);

    const notPersisted = buildAgentRunResponse({ ok: true, taskId: 'ready-task', steps: [] });
    assert.equal(notPersisted.persistedBacklog, false);
  });
});
