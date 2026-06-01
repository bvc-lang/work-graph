import { buildEvidenceReadModelForTask } from './evidenceReadModel.mjs';
import { buildMemoryRecordCandidatesFromItems } from './memoryRecordWriter.mjs';
import { buildMemoryWorkerSliceForTask } from './memoryWorkerSlice.mjs';
import { buildPvrgTaskScopeSlice } from './pvrgTaskScope.mjs';

export const GRAPH_RAG_SLICE_SCHEMA = 'pvrg.graph_rag.slice.v1';
export const GRAPH_RAG_CONTEXT_SCHEMA = 'pvrg.graph_rag.context.v1';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function stableUnique(values) {
  return [...new Set(values)].sort(compareText);
}

function workItemNode(item) {
  return {
    id: `work:${item.id}`,
    kind: 'work_item',
    label: item.title,
    summary: String(item.nextAction || item.title || item.id).trim(),
    sourceRefs: [`work:${item.id}`],
    confidence: 'high',
    sourceField: 'workgraph.snapshot.v1',
    data: {
      id: item.id,
      title: item.title,
      status: item.status,
      ownerRole: item.ownerRole ?? '',
      department: item.department ?? '',
      priority: item.priority ?? '',
      risk: item.risk ?? '',
      dependsOn: [...(item.dependsOn ?? [])].sort(compareText),
      targetFiles: [...(item.targetFiles ?? [])].sort(compareText),
      traceStatus: item.traceStatus ?? '',
      blocker: item.blocker ?? '',
      nextAction: item.nextAction ?? '',
    },
  };
}

function fileArtifactNode(path, options = {}) {
  return {
    id: `file:${path}`,
    kind: 'file_artifact',
    label: path,
    summary: options.summary ?? path,
    sourceRefs: [`file:${path}`],
    confidence: options.confidence ?? 'medium',
    sourceField: options.sourceField ?? 'work.target_files',
    data: {
      path,
      adapterId: options.adapterId ?? '',
      languageId: options.languageId ?? '',
    },
  };
}

function evidenceNode(record) {
  return {
    id: `evidence:${record.id}`,
    kind: 'evidence',
    label: record.type,
    summary: record.summary,
    sourceRefs: [record.id],
    confidence: record.status === 'failed' ? 'high' : 'medium',
    sourceField: 'evidence-record.v1',
    data: {
      taskId: record.taskId,
      type: record.type,
      status: record.status,
      source: record.source,
    },
  };
}

function memoryRecordNode(record) {
  return {
    id: `memory:${record.id}`,
    kind: 'memory_record',
    label: record.type,
    summary: record.summary,
    sourceRefs: [record.id],
    confidence: record.confidence ?? 'medium',
    sourceField: 'memory-record.v1',
    data: {
      type: record.type,
      status: record.status,
      sourceWorkItem: record.sourceWorkItem,
      relatedFiles: [...(record.relatedFiles ?? [])].sort(compareText),
      relatedTasks: [...(record.relatedTasks ?? [])].sort(compareText),
    },
  };
}

function edge(fromId, toId, relation, sourceField, confidence = 'medium') {
  return {
    id: `${fromId}\0${relation}\0${toId}`,
    from: fromId,
    to: toId,
    relation,
    sourceField,
    confidence,
  };
}

function collectRelatedWorkIds(items, seedWorkId, scopeSlice) {
  const ids = new Set([seedWorkId]);

  for (const node of scopeSlice.nodes) {
    if (node.kind === 'work') {
      ids.add(node.id);
    }
  }

  for (const item of items) {
    if (item.dependsOn?.includes(seedWorkId)) {
      ids.add(item.id);
    }
  }

  return [...ids].sort(compareText);
}

export function buildGraphRagSlice(options = {}) {
  const items = options.items ?? [];
  const seedWorkId = String(options.seedWorkId ?? '').trim();

  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  if (seedWorkId === '') {
    throw new TypeError('seedWorkId must be a non-empty string');
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const seed = itemById.get(seedWorkId);
  if (seed === undefined) {
    throw new Error(`unknown seed work id: ${seedWorkId}`);
  }

  const maxNodes = Number.isInteger(options.maxNodes) && options.maxNodes > 0 ? options.maxNodes : 32;
  const maxDepth = Number.isInteger(options.maxDepth) && options.maxDepth >= 0 ? options.maxDepth : 2;
  const scopeSlice = options.scopeSlice ?? buildPvrgTaskScopeSlice(items, seedWorkId, {
    maxNodes,
    maxDepth,
    linkage: options.linkage,
  });

  const relatedWorkIds = collectRelatedWorkIds(items, seedWorkId, scopeSlice);
  const nodeMap = new Map();
  const edgeMap = new Map();
  const warnings = [];

  for (const workId of relatedWorkIds) {
    const item = itemById.get(workId);
    if (item === undefined) {
      warnings.push(`missing work item for related id ${workId}`);
      continue;
    }

    nodeMap.set(`work:${item.id}`, workItemNode(item));

    for (const path of item.targetFiles ?? []) {
      nodeMap.set(`file:${path}`, fileArtifactNode(path));
      edgeMap.set(
        edge(`work:${item.id}`, `file:${path}`, 'targets', 'work.target_files', 'high').id,
        edge(`work:${item.id}`, `file:${path}`, 'targets', 'work.target_files', 'high'),
      );
    }

    for (const dependencyId of item.dependsOn ?? []) {
      if (itemById.has(dependencyId)) {
        nodeMap.set(`work:${dependencyId}`, workItemNode(itemById.get(dependencyId)));
      }

      edgeMap.set(
        edge(`work:${item.id}`, `work:${dependencyId}`, 'depends_on', 'work.depends_on', 'high').id,
        edge(`work:${item.id}`, `work:${dependencyId}`, 'depends_on', 'work.depends_on', 'high'),
      );
    }

    const evidenceModel = buildEvidenceReadModelForTask(items, item.id);
    for (const record of evidenceModel.records) {
      nodeMap.set(`evidence:${record.id}`, evidenceNode(record));
      edgeMap.set(
        edge(`work:${item.id}`, `evidence:${record.id}`, 'has_evidence', 'work.evidence', 'high').id,
        edge(`work:${item.id}`, `evidence:${record.id}`, 'has_evidence', 'work.evidence', 'high'),
      );
    }
  }

  const memoryCandidates = options.memoryRecords
    ?? buildMemoryRecordCandidatesFromItems(items, options.memoryOptions).records;

  for (const record of memoryCandidates) {
    const related = record.sourceWorkItem === seedWorkId
      || record.relatedTasks.includes(seedWorkId)
      || relatedWorkIds.includes(record.sourceWorkItem);

    if (!related) {
      continue;
    }

    nodeMap.set(`memory:${record.id}`, memoryRecordNode(record));
    edgeMap.set(
      edge(`work:${record.sourceWorkItem}`, `memory:${record.id}`, 'writes_memory', 'memory-record.v1', record.confidence ?? 'medium').id,
      edge(`work:${record.sourceWorkItem}`, `memory:${record.id}`, 'writes_memory', 'memory-record.v1', record.confidence ?? 'medium'),
    );

    for (const evidenceId of record.evidenceIds ?? []) {
      edgeMap.set(
        edge(`memory:${record.id}`, `evidence:${evidenceId}`, 'cites_evidence', 'memory.evidenceIds', 'medium').id,
        edge(`memory:${record.id}`, `evidence:${evidenceId}`, 'cites_evidence', 'memory.evidenceIds', 'medium'),
      );
    }
  }

  for (const scopeEdge of scopeSlice.edges) {
    const fromId = `${scopeEdge.from.kind}:${scopeEdge.from.id}`;
    const toId = `${scopeEdge.to.kind}:${scopeEdge.to.id}`;
    const relation = scopeEdge.relation;
    const mapped = edge(fromId, toId, relation, scopeEdge.source ?? 'unified-linkage.projection.v1', scopeEdge.confidence ?? 'medium');
    edgeMap.set(mapped.id, mapped);

    if (scopeEdge.to.kind === 'file') {
      nodeMap.set(toId, fileArtifactNode(scopeEdge.to.id, {
        sourceField: scopeEdge.source,
        confidence: scopeEdge.confidence,
      }));
    }
  }

  for (const adapterFact of options.adapterProjections?.facts ?? []) {
    const path = adapterFact.filePath;
    if (!path) {
      continue;
    }

    nodeMap.set(`file:${path}`, fileArtifactNode(path, {
      adapterId: adapterFact.adapterId,
      languageId: adapterFact.languageId,
      confidence: adapterFact.confidence,
      sourceField: 'language-adapter.facts',
      summary: `${adapterFact.languageId} (${adapterFact.adapterId})`,
    }));
  }

  for (const run of options.providerRuns ?? []) {
    if (run.taskId !== seedWorkId && !relatedWorkIds.includes(run.taskId)) {
      continue;
    }

    const runId = `provider_run:${run.runId ?? run.taskId}`;
    nodeMap.set(runId, {
      id: runId,
      kind: 'provider_run',
      label: run.provider ?? 'worker',
      summary: run.summary ?? run.status ?? '',
      sourceRefs: [run.runId ?? run.taskId],
      confidence: 'high',
      sourceField: 'worker-run.summary',
      data: run,
    });

    edgeMap.set(
      edge(runId, `work:${run.taskId}`, 'produced_by_run', 'worker-run.summary', 'high').id,
      edge(runId, `work:${run.taskId}`, 'produced_by_run', 'worker-run.summary', 'high'),
    );
  }

  const nodes = [...nodeMap.values()]
    .sort((left, right) => compareText(left.id, right.id))
    .slice(0, maxNodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = [...edgeMap.values()]
    .filter((entry) => nodeIds.has(entry.from) && nodeIds.has(entry.to))
    .sort((left, right) => compareText(left.id, right.id));

  const slice = {
    schema: GRAPH_RAG_SLICE_SCHEMA,
    sliceVersion: '1',
    generatedAt: options.generatedAt ?? null,
    seedWorkId,
    truncated: nodeMap.size > maxNodes || scopeSlice.truncated,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    sourceInputs: stableUnique([
      'workgraph.snapshot.v1',
      'pvrg.task-scope.slice.v1',
      'evidence.read-model.v1',
      'memory-record.candidates.v1',
      ...(options.adapterProjections ? ['workgraph.language-file-facts.batch.v1'] : []),
      ...(options.providerRuns?.length ? ['worker-run.summary'] : []),
    ]),
    warnings,
    retrievalProfiles: {
      currentTaskContext: buildCurrentTaskContext(nodes, edges, seedWorkId),
      relatedArtifacts: buildRelatedArtifacts(nodes, edges, seedWorkId),
      blockers: buildBlockers(nodes, seedWorkId),
      previousDecisions: buildPreviousDecisions(nodes),
    },
  };

  return slice;
}

function buildCurrentTaskContext(nodes, edges, seedWorkId) {
  const connected = new Set([`work:${seedWorkId}`]);
  for (const entry of edges) {
    if (entry.from === `work:${seedWorkId}` || entry.to === `work:${seedWorkId}`) {
      connected.add(entry.from);
      connected.add(entry.to);
    }
  }

  const selected = nodes.filter((node) => connected.has(node.id));
  return summarizeProfile(selected);
}

function buildRelatedArtifacts(nodes, edges, seedWorkId) {
  const fileIds = new Set(
    edges
      .filter((entry) => entry.from === `work:${seedWorkId}` && entry.relation === 'targets')
      .map((entry) => entry.to),
  );

  return summarizeProfile(nodes.filter((node) => fileIds.has(node.id) || (node.kind === 'file_artifact' && fileIds.has(node.id))));
}

function buildBlockers(nodes, seedWorkId) {
  const seed = nodes.find((node) => node.id === `work:${seedWorkId}`);
  const blockedItems = nodes.filter((node) =>
    node.kind === 'work_item'
    && (node.data.status === 'blocked' || node.data.blocker),
  );
  const failedEvidence = nodes.filter((node) => node.kind === 'evidence' && node.data.status === 'failed');

  return summarizeProfile([
    ...(seed?.data.blocker ? [seed] : []),
    ...blockedItems,
    ...failedEvidence,
  ]);
}

function buildPreviousDecisions(nodes) {
  return summarizeProfile(nodes.filter((node) => node.kind === 'memory_record'));
}

function summarizeProfile(nodes) {
  return {
    nodeIds: nodes.map((node) => node.id).sort(compareText),
    workItems: nodes.filter((node) => node.kind === 'work_item').map((node) => ({
      id: node.data.id,
      title: node.data.title,
      status: node.data.status,
    })).sort((left, right) => compareText(left.id, right.id)),
    files: nodes.filter((node) => node.kind === 'file_artifact').map((node) => node.data.path).sort(compareText),
    evidence: nodes.filter((node) => node.kind === 'evidence').map((node) => node.summary).sort(compareText),
    memory: nodes.filter((node) => node.kind === 'memory_record').map((node) => ({
      id: node.id.replace(/^memory:/u, ''),
      type: node.data.type,
      summary: node.summary,
    })).sort((left, right) => compareText(left.id, right.id)),
  };
}

export function getCurrentTaskContext(slice) {
  return slice?.retrievalProfiles?.currentTaskContext ?? summarizeProfile([]);
}

export function getRelatedArtifacts(slice) {
  return slice?.retrievalProfiles?.relatedArtifacts ?? summarizeProfile([]);
}

export function getBlockers(slice) {
  return slice?.retrievalProfiles?.blockers ?? summarizeProfile([]);
}

export function getPreviousDecisions(slice) {
  return slice?.retrievalProfiles?.previousDecisions ?? summarizeProfile([]);
}

export function buildGraphRagContextForWorkerInput(items, taskId, options = {}) {
  const memoryWorker = buildMemoryWorkerSliceForTask(items, taskId, options.memoryWorker ?? options);
  const slice = buildGraphRagSlice({
    items,
    seedWorkId: taskId,
    memoryRecords: memoryWorker.records,
    ...options,
  });

  return {
    schema: GRAPH_RAG_CONTEXT_SCHEMA,
    taskId,
    sliceSchema: slice.schema,
    seedWorkId: taskId,
    truncated: slice.truncated || memoryWorker.truncated,
    nodeCount: slice.nodeCount,
    edgeCount: slice.edgeCount,
    sourceInputs: stableUnique([
      ...slice.sourceInputs,
      ...(memoryWorker.recordCount > 0 ? ['memory-record.worker-slice.v1'] : []),
    ]),
    memoryWorker,
    memoryRecordCount: memoryWorker.recordCount,
    memoryTruncated: memoryWorker.truncated,
    currentTaskContext: getCurrentTaskContext(slice),
    relatedArtifacts: getRelatedArtifacts(slice),
    blockers: getBlockers(slice),
    previousDecisions: getPreviousDecisions(slice),
  };
}

export function buildGraphRagContextSlice(items, taskId, options = {}) {
  return buildGraphRagContextForWorkerInput(items, taskId, options);
}

export function formatGraphRagContextForPrompt(context) {
  if (!context || context.schema !== GRAPH_RAG_CONTEXT_SCHEMA) {
    return '';
  }

  const lines = [
    'Graph RAG context (derived, bounded):',
    `seed=${context.seedWorkId} nodes=${context.nodeCount} edges=${context.edgeCount}${context.truncated ? ' truncated=true' : ''}`,
  ];

  const workLines = context.currentTaskContext.workItems
    .map((item) => `- work ${item.id} [${item.status}] ${item.title}`);
  if (workLines.length > 0) {
    lines.push('Related work items:', ...workLines);
  }

  if (context.relatedArtifacts.files.length > 0) {
    lines.push('Related files:', ...context.relatedArtifacts.files.map((path) => `- ${path}`));
  }

  if (context.currentTaskContext.evidence.length > 0) {
    lines.push('Evidence:', ...context.currentTaskContext.evidence.map((entry) => `- ${entry}`));
  }

  if (context.previousDecisions.memory.length > 0) {
    lines.push('Memory decisions:', ...context.previousDecisions.memory.map((entry) => `- [${entry.type}] ${entry.summary}`));
  }

  if (context.memoryWorker?.recordCount > 0) {
    lines.push(
      `Memory worker slice: records=${context.memoryRecordCount}${context.memoryTruncated ? ' truncated=true' : ''}`,
    );
  }

  if (context.blockers.workItems.length > 0 || context.blockers.evidence.length > 0) {
    lines.push('Blockers:', ...context.blockers.workItems.map((item) => `- ${item.id}: ${item.status}`));
    lines.push(...context.blockers.evidence.map((entry) => `- evidence: ${entry}`));
  }

  return lines.join('\n');
}
