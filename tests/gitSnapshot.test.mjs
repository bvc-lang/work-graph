import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  buildGitSnapshotMessage,
  formatGitSnapshotEvidenceLine,
  loadGitSnapshotPolicy,
  normalizeGitSnapshotPaths,
  resolveGitSnapshotPolicy,
  runGitSnapshot,
  writeGitSnapshotSettingsFile,
} from '../src/gitSnapshot.mjs';

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'pipe', windowsHide: true });
}

async function createGitFixture() {
  const root = await mkdtemp(join(tmpdir(), 'wg-git-snapshot-'));
  git(root, ['init']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'WG Test']);
  await mkdir(join(root, 'intent/system/runtime/work'), { recursive: true });
  await writeFile(join(root, 'intent/system/runtime/work/base.work.bvc'), 'base\n', 'utf8');
  git(root, ['add', 'intent/system/runtime/work/base.work.bvc']);
  git(root, ['commit', '-m', 'init']);
  await writeFile(join(root, 'unrelated.js'), 'console.log(1)\n', 'utf8');
  return root;
}

describe('gitSnapshot policy', () => {
  it('defaults to disabled without env/file', () => {
    const policy = resolveGitSnapshotPolicy({ env: {} });
    assert.equal(policy.enabled, false);
    assert.equal(policy.push, 'never');
  });

  it('enables via WORKGRAPH_GIT_SNAPSHOT=1 and event aliases', () => {
    const policy = resolveGitSnapshotPolicy({
      env: {
        WORKGRAPH_GIT_SNAPSHOT: '1',
        WORKGRAPH_GIT_SNAPSHOT_EVENTS: 'done,analytics',
      },
    });
    assert.equal(policy.enabled, true);
    assert.deepEqual(policy.events, ['analytics.created', 'work_item.done']);
  });

  it('loads project settings file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-git-snapshot-settings-'));
    try {
      await writeGitSnapshotSettingsFile(root, {
        enabled: true,
        events: ['work_item.created'],
        recordShaInEvidence: false,
      });
      const policy = await loadGitSnapshotPolicy({ cwd: root, env: {} });
      assert.equal(policy.enabled, true);
      assert.deepEqual(policy.events, ['work_item.created']);
      assert.equal(policy.recordShaInEvidence, false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('gitSnapshot paths', () => {
  it('rejects wildcards and allows intent/work prefixes', () => {
    assert.throws(
      () => normalizeGitSnapshotPaths(['intent/**/work/*.bvc'], '/repo'),
      /wildcards/u,
    );
    const paths = normalizeGitSnapshotPaths([
      'intent/system/runtime/work/a.work.bvc',
      'work/analytics-records.jsonl',
    ], '/repo');
    assert.deepEqual(paths, [
      'intent/system/runtime/work/a.work.bvc',
      'work/analytics-records.jsonl',
    ]);
  });
});

describe('runGitSnapshot', () => {
  it('skips when policy disabled', async () => {
    const root = await createGitFixture();
    try {
      const result = await runGitSnapshot({
        cwd: root,
        event: 'work_item.done',
        paths: ['intent/system/runtime/work/base.work.bvc'],
        policy: resolveGitSnapshotPolicy({ env: {} }),
      });
      assert.equal(result.skipped, true);
      assert.equal(result.reason, 'disabled');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('commits only scoped paths and leaves unrelated dirty file unstaged', async () => {
    const root = await createGitFixture();
    try {
      const target = 'intent/system/runtime/work/task.work.bvc';
      await writeFile(join(root, target), 'task\n', 'utf8');
      const result = await runGitSnapshot({
        cwd: root,
        event: 'work_item.done',
        workId: 'task-a',
        title: 'Task A',
        paths: [target],
        policy: resolveGitSnapshotPolicy({
          env: { WORKGRAPH_GIT_SNAPSHOT: '1', WORKGRAPH_GIT_SNAPSHOT_EVENTS: 'done' },
        }),
      });
      assert.equal(result.ok, true);
      assert.equal(result.skipped, false);
      assert.match(result.sha, /^[0-9a-f]{7,40}$/u);
      assert.deepEqual(result.stagedPaths, [target]);

      const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
      assert.match(status, /^\?\? unrelated\.js$/mu);
      assert.doesNotMatch(status, /task\.work\.bvc/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skips empty snapshot without error', async () => {
    const root = await createGitFixture();
    try {
      const result = await runGitSnapshot({
        cwd: root,
        event: 'work_item.done',
        paths: ['intent/system/runtime/work/base.work.bvc'],
        policy: resolveGitSnapshotPolicy({
          env: { WORKGRAPH_GIT_SNAPSHOT: '1', WORKGRAPH_GIT_SNAPSHOT_EVENTS: 'done' },
        }),
      });
      assert.equal(result.skipped, true);
      assert.equal(result.reason, 'empty');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('gitSnapshot helpers', () => {
  it('builds commit message and evidence line', () => {
    const message = buildGitSnapshotMessage({
      event: 'work_item.done',
      workId: 'task-a',
      title: 'Task A',
    });
    assert.match(message, /wg\(done\): task-a/u);
    const evidence = formatGitSnapshotEvidenceLine({
      ok: true,
      sha: 'abc1234',
      event: 'work_item.done',
      stagedPaths: ['intent/a.work.bvc'],
    });
    assert.match(evidence, /sha=abc1234/u);
  });
});
