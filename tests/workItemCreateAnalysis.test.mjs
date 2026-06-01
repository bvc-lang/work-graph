import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';
import {
  buildDefaultWorkItemAnalysis,
  buildDefaultWorkItemDecision,
  buildWorkItemCreateAnalysisDecision,
} from '../src/workItemCreateAnalysis.mjs';
import { evaluateWorkItemExecutionGate } from '../src/workItemExecutionGate.mjs';

describe('buildWorkItemCreateAnalysisDecision', () => {
  it('builds default analysis and decision with pipeline labels', () => {
    const result = buildWorkItemCreateAnalysisDecision({
      workId: 'demo-task',
      title: 'Demo task',
      basis: 'Basis line.',
      vector: 'Vector line.',
      goal: 'Goal line.',
      intakeSourceKind: 'analytics-record',
      intakeSourceRef: 'analytics:graph-canvas-layout-mess',
      analyticsKey: 'AN-1',
    });

    assert.ok(result.analysis.length >= 4);
    assert.match(result.analysis.join('\n'), /Зачем:/u);
    assert.match(result.analysis.join('\n'), /Basis line/u);
    assert.equal(result.decision[0], 'Вердикт:');
    assert.equal(result.decision[1], 'полезно');
    assert.doesNotMatch(result.analysis.join('\n'), /actionable|Целесообразность|Scope drift|depends_on=/u);
    assert.equal(result.pipelineLabels['work.decision.verdict'], 'useful');
    assert.equal(result.pipelineLabels['work.pipeline_stage'], 'decided');
    assert.equal(result.pipelineLabels['intake.source_ref'], 'analytics:graph-canvas-layout-mess');
    assert.equal(result.pipelineLabels['intake.analytics_key'], 'AN-1');
  });

  it('respects explicit analysis and decision overrides', () => {
    const result = buildWorkItemCreateAnalysisDecision({
      analysis: ['Custom analysis line'],
      decision: ['Verdict: defer', 'Wait for deps'],
      decisionVerdict: 'defer',
    });

    assert.deepEqual(result.analysis, ['Custom analysis line']);
    assert.deepEqual(result.decision, ['Verdict: defer', 'Wait for deps']);
    assert.equal(result.pipelineLabels['work.decision.verdict'], 'defer');
  });
});

describe('createWorkItem analysis/decision sections', () => {
  async function createFixture() {
    const root = await mkdtemp(join(tmpdir(), 'work-item-create-analysis-'));
    await mkdir(join(root, 'intent', 'ui', 'dashboard', 'work'), { recursive: true });
    await writeFile(join(root, 'intent', 'index.bvc'), `#Index<[
WorkItems:
]>\n`, 'utf8');
    return root;
  }

  it('persists Анализ and Решение in new atom', async () => {
    const root = await createFixture();
    try {
      await createWorkItem({
        workId: 'with-analysis',
        title: 'With analysis',
        department: 'frontend-ui',
      }, { root });

      const atomText = await readFile(
        join(root, 'intent/ui/dashboard/work/with-analysis.work.bvc'),
        'utf8',
      );

      assert.match(atomText, /Анализ:/u);
      assert.match(atomText, /Решение:/u);
      assert.match(atomText, /Зачем:/u);
      assert.match(atomText, /work\.decision\.verdict: useful/u);
      assert.match(atomText, /work\.pipeline_stage: decided/u);

      const gate = evaluateWorkItemExecutionGate({
        id: 'with-analysis',
        analysis: 'Зачем: test',
        labels: { 'work.decision.verdict': 'useful' },
      });
      assert.equal(gate.allowed, true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('buildDefaultWorkItemAnalysis', () => {
  it('derives analysis from basis and intake key', () => {
    const lines = buildDefaultWorkItemAnalysis({
      title: 'Layout profile',
      basis: ['Карта архитектуры не читается в sidebar.'],
      analyticsKey: 'AN-1',
      intakeSourceKind: 'analytics-record',
      intakeSourceRef: 'analytics:graph-canvas-layout-mess',
    });

    assert.match(lines.join(' '), /Зачем:/u);
    assert.match(lines.join(' '), /Карта архитектуры/u);
    assert.doesNotMatch(lines.join(' '), /Целесообразность|Стоит завести/u);
  });

  it('mentions dependencies in when line', () => {
    const lines = buildDefaultWorkItemAnalysis({
      title: 'Intent graph task',
      dependsOn: ['epic-foo', 'decide-bar'],
    });

    assert.match(lines.join(' '), /После готовности/u);
    assert.match(lines.join(' '), /epic-foo/u);
  });
});

describe('buildDefaultWorkItemDecision', () => {
  it('includes verdict line in Russian', () => {
    const lines = buildDefaultWorkItemDecision({}, 'useful');
    assert.equal(lines[0], 'Вердикт:');
    assert.equal(lines[1], 'полезно');
  });
});
