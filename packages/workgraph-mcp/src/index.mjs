#!/usr/bin/env node

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  addWorkItemEvidence,
  assertTaskReadyForDone,
  attachWorkItemUiReference,
  claimWorkItem,
  completeWorkItem,
  createWorkItem,
  getBacklogSnapshot,
  getCurrentCycle,
  getEpicWorkScope,
  getActiveWorkspace,
  getArchitectureSnapshot,
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
  querySemanticFieldMcp,
  detectSemanticDriftMcp,
  getContextSliceMcp,
  findSemanticVoidsMcp,
  getWorkContract,
  getAnalyticsLineage,
  getWorkItem,
  getWorkItemPipeline,
  gitSnapshot,
  listEvidenceRecords,
  listMemoryRecords,
  listWorkItems,
  listWorkItemUiReferences,
  readWorkGraphResource,
  readWorkItemAtomResource,
  recordWorkItemAnalysisFromMcp,
  recordWorkItemDecisionFromMcp,
  resolveWorkGraphRoot,
  semanticSearch,
  onebaseCheckConfig,
  onebaseDescribeConfig,
  onebaseListMetadata,
  onebaseReadConfigFile,
  onebaseRestGet,
  onebaseRestWriteExecute,
  onebaseRestWritePrepare,
  updateWorkItemStatus,
  validateEvidence,
} from './handlers.mjs';
import { toMcpPromptResult, workgraphPrompts } from './prompts.mjs';

const server = new McpServer({ name: 'workgraph-mcp', version: '0.1.0' });

const jsonText = (value) => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});

const rootOptions = () => ({ root: resolveWorkGraphRoot() });

server.tool(
  'list_work_items',
  'List WorkGraph WorkItems from the intent tree',
  {
    status: z.string().optional().describe('Optional exact work.status filter'),
    query: z.string().optional().describe('Optional text query over id/title/role/files'),
    limit: z.number().optional().describe('Maximum rows, 1..200'),
  },
  async (args) => jsonText(await listWorkItems(args, rootOptions())),
);

server.tool(
  'get_work_item',
  'Read one WorkGraph WorkItem by id',
  { workId: z.string().describe('WorkItem id') },
  async (args) => jsonText(await getWorkItem(args, rootOptions())),
);

server.tool(
  'get_backlog_snapshot',
  'Read the full WorkGraph snapshot derived from intent tree files',
  {},
  async () => jsonText(await getBacklogSnapshot({}, rootOptions())),
);

server.tool(
  'get_current_cycle',
  'Read current WorkGraph cycle/queue summary',
  {},
  async () => jsonText(await getCurrentCycle({}, rootOptions())),
);

server.tool(
  'get_promote_ready_queue',
  'List backlog WorkItems eligible for promote-ready (minPhase defaults to 8; use 0 for all phases)',
  {
    minPhase: z.number().optional().describe('Minimum phase number (default 8; 0 includes phases 0–7)'),
    limit: z.number().optional().describe('Maximum queue rows, 1..200'),
  },
  async (args) => jsonText(await getPromoteReadyQueue(args, rootOptions())),
);

server.tool(
  'get_intent_hierarchy',
  'Read intent.hierarchy.snapshot.v1 derived from WorkItems (domain/feature taxonomy)',
  {},
  async () => jsonText(await getIntentHierarchy({}, rootOptions())),
);

server.tool(
  'get_architecture_snapshot',
  'Read architecture.snapshot.v1 L1 blocks and edges for Work Graph rebuild',
  {
    focusBlockId: z.string().optional().describe('Optional architecture block id to focus'),
  },
  async (args) => jsonText(await getArchitectureSnapshot(args, rootOptions())),
);

server.tool(
  'get_unified_linkage',
  'Read unified-linkage.projection.v1 (trace links, planning edges, reverse markers)',
  {},
  async () => jsonText(await getUnifiedLinkage({}, rootOptions())),
);

server.tool(
  'query_intent_plane',
  'Navigate information plane subgraph from a start node (work/analytics) with direction and depth',
  {
    startNode: z.object({
      kind: z.string().optional(),
      id: z.string(),
    }).optional(),
    workId: z.string().optional().describe('Shortcut for startNode.id when kind=work'),
    direction: z.string().optional().describe('downstream | upstream | lateral | both'),
    depth: z.number().optional().describe('Traversal depth 0..3'),
    returnFormat: z.string().optional().describe('json | markdown'),
  },
  async (args) => jsonText(await queryIntentPlaneMcp(args, rootOptions())),
);

server.tool(
  'query_semantic_field',
  'Semantic search over work items and linked files with optional scope anchor',
  {
    q: z.string().describe('Semantic query'),
    query: z.string().optional(),
    workId: z.string().optional(),
    scope: z.object({ workId: z.string().optional() }).optional(),
    depth: z.number().optional(),
    limit: z.number().optional(),
    mode: z.string().optional(),
  },
  async (args) => jsonText(await querySemanticFieldMcp(args, rootOptions())),
);

server.tool(
  'detect_semantic_drift',
  'Compute lexical drift_score between BVC goal/vector and target files/evidence',
  {
    workId: z.string().describe('WorkItem id'),
  },
  async (args) => jsonText(await detectSemanticDriftMcp(args, rootOptions())),
);

server.tool(
  'get_context_slice',
  'Agent context bundle: graph RAG + drift metrics + optional semantic field',
  {
    workId: z.string().describe('WorkItem id'),
    q: z.string().optional(),
    maxTokens: z.number().optional(),
  },
  async (args) => jsonText(await getContextSliceMcp(args, rootOptions())),
);

server.tool(
  'find_semantic_voids',
  'List semantic voids: work without evidence, orphan files, orphan analytics',
  {
    domain: z.string().optional().describe('Filter by work.department'),
    tier: z.string().optional(),
  },
  async (args) => jsonText(await findSemanticVoidsMcp(args, rootOptions())),
);

server.tool(
  'get_epic_work_scope',
  'Read compact read-only epic scope rollup (direct children with work.status) for chat/UI',
  {
    epicId: z.string().describe('Epic WorkItem id'),
  },
  async (args) => jsonText(await getEpicWorkScope(args, rootOptions())),
);

server.tool(
  'get_pvrg_task_scope',
  'Read bounded pvrg.task-scope.slice.v1 subgraph for one WorkItem',
  {
    workId: z.string().describe('Seed WorkItem id'),
    maxNodes: z.number().optional().describe('Maximum nodes in subgraph (default 24)'),
    maxDepth: z.number().optional().describe('Maximum depends_on expansion depth (default 2)'),
  },
  async (args) => jsonText(await getPvrgTaskScope(args, rootOptions())),
);

server.tool(
  'get_graph_rag_context',
  'Read pvrg.graph_rag.context.v1 for one WorkItem (WorkItems, files, evidence, memory — same bundle as WG worker prompt)',
  {
    workId: z.string().describe('Seed WorkItem id'),
    maxNodes: z.number().optional().describe('Maximum nodes in graph RAG slice (default 32)'),
    maxDepth: z.number().optional().describe('Maximum depends_on expansion depth (default 2)'),
  },
  async (args) => jsonText(await getGraphRagContext(args, rootOptions())),
);

server.tool(
  'list_memory_records',
  'List memory-record.v1 entries (derived from done WorkItems + journal)',
  {
    workId: z.string().optional().describe('Filter by sourceWorkItem or relatedTasks'),
    type: z.string().optional().describe('Filter by memory type (decision, invariant, ...)'),
    status: z.string().optional().describe('Filter by status (active, draft, needs-review)'),
    query: z.string().optional().describe('Optional text query over id/summary/files'),
    limit: z.number().optional().describe('Maximum rows, 1..200'),
  },
  async (args) => jsonText(await listMemoryRecords(args, rootOptions())),
);

server.tool(
  'get_memory_record',
  'Read one memory-record.v1 by id',
  { recordId: z.string().describe('MemoryRecord id') },
  async (args) => jsonText(await getMemoryRecord(args, rootOptions())),
);

server.tool(
  'list_evidence_records',
  'List evidence-record.v1 entries (from WorkItem evidence strings)',
  {
    workId: z.string().optional().describe('Filter by taskId'),
    type: z.string().optional().describe('Filter by evidence type'),
    status: z.string().optional().describe('Filter by status (succeeded, failed)'),
    query: z.string().optional().describe('Optional text query'),
    limit: z.number().optional().describe('Maximum rows, 1..200'),
  },
  async (args) => jsonText(await listEvidenceRecords(args, rootOptions())),
);

server.tool(
  'get_evidence_record',
  'Read one evidence-record.v1 by id',
  { recordId: z.string().describe('EvidenceRecord id') },
  async (args) => jsonText(await getEvidenceRecord(args, rootOptions())),
);

server.tool(
  'get_operator_shell_snapshot',
  'Read operator-shell.snapshot.v2 (intent sidebar, cross-highlight, cycle slice)',
  {},
  async () => jsonText(await getOperatorShellSnapshot({}, rootOptions())),
);

server.tool(
  'get_step_graph_projection',
  'Read step-graph.projection.v1 from repo .bvc/.bvc files (refs between blocks, no UI)',
  {
    maxNodes: z.number().optional().describe('Optional cap on returned nodes'),
    roots: z.string().optional().describe('Comma-separated scan roots (default charter,protocols,plans,intent,...)'),
  },
  async (args) => jsonText(await getStepGraphProjection(args, rootOptions())),
);

server.tool(
  'get_step_graph_slice',
  'Read bounded step-graph.slice.v1 around one step block (semantic map headless)',
  {
    seedStepName: z.string().optional().describe('Step block name (#Name)'),
    seedPath: z.string().optional().describe('Logical .bvc or legacy .bvc path containing the block'),
    seedNodeId: z.string().optional().describe('Full node id path\\u001fStepName'),
    maxNodes: z.number().optional().describe('Maximum nodes (default 32)'),
    maxDepth: z.number().optional().describe('Expansion depth (default 2)'),
  },
  async (args) => jsonText(await getStepGraphSlice(args, rootOptions())),
);

server.tool(
  'update_work_item_status',
  'Update WorkItem status through WorkGraph policy gates',
  {
    workId: z.string().describe('WorkItem id'),
    status: z.string().describe('Target status: backlog, ready, claimed, doing, verify, done, blocked'),
    reason: z.string().optional().describe('Required for blocked; useful audit reason otherwise'),
    evidence: z.string().optional().describe('Evidence line, required by policy for done'),
  },
  async (args) => jsonText(await updateWorkItemStatus(args, rootOptions())),
);

server.tool(
  'add_work_item_evidence',
  'Append evidence to a WorkItem (prose and/or structured evidence-record.v1 JSON)',
  {
    workId: z.string().describe('WorkItem id'),
    evidence: z.string().optional().describe('Prose evidence line to append'),
    structuredEvidence: z.union([z.record(z.unknown()), z.string()]).optional()
      .describe('Optional evidence-record.v1 object or JSON string (type, command, exitCode, status)'),
  },
  async (args) => jsonText(await addWorkItemEvidence(args, rootOptions())),
);

server.tool(
  'claim_work_item',
  'Claim the next ready WorkItem or a specific ready WorkItem',
  {
    workId: z.string().optional().describe('Optional ready WorkItem id; omitted means claimNext'),
    evidence: z.string().optional().describe('Optional evidence line for the claim'),
  },
  async (args) => jsonText(await claimWorkItem(args, rootOptions())),
);

server.tool(
  'complete_work_item',
  'Mark a WorkItem done with required evidence',
  {
    workId: z.string().describe('WorkItem id'),
    evidence: z.string().describe('Required evidence line'),
  },
  async (args) => jsonText(await completeWorkItem(args, rootOptions())),
);

server.tool(
  'git_snapshot',
  'Create an opt-in scoped git commit for explicit paths (no push, no wildcards)',
  {
    event: z.string().optional().describe('Snapshot event id, e.g. work_item.done or analytics.created'),
    workId: z.string().optional().describe('Optional WorkItem id for commit message'),
    analyticsKey: z.string().optional().describe('Optional analytics key for commit message'),
    title: z.string().optional().describe('Optional title for commit message'),
    paths: z.array(z.string()).optional().describe('Explicit repo-relative paths to stage'),
  },
  async (args) => jsonText(await gitSnapshot(args, rootOptions())),
);

server.tool(
  'get_work_contract',
  'Return work-item-contract.v1 projection for a WorkItem (input/output/verification)',
  { workId: z.string().describe('WorkItem id') },
  async (args) => jsonText(await getWorkContract(args, rootOptions())),
);

server.tool(
  'assert_task_ready_for_done',
  'Dry-run readiness check before complete_work_item; returns violations[]',
  { workId: z.string().describe('WorkItem id') },
  async (args) => jsonText(await assertTaskReadyForDone(args, rootOptions())),
);

server.tool(
  'validate_evidence',
  'Validate structured evidence JSON against task contract and evidence-record-v1',
  {
    workId: z.string().describe('WorkItem id'),
    evidenceJson: z.union([z.string(), z.record(z.unknown())]).describe('Structured evidence JSON or JSON string'),
  },
  async (args) => jsonText(await validateEvidence(args, rootOptions())),
);

server.tool(
  'get_analytics_lineage',
  'Return analytics-lineage.projection.v1 for an analytics record (parent, continuations, related)',
  {
    recordKey: z.string().optional().describe('Analytics key e.g. AN-50.1'),
    recordId: z.string().optional().describe('Analytics record id e.g. analytics:work-graph-bvc-contract-verification'),
  },
  async (args) => jsonText(await getAnalyticsLineage(args, rootOptions())),
);

server.tool(
  'create_work_item',
  'Create a new WorkItem atom in intent tree as *.work.bvc (legacy *.work.bvc read-only)',
  {
    workId: z.string().describe('Unique work.id slug'),
    title: z.string().describe('Human title'),
    basis: z.string().optional().describe('Basis text or newline-separated bullets'),
    vector: z.string().optional().describe('Vector text or newline-separated bullets'),
    goal: z.string().optional().describe('Goal text or newline-separated bullets'),
    department: z.string().optional().describe('e.g. domain-onebase, agent-platform'),
    ownerRole: z.string().optional().describe('work.owner_role'),
    priority: z.string().optional().describe('low | medium | high | critical'),
    risk: z.string().optional().describe('low | medium | high'),
    status: z.string().optional().describe('Default backlog'),
    nextAction: z.string().optional().describe('work.next_action hint'),
    dependsOn: z.string().optional().describe('Comma-separated work ids'),
    parentId: z.string().optional().describe('Parent work.id for subtasks (work.parent_id)'),
    itemKind: z.enum(['epic', 'subtask', 'task']).optional().describe('work.item_kind: epic | subtask | task'),
    targetFiles: z.string().optional().describe('Comma-separated relative file paths'),
    checks: z.string().optional().describe('Newline-separated readiness checks'),
    analysis: z.string().optional().describe('Newline-separated «Анализ» lines; auto-generated if omitted'),
    decision: z.string().optional().describe('Newline-separated «Решение» lines; auto-generated if omitted'),
    decisionVerdict: z.enum(['useful', 'harmful', 'defer']).optional().describe('Default useful'),
    intakeSourceKind: z.string().optional().describe('e.g. analytics-record'),
    intakeSourceRef: z.string().optional().describe('e.g. analytics:graph-canvas-layout-mess'),
    analyticsKey: z.string().optional().describe('e.g. AN-1'),
  },
  async (args) => {
    const parsed = {
      ...args,
      dependsOn: args.dependsOn?.split(',').map((entry) => entry.trim()).filter(Boolean),
      targetFiles: args.targetFiles?.split(',').map((entry) => entry.trim()).filter(Boolean),
    };
    return jsonText(await createWorkItem(parsed, rootOptions()));
  },
);

server.tool(
  'get_work_item_pipeline',
  'Read analyze/decide pipeline state for one WorkItem (analysis and decision live on the atom)',
  { workId: z.string().describe('WorkItem id') },
  async (args) => jsonText(await getWorkItemPipeline(args, rootOptions())),
);

server.tool(
  'record_work_item_analysis',
  'Write pre-execution feasibility analysis into WorkItem «Анализ» (стоит ли делать; not post-factum review). Text must come from the connected agent LLM — server does not call models.',
  {
    workId: z.string().describe('WorkItem id'),
    analysis: z.string().describe('Full analysis text produced by the connected agent'),
  },
  async (args) => jsonText(await recordWorkItemAnalysisFromMcp(args, rootOptions())),
);

server.tool(
  'record_work_item_decision',
  'Record operator verdict useful|harmful|defer into «Решение» after analysis',
  {
    workId: z.string().describe('WorkItem id'),
    verdict: z.enum(['useful', 'harmful', 'defer']).describe('Pipeline decision'),
    notes: z.string().describe('Decision rationale (required)'),
  },
  async (args) => jsonText(await recordWorkItemDecisionFromMcp(args, rootOptions())),
);

server.tool(
  'list_work_item_ui_references',
  'List UI reference screenshots attached to a WorkItem (ui-facing tasks)',
  { workId: z.string().describe('WorkItem id') },
  async (args) => jsonText(await listWorkItemUiReferences(args, rootOptions())),
);

server.tool(
  'attach_work_item_ui_reference',
  'Attach a UI reference screenshot (base64) to a WorkItem; updates atom labels and Референсы_UI section',
  {
    workId: z.string().describe('WorkItem id'),
    filename: z.string().describe('Original filename with extension (.png, .jpg, .webp, .gif)'),
    contentBase64: z.string().describe('Base64-encoded image bytes'),
    caption: z.string().optional().describe('Optional caption shown in task card'),
    force: z.boolean().optional().describe('Allow attach on non-UI tasks when true'),
  },
  async (args) => jsonText(await attachWorkItemUiReference(args, rootOptions())),
);

server.resource(
  'workgraph-workspace-active',
  'workgraph://workspace/active',
  { description: 'Active multiproject workspace from registry vs MCP effective repoRoot', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-backlog',
  'workgraph://backlog',
  { description: 'Full WorkGraph snapshot', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-current-cycle',
  'workgraph://cycle/current',
  { description: 'Current WorkGraph cycle summary', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-intent-hierarchy',
  'workgraph://intent/hierarchy',
  { description: 'Intent hierarchy snapshot (domains and classified nodes)', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-architecture-snapshot',
  'workgraph://architecture/snapshot',
  { description: 'Architecture L1 snapshot with blocks and edges', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-linkage-projection',
  'workgraph://linkage/projection',
  { description: 'Unified linkage projection (step/code/task edges)', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-step-graph-projection',
  'workgraph://step-graph/projection',
  { description: 'Step graph projection from .bvc block refs', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-memory-records',
  'workgraph://memory/records',
  { description: 'Project memory records (memory-record-list.v1)', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-evidence-records',
  'workgraph://evidence/records',
  { description: 'Evidence records (evidence-record-list.v1)', mimeType: 'application/json' },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await readWorkGraphResource(uri.href, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-graph-rag-context',
  new ResourceTemplate('workgraph://pvrg/graph-rag/{workId}', {
    list: async () => {
      const items = await listWorkItems({ limit: 200 }, rootOptions());
      return {
        resources: items.map((item) => ({
          name: item.id,
          uri: `workgraph://pvrg/graph-rag/${encodeURIComponent(item.id)}`,
          description: `Graph RAG context: ${item.title}`,
          mimeType: 'application/json',
        })),
      };
    },
    complete: {
      workId: async (value) => {
        const query = String(value ?? '').toLowerCase();
        const items = await listWorkItems({ limit: 200 }, rootOptions());
        return items
          .map((item) => item.id)
          .filter((id) => id.toLowerCase().includes(query))
          .slice(0, 50);
      },
    },
  }),
  { description: 'Graph RAG context for one WorkItem', mimeType: 'application/json' },
  async (uri, variables) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await getGraphRagContext({ workId: variables.workId }, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-memory-record',
  new ResourceTemplate('workgraph://memory/record/{recordId}', {
    complete: {
      recordId: async (value) => {
        const query = String(value ?? '').toLowerCase();
        const list = await listMemoryRecords({ limit: 200 }, rootOptions());
        return list.records
          .map((record) => record.id)
          .filter((id) => id.toLowerCase().includes(query))
          .slice(0, 50);
      },
    },
  }),
  { description: 'Single memory-record.v1 by id', mimeType: 'application/json' },
  async (uri, variables) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await getMemoryRecord({ recordId: variables.recordId }, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-evidence-record',
  new ResourceTemplate('workgraph://evidence/record/{recordId}', {
    complete: {
      recordId: async (value) => {
        const query = String(value ?? '').toLowerCase();
        const list = await listEvidenceRecords({ limit: 200 }, rootOptions());
        return list.records
          .map((record) => record.id)
          .filter((id) => id.toLowerCase().includes(query))
          .slice(0, 50);
      },
    },
  }),
  { description: 'Single evidence-record.v1 by id', mimeType: 'application/json' },
  async (uri, variables) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await getEvidenceRecord({ recordId: variables.recordId }, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-item',
  new ResourceTemplate('workgraph://item/{workId}', {
    list: async () => {
      const items = await listWorkItems({ limit: 200 }, rootOptions());
      return {
        resources: items.map((item) => ({
          name: item.id,
          uri: `workgraph://item/${encodeURIComponent(item.id)}`,
          description: item.title,
          mimeType: 'application/json',
        })),
      };
    },
    complete: {
      workId: async (value) => {
        const query = String(value ?? '').toLowerCase();
        const items = await listWorkItems({ limit: 200 }, rootOptions());
        return items
          .map((item) => item.id)
          .filter((id) => id.toLowerCase().includes(query))
          .slice(0, 50);
      },
    },
  }),
  { description: 'Parsed WorkItem by id', mimeType: 'application/json' },
  async (uri, variables) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await getWorkItem({ workId: variables.workId }, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-contract',
  new ResourceTemplate('workgraph://contract/{workId}', {
    list: async () => {
      const items = await listWorkItems({ limit: 200 }, rootOptions());
      return {
        resources: items.map((item) => ({
          name: item.id,
          uri: `workgraph://contract/${encodeURIComponent(item.id)}`,
          description: `Work contract: ${item.title}`,
          mimeType: 'application/json',
        })),
      };
    },
    complete: {
      workId: async (value) => {
        const query = String(value ?? '').toLowerCase();
        const items = await listWorkItems({ limit: 200 }, rootOptions());
        return items
          .map((item) => item.id)
          .filter((id) => id.toLowerCase().includes(query))
          .slice(0, 50);
      },
    },
  }),
  { description: 'work-item-contract.v1 projection by WorkItem id', mimeType: 'application/json' },
  async (uri, variables) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await getWorkContract({ workId: variables.workId }, rootOptions()), null, 2),
    }],
  }),
);

server.resource(
  'workgraph-epic-scope',
  new ResourceTemplate('workgraph://epic/{epicId}/scope', {
    list: async () => {
      const items = await listWorkItems({ limit: 200 }, rootOptions());
      return {
        resources: items
          .filter((item) => String(item.id).startsWith('epic-'))
          .map((item) => ({
            name: item.id,
            uri: `workgraph://epic/${encodeURIComponent(item.id)}/scope`,
            description: `Epic scope: ${item.title}`,
            mimeType: 'application/json',
          })),
      };
    },
    complete: {
      epicId: async (value) => {
        const query = String(value ?? '').toLowerCase();
        const items = await listWorkItems({ limit: 200 }, rootOptions());
        return items
          .map((item) => item.id)
          .filter((id) => id.toLowerCase().includes(query))
          .slice(0, 50);
      },
    },
  }),
  { description: 'Read-only epic child scope rollup', mimeType: 'application/json' },
  async (uri, variables) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(await getEpicWorkScope({ epicId: variables.epicId }, rootOptions()), null, 2),
    }],
  }),
);

server.tool(
  'read_work_item_atom',
  'Read raw .work.bvc atom text for a WorkItem',
  { workId: z.string().describe('WorkItem id') },
  async ({ workId }) => ({
    content: [{ type: 'text', text: await readWorkItemAtomResource(workId, rootOptions()) }],
  }),
);

server.tool(
  'semantic_search',
  'Lexical or hybrid semantic search over WorkItems and linked target files',
  {
    query: z.string().describe('Search query (min 2-char tokens)'),
    limit: z.number().optional().describe('Maximum hits, 1..200 (default 12)'),
    mode: z.string().optional().describe('lexical-v1 | hybrid-lexical-bm25-v1 | hybrid-lexical-bm25-tfidf-v1'),
  },
  async (args) => jsonText(await semanticSearch(args, rootOptions())),
);

server.tool(
  'onebase_list_metadata',
  'List bounded OneBase metadata artifacts (catalogs, documents, registers, reports, constants, widgets)',
  {
    onebaseRoot: z.string().optional().describe('Optional OneBase project/root path; defaults to WORKGRAPH_ROOT / cwd'),
  },
  async (args) => jsonText(await onebaseListMetadata(args, rootOptions())),
);

server.tool(
  'onebase_read_config_file',
  'Read one bounded OneBase config artifact and extracted facts',
  {
    relativePath: z.string().describe('Path inside OneBase root under metadata dirs, src/*.os, or examples/'),
    onebaseRoot: z.string().optional().describe('Optional OneBase project/root path; defaults to WORKGRAPH_ROOT / cwd'),
    maxChars: z.number().optional().describe('Maximum returned text characters (default 32000)'),
  },
  async (args) => jsonText(await onebaseReadConfigFile(args, rootOptions())),
);

server.tool(
  'onebase_describe_config',
  'Run onebase describe --json for a bounded OneBase project and return evidence',
  {
    projectRoot: z.string().optional().describe('Optional OneBase project path; defaults to onebaseRoot'),
    onebaseRoot: z.string().optional().describe('Optional OneBase root/project path'),
    taskId: z.string().optional().describe('Evidence task id for records'),
  },
  async (args) => jsonText(await onebaseDescribeConfig(args, rootOptions())),
);

server.tool(
  'onebase_check_config',
  'Run onebase check for a bounded OneBase project and return evidence',
  {
    projectRoot: z.string().optional().describe('Optional OneBase project path; defaults to onebaseRoot'),
    onebaseRoot: z.string().optional().describe('Optional OneBase root/project path'),
    taskId: z.string().optional().describe('Evidence task id for records'),
  },
  async (args) => jsonText(await onebaseCheckConfig(args, rootOptions())),
);

server.tool(
  'onebase_rest_get',
  'Run a safe GET-only OneBase REST read against allowlisted endpoints and return evidence',
  {
    path: z.string().describe('Relative OneBase REST path: /catalogs/*, /documents/*, /registers/*, /reports/*, /widgets/*, /health, /status'),
    baseUrl: z.string().optional().describe('Optional OneBase API base URL; defaults to ONEBASE_API_BASE_URL'),
    taskId: z.string().optional().describe('Evidence task id for records'),
  },
  async (args) => jsonText(await onebaseRestGet(args, rootOptions())),
);

server.tool(
  'onebase_rest_write_prepare',
  'Prepare a narrow OneBase REST write and return a confirm token; does not mutate runtime',
  {
    path: z.string().describe('Allowlisted write path, e.g. /documents/<document>/<id>/post'),
    body: z.record(z.unknown()).optional().describe('JSON request body'),
    taskId: z.string().optional().describe('Evidence task id for records'),
  },
  async (args) => jsonText(await onebaseRestWritePrepare(args, rootOptions())),
);

server.tool(
  'onebase_rest_write_execute',
  'Execute a prepared OneBase REST write only when confirmToken matches the prepared request',
  {
    path: z.string().describe('Allowlisted write path, e.g. /documents/<document>/<id>/post'),
    body: z.record(z.unknown()).optional().describe('JSON request body; must match prepare step'),
    confirmToken: z.string().describe('Confirm token from onebase_rest_write_prepare'),
    confirmedBy: z.string().optional().describe('Operator/user who confirmed execution'),
    baseUrl: z.string().optional().describe('Optional OneBase API base URL; defaults to ONEBASE_API_BASE_URL'),
    taskId: z.string().optional().describe('Evidence task id for records'),
  },
  async (args) => jsonText(await onebaseRestWriteExecute(args, rootOptions())),
);

for (const [name, prompt] of Object.entries(workgraphPrompts)) {
  const argsSchema = Object.fromEntries(
    Object.entries(prompt.argsSchema).map(([key, description]) => [
      key,
      z.string().optional().describe(description),
    ]),
  );
  server.prompt(name, prompt.description, argsSchema, (args) => toMcpPromptResult(name, args));
}

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
