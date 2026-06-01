import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attachIntentGraphToAnalyticsRecords, buildIntentGraphProjection, resolveIntentBranchForAnalyticsRecord } from '../src/intentGraphProjection.mjs';
import { parseIntentNodes, readIntentNodesFromRepo } from '../src/intentNodeRuntime.mjs';
import { lintIntentNodeGraphReport } from '../src/intentNodeLint.mjs';
import { buildIntentRoadmapProjection } from '../src/intentRoadmapProjection.mjs';
import { join } from 'node:path';

const FIXTURE_TEXT = `#IntentNode_iq<[
Базис:
  Question?
Метки:
  atom.profile: intent_node
  intent.id: iq:test
  intent.node_kind: question
  intent.link.analytics_ref: analytics:test-record
  intent.title: Test question
]>

#IntentNode_option<[
Базис:
  Option A
Метки:
  atom.profile: intent_node
  intent.id: option-a
  intent.node_kind: option
  intent.parent_id: iq:test
  intent.title: Option A
]>

#IntentNode_decision<[
Базис:
  Decision
Метки:
  atom.profile: intent_node
  intent.id: decision:test-v1
  intent.node_kind: decision
  intent.parent_id: iq:test
  intent.link.option_id: option-a
  intent.title: Selected path
  intent.selected: true
]>
`;

describe('intentNodeRuntime', () => {
  it('parses intent_node atoms', () => {
    const nodes = parseIntentNodes(FIXTURE_TEXT);
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0].nodeKind, 'question');
    assert.equal(nodes[2].selected, true);
  });

  it('reads AN-3 seed nodes from repo', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const nodes = await readIntentNodesFromRepo({ cwd: repoRoot });
    assert.ok(nodes.some((node) => node.id === 'iq:intent-graph-storage'));
    assert.ok(nodes.some((node) => node.id === 'decision:intent-graph-storage-v1'));
  });
});

describe('intentGraphProjection', () => {
  it('builds question → options → decision branch for analytics record', () => {
    const nodes = parseIntentNodes(FIXTURE_TEXT);
    const projection = buildIntentGraphProjection(nodes, []);
    const record = { id: 'analytics:test-record', title: 'Test' };
    const branch = resolveIntentBranchForAnalyticsRecord(record, projection);

    assert.ok(branch);
    assert.equal(branch.question.id, 'iq:test');
    assert.equal(branch.options.length, 1);
    assert.equal(branch.selectedDecision?.id, 'decision:test-v1');
  });

  it('attaches intentGraph to analytics records', () => {
    const nodes = parseIntentNodes(FIXTURE_TEXT);
    const projection = buildIntentGraphProjection(nodes, []);
    const enriched = attachIntentGraphToAnalyticsRecords([
      { id: 'analytics:test-record', title: 'Test' },
    ], projection);

    assert.ok(enriched[0].intentGraph);
    assert.equal(enriched[0].selectedDecision?.id, 'decision:test-v1');
  });
});

describe('intentNodeLint', () => {
  it('passes valid AN-3 graph', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const nodes = await readIntentNodesFromRepo({ cwd: repoRoot });
    const report = lintIntentNodeGraphReport(nodes, []);
    assert.equal(report.ok, true, report.issues.map((issue) => issue.message).join('; '));
  });
});

describe('intentRoadmapProjection', () => {
  it('builds roadmap branch from decision-linked work items', () => {
    const nodes = parseIntentNodes(FIXTURE_TEXT);
    const workItems = [{
      id: 'task-root',
      status: 'backlog',
      title: 'Root task',
      dependsOn: [],
      evidence: [],
      checks: [],
      targetFiles: [],
      labels: { 'intent.decision_id': 'decision:test-v1' },
    }];
    const projection = buildIntentRoadmapProjection(nodes, workItems);
    assert.equal(projection.schema, 'workgraph.intent-roadmap.projection.v1');
    assert.equal(projection.branches.length, 1);
    assert.equal(projection.branches[0].roots[0].workId, 'task-root');
  });
});
