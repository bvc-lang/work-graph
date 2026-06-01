import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  ONEBASE_WORKER_TOOL_IDS,
  buildOnebaseWorkerEvidence,
  executeOnebaseListMetadata,
  executeOnebaseReadConfigFile,
  executeOnebaseStaticVerify,
  executeOnebaseVerificationCommand,
  executeOnebaseWorkerTool,
  isOnebaseDomainTask,
  resolveOnebaseAllowedTools,
  runOnebaseWorkerPreflight,
} from '../src/onebaseWorkerTools.mjs';
import { resolveDomainWorkerCapabilities } from '../src/workGraphWorkerProvider.mjs';
import { runLocalWorker, buildWorkerInputFromTask } from '../src/agentWorkerLocalRunner.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_CATALOG = `name: Номенклатура
fields:
  - { name: Наименование, type: string }
`;

const ONEBASE_TASK = {
  id: 'onebase-task',
  title: 'OneBase task',
  status: 'ready',
  department: 'domain-onebase',
  labels: { 'domain.id': 'onebase' },
  checks: ['metadata scan выполнен'],
  evidence: ['npm run test:optional:onebase'],
  dependsOn: [],
  targetFiles: ['../onebase/examples/trade/registers/валовая_прибыль.yaml'],
  traceStatus: 'pending',
  nextAction: 'verify',
};

describe('isOnebaseDomainTask', () => {
  it('detects onebase domain by labels and department', () => {
    assert.equal(isOnebaseDomainTask(ONEBASE_TASK), true);
    assert.equal(isOnebaseDomainTask({ id: 'x', department: 'frontend-ui', labels: {} }), false);
  });
});

describe('executeOnebaseListMetadata', () => {
  it('lists yaml metadata entries from bounded dirs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-onebase-tools-'));
    await mkdir(join(root, 'catalogs'), { recursive: true });
    await writeFile(join(root, 'catalogs', 'Номенклатура.yaml'), SAMPLE_CATALOG, 'utf8');

    try {
      const result = executeOnebaseListMetadata(root);
      assert.equal(result.ok, true);
      assert.equal(result.entries.length, 1);
      assert.equal(result.entries[0].name, 'Номенклатура');
      assert.equal(result.entries[0].kind, 'catalog');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('executeOnebaseReadConfigFile', () => {
  it('reads bounded yaml files and rejects traversal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-onebase-read-'));
    await mkdir(join(root, 'catalogs'), { recursive: true });
    await writeFile(join(root, 'catalogs', 'item.yaml'), SAMPLE_CATALOG, 'utf8');

    try {
      const ok = executeOnebaseReadConfigFile(root, 'catalogs/item.yaml');
      assert.equal(ok.ok, true);
      assert.match(ok.text, /Номенклатура/u);

      const blocked = executeOnebaseReadConfigFile(root, '../outside.yaml');
      assert.equal(blocked.ok, false);
      assert.match(blocked.error, /inside onebase root/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('executeOnebaseStaticVerify', () => {
  it('reports missing root as failure', () => {
    const result = executeOnebaseStaticVerify('D:/Work/IDE/__missing_onebase_tools__');
    assert.equal(result.ok, false);
    assert.ok(result.failures.length > 0);
  });
});

describe('executeOnebaseVerificationCommand', () => {
  it('blocks shell verification when allowShell is false', () => {
    const result = executeOnebaseVerificationCommand({ policy: { allowShell: false } });
    assert.equal(result.blocked, true);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'allowShell=false');
  });
});

describe('buildOnebaseWorkerEvidence', () => {
  it('maps tool results to worker evidence entries', () => {
    const metadataEvidence = buildOnebaseWorkerEvidence({
      ok: true,
      toolId: 'onebase.listMetadata',
      summary: { total: 2, byKind: { catalog: 2 } },
    });
    assert.equal(metadataEvidence.kind, 'onebase_metadata');
    assert.equal(metadataEvidence.result, 'succeeded');

    const blockedEvidence = buildOnebaseWorkerEvidence({
      ok: false,
      blocked: true,
      toolId: 'onebase.runVerificationCommand',
      reason: 'allowShell=false',
    });
    assert.equal(blockedEvidence.result, 'blocked');
  });
});

describe('runOnebaseWorkerPreflight', () => {
  it('skips non-onebase tasks', () => {
    const result = runOnebaseWorkerPreflight({
      id: 'generic',
      department: 'frontend-ui',
      labels: {},
      checks: [],
      evidence: [],
      targetFiles: [],
    });

    assert.equal(result.skipped, true);
    assert.deepEqual(result.evidence, []);
  });

  it('runs metadata/static/blocked verification for onebase tasks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-onebase-preflight-'));
    await mkdir(join(root, 'catalogs'), { recursive: true });
    await writeFile(join(root, 'catalogs', 'item.yaml'), SAMPLE_CATALOG, 'utf8');

    try {
      const result = runOnebaseWorkerPreflight(ONEBASE_TASK, {
        onebaseRoot: root,
        policy: { allowShell: false },
      });

      assert.equal(result.skipped, false);
      assert.ok(result.evidence.length >= 5);
      assert.equal(result.summary.verificationBlocked, true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('provider registry domain capabilities', () => {
  it('exposes onebase tool ids for onebase domain tasks', () => {
    const capabilities = resolveDomainWorkerCapabilities(ONEBASE_TASK);
    assert.equal(capabilities.domainId, 'onebase');
    assert.deepEqual(capabilities.allowedTools, ONEBASE_WORKER_TOOL_IDS);
    assert.deepEqual(resolveOnebaseAllowedTools(ONEBASE_TASK), ONEBASE_WORKER_TOOL_IDS);
  });
});

describe('local worker integration', () => {
  it('includes onebase evidence in worker output for onebase tasks', () => {
    const input = buildWorkerInputFromTask(ONEBASE_TASK, { runId: 'run-onebase' });
    assert.deepEqual(input.allowedTools, ONEBASE_WORKER_TOOL_IDS);

    const output = runLocalWorker(input);
    assert.equal(output.status, 'succeeded');
    assert.ok(output.evidence.some((entry) => entry.kind === 'onebase_verify'));
    assert.ok(output.evidence.some((entry) => entry.kind === 'onebase_metadata'));
  });
});

describe('executeOnebaseWorkerTool', () => {
  it('dispatches known tool ids', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-onebase-dispatch-'));
    await mkdir(join(root, 'reports'), { recursive: true });
    await writeFile(join(root, 'reports', 'sales.yaml'), 'name: Sales\n', 'utf8');

    try {
      const result = executeOnebaseWorkerTool('onebase.listMetadata', {}, { onebaseRoot: root });
      assert.equal(result.toolId, 'onebase.listMetadata');
      assert.equal(result.entries.length, 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
