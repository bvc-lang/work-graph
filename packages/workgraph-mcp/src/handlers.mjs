import { resolve } from 'node:path';

import { buildEpicWorkScopeSlice } from '../../../src/epicWorkScope.mjs';
import {
  appendWorkItemAtomToIntentTree,
  persistWorkItemUpdateToRepo,
  persistWorkItemUpdatesToRepo,
  readWorkItemAtomFromRepo,
  readWorkItemsFromRepo,
} from '../../../src/intentTreeWorkItems.mjs';
import {
  buildSnapshot,
  claimNext,
  claimWorkItemWithLease,
  recordEvidence,
  transitionStatus,
} from '../../../src/workGraphRuntime.mjs';
import { transitionWorkItemWithEpicCascade } from '../../../src/workItemEpicCascade.mjs';
import { executeSemanticSearchFromRepo } from '../../../src/semanticSearchWorkflow.mjs';
import {
  buildWorkItemCreateAnalysisDecision,
} from '../../../src/workItemCreateAnalysis.mjs';
import { formatStepAtomDraft } from '../../../src/stepAtomFormatter.mjs';
import { buildArchitectureSnapshot } from '../../../src/architectureSnapshot.mjs';
import { buildIntentHierarchySnapshot } from '../../../src/intentHierarchy.mjs';
import { buildOperatorShellSnapshotV2 } from '../../../src/operatorShellProjection.mjs';
import { buildGraphRagContextForWorkerInput } from '../../../src/graphRagContextSlice.mjs';
import { buildEvidenceReadModelForTask, buildEvidenceReadModelFromItems } from '../../../src/evidenceReadModel.mjs';
import {
  buildMemoryRecordCandidatesFromItems,
  mergeMemoryJournalWithCandidates,
  readMemoryRecordJournal,
} from '../../../src/memoryRecordWriter.mjs';
import { buildPvrgTaskScopeSlice } from '../../../src/pvrgTaskScope.mjs';
import { buildUnifiedLinkageProjectionV1 } from '../../../src/unifiedLinkageProjection.mjs';
import { queryIntentPlane } from '../../../src/queryIntentPlane.mjs';
import {
  detectSemanticDrift,
  getContextSlice,
  querySemanticField,
} from '../../../src/semanticPlaneMcp.mjs';
import { findSemanticVoidsFromRepo } from '../../../src/semanticVoids.mjs';
import { buildPhasePromoteReadyQueue } from '../../../src/workGraphPhasePromoteReadyQueue.mjs';
import {
  buildStepGraphProjectionFromRepo,
  buildStepGraphSliceFromRepo,
} from '../../../src/stepGraphSlice.mjs';
import {
  buildWorkItemPipelineView,
  recordWorkItemAnalysis,
  recordWorkItemDecision,
} from '../../../src/workItemDecisionPipeline.mjs';
import {
  assertWorkItemExecutionAllowed,
  statusChangeRequiresExecutionGate,
} from '../../../src/workItemExecutionGate.mjs';
import {
  attachUiReference,
  listUiReferences,
} from '../../../src/workItemUiReferences.mjs';
import { buildWorkItemContractV1 } from '../../../src/workItemContractProjection.mjs';
import {
  evaluateWorkItemReadyForDone,
  validateEvidenceForContract,
} from '../../../src/workItemReadyForDone.mjs';
import { prepareWorkItemEvidenceAppend } from '../../../src/structuredEvidenceV1.mjs';
import { buildAnalyticsPanelProjection } from '../../../src/analyticsPanelProjection.mjs';
import { findAnalyticsRecordByKeyOrId } from '../../../src/analyticsLineageProjection.mjs';

const DONE_STATUSES = new Set(['done', 'verified']);

export function resolveWorkGraphRoot(env = process.env) {
  const fromProject = env.WG_PROJECT_ROOT?.trim();
  if (fromProject) {
    return resolve(fromProject);
  }
  const raw = env.WORKGRAPH_ROOT?.trim();
  return resolve(raw || process.cwd());
}

export async function listWorkItems(args = {}, options = {}) {
  const items = await readItems(options);
  const status = normalizeOptional(args.status);
  const query = normalizeOptional(args.query)?.toLowerCase();
  const limit = clampLimit(args.limit, 50);

  return items
    .filter((item) => !status || item.status === status)
    .filter((item) => {
      if (!query) return true;
      return [
        item.id,
        item.title,
        item.status,
        item.ownerRole,
        item.department,
        item.priority,
        item.risk,
        item.nextAction,
        ...(item.targetFiles ?? []),
      ].join(' ').toLowerCase().includes(query);
    })
    .slice(0, limit)
    .map(toWorkItemSummary);
}

export async function getWorkItem(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  const item = items.find((candidate) => candidate.id === workId);
  if (!item) {
    throw new Error(`WorkItem not found: ${workId}`);
  }
  return item;
}

export async function getBacklogSnapshot(_args = {}, options = {}) {
  const items = await readItems(options);
  return buildSnapshot(items);
}

export async function getCurrentCycle(_args = {}, options = {}) {
  const items = await readItems(options);
  const snapshot = buildSnapshot(items);
  const phase8PlusPromoteReadyQueue = buildPhasePromoteReadyQueue(items);
  return {
    schema: 'workgraph.current-cycle.v1',
    source: 'intent/index.bvc',
    statusCounts: snapshot.statusCounts,
    readyQueue: snapshot.readyQueue,
    current: snapshot.items.filter((item) => ['claimed', 'doing', 'verify'].includes(item.status)),
    backlogCount: snapshot.items.filter((item) => item.status === 'backlog').length,
    doneCount: snapshot.items.filter((item) => DONE_STATUSES.has(item.status)).length,
    phase8PlusPromoteReadyQueue,
  };
}

export async function getPromoteReadyQueue(args = {}, options = {}) {
  const items = await readItems(options);
  return buildPhasePromoteReadyQueue(items, {
    minPhase: args.minPhase,
    limit: args.limit,
  });
}

export async function getIntentHierarchy(_args = {}, options = {}) {
  const items = await readItems(options);
  return buildIntentHierarchySnapshot(items.map((item) => ({ item })));
}

export async function getArchitectureSnapshot(args = {}, options = {}) {
  const items = await readItems(options);
  const snapshot = buildSnapshot(items);
  const focusBlockId = normalizeOptional(args.focusBlockId ?? args.focus_block_id);
  return buildArchitectureSnapshot(snapshot, {
    repoRoot: resolveRoot(options),
    ...(focusBlockId ? { focusBlockId } : {}),
  });
}

export async function getUnifiedLinkage(_args = {}, options = {}) {
  const items = await readItems(options);
  return buildUnifiedLinkageProjectionV1(items);
}

export async function queryIntentPlaneMcp(args = {}, options = {}) {
  const items = await readItems(options);
  return queryIntentPlane(items, args, { cwd: resolveRoot(options) });
}

export async function querySemanticFieldMcp(args = {}, options = {}) {
  const q = String(args.q ?? args.query ?? '').trim();
  if (!q) {
    throw new Error('q is required');
  }
  const items = await readItems(options);
  return querySemanticField(items, args, { cwd: resolveRoot(options) });
}

export async function detectSemanticDriftMcp(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  return detectSemanticDrift(items, workId);
}

export async function getContextSliceMcp(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  return getContextSlice(items, args, { cwd: resolveRoot(options) });
}

export async function findSemanticVoidsMcp(args = {}, options = {}) {
  return findSemanticVoidsFromRepo({
    cwd: resolveRoot(options),
    domain: args.domain ?? args.department ?? null,
    tier: args.tier ?? null,
  });
}

export async function getEpicWorkScope(args = {}, options = {}) {
  const epicId = requireWorkId({ workId: args.epicId ?? args.epic_id ?? args.workId ?? args.id });
  const items = await readItems(options);
  return buildEpicWorkScopeSlice(items, epicId);
}

export async function getPvrgTaskScope(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  const scopeOptions = {};
  if (Number.isInteger(args.maxNodes) && args.maxNodes > 0) {
    scopeOptions.maxNodes = args.maxNodes;
  }
  if (Number.isInteger(args.maxDepth) && args.maxDepth >= 0) {
    scopeOptions.maxDepth = args.maxDepth;
  }
  return buildPvrgTaskScopeSlice(items, workId, scopeOptions);
}

async function loadMergedMemoryRecords(options = {}) {
  const items = await readItems(options);
  const candidates = buildMemoryRecordCandidatesFromItems(items).records;
  const journal = await readMemoryRecordJournal({ cwd: resolveRoot(options) });
  return {
    items,
    records: mergeMemoryJournalWithCandidates(candidates, journal.records),
  };
}

function filterMemoryRecords(records, args = {}) {
  const sourceWorkItem = normalizeOptional(args.sourceWorkItem ?? args.workId);
  const type = normalizeOptional(args.type);
  const status = normalizeOptional(args.status);
  const query = normalizeOptional(args.query)?.toLowerCase();

  return records.filter((record) => {
    if (sourceWorkItem) {
      const related = record.sourceWorkItem === sourceWorkItem
        || (record.relatedTasks ?? []).includes(sourceWorkItem);
      if (!related) {
        return false;
      }
    }

    if (type && record.type !== type) {
      return false;
    }

    if (status && record.status !== status) {
      return false;
    }

    if (query) {
      const haystack = [
        record.id,
        record.type,
        record.summary,
        record.sourceWorkItem,
        ...(record.relatedFiles ?? []),
        ...(record.relatedTasks ?? []),
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return record.status !== 'retired';
  });
}

function filterEvidenceRecords(records, args = {}) {
  const type = normalizeOptional(args.type);
  const status = normalizeOptional(args.status);
  const query = normalizeOptional(args.query)?.toLowerCase();

  return records.filter((record) => {
    if (type && record.type !== type) {
      return false;
    }

    if (status && record.status !== status) {
      return false;
    }

    if (query) {
      const haystack = [record.id, record.taskId, record.type, record.summary].join(' ').toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export async function getGraphRagContext(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const { items, records } = await loadMergedMemoryRecords(options);
  findItem(items, workId);

  const graphRagOptions = {
    memoryWorker: { memoryRecords: records },
    memoryRecords: records,
  };

  if (Number.isInteger(args.maxNodes) && args.maxNodes > 0) {
    graphRagOptions.maxNodes = args.maxNodes;
  }

  if (Number.isInteger(args.maxDepth) && args.maxDepth >= 0) {
    graphRagOptions.maxDepth = args.maxDepth;
  }

  return buildGraphRagContextForWorkerInput(items, workId, graphRagOptions);
}

export async function listMemoryRecords(args = {}, options = {}) {
  const { records } = await loadMergedMemoryRecords(options);
  const filtered = filterMemoryRecords(records, args);
  const limit = clampLimit(args.limit, 50);

  return {
    schema: 'memory-record-list.v1',
    count: filtered.length,
    records: filtered.slice(0, limit),
  };
}

export async function getMemoryRecord(args = {}, options = {}) {
  const recordId = normalizeOptional(args.recordId ?? args.id);
  if (!recordId) {
    throw new Error('recordId is required');
  }

  const { records } = await loadMergedMemoryRecords(options);
  const record = records.find((entry) => entry.id === recordId);
  if (!record) {
    throw new Error(`MemoryRecord not found: ${recordId}`);
  }

  return record;
}

export async function listEvidenceRecords(args = {}, options = {}) {
  const items = await readItems(options);
  const taskId = normalizeOptional(args.taskId ?? args.workId);
  const model = taskId
    ? buildEvidenceReadModelForTask(items, taskId)
    : buildEvidenceReadModelFromItems(items);
  const filtered = filterEvidenceRecords(model.records, args);
  const limit = clampLimit(args.limit, 50);

  return {
    schema: 'evidence-record-list.v1',
    count: filtered.length,
    records: filtered.slice(0, limit),
    compatibility: model.compatibility,
  };
}

export async function getEvidenceRecord(args = {}, options = {}) {
  const recordId = normalizeOptional(args.recordId ?? args.id);
  if (!recordId) {
    throw new Error('recordId is required');
  }

  const items = await readItems(options);
  const model = buildEvidenceReadModelFromItems(items);
  const record = model.records.find((entry) => entry.id === recordId);
  if (!record) {
    throw new Error(`EvidenceRecord not found: ${recordId}`);
  }

  return record;
}

export async function getOperatorShellSnapshot(_args = {}, options = {}) {
  const items = await readItems(options);
  const snapshot = buildSnapshot(items);
  return buildOperatorShellSnapshotV2(snapshot);
}

export async function getStepGraphProjection(args = {}, options = {}) {
  return buildStepGraphProjectionFromRepo({
    cwd: resolveRoot(options),
    maxNodes: args.maxNodes,
    roots: normalizeOptional(args.roots)?.split(',').map((entry) => entry.trim()).filter(Boolean),
  });
}

export async function getStepGraphSlice(args = {}, options = {}) {
  const seedStepName = normalizeOptional(args.seedStepName ?? args.stepName);
  const seedPath = normalizeOptional(args.seedPath ?? args.logicalPath);
  const seedNodeId = normalizeOptional(args.seedNodeId ?? args.nodeId);

  if (!seedStepName && !seedPath && !seedNodeId) {
    throw new Error('seedStepName, seedPath or seedNodeId is required');
  }

  return buildStepGraphSliceFromRepo({
    cwd: resolveRoot(options),
    ...(seedStepName ? { seedStepName } : {}),
    ...(seedPath ? { seedPath } : {}),
    ...(seedNodeId ? { seedNodeId } : {}),
    maxNodes: args.maxNodes,
    maxDepth: args.maxDepth,
  });
}

export async function updateWorkItemStatus(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const status = String(args.status ?? '').trim();
  if (!status) {
    throw new Error('status is required');
  }
  const items = await readItems(options);
  const item = findItem(items, workId);
  if (statusChangeRequiresExecutionGate(status)) {
    assertWorkItemExecutionAllowed(item);
  }
  const updated = transitionWorkItemWithEpicCascade(items, item, status, {
    reason: args.reason,
    blocker: args.reason,
    evidence: args.evidence,
  });
  const persisted = await persistWorkItemUpdatesToRepo(updated.updatedItems, {
    cwd: resolveRoot(options),
  });
  const primary = updated.updatedItems.find((entry) => entry.id === workId) ?? updated.updatedItems.at(-1);
  return {
    ok: true,
    workId,
    previousStatus: item.status,
    newStatus: primary?.status ?? status,
    cascadedChildIds: updated.cascadedChildIds,
    paths: persisted.map((entry) => entry.path),
    path: persisted.find((entry) => entry.workId === workId)?.path ?? persisted.at(-1)?.path,
  };
}

export async function addWorkItemEvidence(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  const item = findItem(items, workId);
  const prepared = prepareWorkItemEvidenceAppend(item, args, { allItems: items });

  if (!prepared.ok) {
    return {
      ok: false,
      workId,
      ...prepared,
    };
  }

  let updated = item;
  for (const line of prepared.lines) {
    updated = recordEvidence(updated, line);
  }

  const persisted = await persistWorkItemUpdateToRepo({
    cwd: resolveRoot(options),
    item: updated,
  });
  return {
    ok: true,
    workId,
    evidenceCount: updated.evidence.length,
    structured: prepared.structured === true,
    path: persisted.path,
  };
}

export async function claimWorkItem(args = {}, options = {}) {
  const items = await readItems(options);
  const workId = normalizeOptional(args.workId);
  const item = workId ? findItem(items, workId) : claimNext(items);
  if (!item) {
    throw new Error('No claimable WorkItem found');
  }

  assertWorkItemExecutionAllowed(item);

  const claimRunId = normalizeOptional(args.claimRunId ?? args.claim_run_id)
    ?? `mcp-claim-${item.id}-${Date.now()}`;
  const claimResult = claimWorkItemWithLease(item, {
    claimRunId,
    targetStatus: 'doing',
    evidence: args.evidence ?? `claim: ${item.id} via WorkGraph MCP`,
  });

  if (!claimResult.ok) {
    if (claimResult.error === 'claim_lease_active') {
      throw new Error(`Claim lease active for ${item.id}${claimResult.claimedBy ? ` (claimed_by=${claimResult.claimedBy})` : ''}`);
    }
    throw new Error(`WorkItem is not claimable: ${item.id} (${item.status})`);
  }

  if (claimResult.idempotent) {
    return {
      ok: true,
      workId: item.id,
      previousStatus: claimResult.previousStatus,
      newStatus: claimResult.newStatus,
      idempotent: true,
      claimRunId: claimResult.claimRunId,
      leaseUntil: claimResult.leaseUntil,
    };
  }

  const persisted = await persistWorkItemUpdateToRepo({
    cwd: resolveRoot(options),
    item: claimResult.item,
  });
  return {
    ok: true,
    workId: item.id,
    previousStatus: claimResult.previousStatus,
    newStatus: claimResult.newStatus,
    claimRunId: claimResult.claimRunId,
    leaseUntil: claimResult.leaseUntil,
    path: persisted.path,
  };
}

export async function getWorkContract(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  const item = findItem(items, workId);
  return buildWorkItemContractV1(item, { allItems: items, source: 'workgraph-mcp' });
}

export async function assertTaskReadyForDone(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  const item = findItem(items, workId);
  return evaluateWorkItemReadyForDone(item, { allItems: items, targetStatus: 'done' });
}

export async function validateEvidence(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const items = await readItems(options);
  const item = findItem(items, workId);
  const contract = buildWorkItemContractV1(item, { allItems: items });

  let evidenceJson = args.evidenceJson ?? args.evidence_json ?? args.evidence;
  if (typeof evidenceJson === 'string') {
    evidenceJson = JSON.parse(evidenceJson);
  }

  const result = validateEvidenceForContract(evidenceJson, contract, workId);
  return {
    schema: 'work-item-evidence-validation.v1',
    workId,
    contractSchema: contract.schema,
    ...result,
  };
}

export async function completeWorkItem(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const evidence = String(args.evidence ?? '').trim();
  if (!evidence) {
    return {
      ok: false,
      schema: 'work-item-ready-for-done.v1',
      workId,
      violations: [{
        code: 'missing_evidence',
        severity: 'error',
        message: 'evidence is required to complete a WorkItem',
        fix: 'add_work_item_evidence with command output',
      }],
      suggestedCommands: [],
    };
  }

  const items = await readItems(options);
  const item = findItem(items, workId);
  const evaluation = evaluateWorkItemReadyForDone(item, {
    allItems: items,
    pendingEvidence: evidence,
    targetStatus: 'done',
  });

  if (!evaluation.ok) {
    return {
      ok: false,
      workId,
      previousStatus: item.status,
      ...evaluation,
    };
  }

  const updated = transitionWorkItemWithEpicCascade(items, item, 'done', { evidence });
  const persisted = await persistWorkItemUpdatesToRepo(updated.updatedItems, {
    cwd: resolveRoot(options),
  });
  const primary = updated.updatedItems.find((entry) => entry.id === workId) ?? updated.updatedItems.at(-1);
  return {
    ok: true,
    workId,
    previousStatus: item.status,
    newStatus: primary?.status ?? 'done',
    cascadedChildIds: updated.cascadedChildIds,
    paths: persisted.map((entry) => entry.path),
    path: persisted.find((entry) => entry.workId === workId)?.path ?? persisted.at(-1)?.path,
    readiness: evaluation,
  };
}

export async function getAnalyticsLineage(args = {}, options = {}) {
  const recordKey = normalizeOptional(args.recordKey ?? args.key);
  const recordId = normalizeOptional(args.recordId ?? args.id);
  if (!recordKey && !recordId) {
    throw new Error('recordKey or recordId is required');
  }

  const projection = await buildAnalyticsPanelProjection({ cwd: resolveRoot(options) });
  const record = findAnalyticsRecordByKeyOrId(projection.records, { recordKey, recordId });
  if (!record) {
    throw new Error(`Analytics record not found: ${recordKey || recordId}`);
  }

  return {
    ...record.analyticsLineage,
    relatedWorkItems: record.relatedWorkItems ?? [],
  };
}

export async function readWorkGraphResource(uri, options = {}) {
  const value = String(uri ?? '').trim();
  if (value === 'workgraph://backlog') {
    return getBacklogSnapshot({}, options);
  }
  if (value === 'workgraph://cycle/current') {
    return getCurrentCycle({}, options);
  }
  if (value === 'workgraph://intent/hierarchy') {
    return getIntentHierarchy({}, options);
  }
  if (value === 'workgraph://architecture/snapshot') {
    return getArchitectureSnapshot({}, options);
  }
  if (value === 'workgraph://linkage/projection') {
    return getUnifiedLinkage({}, options);
  }
  if (value === 'workgraph://step-graph/projection') {
    return getStepGraphProjection({}, options);
  }
  const stepGraphSliceMatch = value.match(/^workgraph:\/\/step-graph\/slice\/(.+)$/u);
  if (stepGraphSliceMatch) {
    const seed = decodeURIComponent(stepGraphSliceMatch[1]);
    if (seed.includes('\u001f')) {
      return getStepGraphSlice({ seedNodeId: seed }, options);
    }

    return getStepGraphSlice({ seedStepName: seed }, options);
  }
  const epicScopeMatch = value.match(/^workgraph:\/\/epic\/(.+)\/scope$/u);
  if (epicScopeMatch) {
    return getEpicWorkScope({ epicId: decodeURIComponent(epicScopeMatch[1]) }, options);
  }
  const contractMatch = value.match(/^workgraph:\/\/contract\/(.+)$/u);
  if (contractMatch) {
    return getWorkContract({ workId: decodeURIComponent(contractMatch[1]) }, options);
  }
  const scopeMatch = value.match(/^workgraph:\/\/pvrg\/scope\/(.+)$/u);
  if (scopeMatch) {
    return getPvrgTaskScope({ workId: decodeURIComponent(scopeMatch[1]) }, options);
  }
  const graphRagMatch = value.match(/^workgraph:\/\/pvrg\/graph-rag\/(.+)$/u);
  if (graphRagMatch) {
    return getGraphRagContext({ workId: decodeURIComponent(graphRagMatch[1]) }, options);
  }
  if (value === 'workgraph://memory/records') {
    return listMemoryRecords({ limit: 200 }, options);
  }
  const memoryRecordMatch = value.match(/^workgraph:\/\/memory\/record\/(.+)$/u);
  if (memoryRecordMatch) {
    return getMemoryRecord({ recordId: decodeURIComponent(memoryRecordMatch[1]) }, options);
  }
  if (value === 'workgraph://evidence/records') {
    return listEvidenceRecords({ limit: 200 }, options);
  }
  const evidenceRecordMatch = value.match(/^workgraph:\/\/evidence\/record\/(.+)$/u);
  if (evidenceRecordMatch) {
    return getEvidenceRecord({ recordId: decodeURIComponent(evidenceRecordMatch[1]) }, options);
  }
  const itemMatch = value.match(/^workgraph:\/\/item\/(.+)$/u);
  if (itemMatch) {
    return getWorkItem({ workId: decodeURIComponent(itemMatch[1]) }, options);
  }
  throw new Error(`Unsupported WorkGraph resource URI: ${value}`);
}

export async function readWorkItemAtomResource(workId, options = {}) {
  const atom = await readWorkItemAtomFromRepo(workId, { cwd: resolveRoot(options) });
  return atom.atomText;
}

export async function semanticSearch(args = {}, options = {}) {
  const query = String(args.query ?? args.q ?? '').trim();
  if (!query) {
    throw new Error('query is required');
  }

  const limit = clampLimit(args.limit, 12);
  const mode = String(args.mode ?? '').trim() || undefined;
  return executeSemanticSearchFromRepo({
    cwd: resolveRoot(options),
    query,
    limit,
    ...(mode ? { mode } : {}),
  });
}

function atomNameFromWorkId(workId) {
  return `Задача_${String(workId).replace(/-/gu, '_')}`;
}

function normalizeTextList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  const text = String(value ?? '').trim();
  if (text === '') {
    return [...fallback];
  }

  return text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

export async function createWorkItem(args = {}, options = {}) {
  const workId = normalizeOptional(args.workId ?? args.id);
  if (!workId) {
    throw new Error('workId is required');
  }

  const title = String(args.title ?? workId).trim();
  const department = String(args.department ?? 'agent-platform').trim();
  const ownerRole = String(args.ownerRole ?? args.owner_role ?? 'integration_architect').trim();
  const priority = String(args.priority ?? 'medium').trim();
  const risk = String(args.risk ?? 'medium').trim();
  const status = String(args.status ?? 'backlog').trim();
  const nextAction = String(args.nextAction ?? args.next_action ?? 'просмотреть и перевести в ready').trim();
  const dependsOn = normalizeTextList(args.dependsOn ?? args.depends_on);
  const targetFiles = normalizeTextList(args.targetFiles ?? args.target_files);
  const parentId = normalizeOptional(args.parentId ?? args.parent_id);
  const itemKind = normalizeOptional(args.itemKind ?? args.item_kind);
  const intentQuestionId = normalizeOptional(args.intentQuestionId ?? args.intent_question_id);
  const intentOptionId = normalizeOptional(args.intentOptionId ?? args.intent_option_id);
  const intentDecisionId = normalizeOptional(args.intentDecisionId ?? args.intent_decision_id);
  const checks = normalizeTextList(args.checks, [
    'Atom WorkItem проходит StepAtomDraft validation',
    'Файл intent/**/*.work.bvc (новые items; legacy .work.bvc read-only)',
    'intent/index.bvc актуален',
    'Свидетельства записаны перед переводом в done',
  ]);

  const { analysis, decision, pipelineLabels } = buildWorkItemCreateAnalysisDecision(args);

  const draft = {
    name: atomNameFromWorkId(workId),
    profile: 'work_item',
    basis: normalizeTextList(args.basis, [`WorkItem ${workId} создан через WorkGraph MCP.`]),
    vector: normalizeTextList(args.vector, ['Выполнить задачу с evidence-driven workflow.']),
    goal: normalizeTextList(args.goal, [title]),
    ...(analysis.length > 0 ? { analysis } : {}),
    ...(decision.length > 0 ? { decision } : {}),
    checks,
    labels: {
      'atom.profile': 'work_item',
      'work.id': workId,
      'work.title': title,
      'work.status': status,
      'work.owner_role': ownerRole,
      'work.department': department,
      'work.priority': priority,
      'work.risk': risk,
      'work.next_action': nextAction,
      ...(dependsOn.length > 0 ? { 'work.depends_on': dependsOn.join(', ') } : {}),
      ...(targetFiles.length > 0 ? { 'work.target_files': targetFiles.join(', ') } : {}),
      ...(parentId ? { 'work.parent_id': parentId } : {}),
      ...(itemKind ? { 'work.item_kind': itemKind } : {}),
      ...(intentQuestionId ? { 'intent.question_id': intentQuestionId } : {}),
      ...(intentOptionId ? { 'intent.option_id': intentOptionId } : {}),
      ...(intentDecisionId ? { 'intent.decision_id': intentDecisionId } : {}),
      'trace.status': 'pending',
      'migration.strategy': String(args.migrationStrategy ?? 'rebuild').trim(),
      ...(args.intakeSourceKind ? { 'intake.source_kind': String(args.intakeSourceKind).trim() } : {}),
      ...pipelineLabels,
    },
  };

  const atomText = formatStepAtomDraft(draft);
  const persisted = await appendWorkItemAtomToIntentTree(atomText, {
    cwd: resolveRoot(options),
    path: args.path,
  });

  return {
    ok: true,
    workId,
    status,
    path: persisted.path,
    indexPath: persisted.indexPath,
  };
}

export async function getWorkItemPipeline(args = {}, options = {}) {
  const workId = requireWorkId(args);
  const item = findItem(await readItems(options), workId);
  return buildWorkItemPipelineView(item);
}

export async function recordWorkItemAnalysisFromMcp(args = {}, options = {}) {
  return recordWorkItemAnalysis({
    cwd: resolveRoot(options),
    workId: requireWorkId(args),
    analysis: args.analysis,
    analysisSource: args.analysisSource ?? 'cursor-mcp',
  });
}

export async function recordWorkItemDecisionFromMcp(args = {}, options = {}) {
  const verdict = String(args.verdict ?? '').trim();
  if (verdict === '') {
    throw new Error('verdict is required (useful | harmful | defer)');
  }
  return recordWorkItemDecision({
    cwd: resolveRoot(options),
    workId: requireWorkId(args),
    verdict,
    notes: args.notes ?? args.decision,
  });
}

export async function attachWorkItemUiReference(args = {}, options = {}) {
  return attachUiReference({
    cwd: resolveRoot(options),
    workId: requireWorkId(args),
    filename: args.filename,
    contentBase64: args.contentBase64,
    caption: args.caption,
    force: args.force === true,
  });
}

export async function listWorkItemUiReferences(args = {}, options = {}) {
  return listUiReferences({
    cwd: resolveRoot(options),
    workId: requireWorkId(args),
  });
}

async function readItems(options) {
  return readWorkItemsFromRepo({ cwd: resolveRoot(options) });
}

function findItem(items, workId) {
  const item = items.find((candidate) => candidate.id === workId);
  if (!item) {
    throw new Error(`WorkItem not found: ${workId}`);
  }
  return item;
}

function requireWorkId(args) {
  const workId = normalizeOptional(args.workId ?? args.id);
  if (!workId) {
    throw new Error('workId is required');
  }
  return workId;
}

function normalizeOptional(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function clampLimit(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(200, Math.floor(number)));
}

function resolveRoot(options) {
  return resolve(options.root ?? resolveWorkGraphRoot(options.env));
}

function toWorkItemSummary(item) {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    ownerRole: item.ownerRole,
    department: item.department,
    priority: item.priority,
    risk: item.risk,
    dependsOn: item.dependsOn,
    targetFiles: item.targetFiles,
    nextAction: item.nextAction,
    evidenceCount: item.evidence?.length ?? 0,
    blocker: item.blocker,
  };
}
