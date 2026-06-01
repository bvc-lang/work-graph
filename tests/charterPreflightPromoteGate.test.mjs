import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  evaluateCharterPreflightForPromote,
  evaluateCharterPreflightForPromoteFromRepo,
} from '../src/charterPreflightPromoteGate.mjs';
import { executePromoteReady } from '../src/workGraphPromoteReadyApi.mjs';
import {
  evaluatePromoteReadyEligibility,
  parseWorkItems,
} from '../src/workGraphRuntime.mjs';

const CHARTER_FIXTURE = `#Устав_Test<[
Базис:
  Seed charter for promote gate tests with enough meaningful content to pass classifyCharterBody heuristics without placeholder markers.
Вектор:
  Block promote-ready when target_files violate anti-goals from charter scope.
Цель:
  Controlled rebuild acceptance boundary.

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

#Задача_promote_me<[
Метки:
  atom.profile: work_item
  work.id: promote-me
  work.title: Promote Me
  work.status: backlog
  work.depends_on: done-task
  work.target_files: src/workGraphPromoteReadyApi.mjs
]>

#Задача_charter_blocked<[
Метки:
  atom.profile: work_item
  work.id: charter-blocked
  work.title: Charter Blocked
  work.status: backlog
  work.depends_on: done-task
  work.target_files: src/agent/orchestrator.js
]>
`;

describe('evaluateCharterPreflightForPromote', () => {
  it('passes safe target_files with valid charter', () => {
    const [item] = parseWorkItems(SAMPLE_BACKLOG).filter((entry) => entry.id === 'promote-me');
    const result = evaluateCharterPreflightForPromote(item, {
      charterText: CHARTER_FIXTURE,
      charterPath: 'charter/main.bvc',
    });

    assert.equal(result.ok, true);
    assert.equal(result.charterStatus, 'ok');
  });

  it('blocks orchestrator target_files', () => {
    const [item] = parseWorkItems(SAMPLE_BACKLOG).filter((entry) => entry.id === 'charter-blocked');
    const result = evaluateCharterPreflightForPromote(item, {
      charterText: CHARTER_FIXTURE,
      charterPath: 'charter/main.bvc',
    });

    assert.equal(result.ok, false);
    assert.ok(result.violations.some((violation) => violation.ruleId === 'anti_monolith_orchestrator'));
  });
});

describe('evaluatePromoteReadyEligibility charter gate', () => {
  it('returns charter_preflight_blocked when charter preflight fails', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const item = items.find((entry) => entry.id === 'charter-blocked');
    const charterPreflight = evaluateCharterPreflightForPromote(item, {
      charterText: CHARTER_FIXTURE,
    });

    const result = evaluatePromoteReadyEligibility(items, 'charter-blocked', { charterPreflight });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'charter_preflight_blocked');
  });
});

describe('executePromoteReady charter gate', () => {
  it('does not persist promote when charter preflight blocks target_files', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-charter-gate-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await mkdir(join(cwd, 'charter'), { recursive: true });
    await writeFile(join(cwd, 'charter/main.bvc'), CHARTER_FIXTURE, 'utf8');
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const before = await readFile(backlogPath, 'utf8');
      const response = await executePromoteReady({
        cwd,
        backlogPath: 'backlog.bvc',
        body: { workId: 'charter-blocked' },
      });

      assert.equal(response.ok, false);
      assert.equal(response.error, 'charter_preflight_blocked');
      assert.ok(response.charterViolations.length >= 1);
      assert.equal(await readFile(backlogPath, 'utf8'), before);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('allows promote when charter and target_files pass', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-charter-gate-ok-'));
    const backlogPath = join(cwd, 'backlog.bvc');
    await mkdir(join(cwd, 'charter'), { recursive: true });
    await writeFile(join(cwd, 'charter/main.bvc'), CHARTER_FIXTURE, 'utf8');
    await writeFile(backlogPath, SAMPLE_BACKLOG, 'utf8');

    try {
      const response = await executePromoteReady({
        cwd,
        backlogPath: 'backlog.bvc',
        body: { workId: 'promote-me' },
      });

      assert.equal(response.ok, true);
      assert.equal(response.newStatus, 'ready');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('evaluateCharterPreflightForPromoteFromRepo', () => {
  it('reads charter from repo cwd', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-charter-read-'));
    await mkdir(join(cwd, 'charter'), { recursive: true });
    await writeFile(join(cwd, 'charter/main.bvc'), CHARTER_FIXTURE, 'utf8');

    try {
      const [item] = parseWorkItems(SAMPLE_BACKLOG).filter((entry) => entry.id === 'promote-me');
      const result = await evaluateCharterPreflightForPromoteFromRepo(item, { cwd });
      assert.equal(result.ok, true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
