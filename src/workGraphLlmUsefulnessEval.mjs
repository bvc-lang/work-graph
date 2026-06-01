import { buildGraphRagContextForWorkerInput, formatGraphRagContextForPrompt } from './graphRagContextSlice.mjs';
import { applyWorkerOutputToItem } from './agentWorkerLiveLoop.mjs';
import { runLocalWorker, buildWorkerInputFromTask } from './agentWorkerLocalRunner.mjs';
import { buildPromptEvalWorkGraphFixtureCatalog } from './workGraphToolSurfaceAudit.mjs';
import { parseWorkItems, transitionStatus } from './workGraphRuntime.mjs';
import { workgraphPrompts } from '../packages/workgraph-mcp/src/prompts.mjs';

export const LLM_USEFULNESS_EVAL_SCHEMA = 'workgraph.llm-usefulness.eval.v1';

export const MCP_READ_FIELDS_FOR_LLM = [
  'id',
  'title',
  'status',
  'targetFiles',
  'dependsOn',
  'nextAction',
  'checks',
  'evidence',
  'blocker',
  'ownerRole',
  'priority',
];

export const MCP_WRITE_TOOLS_V1 = [
  'create_work_item',
  'record_work_item_analysis',
  'record_work_item_decision',
  'update_work_item_status',
  'add_work_item_evidence',
  'claim_work_item',
  'complete_work_item',
];

export const MCP_INTENT_GRAPH_TOOLS_V1 = [
  'get_intent_hierarchy',
  'get_architecture_snapshot',
  'get_unified_linkage',
  'get_pvrg_task_scope',
];

export const MCP_CURSOR_CONTEXT_TOOLS_V1 = [
  'get_graph_rag_context',
  'list_memory_records',
  'get_memory_record',
  'list_evidence_records',
  'get_evidence_record',
];

export const DEFAULT_CONTEXT_BUDGET_CHARS = 12_000;

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

const SAMPLE_READY_BACKLOG = `#Задача_done_dep<[
Базис:
  Dependency done.
Вектор:
  Unblock ready task.
Цель:
  Satisfy depends_on.

Свидетельства:
  npm test passed.

Метки:
  atom.profile: work_item
  work.id: done-dep
  work.title: Done dependency
  work.status: done
  trace.status: verified
]>

#Задача_ready_eval<[
Базис:
  Ready task for MCP workflow eval.
Вектор:
  Claim and inspect via MCP tools.
Цель:
  Validate LLM-facing read surface.
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
  work.priority: high
  work.depends_on: done-dep
  work.target_files: src/workGraphLlmUsefulnessEval.mjs
  work.next_action: run eval harness
  work.decision.verdict: useful

критерии_готовности:
  - MCP read surface complete
  - claim workflow succeeds
]>
`;

function keywordMatch(text, keywords) {
  const haystack = String(text ?? '').toLowerCase();
  return (keywords ?? []).every((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

export function scoreMcpWorkItemReadSurface(item) {
  const missing = MCP_READ_FIELDS_FOR_LLM.filter((field) => !(field in item));
  const emptyCritical = ['id', 'title', 'status'].filter((field) => String(item?.[field] ?? '').trim() === '');

  return {
    ok: missing.length === 0 && emptyCritical.length === 0,
    missing,
    emptyCritical,
    score: Math.max(0, 1 - (missing.length + emptyCritical.length) / MCP_READ_FIELDS_FOR_LLM.length),
  };
}

export async function evaluateIntentGraphMcpHandlers(handlers, options = {}) {
  if (!handlers?.getIntentHierarchy || !handlers.getArchitectureSnapshot || !handlers.getUnifiedLinkage || !handlers.getPvrgTaskScope) {
    return {
      ok: false,
      skipped: true,
      missingHandlers: MCP_INTENT_GRAPH_TOOLS_V1,
      score: 0,
    };
  }

  let seedWorkId = parseWorkItems(SAMPLE_READY_BACKLOG).find((item) => item.status === 'ready')?.id ?? 'ready-eval';
  if (handlers.listWorkItems && options.root) {
    const listed = await handlers.listWorkItems({ limit: 100 }, { root: options.root });
    seedWorkId = listed.find((item) => item.status === 'ready')?.id
      ?? listed.find((item) => (item.dependsOn?.length ?? 0) > 0)?.id
      ?? listed[0]?.id
      ?? seedWorkId;
  }

  const checks = [];

  const hierarchy = await handlers.getIntentHierarchy({}, options);
  checks.push({
    id: 'intent-hierarchy-schema',
    ok: hierarchy?.schema === 'intent.hierarchy.snapshot.v1' && (hierarchy.domains?.length ?? 0) > 0,
  });

  const architecture = await handlers.getArchitectureSnapshot({}, options);
  checks.push({
    id: 'architecture-snapshot-schema',
    ok: architecture?.schema === 'architecture.snapshot.v1' && (architecture.blocks?.length ?? 0) > 0,
  });

  const linkage = await handlers.getUnifiedLinkage({}, options);
  checks.push({
    id: 'unified-linkage-schema',
    ok: linkage?.schema === 'unified-linkage.projection.v1' && Array.isArray(linkage.links),
  });

  const scope = await handlers.getPvrgTaskScope({ workId: seedWorkId }, options);
  checks.push({
    id: 'pvrg-task-scope-schema',
    ok: scope?.schema === 'pvrg.task-scope.slice.v1' && scope.seedWorkId === seedWorkId,
  });

  const passed = checks.filter((check) => check.ok).length;
  return {
    ok: passed === checks.length,
    skipped: false,
    seedWorkId,
    checks,
    score: passed / checks.length,
  };
}

export async function evaluateCursorMcpContextSurface(handlers, options = {}) {
  const required = [
    'getGraphRagContext',
    'listMemoryRecords',
    'getMemoryRecord',
    'listEvidenceRecords',
    'getEvidenceRecord',
    'readWorkGraphResource',
  ];

  const missingHandlers = required.filter((name) => typeof handlers?.[name] !== 'function');
  if (missingHandlers.length > 0) {
    return {
      ok: false,
      skipped: true,
      missingHandlers,
      score: 0,
    };
  }

  let seedWorkId = parseWorkItems(SAMPLE_READY_BACKLOG).find((item) => item.status === 'ready')?.id ?? 'ready-eval';
  if (handlers.listWorkItems && options.root) {
    const listed = await handlers.listWorkItems({ limit: 100 }, { root: options.root });
    seedWorkId = listed.find((item) => item.status === 'ready')?.id
      ?? listed.find((item) => item.status === 'done')?.id
      ?? listed[0]?.id
      ?? seedWorkId;
  }

  const checks = [];

  const graphRag = await handlers.getGraphRagContext({ workId: seedWorkId }, options);
  checks.push({
    id: 'graph-rag-context-schema',
    ok: graphRag?.schema === 'pvrg.graph_rag.context.v1' && graphRag.seedWorkId === seedWorkId,
  });
  checks.push({
    id: 'graph-rag-has-work-nodes',
    ok: (graphRag.currentTaskContext?.workItems?.length ?? 0) >= 1,
  });

  const memoryList = await handlers.listMemoryRecords({ workId: seedWorkId, limit: 20 }, options);
  checks.push({
    id: 'memory-record-list-schema',
    ok: memoryList?.schema === 'memory-record-list.v1' && Array.isArray(memoryList.records),
  });

  if (memoryList.records.length > 0) {
    const memoryRecord = await handlers.getMemoryRecord({ recordId: memoryList.records[0].id }, options);
    checks.push({
      id: 'memory-record-get-schema',
      ok: memoryRecord?.schema === 'memory-record.v1',
    });
  } else {
    checks.push({
      id: 'memory-record-get-schema',
      ok: true,
      note: 'no memory records in fixture; list schema sufficient',
    });
  }

  const evidenceList = await handlers.listEvidenceRecords({ workId: seedWorkId, limit: 20 }, options);
  checks.push({
    id: 'evidence-record-list-schema',
    ok: evidenceList?.schema === 'evidence-record-list.v1' && Array.isArray(evidenceList.records),
  });

  if (evidenceList.records.length > 0) {
    const evidenceRecord = await handlers.getEvidenceRecord({ recordId: evidenceList.records[0].id }, options);
    checks.push({
      id: 'evidence-record-get-schema',
      ok: evidenceRecord?.schema === 'evidence-record.v1',
    });
  } else {
    checks.push({
      id: 'evidence-record-get-schema',
      ok: true,
      note: 'no evidence records in fixture; list schema sufficient',
    });
  }

  const graphRagResource = await handlers.readWorkGraphResource(
    `workgraph://pvrg/graph-rag/${encodeURIComponent(seedWorkId)}`,
    options,
  );
  checks.push({
    id: 'graph-rag-resource-schema',
    ok: graphRagResource?.schema === 'pvrg.graph_rag.context.v1',
  });

  const memoryResource = await handlers.readWorkGraphResource('workgraph://memory/records', options);
  checks.push({
    id: 'memory-records-resource-schema',
    ok: memoryResource?.schema === 'memory-record-list.v1',
  });

  const evidenceResource = await handlers.readWorkGraphResource('workgraph://evidence/records', options);
  checks.push({
    id: 'evidence-records-resource-schema',
    ok: evidenceResource?.schema === 'evidence-record-list.v1',
  });

  const passed = checks.filter((check) => check.ok).length;
  return {
    ok: passed === checks.length,
    skipped: false,
    seedWorkId,
    checks,
    score: passed / checks.length,
  };
}

export function evaluateMcpPromptToolCoverage() {
  const promptText = Object.values(workgraphPrompts)
    .map((prompt) => {
      if (typeof prompt.text === 'function') {
        return prompt.text({});
      }
      return '';
    })
    .join('\n');

  const rows = MCP_WRITE_TOOLS_V1.map((tool) => ({
    tool,
    mentioned: promptText.includes(tool),
  }));

  const mentionedCount = rows.filter((row) => row.mentioned).length;

  return {
    ok: mentionedCount === MCP_WRITE_TOOLS_V1.length,
    mentionedCount,
    total: MCP_WRITE_TOOLS_V1.length,
    rows,
    score: mentionedCount / MCP_WRITE_TOOLS_V1.length,
  };
}

export function evaluateGraphRagUsefulness(items, taskId, options = {}) {
  const budget = options.maxPromptChars ?? DEFAULT_CONTEXT_BUDGET_CHARS;
  const context = buildGraphRagContextForWorkerInput(items, taskId, options.graphRag);
  const promptText = formatGraphRagContextForPrompt(context);
  const slice = context.slice ?? context;

  const hasTargetFiles = promptText.includes('target') || promptText.includes('workGraphLlmUsefulnessEval');
  const hasDependencies = promptText.includes('depends') || promptText.includes('done-dep');
  const hasEvidenceTrail = promptText.includes('evidence') || (slice.nodes ?? []).some((node) => node.kind === 'evidence');
  const withinBudget = promptText.length <= budget;

  const signals = [hasTargetFiles, hasDependencies, hasEvidenceTrail, withinBudget];
  const score = signals.filter(Boolean).length / signals.length;

  return {
    ok: score >= 0.75,
    promptChars: promptText.length,
    nodeCount: slice.nodes?.length ?? 0,
    edgeCount: slice.edges?.length ?? 0,
    hasTargetFiles,
    hasDependencies,
    hasEvidenceTrail,
    withinBudget,
    score,
  };
}

export function evaluateSemanticSearchActionability(searchResult, expectations = {}) {
  const hits = searchResult?.hits ?? [];
  const minHits = expectations.minHits ?? 1;
  const requiredKinds = expectations.requiredKinds ?? ['work_item'];
  const requiredWorkId = expectations.requiredWorkId ?? null;

  const kindsPresent = new Set(hits.map((hit) => hit.kind));
  const hasRequiredKinds = requiredKinds.every((kind) => kindsPresent.has(kind));
  const hasWorkId = requiredWorkId
    ? hits.some((hit) => hit.workId === requiredWorkId)
    : true;

  return {
    ok: hits.length >= minHits && hasRequiredKinds && hasWorkId,
    hitCount: hits.length,
    topScore: hits[0]?.score ?? 0,
    hasRequiredKinds,
    hasWorkId,
    score: hits.length === 0 ? 0 : Math.min(1, hits[0].score / 40),
  };
}

export async function evaluateMcpTakeNextWorkflow(handlers, options = {}) {
  const root = options.root;
  const handlerOptions = { root };

  const cycle = await handlers.getCurrentCycle({}, handlerOptions);
  const readyItems = await handlers.listWorkItems({ status: 'ready' }, handlerOptions);

  const cycleActionable = Array.isArray(cycle.readyQueue) && cycle.readyQueue.length > 0;
  const readyMatchesCycle = cycleActionable
    && readyItems.some((item) => cycle.readyQueue.includes(item.id));

  let claimed = null;
  let readSurface = null;

  if (readyItems.length > 0) {
    const targetId = readyItems[0].id;
    const fullItem = await handlers.getWorkItem({ workId: targetId }, handlerOptions);
    readSurface = scoreMcpWorkItemReadSurface(fullItem);

    if (options.executeClaim !== false && fullItem.status === 'ready') {
      claimed = await handlers.claimWorkItem({ workId: targetId }, handlerOptions);
    }
  }

  const ok = cycleActionable && readyMatchesCycle && readSurface?.ok === true
    && (options.executeClaim === false || claimed?.newStatus === 'doing');

  return {
    ok,
    cycleActionable,
    readyMatchesCycle,
    readyCount: readyItems.length,
    readSurface,
    claimed,
    score: [
      cycleActionable,
      readyMatchesCycle,
      readSurface?.ok,
      options.executeClaim === false || claimed?.newStatus === 'doing',
    ].filter(Boolean).length / 4,
  };
}

function executeTraceGateWithoutEvidenceFixture() {
  const items = parseWorkItems(`#Задача_gate_task<[
Базис:
  Gate task.
Вектор:
  Policy gate.
Цель:
  Block done without evidence.

Метки:
  atom.profile: work_item
  work.id: gate-task
  work.title: Gate task
  work.status: doing
  trace.status: pending
]>`);

  try {
    transitionStatus(items[0], 'done');
    return { ok: false, error: 'expected WorkGraphPolicyError' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: message.includes('cannot mark done without evidence'),
      message,
    };
  }
}

function executePolicyDenialDryRunFixture() {
  const items = parseWorkItems(SAMPLE_READY_BACKLOG);
  const task = items.find((item) => item.id === 'ready-eval');
  const input = buildWorkerInputFromTask(task, {
    policy: { mode: 'execute', allowShell: false, allowNetwork: false, allowFileWrite: false },
    workGraphItems: items,
  });
  const output = runLocalWorker(input);
  const combined = JSON.stringify(output);

  return {
    ok: output.status === 'failed' && keywordMatch(combined, ['unsupported local runner mode', 'failed']),
    outputStatus: output.status,
    combined,
  };
}

function executeWorkerDryRunVerifyProposalFixture() {
  const items = parseWorkItems(SAMPLE_READY_BACKLOG);
  const task = items.find((item) => item.id === 'ready-eval');
  const input = buildWorkerInputFromTask(task, { workGraphItems: items });
  const output = runLocalWorker(input);
  const applied = applyWorkerOutputToItem(task, output);
  const combined = JSON.stringify({ output, applied });

  return {
    ok: output.status === 'succeeded'
      && applied.appliedTransition === 'verify'
      && keywordMatch(combined, ['verify', 'succeeded', 'dry-run']),
    outputStatus: output.status,
    appliedTransition: applied.appliedTransition,
    combined,
  };
}

export const MANDATORY_PROMPT_EVAL_EXECUTORS = {
  'trace-gate-without-evidence': executeTraceGateWithoutEvidenceFixture,
  'policy-denial-dry-run': executePolicyDenialDryRunFixture,
  'worker-dry-run-verify-proposal': executeWorkerDryRunVerifyProposalFixture,
};

export function runMandatoryPromptEvalFixtures(options = {}) {
  const catalog = buildPromptEvalWorkGraphFixtureCatalog();
  const mandatory = catalog.fixtures.filter((fixture) => fixture.tier === 'mandatory-deterministic');
  const executors = { ...MANDATORY_PROMPT_EVAL_EXECUTORS, ...(options.executors ?? {}) };

  const results = mandatory.map((fixture) => {
    const executor = executors[fixture.id];
    if (typeof executor !== 'function') {
      return {
        fixtureId: fixture.id,
        ok: false,
        skipped: true,
        reason: 'no_executor',
        tier: fixture.tier,
      };
    }

    const execution = executor(fixture, options);
    const combined = JSON.stringify(execution);
    const keywordsOk = keywordMatch(combined, fixture.expectedKeywords ?? []);

    return {
      fixtureId: fixture.id,
      ok: Boolean(execution.ok) && (fixture.expectedKeywords?.length ? keywordsOk : true),
      skipped: false,
      tier: fixture.tier,
      failureClass: fixture.failureClass,
      keywordsOk,
      execution,
    };
  });

  const passed = results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok && !result.skipped).length;
  const skipped = results.filter((result) => result.skipped).length;

  return {
    schema: LLM_USEFULNESS_EVAL_SCHEMA,
    kind: 'mandatory-prompt-eval',
    passed,
    failed,
    skipped,
    total: results.length,
    ok: failed === 0 && skipped === 0,
    results: results.sort((left, right) => compareText(left.fixtureId, right.fixtureId)),
  };
}

export function buildLlmUsefulnessScorecard(parts) {
  const rawDimensions = [
    { id: 'mcp-read-surface', weight: 0.2, score: parts.mcpReadSurface?.score ?? 0 },
    { id: 'mcp-prompt-tool-coverage', weight: 0.15, score: parts.mcpPromptCoverage?.score ?? 0 },
    { id: 'mcp-workflow', weight: 0.25, score: parts.mcpWorkflow?.score ?? 0, skip: parts.mcpWorkflow?.skipped === true },
    { id: 'graph-rag-context', weight: 0.2, score: parts.graphRag?.score ?? 0 },
    {
      id: 'mandatory-policy-fixtures',
      weight: 0.2,
      score: parts.mandatoryEval?.ok ? 1 : (parts.mandatoryEval?.passed ?? 0) / Math.max(1, parts.mandatoryEval?.total ?? 1),
    },
  ];

  const dimensions = rawDimensions.filter((dim) => !dim.skip);
  const weightSum = dimensions.reduce((sum, dim) => sum + dim.weight, 0);
  const weighted = dimensions.reduce((sum, dim) => sum + (dim.weight / weightSum) * dim.score, 0);

  return {
    schema: 'workgraph.llm-usefulness.scorecard.v1',
    overall: Number(weighted.toFixed(3)),
    dimensions: dimensions.map(({ skip, ...dim }) => dim),
    verdict: weighted >= 0.8 ? 'strong' : weighted >= 0.55 ? 'partial' : 'weak',
  };
}

export async function buildWorkGraphLlmUsefulnessReport(options = {}) {
  const mandatoryEval = runMandatoryPromptEvalFixtures(options);
  const mcpPromptCoverage = evaluateMcpPromptToolCoverage();

  const items = parseWorkItems(SAMPLE_READY_BACKLOG);
  const mcpReadSurface = scoreMcpWorkItemReadSurface(items.find((item) => item.id === 'ready-eval'));
  const graphRag = evaluateGraphRagUsefulness(items, 'ready-eval', options);

  let mcpWorkflow = { ok: false, score: 0, skipped: true };
  if (options.handlers && options.root) {
    mcpWorkflow = await evaluateMcpTakeNextWorkflow(options.handlers, {
      root: options.root,
      executeClaim: options.executeClaim,
    });
    mcpWorkflow.skipped = false;
  }

  let intentGraphMcp = { ok: false, score: 0, skipped: true };
  if (options.handlers && options.root) {
    intentGraphMcp = await evaluateIntentGraphMcpHandlers(options.handlers, { root: options.root });
  }

  let cursorMcpContext = { ok: false, score: 0, skipped: true };
  if (options.handlers && options.root) {
    cursorMcpContext = await evaluateCursorMcpContextSurface(options.handlers, { root: options.root });
  }

  const mcpReadSurfaceBlended = {
    ...mcpReadSurface,
    score: intentGraphMcp.skipped && cursorMcpContext.skipped
      ? mcpReadSurface.score
      : Number(([
        mcpReadSurface.score,
        ...(intentGraphMcp.skipped ? [] : [intentGraphMcp.score]),
        ...(cursorMcpContext.skipped ? [] : [cursorMcpContext.score]),
      ].reduce((sum, value) => sum + value, 0) / (
        1 + (intentGraphMcp.skipped ? 0 : 1) + (cursorMcpContext.skipped ? 0 : 1)
      )).toFixed(3)),
    intentGraphMcp,
    cursorMcpContext,
  };

  const scorecard = buildLlmUsefulnessScorecard({
    mcpReadSurface: mcpReadSurfaceBlended,
    mcpPromptCoverage,
    mcpWorkflow,
    graphRag,
    mandatoryEval,
  });

  return {
    schema: LLM_USEFULNESS_EVAL_SCHEMA,
    scorecard,
    mandatoryEval,
    mcpPromptCoverage,
    mcpReadSurface: mcpReadSurfaceBlended,
    graphRag,
    mcpWorkflow,
    intentGraphMcp,
    cursorMcpContext,
  };
}

export { SAMPLE_READY_BACKLOG };
