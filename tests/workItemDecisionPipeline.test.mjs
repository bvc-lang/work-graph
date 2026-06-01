import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import {
  buildWorkItemPipelineView,
  recordWorkItemAnalysis,
  recordWorkItemDecision,
} from '../src/workItemDecisionPipeline.mjs';
import {
  assertWorkItemExecutionAllowed,
  evaluateWorkItemExecutionGate,
} from '../src/workItemExecutionGate.mjs';

const SAMPLE_ATOM = `#Задача_pipeline_sample<[
Базис:
  Sample task for pipeline.
Вектор:
  Test analyze/decide flow.
Цель:
  Pipeline in work item card.

Проверки:
  analysis visible in UI

Метки:
  atom.profile: work_item
  work.id: pipeline-sample-task
  work.title: Pipeline sample
  work.status: backlog
  work.pipeline_stage: intake
  trace.status: pending
]>
`;

describe('workItemDecisionPipeline', () => {
  it('parses analysis and decision sections from work item atom', () => {
    const text = `#T<[
Базис:
  b
Вектор:
  v
Цель:
  g
Анализ:
  line one
  line two
Решение:
  Verdict: useful
Метки:
  atom.profile: work_item
  work.id: x
  work.decision.verdict: useful
]>`;

    const [item] = parseWorkItems(text);
    assert.match(item.analysis, /line one/u);
    assert.match(item.decision, /Verdict: useful/u);
    assert.equal(buildWorkItemPipelineView(item).verdict, 'useful');
  });

  it('parses analysis with inner headings like Контекст:', () => {
    const text = `#T<[
Базис:
  b
Вектор:
  v
Цель:
  g
Анализ:
  Контекст:
  sample basis
  Options:
  - useful: yes
Метки:
  atom.profile: work_item
  work.id: x
]>`;

    const [item] = parseWorkItems(text);
    assert.match(item.analysis, /Контекст:/u);
    assert.match(item.analysis, /Options:/u);
  });

  it('records analysis only when text is provided', async () => {
    const blocked = await recordWorkItemAnalysis({
      workId: 'x',
      backlogText: SAMPLE_ATOM,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, 'analysis_required');
  });

  it('persists cursor-provided analysis and decision into intent tree', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-pipeline-'));
    const relPath = 'intent/system/runtime/work/pipeline-sample-task.work.bvc';
    await mkdir(join(cwd, 'intent/system/runtime/work'), { recursive: true });
    await writeFile(join(cwd, relPath), SAMPLE_ATOM, 'utf8');
    await writeFile(join(cwd, 'intent/index.bvc'), `#Индекс<[
WorkItems:
  - pipeline-sample-task: ${relPath}
Метки:
  atom.profile: trace
  trace.status: pending
]>`, 'utf8');

    const analysis = await recordWorkItemAnalysis({
      cwd,
      workId: 'pipeline-sample-task',
      analysis: 'Real Cursor analysis: scope ok, no duplicates.',
    });
    assert.equal(analysis.ok, true);

    const decide = await recordWorkItemDecision({
      cwd,
      workId: 'pipeline-sample-task',
      verdict: 'useful',
      notes: 'Verdict: useful\nOperator approved in Cursor.',
    });
    assert.equal(decide.ok, true);
    assert.equal(decide.verdict, 'useful');

    const items = await readWorkItemsFromRepo({ cwd });
    const refreshed = items.find((entry) => entry.id === 'pipeline-sample-task');
    assert.match(refreshed.analysis, /Real Cursor analysis/u);
    assert.equal(refreshed.labels['work.decision.verdict'], 'useful');
    assertWorkItemExecutionAllowed(refreshed);
  });
});

describe('workItemExecutionGate', () => {
  it('blocks execution without analysis and useful verdict', () => {
    const [item] = parseWorkItems(SAMPLE_ATOM);
    assert.equal(evaluateWorkItemExecutionGate(item).code, 'missing_analysis');

    const withAnalysis = {
      ...item,
      analysis: 'done',
      labels: { ...item.labels, 'work.decision.verdict': 'defer' },
    };
    assert.equal(evaluateWorkItemExecutionGate(withAnalysis).code, 'verdict_defer');
  });
});
