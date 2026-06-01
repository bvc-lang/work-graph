import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';
import { buildPvrgTaskScopeSlice } from '../src/pvrgTaskScope.mjs';
import { buildUnifiedLinkageProjectionV1 } from '../src/unifiedLinkageProjection.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import {
  buildTraceEnvelopeSnapshot,
  buildWorkItemTraceEnvelope,
  evaluateTraceVerifyGate,
  isCodeFacingWorkItem,
} from '../src/workItemTraceEnvelope.mjs';

describe('isCodeFacingWorkItem', () => {
  it('detects code paths and trace labels', () => {
    const codeItem = {
      id: 'code-task',
      targetFiles: ['src/runtime.mjs'],
      labels: {},
      evidence: [],
    };
    const designItem = {
      id: 'design-task',
      targetFiles: ['docs/plan.md'],
      labels: {},
      evidence: [],
    };

    assert.equal(isCodeFacingWorkItem(codeItem), true);
    assert.equal(isCodeFacingWorkItem(designItem), false);
  });
});

describe('buildWorkItemTraceEnvelope', () => {
  it('aggregates trace labels into envelope v1', () => {
    const item = {
      id: 'trace-task',
      targetFiles: ['src/runtime.mjs'],
      traceStatus: 'linked',
      evidence: ['npm test passed'],
      labels: {
        'trace.code_refs': 'src/runtime.mjs#parseWorkItems',
        'trace.source_step': 'protocols/step-code-trace-links-v1.bvc',
      },
    };

    const envelope = buildWorkItemTraceEnvelope(item);
    assert.equal(envelope.schema, 'workitem.trace-envelope.v1');
    assert.equal(envelope.workId, 'trace-task');
    assert.equal(envelope.codeFacing, true);
    assert.deepEqual(envelope.traceRefs['trace.code_refs'], ['src/runtime.mjs#parseWorkItems']);
  });
});

describe('evaluateTraceVerifyGate', () => {
  it('warns when done task has only target_files', () => {
    const item = {
      id: 'weak-trace',
      status: 'done',
      targetFiles: ['src/runtime.mjs'],
      traceStatus: 'verified',
      evidence: ['npm test passed'],
      labels: {},
    };

    const result = evaluateTraceVerifyGate(item, { targetStatus: 'done' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.diagnostics.map((diagnostic) => diagnostic.code), ['trace.weak_target_files_only']);
  });

  it('blocks verify when code-facing task has missing trace status', () => {
    const item = {
      id: 'missing-trace',
      status: 'ready',
      targetFiles: ['src/runtime.mjs'],
      traceStatus: 'missing',
      evidence: [],
      labels: {},
    };

    const result = evaluateTraceVerifyGate(item, { targetStatus: 'verify' });
    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'trace.envelope.verify_blocked'));
  });
});

describe('buildTraceEnvelopeSnapshot', () => {
  it('includes only code-facing envelopes from intent tree', async () => {
    const items = await readWorkItemsFromIntentTree();
    const snapshot = buildTraceEnvelopeSnapshot(items);

    assert.equal(snapshot.schema, 'workitem.trace-envelope.snapshot.v1');
    assert.ok(snapshot.count > 0);
    assert.ok(snapshot.envelopes.every((envelope) => envelope.codeFacing));
  });
});

describe('buildUnifiedLinkageProjectionV1', () => {
  it('merges trace links, planning edges and reverse markers', () => {
    const items = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace.
Вектор:
  Link.
Цель:
  Projection.

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
  Base.
Вектор:
  Base.
Цель:
  Base.

Метки:
  atom.profile: work_item
  work.id: base-task
  work.title: Base task
  work.status: done
]>
`);

    const projection = buildUnifiedLinkageProjectionV1(items, {
      fileContentsByPath: {
        'src/runtime.mjs': '// iohasc-ref: work:trace-task\n',
      },
    });

    assert.equal(projection.schema, 'unified-linkage.projection.v1');
    assert.ok(projection.linkCount >= 3);
    assert.equal(projection.markerCount, 1);
    assert.ok(projection.links.some((link) => link.sourceLabel === 'trace.code_refs'));
    assert.ok(projection.links.some((link) => link.sourceLabel === 'work.target_files'));
    assert.ok(projection.links.some((link) => link.sourceLabel === 'work.depends_on'));
  });
});

describe('buildPvrgTaskScopeSlice', () => {
  it('builds bounded subgraph from task seeds', () => {
    const items = parseWorkItems(`#Задача_trace_task<[
Базис:
  Trace.
Вектор:
  Link.
Цель:
  Scope.

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
  Base.
Вектор:
  Base.
Цель:
  Base.

Метки:
  atom.profile: work_item
  work.id: base-task
  work.title: Base task
  work.status: done
  work.target_files: src/base.mjs
]>
`);

    const slice = buildPvrgTaskScopeSlice(items, 'trace-task', { maxNodes: 10, maxDepth: 1 });
    assert.equal(slice.schema, 'pvrg.task-scope.slice.v1');
    assert.equal(slice.seedWorkId, 'trace-task');
    assert.ok(slice.nodeCount >= 2);
    assert.ok(slice.nodes.some((node) => node.kind === 'work' && node.id === 'base-task'));
    assert.ok(slice.nodes.some((node) => node.kind === 'file' && node.id === 'src/runtime.mjs'));
  });
});
