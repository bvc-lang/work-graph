import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GRAPH_RAG_CONTEXT_SCHEMA,
  GRAPH_RAG_SLICE_SCHEMA,
  buildGraphRagContextForWorkerInput,
  buildGraphRagContextSlice,
  buildGraphRagSlice,
  formatGraphRagContextForPrompt,
  getCurrentTaskContext,
  getPreviousDecisions,
} from '../src/graphRagContextSlice.mjs';
import { buildWorkerInputFromTask } from '../src/agentWorkerLocalRunner.mjs';
import { buildWorkerPromptFromInput } from '../src/agentWorkerOpenAiProvider.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const SAMPLE_ITEMS = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace basis.
Вектор:
  Link runtime.
Цель:
  Ship trace scope.

Свидетельства:
  - npm test graph slice passed

Метки:
  atom.profile: work_item
  work.id: trace-task
  work.title: Trace task
  work.status: ready
  work.target_files: src/runtime.mjs
  work.depends_on: base-task
  trace.code_refs: src/runtime.mjs#parseWorkItems
  trace.status: linked
]>

#Задача_base_task<[
Базис:
  Base basis.
Вектор:
  Base vector.
Цель:
  Base goal.

Свидетельства:
  - decision: keep dependency chain deterministic

Метки:
  atom.profile: work_item
  work.id: base-task
  work.title: Base task
  work.status: done
  work.target_files: src/base.mjs
  work.owner_role: engineer
]>
`);

describe('buildGraphRagSlice', () => {
  it('builds deterministic bounded graph rag slice for seed task', () => {
    const slice = buildGraphRagSlice({
      items: SAMPLE_ITEMS,
      seedWorkId: 'trace-task',
      maxNodes: 16,
      maxDepth: 2,
    });

    assert.equal(slice.schema, GRAPH_RAG_SLICE_SCHEMA);
    assert.equal(slice.seedWorkId, 'trace-task');
    assert.ok(slice.nodeCount >= 3);
    assert.ok(slice.nodes.some((node) => node.id === 'work:trace-task'));
    assert.ok(slice.nodes.some((node) => node.id === 'work:base-task'));
    assert.ok(slice.nodes.some((node) => node.id === 'file:src/runtime.mjs'));
    assert.ok(slice.edges.some((edge) => edge.relation === 'depends_on'));
    assert.ok(slice.edges.some((edge) => edge.relation === 'has_evidence'));
    assert.deepEqual(slice.nodes.map((node) => node.id), [...slice.nodes.map((node) => node.id)].sort());
  });

  it('includes memory records from done related tasks', () => {
    const slice = buildGraphRagSlice({
      items: SAMPLE_ITEMS,
      seedWorkId: 'trace-task',
      maxNodes: 24,
    });

    const memory = getPreviousDecisions(slice);
    assert.ok(memory.memory.length >= 1);
    assert.ok(memory.memory.some((entry) => entry.summary.includes('Base goal')));
  });
});

describe('buildGraphRagContextForWorkerInput', () => {
  it('projects slice into worker memorySlice entry', () => {
    const context = buildGraphRagContextForWorkerInput(SAMPLE_ITEMS, 'trace-task', { maxNodes: 16 });

    assert.equal(context.schema, GRAPH_RAG_CONTEXT_SCHEMA);
    assert.equal(context.taskId, 'trace-task');
    assert.ok(context.currentTaskContext.workItems.some((item) => item.id === 'base-task'));
    assert.ok(context.relatedArtifacts.files.includes('src/runtime.mjs'));
    assert.match(formatGraphRagContextForPrompt(context), /Graph RAG context/);
    assert.match(formatGraphRagContextForPrompt(context), /trace-task/);
  });

  it('wires into worker input and prompt without provider-specific state', () => {
    const task = SAMPLE_ITEMS.find((item) => item.id === 'trace-task');
    const input = buildWorkerInputFromTask(task, {
      runId: 'run-1',
      workGraphItems: SAMPLE_ITEMS,
      graphRag: { maxNodes: 16 },
    });

    assert.equal(input.memorySlice.length, 2);
    assert.equal(input.memorySlice[0].schema, 'memory-record.worker-slice.v1');
    assert.equal(input.memorySlice[1].schema, GRAPH_RAG_CONTEXT_SCHEMA);
    assert.ok(getCurrentTaskContext(buildGraphRagSlice({
      items: SAMPLE_ITEMS,
      seedWorkId: 'trace-task',
      maxNodes: 16,
    })).workItems.length >= 1);

    const prompt = buildWorkerPromptFromInput(input);
    assert.match(prompt.messages[1].content, /Graph RAG context/);
    assert.match(prompt.messages[1].content, /src\/runtime\.mjs/);
  });

  it('fuses bounded memory worker slice into graph rag context', () => {
    const journalRecord = {
      id: 'mem:base-task:decision:base-goal',
      schema: 'memory-record.v1',
      type: 'decision',
      summary: 'Fused journal decision for graph rag',
      sourceWorkItem: 'base-task',
      confidence: 'high',
      status: 'active',
      relatedFiles: ['src/base.mjs'],
      relatedTasks: ['trace-task'],
      evidenceIds: [],
      reviewRequired: false,
    };

    const context = buildGraphRagContextSlice(SAMPLE_ITEMS, 'trace-task', {
      maxNodes: 16,
      memoryWorker: {
        memoryRecords: [journalRecord],
        maxRecords: 1,
        maxChars: 200,
      },
    });

    assert.equal(context.memoryRecordCount, 1);
    assert.ok(context.previousDecisions.memory.some((entry) => entry.summary.includes('Fused journal decision')));
    assert.match(formatGraphRagContextForPrompt(context), /Memory worker slice/);
  });
});
