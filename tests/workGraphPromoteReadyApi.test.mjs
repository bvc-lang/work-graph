import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildPromoteReadyResponse,
  executePromoteReady,
} from '../src/workGraphPromoteReadyApi.mjs';
import {
  evaluatePromoteReadyEligibility,
  parseWorkItems,
} from '../src/workGraphRuntime.mjs';

const CHARTER_FIXTURE = `#Устав_Test<[
Базис:
  Seed charter for promote-ready tests with enough meaningful content to pass classifyCharterBody heuristics without placeholder markers in temp workspaces.
Вектор:
  Promote-ready requires valid charter preflight before backlog to ready transition.
Цель:
  Controlled rebuild acceptance boundary for unit tests.

Метки:
  atom.profile: charter
  project.slug: work-graph-rebuild
  trace.status: verified
]>
`;

const SAMPLE_BACKLOG = `#Задача_done_task<[
Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done Task
  work.status: done
]>

#Задача_blocked_dep_task<[
Метки:
  atom.profile: work_item
  work.id: blocked-dep-task
  work.title: Blocked Dep Task
  work.status: backlog
  work.depends_on: missing-task
]>

#Задача_promote_me<[
Метки:
  atom.profile: work_item
  work.id: promote-me
  work.title: Promote Me
  work.status: backlog
  work.depends_on: done-task
]>
`;

async function writeCharterFixture(cwd) {
  await mkdir(join(cwd, 'charter'), { recursive: true });
  await writeFile(join(cwd, 'charter/main.bvc'), CHARTER_FIXTURE, 'utf8');
}

describe('evaluatePromoteReadyEligibility', () => {
  it('accepts backlog items with satisfied dependencies', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const result = evaluatePromoteReadyEligibility(items, 'promote-me');

    assert.equal(result.ok, true);
    assert.equal(result.workId, 'promote-me');
  });

  it('rejects backlog items with unsatisfied dependencies', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const result = evaluatePromoteReadyEligibility(items, 'blocked-dep-task');

    assert.equal(result.ok, false);
    assert.equal(result.error, 'dependencies_unsatisfied');
    assert.deepEqual(result.unsatisfiedDependencies, ['missing-task']);
  });
});

describe('executePromoteReady', () => {
  it('persists backlog→ready transition on disk', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-promote-ready-'));
    const backlogPath = join(cwd, 'backlog.bvc');

    await writeCharterFixture(cwd);
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const response = await executePromoteReady({
        cwd,
        backlogPath: 'backlog.bvc',
        body: { workId: 'promote-me' },
      });

      assert.equal(response.schema, 'operator.promote-ready.response.v1');
      assert.equal(response.ok, true);
      assert.equal(response.workId, 'promote-me');
      assert.equal(response.previousStatus, 'backlog');
      assert.equal(response.newStatus, 'ready');
      assert.equal(response.persistedBacklog, true);

      const after = await readFile(backlogPath, 'utf8');
      assert.match(after, /work\.status: ready/u);
      assert.match(after, /promote-ready: backlog→ready via operator board/u);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('returns dependencies_unsatisfied without writing backlog', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-promote-ready-'));
    const backlogPath = join(cwd, 'backlog.bvc');

    await writeCharterFixture(cwd);
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const before = await readFile(backlogPath, 'utf8');
      const response = await executePromoteReady({
        cwd,
        backlogPath: 'backlog.bvc',
        body: { workId: 'blocked-dep-task' },
      });

      assert.equal(response.ok, false);
      assert.equal(response.error, 'dependencies_unsatisfied');
      assert.deepEqual(response.unsatisfiedDependencies, ['missing-task']);
      assert.equal(await readFile(backlogPath, 'utf8'), before);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('buildPromoteReadyResponse', () => {
  it('reflects persistedBacklog flag', () => {
    const response = buildPromoteReadyResponse({
      ok: true,
      workId: 'promote-me',
      persistedBacklog: true,
    });

    assert.equal(response.persistedBacklog, true);
  });
});
