import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1,
  searchSemanticWorkflowAsync,
} from '../src/semanticSearchWorkflow.mjs';
import {
  addWorkItemEvidence,
  claimWorkItem,
  completeWorkItem,
  createWorkItem,
  getArchitectureSnapshot,
  getAnalyticsLineage,
  getBacklogSnapshot,
  getCurrentCycle,
  getEvidenceRecord,
  getGraphRagContext,
  getIntentHierarchy,
  getMemoryRecord,
  getOperatorShellSnapshot,
  getPromoteReadyQueue,
  getPvrgTaskScope,
  getStepGraphProjection,
  getStepGraphSlice,
  getUnifiedLinkage,
  queryIntentPlaneMcp,
  detectSemanticDriftMcp,
  getContextSliceMcp,
  getWorkItem,
  listEvidenceRecords,
  listMemoryRecords,
  listWorkItems,
  readWorkGraphResource,
  readWorkItemAtomResource,
  semanticSearch,
  updateWorkItemStatus,
} from '../packages/workgraph-mcp/src/handlers.mjs';
import { toMcpPromptResult, workgraphPrompts } from '../packages/workgraph-mcp/src/prompts.mjs';

const DONE_TASK = `#Задача_done_task<[
Базис:
  Done task.
Вектор:
  Done vector.
Цель:
  Done goal.
Свидетельства:
  npm test passed.

Метки:
  atom.profile: work_item
  work.id: done-task
  work.title: Done task
  work.status: done
  work.owner_role: engineer
  work.department: agent-platform
  work.priority: high
  trace.status: verified
]>
`;

const READY_TASK = `#Задача_ready_task<[
Базис:
  Ready task.
Вектор:
  Ready vector.
Цель:
  Ready goal.
Анализ:
  Fixture analysis for gate tests.
Решение:
  Verdict: useful
  Approved in fixture.

Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready task
  work.status: ready
  work.owner_role: engineer
  work.department: agent-platform
  work.depends_on: done-task
  work.priority: high
  work.decision.verdict: useful
  trace.status: pending
]>
`;

const BLOCKED_TASK = `#Задача_blocked_task<[
Базис:
  Blocked task.
Вектор:
  Blocked vector.
Цель:
  Blocked goal.

Метки:
  atom.profile: work_item
  work.id: blocked-task
  work.title: Blocked task
  work.status: backlog
  work.owner_role: engineer
  work.department: agent-platform
  work.depends_on: missing-task
  work.next_action: wait
  trace.status: pending
]>
`;

describe('workgraph MCP handlers', () => {
  it('lists, reads and exposes snapshot resources from intent tree', async () => {
    const root = await createFixture();
    try {
      const items = await listWorkItems({ status: 'ready' }, { root });
      assert.deepEqual(items.map((item) => item.id), ['ready-task']);

      const item = await getWorkItem({ workId: 'done-task' }, { root });
      assert.equal(item.status, 'done');

      const snapshot = await getBacklogSnapshot({}, { root });
      assert.equal(snapshot.items.length, 3);

      const current = await getCurrentCycle({}, { root });
      assert.equal(current.doneCount, 1);
      assert.deepEqual(current.readyQueue, ['ready-task']);

      const resource = await readWorkGraphResource('workgraph://item/ready-task', { root });
      assert.equal(resource.id, 'ready-task');

      const atomText = await readWorkItemAtomResource('ready-task', { root });
      assert.match(atomText, /work\.id: ready-task/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('applies guarded status and evidence updates to one intent file', async () => {
    const root = await createFixture();
    try {
      const claimed = await claimWorkItem({ workId: 'ready-task' }, { root });
      assert.equal(claimed.newStatus, 'doing');

      const claimedAtom = await readFile(join(root, 'intent/system/runtime/work/ready-task.work.bvc'), 'utf8');
      assert.match(claimedAtom, /work\.updated_by: workgraph-mcp/u);
      assert.match(claimedAtom, /work\.write\.operation: claim/u);

      const evidence = await addWorkItemEvidence({ workId: 'ready-task', evidence: 'mcp evidence line' }, { root });
      assert.equal(evidence.evidenceCount, 2);

      await assert.rejects(
        () => updateWorkItemStatus({ workId: 'blocked-task', status: 'done' }, { root }),
        /cannot mark done without evidence/u,
      );

      const completed = await completeWorkItem({ workId: 'ready-task', evidence: 'final verification passed' }, { root });
      assert.equal(completed.newStatus, 'done');

      const text = await readFile(join(root, 'intent/system/runtime/work/ready-task.work.bvc'), 'utf8');
      assert.match(text, /work\.status: done/u);
      assert.match(text, /final verification passed/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects second claim while lease is active', async () => {
    const root = await createFixture();
    try {
      const first = await claimWorkItem({ workId: 'ready-task', claimRunId: 'mcp-run-a' }, { root });
      assert.equal(first.newStatus, 'doing');

      await assert.rejects(
        () => claimWorkItem({ workId: 'ready-task', claimRunId: 'mcp-run-b' }, { root }),
        /Claim lease active for ready-task/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('creates a new WorkItem atom in intent tree', async () => {
    const root = await createFixture();
    try {
      const created = await createWorkItem({
        workId: 'mcp-created-task',
        title: 'MCP created task',
        department: 'agent-platform',
        basis: 'Created from MCP test.',
        vector: 'Verify create_work_item persists atom + index.',
        goal: 'Intent tree contains mcp-created-task.',
        targetFiles: ['packages/workgraph-mcp/src/handlers.mjs'],
      }, { root });

      assert.equal(created.ok, true);
      assert.equal(created.workId, 'mcp-created-task');

      const atomText = await readFile(
        join(root, 'intent/system/runtime/work/mcp-created-task.work.bvc'),
        'utf8',
      ).catch(() => readFile(
        join(root, 'intent/ui/dashboard/work/mcp-created-task.work.bvc'),
        'utf8',
      ));

      assert.match(atomText, /Анализ:/u);
      assert.match(atomText, /Решение:/u);
      assert.match(atomText, /work\.decision\.verdict: useful/u);

      assert.match(atomText, /work\.updated_by: workgraph-mcp/u);
      assert.match(atomText, /work\.write\.operation: create/u);
      assert.match(atomText, /work\.write\.at:/u);

      const items = await listWorkItems({}, { root });
      assert.ok(items.some((item) => item.id === 'mcp-created-task'));

      const indexText = await readFile(join(root, 'intent/index.bvc'), 'utf8');
      assert.match(indexText, /mcp-created-task/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('creates epic and subtask with itemKind and parentId in atom and projection', async () => {
    const root = await createFixture();
    try {
      await createWorkItem({
        workId: 'mcp-hierarchy-epic',
        title: 'MCP hierarchy epic',
        itemKind: 'epic',
        department: 'agent-platform',
      }, { root });

      await createWorkItem({
        workId: 'mcp-hierarchy-sub',
        title: 'MCP hierarchy subtask',
        itemKind: 'subtask',
        parentId: 'mcp-hierarchy-epic',
        department: 'agent-platform',
      }, { root });

      const epicAtom = await readFile(
        join(root, 'intent/system/runtime/work/mcp-hierarchy-epic.work.bvc'),
        'utf8',
      );
      assert.match(epicAtom, /work\.item_kind: epic/u);

      const subAtom = await readFile(
        join(root, 'intent/system/runtime/work/mcp-hierarchy-sub.work.bvc'),
        'utf8',
      );
      assert.match(subAtom, /work\.item_kind: subtask/u);
      assert.match(subAtom, /work\.parent_id: mcp-hierarchy-epic/u);

      const epicItem = await getWorkItem({ workId: 'mcp-hierarchy-epic' }, { root });
      assert.equal(epicItem.itemKind, 'epic');

      const subItem = await getWorkItem({ workId: 'mcp-hierarchy-sub' }, { root });
      assert.equal(subItem.itemKind, 'subtask');
      assert.equal(subItem.parentId, 'mcp-hierarchy-epic');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects subtask create_work_item without parentId', async () => {
    const root = await createFixture();
    try {
      await assert.rejects(
        () => createWorkItem({
          workId: 'mcp-orphan-subtask',
          title: 'Orphan subtask',
          itemKind: 'subtask',
          department: 'agent-platform',
        }, { root }),
        (error) => error.code === 'subtask_requires_parent_id',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('runs lexical semantic search over intent tree WorkItems', async () => {
    const root = await createFixture();
    try {
      const result = await semanticSearch({ query: 'ready task' }, { root });
      assert.equal(result.schema, 'semantic-search.result.v1');
      assert.equal(result.mode, 'lexical-v1');
      assert.ok(result.hitCount >= 1);
      assert.ok(result.hits.some((hit) => hit.workId === 'ready-task'));
      assert.ok(result.hits.some((hit) => hit.traceRefs?.includes('work:ready-task')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('exposes intent graph MCP handlers and resources', async () => {
    const root = await createFixture();
    try {
      const hierarchy = await getIntentHierarchy({}, { root });
      assert.equal(hierarchy.schema, 'intent.hierarchy.snapshot.v1');
      assert.ok(hierarchy.domains.length >= 1);

      const architecture = await getArchitectureSnapshot({}, { root });
      assert.equal(architecture.schema, 'architecture.snapshot.v1');
      assert.ok(architecture.blocks.length >= 1);

      const linkage = await getUnifiedLinkage({}, { root });
      assert.equal(linkage.schema, 'unified-linkage.projection.v1');
      assert.ok(Array.isArray(linkage.links));

      const scope = await getPvrgTaskScope({ workId: 'ready-task' }, { root });
      assert.equal(scope.schema, 'pvrg.task-scope.slice.v1');
      assert.equal(scope.seedWorkId, 'ready-task');
      assert.ok(scope.nodes.some((node) => node.kind === 'work' && node.id === 'ready-task'));

      const shell = await getOperatorShellSnapshot({}, { root });
      assert.equal(shell.schema, 'operator-shell.snapshot.v2');
      assert.ok(shell.intentSidebar.domains.length >= 1);

      const hierarchyResource = await readWorkGraphResource('workgraph://intent/hierarchy', { root });
      assert.equal(hierarchyResource.schema, 'intent.hierarchy.snapshot.v1');

      const scopeResource = await readWorkGraphResource('workgraph://pvrg/scope/ready-task', { root });
      assert.equal(scopeResource.seedWorkId, 'ready-task');

      const projection = await getStepGraphProjection({}, { root });
      assert.equal(projection.schema, 'step-graph.projection.v1');
      assert.ok(projection.nodeCount >= 1);

      const stepGraphResource = await readWorkGraphResource('workgraph://step-graph/projection', { root });
      assert.equal(stepGraphResource.schema, 'step-graph.projection.v1');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('exposes cursor MCP context surface (graph RAG, memory, evidence)', async () => {
    const root = await createFixture();
    try {
      const graphRag = await getGraphRagContext({ workId: 'ready-task' }, { root });
      assert.equal(graphRag.schema, 'pvrg.graph_rag.context.v1');
      assert.equal(graphRag.seedWorkId, 'ready-task');
      assert.ok((graphRag.currentTaskContext?.workItems?.length ?? 0) >= 1);

      const memoryList = await listMemoryRecords({ workId: 'done-task' }, { root });
      assert.equal(memoryList.schema, 'memory-record-list.v1');
      assert.ok(memoryList.count >= 1);
      const memoryRecord = await getMemoryRecord({ recordId: memoryList.records[0].id }, { root });
      assert.equal(memoryRecord.schema, 'memory-record.v1');

      const evidenceList = await listEvidenceRecords({ workId: 'done-task' }, { root });
      assert.equal(evidenceList.schema, 'evidence-record-list.v1');
      assert.ok(evidenceList.count >= 1);
      const evidenceRecord = await getEvidenceRecord({ recordId: evidenceList.records[0].id }, { root });
      assert.equal(evidenceRecord.schema, 'evidence-record.v1');

      const graphRagResource = await readWorkGraphResource('workgraph://pvrg/graph-rag/ready-task', { root });
      assert.equal(graphRagResource.schema, 'pvrg.graph_rag.context.v1');

      const memoryResource = await readWorkGraphResource('workgraph://memory/records', { root });
      assert.equal(memoryResource.schema, 'memory-record-list.v1');

      const evidenceResource = await readWorkGraphResource('workgraph://evidence/records', { root });
      assert.equal(evidenceResource.schema, 'evidence-record-list.v1');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('defines reusable MCP workflow prompts', () => {
    assert.deepEqual(Object.keys(workgraphPrompts).sort(), [
      'add_evidence',
      'analyze_work_item',
      'close_work_item',
      'create_epic_subtasks',
      'create_work_item',
      'create_work_item_from_analytics',
      'show_blockers',
      'summarize_current_cycle',
      'take_next_work_item',
    ]);
    const result = toMcpPromptResult('close_work_item', { workId: 'ready-task' });
    assert.match(result.messages[0].content.text, /complete_work_item/u);
    assert.match(result.messages[0].content.text, /ready-task/u);

    const analyze = toMcpPromptResult('analyze_work_item', { workId: 'ready-task' });
    assert.match(analyze.messages[0].content.text, /before execution/u);
    assert.match(analyze.messages[0].content.text, /Целесообразность:/u);
    assert.match(analyze.messages[0].content.text, /NOT a post-factum/u);
    assert.match(analyze.messages[0].content.text, /present\/decision/u);

    const fromAnalytics = toMcpPromptResult('create_work_item_from_analytics', {
      analyticsKey: 'AN-77',
      analyticsBodyPath: 'work/analytics/foo.md',
      title: 'Test',
    });
    assert.match(fromAnalytics.messages[0].content.text, /create_work_item/u);
    assert.match(fromAnalytics.messages[0].content.text, /do NOT edit .work.bvc/iu);

    const epicSub = toMcpPromptResult('create_epic_subtasks', { epicWorkId: 'epic-test-v1' });
    assert.match(epicSub.messages[0].content.text, /itemKind=epic/u);
    assert.match(epicSub.messages[0].content.text, /parentId/u);
  });

  it('get_analytics_lineage resolves AN-50.1 parent from repo journal', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const result = await getAnalyticsLineage({ recordKey: 'AN-50.1' }, { root: repoRoot });
    assert.equal(result.schema, 'analytics-lineage.projection.v1');
    assert.equal(result.parent?.key, 'AN-50');
  });

  it('query_intent_plane returns downstream subgraph for fixture task', async () => {
    const root = await createFixture();
    try {
      const downstream = await queryIntentPlaneMcp({
        startNode: { id: 'ready-task' },
        direction: 'downstream',
        depth: 1,
      }, { root });
      assert.equal(downstream.schema, 'intent.plane.query.result.v1');
      assert.ok(downstream.nodes.some((node) => node.id === 'ready-task'));

      const upstream = await queryIntentPlaneMcp({
        startNode: { id: 'ready-task' },
        direction: 'upstream',
        depth: 1,
      }, { root });
      assert.notDeepEqual(
        downstream.edges.map((edge) => edge.to).sort(),
        upstream.edges.map((edge) => edge.from).sort(),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('detect_semantic_drift returns drift metrics for fixture task', async () => {
    const root = await createFixture();
    try {
      const drift = await detectSemanticDriftMcp({ workId: 'ready-task' }, { root });
      assert.equal(drift.schema, 'semantic.drift.result.v1');
      assert.ok(typeof drift.drift_score === 'number');
      assert.ok(Array.isArray(drift.reasons));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'wg-mcp-'));
  const base = join(root, 'intent/system/runtime/work');
  await mkdir(base, { recursive: true });
  await writeFile(join(root, 'intent/index.bvc'), `#Индекс_Intent_Tree_WorkItems<[
WorkItems:
  - blocked-task: intent/system/runtime/work/blocked-task.work.bvc
  - done-task: intent/system/runtime/work/done-task.work.bvc
  - ready-task: intent/system/runtime/work/ready-task.work.bvc

Метки:
  atom.profile: trace
  intent.index: work_items
  trace.status: pending
]>
`, 'utf8');
  await writeFile(join(base, 'done-task.work.bvc'), DONE_TASK, 'utf8');
  await writeFile(join(base, 'ready-task.work.bvc'), READY_TASK, 'utf8');
  await writeFile(join(base, 'blocked-task.work.bvc'), BLOCKED_TASK, 'utf8');
  return root;
}
