import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  buildGitSnapshotMessage,
  collectGitSnapshotTargetFiles,
  formatGitSnapshotEvidenceLine,
  isGitRepository,
  isGitSnapshotPathAllowed,
  isGitSnapshotPathDenied,
  loadGitSnapshotPolicy,
  mergeGitSnapshotStagingPaths,
  normalizeGitSnapshotPaths,
  normalizeGitSnapshotPathsLenient,
  resolveGitSnapshotPolicy,
  maybeRunGitSnapshotAfterPersist,
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
  it('defaults to enabled without env/file', () => {
    const policy = resolveGitSnapshotPolicy({ env: {} });
    assert.equal(policy.enabled, true);
    assert.deepEqual(policy.events, ['analytics.created', 'work_item.done']);
    assert.equal(policy.push, 'never');
  });

  it('disables via WORKGRAPH_GIT_SNAPSHOT=0', () => {
    const policy = resolveGitSnapshotPolicy({ env: { WORKGRAPH_GIT_SNAPSHOT: '0' } });
    assert.equal(policy.enabled, false);
  });

  it('loadGitSnapshotPolicy disables outside git repo', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wg-git-snapshot-no-git-'));
    try {
      const policy = await loadGitSnapshotPolicy({ cwd: root, env: {} });
      assert.equal(policy.enabled, false);
      assert.equal(await isGitRepository(root), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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
    const root = await createGitFixture();
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

  it('allows code prefixes and denies secrets or generated dirs', () => {
    assert.equal(isGitSnapshotPathAllowed('src/gitSnapshot.mjs'), true);
    assert.equal(isGitSnapshotPathAllowed('tests/gitSnapshot.test.mjs'), true);
    assert.equal(isGitSnapshotPathDenied('.env'), true);
    assert.equal(isGitSnapshotPathDenied('.env.local'), true);
    assert.equal(isGitSnapshotPathDenied('node_modules/pkg/index.js'), true);
    assert.equal(isGitSnapshotPathAllowed('node_modules/pkg/index.js'), false);
    assert.equal(isGitSnapshotPathAllowed('secrets/credentials.json'), false);
  });

  it('merges target_files only on work_item.done', () => {
    const merged = mergeGitSnapshotStagingPaths({
      paths: ['intent/system/runtime/work/a.work.bvc'],
      targetFiles: ['src/foo.mjs', 'tests/foo.test.mjs'],
      event: 'work_item.done',
    });
    assert.deepEqual(merged, [
      'intent/system/runtime/work/a.work.bvc',
      'src/foo.mjs',
      'tests/foo.test.mjs',
    ]);
    const statusOnly = mergeGitSnapshotStagingPaths({
      paths: ['intent/system/runtime/work/a.work.bvc'],
      targetFiles: ['src/foo.mjs'],
      event: 'work_item.status',
    });
    assert.deepEqual(statusOnly, ['intent/system/runtime/work/a.work.bvc']);
  });

  it('lenient normalize skips denied and missing allowlist paths', () => {
    const paths = normalizeGitSnapshotPathsLenient([
      'src/allowed.mjs',
      '.env',
      'node_modules/pkg/index.js',
      'outside-repo.txt',
    ], '/repo');
    assert.deepEqual(paths, ['src/allowed.mjs']);
  });

  it('collectGitSnapshotTargetFiles unions items', () => {
    const files = collectGitSnapshotTargetFiles([
      { targetFiles: ['src/a.mjs', 'tests/a.test.mjs'] },
      { targetFiles: ['src/b.mjs', 'tests/a.test.mjs'] },
    ]);
    assert.deepEqual(files, ['src/a.mjs', 'src/b.mjs', 'tests/a.test.mjs']);
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
        policy: resolveGitSnapshotPolicy({ env: { WORKGRAPH_GIT_SNAPSHOT: '0' } }),
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
        policy: resolveGitSnapshotPolicy({ env: {} }),
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

  it('commits bvc and src target_files on done while leaving unrelated dirty file unstaged', async () => {
    const root = await createGitFixture();
    try {
      const bvcPath = 'intent/system/runtime/work/task.work.bvc';
      const srcPath = 'src/task.mjs';
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, bvcPath), 'task\n', 'utf8');
      await writeFile(join(root, srcPath), 'export const task = 1;\n', 'utf8');
      const result = await runGitSnapshot({
        cwd: root,
        event: 'work_item.done',
        workId: 'task-a',
        title: 'Task A',
        paths: mergeGitSnapshotStagingPaths({
          paths: [bvcPath],
          targetFiles: [srcPath, '.env', 'missing.mjs'],
          event: 'work_item.done',
        }),
        lenientPaths: true,
        policy: resolveGitSnapshotPolicy({ env: {} }),
      });
      assert.equal(result.ok, true);
      assert.equal(result.skipped, false);
      assert.deepEqual(result.stagedPaths, [bvcPath, srcPath]);

      const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
      assert.match(status, /^\?\? unrelated\.js$/mu);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('maybeRunGitSnapshotAfterPersist merges item target_files on done', async () => {
    const root = await createGitFixture();
    try {
      const bvcPath = 'intent/system/runtime/work/task.work.bvc';
      const srcPath = 'src/hook.mjs';
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, bvcPath), 'task\n', 'utf8');
      await writeFile(join(root, srcPath), 'export const hook = 1;\n', 'utf8');
      const result = await maybeRunGitSnapshotAfterPersist({
        cwd: root,
        env: {},
        gitSnapshot: {
          event: 'work_item.done',
          workId: 'task-hook',
          title: 'Hook task',
        },
        persistedResults: [{ path: bvcPath }],
        targetFiles: [srcPath],
      });
      assert.equal(result.skipped, false);
      assert.deepEqual(result.stagedPaths, [bvcPath, srcPath]);
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
        policy: resolveGitSnapshotPolicy({ env: {} }),
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
