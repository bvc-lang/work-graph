import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  buildLlmUsefulnessScorecard,
  buildWorkGraphLlmUsefulnessReport,
  evaluateCursorMcpContextSurface,
  evaluateGraphRagUsefulness,
  evaluateMcpPromptToolCoverage,
  evaluateSemanticSearchActionability,
  runMandatoryPromptEvalFixtures,
  SAMPLE_READY_BACKLOG,
  scoreMcpWorkItemReadSurface,
} from '../src/workGraphLlmUsefulnessEval.mjs';
import {
  claimWorkItem,
  getCurrentCycle,
  getEvidenceRecord,
  getGraphRagContext,
  getMemoryRecord,
  getWorkItem,
  listEvidenceRecords,
  listMemoryRecords,
  listWorkItems,
  readWorkGraphResource,
} from '../packages/workgraph-mcp/src/handlers.mjs';
import { executeSemanticSearchFromRepo } from '../src/semanticSearchWorkflow.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const FIXTURE_READY = `#Задача_ready_eval<[
Базис:
  Ready task.
Вектор:
  MCP eval.
Цель:
  Eval goal.
Анализ:
  Fixture analysis
Решение:
  Verdict: useful

Метки:
  atom.profile: work_item
  work.id: ready-eval
  work.title: Ready eval task
  work.status: ready
  work.owner_role: engineer
  work.department: agent-platform
  work.depends_on: done-dep
  work.target_files: src/workGraphLlmUsefulnessEval.mjs
  work.next_action: inspect and claim
  work.decision.verdict: useful
  trace.status: pending
]>`;

const FIXTURE_DONE = `#Задача_done_dep<[
Базис:
  Done dep.
Вектор:
  Dep.
Цель:
  Dep goal.

Свидетельства:
  done.

Метки:
  atom.profile: work_item
  work.id: done-dep
  work.title: Done dependency
  work.status: done
  trace.status: verified
]>`;

describe('workGraphLlmUsefulnessEval', () => {
  it('scores MCP read surface completeness for LLM planning', () => {
    const item = parseWorkItems(SAMPLE_READY_BACKLOG).find((entry) => entry.id === 'ready-eval');
    const score = scoreMcpWorkItemReadSurface(item);

    assert.equal(score.ok, true);
    assert.equal(score.missing.length, 0);
    assert.ok(score.score >= 0.9);
  });

  it('requires all MCP write tools in workflow prompts', () => {
    const coverage = evaluateMcpPromptToolCoverage();
    assert.equal(coverage.ok, true);
    assert.equal(coverage.mentionedCount, coverage.total);
  });

  it('builds bounded actionable Graph RAG context for worker prompt', () => {
    const items = parseWorkItems(SAMPLE_READY_BACKLOG);
    const usefulness = evaluateGraphRagUsefulness(items, 'ready-eval');

    assert.equal(usefulness.ok, true);
    assert.ok(usefulness.promptChars > 100);
    assert.ok(usefulness.promptChars <= 12_000);
    assert.equal(usefulness.hasTargetFiles, true);
    assert.equal(usefulness.hasDependencies, true);
  });

  it('runs mandatory prompt-eval fixtures without live LLM', () => {
    const report = runMandatoryPromptEvalFixtures();
    assert.equal(report.ok, true);
    assert.equal(report.failed, 0);
    assert.equal(report.skipped, 0);
    assert.equal(report.passed, 3);
    assert.ok(report.results.every((result) => result.ok));
  });

  it('builds scorecard with strong verdict on deterministic harness', async () => {
    const report = await buildWorkGraphLlmUsefulnessReport();
    assert.equal(report.scorecard.verdict, 'strong');
    assert.ok(report.scorecard.overall >= 0.8);
  });

  it('evaluates semantic search actionability on fixture backlog', async () => {
    const root = await createSemanticFixture();
    try {
      const result = await executeSemanticSearchFromRepo({
        cwd: root,
        query: 'ready eval MCP',
        limit: 5,
      });

      const actionability = evaluateSemanticSearchActionability(result, {
        minHits: 1,
        requiredWorkId: 'ready-eval',
      });

      assert.equal(actionability.ok, true);
      assert.ok(actionability.hitCount >= 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('simulates MCP take-next workflow usefulness on fixture intent tree', async () => {
    const root = await createMcpFixture();
    try {
      const report = await buildWorkGraphLlmUsefulnessReport({
        root,
        handlers: {
          getCurrentCycle,
          listWorkItems,
          getWorkItem,
          claimWorkItem,
        },
        executeClaim: true,
      });

      assert.equal(report.mcpWorkflow.skipped, false);
      assert.equal(report.mcpWorkflow.ok, true);
      assert.equal(report.mcpWorkflow.claimed.newStatus, 'doing');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('evaluates cursor MCP context surface on fixture intent tree', async () => {
    const root = await createMcpFixture();
    try {
      const surface = await evaluateCursorMcpContextSurface({
        listWorkItems,
        getGraphRagContext,
        listMemoryRecords,
        getMemoryRecord,
        listEvidenceRecords,
        getEvidenceRecord,
        readWorkGraphResource,
      }, { root });

      assert.equal(surface.skipped, false);
      assert.equal(surface.ok, true);
      assert.ok(surface.score >= 0.9);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('weights mandatory fixtures heavily in scorecard', () => {
    const scorecard = buildLlmUsefulnessScorecard({
      mcpReadSurface: { score: 1 },
      mcpPromptCoverage: { score: 1 },
      mcpWorkflow: { score: 0 },
      graphRag: { score: 1 },
      mandatoryEval: { ok: true, passed: 3, total: 3 },
    });

    assert.equal(scorecard.verdict, 'partial');
    assert.ok(scorecard.overall >= 0.7);
  });
});

async function createMcpFixture() {
  const root = await mkdtemp(join(tmpdir(), 'wg-llm-use-'));
  const base = join(root, 'intent/system/runtime/work');
  await mkdir(base, { recursive: true });
  await writeFile(join(root, 'intent/index.bvc'), `#Индекс<[
WorkItems:
  - done-dep: intent/system/runtime/work/done-dep.work.bvc
  - ready-eval: intent/system/runtime/work/ready-eval.work.bvc
Метки:
  atom.profile: trace
  trace.status: pending
]>
`, 'utf8');
  await writeFile(join(base, 'done-dep.work.bvc'), FIXTURE_DONE, 'utf8');
  await writeFile(join(base, 'ready-eval.work.bvc'), FIXTURE_READY, 'utf8');
  return root;
}

async function createSemanticFixture() {
  return createMcpFixture();
}
