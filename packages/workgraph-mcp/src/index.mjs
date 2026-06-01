#!/usr/bin/env node

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  addWorkItemEvidence,
  attachWorkItemUiReference,
  claimWorkItem,
  completeWorkItem,
  createWorkItem,
  getBacklogSnapshot,
  getCurrentCycle,
  getEpicWorkScope,
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
  getWorkItem,
  getWorkItemPipeline,
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
  updateWorkItemStatus,
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
  'Append one evidence line to a WorkItem',
  {
    workId: z.string().describe('WorkItem id'),
    evidence: z.string().describe('Evidence line to append'),
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
  'Write pre-execution feasibility analysis into WorkItem «Анализ» (стоит ли делать; not post-factum review). Text must come from Cursor LLM — server does not call models.',
  {
    workId: z.string().describe('WorkItem id'),
    analysis: z.string().describe('Full analysis text produced in Cursor'),
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
