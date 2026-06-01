import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import { buildWorkItemLinkageDrilldown } from '../src/unifiedLinkageProjection.mjs';

const ITEMS = parseWorkItems(`#Задача_trace_task<[
Метки:
  atom.profile: work_item
  work.id: trace-task
  work.title: Trace task
  work.status: ready
  work.target_files: src/runtime.mjs
  work.depends_on: base-task
  trace.code_refs: src/runtime.mjs#parseWorkItems
  trace.source_step: protocols/trace-v1.bvc
  trace.status: linked
]>

#Задача_base_task<[
Метки:
  atom.profile: work_item
  work.id: base-task
  work.title: Base task
  work.status: done
]>
`);

describe('buildWorkItemLinkageDrilldown', () => {
  it('returns trace envelope refs and planning edges for operator drill-down', () => {
    const drilldown = buildWorkItemLinkageDrilldown('trace-task', ITEMS);

    assert.equal(drilldown.schema, 'workgraph.work-item-linkage-drilldown.v1');
    assert.equal(drilldown.workId, 'trace-task');
    assert.equal(drilldown.envelope.schema, 'workitem.trace-envelope.v1');
    assert.ok(drilldown.refs.some((entry) => entry.kind === 'file' && entry.ref === 'src/runtime.mjs'));
    assert.ok(drilldown.refs.some((entry) => entry.kind === 'step' && entry.ref === 'protocols/trace-v1.bvc'));
    assert.ok(drilldown.refs.some((entry) => entry.kind === 'work' && entry.ref === 'base-task'));
    assert.ok(drilldown.links.some((link) => link.relation === 'depends_on'));
  });
});
