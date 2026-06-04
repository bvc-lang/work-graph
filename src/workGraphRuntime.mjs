import {
  attachDerivedWorkItemHierarchy,
  assertParentCloseAllowed,
  readWorkItemKind,
  readWorkItemParentId,
} from './workItemHierarchy.mjs';
import { stampWorkItemClosedAt } from './workItemClosedAt.mjs';

const STEP_ATOM_PATTERN = /^#([^\n<]+)<\[\n([\s\S]*?)\n\]>/gmu;
const LIST_SEPARATOR_PATTERN = /\s*,\s*/u;
const TRACE_LABEL_KEYS = ['trace.code_refs', 'trace.artifact_refs', 'trace.evidence_refs', 'trace.links'];
const REVERSE_MARKER_PATTERN = /(?:@iohasc-id:\s*([^\s`"'<>]+)|iohasc-ref:\s*([^\s`"'<>]+))/gu;
const RANGE_LOCATOR_PATTERN = /^(.+)#L(\d+)(?:-L(\d+))?$/u;

const READY_STATUSES = new Set(['ready']);
const DONE_STATUSES = new Set(['done', 'verified']);
const ACTIVE_CLAIM_STATUSES = new Set(['claimed', 'doing', 'in_progress']);
const ALLOWED_STATUSES = new Set(['backlog', 'ready', 'claimed', 'doing', 'in_progress', 'verify', 'done', 'blocked']);
export const DEFAULT_CLAIM_LEASE_MS = 15 * 60 * 1000;

export class WorkGraphPolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkGraphPolicyError';
  }
}

export function parseWorkItems(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }

  const items = [];

  for (const match of text.matchAll(STEP_ATOM_PATTERN)) {
    const [, atomName, body] = match;
    const sections = parseSections(body);
    const labels = sections.labels;

    if (labels['atom.profile'] !== 'work_item' && labels['work.id'] === undefined) {
      continue;
    }

    const id = labels['work.id'];
    if (id === undefined || id.trim() === '') {
      continue;
    }

    items.push({
      atomName: atomName.trim(),
      id: id.trim(),
      title: labels['work.title'] ?? id.trim(),
      status: normalizeStatus(labels['work.status']),
      ownerRole: labels['work.owner_role'] ?? '',
      department: labels['work.department'] ?? '',
      priority: labels['work.priority'] ?? '',
      risk: labels['work.risk'] ?? '',
      dependsOn: parseList(labels['work.depends_on']),
      targetFiles: parseList(labels['work.target_files']),
      traceStatus: labels['trace.status'] ?? '',
      nextAction: labels['work.next_action'] ?? '',
      evidence: sections.evidence,
      checks: sections.checks,
      blocker: labels['work.blocker'] ?? labels['work.blocked_reason'] ?? '',
      basis: normalizeSectionText(sections.basis),
      vector: normalizeSectionText(sections.vector),
      goal: normalizeSectionText(sections.goal),
      analysis: normalizeSectionText(sections.analysis),
      decision: normalizeSectionText(sections.decision),
      uiRefs: normalizeSectionText(sections.uiRefs),
      parentId: String(labels['work.parent_id'] ?? '').trim(),
      itemKind: readWorkItemKind({ labels }),
      closedAt: String(labels['work.closed_at'] ?? '').trim(),
      labels,
    });
  }

  return items;
}

export function claimNext(items) {
  assertItems(items);

  const doneIds = new Set(items.filter((item) => DONE_STATUSES.has(item.status)).map((item) => item.id));

  return stableItems(items).find((item) => {
    if (!READY_STATUSES.has(item.status)) {
      return false;
    }

    return item.dependsOn.every((dependencyId) => doneIds.has(dependencyId));
  }) ?? null;
}

export function getDoneWorkItemIds(items) {
  assertItems(items);
  return new Set(items.filter((item) => DONE_STATUSES.has(item.status)).map((item) => item.id));
}

export function areWorkItemDependenciesSatisfied(items, item) {
  assertItems(items);

  if (item === undefined || item === null) {
    return false;
  }

  const doneIds = getDoneWorkItemIds(items);
  return (item.dependsOn ?? []).every((dependencyId) => doneIds.has(dependencyId));
}

export function isPromotableBacklogItem(items, item) {
  return item?.status === 'backlog' && areWorkItemDependenciesSatisfied(items, item);
}

export function evaluatePromoteReadyEligibility(items, workId, options = {}) {
  assertItems(items);

  const normalizedWorkId = String(workId ?? '').trim();
  if (normalizedWorkId === '') {
    return { ok: false, error: 'work_id_required' };
  }

  const item = items.find((entry) => entry.id === normalizedWorkId);
  if (item === undefined) {
    return { ok: false, error: 'task_not_found', workId: normalizedWorkId };
  }

  if (item.status !== 'backlog') {
    return {
      ok: false,
      error: 'task_not_backlog',
      workId: normalizedWorkId,
      currentStatus: item.status,
    };
  }

  const doneIds = getDoneWorkItemIds(items);
  const unsatisfiedDependencies = (item.dependsOn ?? []).filter((dependencyId) => !doneIds.has(dependencyId));

  if (unsatisfiedDependencies.length > 0) {
    return {
      ok: false,
      error: 'dependencies_unsatisfied',
      workId: normalizedWorkId,
      unsatisfiedDependencies: [...unsatisfiedDependencies].sort(compareText),
    };
  }

  const charterPreflight = options.charterPreflight;
  if (charterPreflight && charterPreflight.ok === false) {
    return {
      ok: false,
      error: 'charter_preflight_blocked',
      workId: normalizedWorkId,
      charterPreflight,
      charterViolations: charterPreflight.violations ?? [],
    };
  }

  return { ok: true, workId: normalizedWorkId, item };
}

export function transitionStatus(item, targetStatus, options = {}) {
  assertItem(item);

  if (!ALLOWED_STATUSES.has(targetStatus)) {
    throw new WorkGraphPolicyError(`unsupported target status: ${targetStatus}`);
  }

  if (targetStatus === 'done' && !hasEvidence(item, options)) {
    throw new WorkGraphPolicyError('cannot mark done without evidence');
  }

  if (Array.isArray(options.allItems) && (targetStatus === 'done' || targetStatus === 'verified')) {
    assertParentCloseAllowed(options.allItems, item, targetStatus);
  }

  if (targetStatus === 'blocked' && !hasBlockerReason(options)) {
    throw new WorkGraphPolicyError('cannot mark blocked without reason');
  }

  let nextItem = {
    ...item,
    status: targetStatus,
    labels: {
      ...item.labels,
      'work.status': targetStatus,
    },
  };

  nextItem = stampWorkItemClosedAt(nextItem, targetStatus, options.recordedAt);

  if (options.reason !== undefined || options.blocker !== undefined) {
    const blocker = String(options.reason ?? options.blocker).trim();
    nextItem.blocker = blocker;
    nextItem.labels['work.blocker'] = blocker;
  }

  if (options.evidence !== undefined) {
    return recordEvidence(nextItem, options.evidence);
  }

  return nextItem;
}

export function getClaimLeaseUntil(item) {
  const raw = item?.labels?.['work.claim_lease_until'] ?? '';
  if (raw === '') {
    return null;
  }

  const timestamp = Date.parse(String(raw));
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isActiveClaimLease(item, nowMs = Date.now()) {
  const leaseUntil = getClaimLeaseUntil(item);
  return leaseUntil !== null && leaseUntil > nowMs;
}

export function evaluateWorkItemClaimEligibility(item, options = {}) {
  assertItem(item);

  const nowMs = options.nowMs ?? Date.now();
  const claimRunId = String(options.claimRunId ?? '').trim();
  const claimedBy = String(item.labels?.['work.claimed_by'] ?? '').trim();
  const leaseActive = isActiveClaimLease(item, nowMs);

  if (item.status === 'ready') {
    return { ok: true, workId: item.id, reclaim: false, idempotent: false };
  }

  if (ACTIVE_CLAIM_STATUSES.has(item.status)) {
    if (leaseActive) {
      if (claimRunId !== '' && claimRunId === claimedBy) {
        return { ok: true, workId: item.id, reclaim: false, idempotent: true, claimedBy, leaseUntil: item.labels['work.claim_lease_until'] };
      }

      return {
        ok: false,
        error: 'claim_lease_active',
        workId: item.id,
        currentStatus: item.status,
        claimedBy: claimedBy || null,
        leaseUntil: item.labels?.['work.claim_lease_until'] ?? null,
      };
    }

    if (claimedBy !== '') {
      if (claimRunId !== '' && claimRunId === claimedBy) {
        return { ok: true, workId: item.id, reclaim: false, idempotent: true, claimedBy, leaseUntil: item.labels?.['work.claim_lease_until'] ?? null };
      }

      return { ok: true, workId: item.id, reclaim: true, idempotent: false };
    }

    return {
      ok: false,
      error: 'claim_lease_active',
      workId: item.id,
      currentStatus: item.status,
      claimedBy: null,
      leaseUntil: null,
    };
  }

  return {
    ok: false,
    error: 'task_not_claimable',
    workId: item.id,
    currentStatus: item.status,
  };
}

export function claimWorkItemWithLease(item, options = {}) {
  const eligibility = evaluateWorkItemClaimEligibility(item, options);
  if (!eligibility.ok) {
    return {
      ok: false,
      ...eligibility,
      item,
      newStatus: item.status,
      previousStatus: item.status,
    };
  }

  if (eligibility.idempotent) {
    return {
      ok: true,
      idempotent: true,
      workId: item.id,
      item,
      previousStatus: item.status,
      newStatus: item.status,
      claimRunId: options.claimRunId ?? item.labels?.['work.claimed_by'] ?? null,
      leaseUntil: item.labels?.['work.claim_lease_until'] ?? null,
    };
  }

  const nowMs = options.nowMs ?? Date.now();
  const leaseMs = Number.isInteger(options.leaseMs) && options.leaseMs > 0 ? options.leaseMs : DEFAULT_CLAIM_LEASE_MS;
  const claimRunId = String(options.claimRunId ?? `claim-${item.id}-${nowMs}`).trim();
  const leaseUntil = new Date(nowMs + leaseMs).toISOString();
  const targetStatus = options.targetStatus ?? 'claimed';
  const previousStatus = item.status;

  let current = item;
  if (previousStatus === 'ready' || eligibility.reclaim) {
    current = transitionStatus(item, targetStatus, {
      evidence: options.evidence ?? `claim: ${item.id} lease until ${leaseUntil}`,
    });
  }

  current = {
    ...current,
    labels: {
      ...current.labels,
      'work.claimed_by': claimRunId,
      'work.claim_lease_until': leaseUntil,
    },
  };

  return {
    ok: true,
    idempotent: false,
    reclaim: eligibility.reclaim === true,
    workId: item.id,
    item: current,
    previousStatus,
    newStatus: current.status,
    claimRunId,
    leaseUntil,
  };
}

export function recordEvidence(item, evidence) {
  assertItem(item);
  const normalizedEvidence = normalizeEvidence(evidence);

  return {
    ...item,
    evidence: [...item.evidence, normalizedEvidence],
  };
}

export function buildSnapshot(items) {
  assertItems(items);

  const enrichedItems = attachDerivedWorkItemHierarchy(items);
  const snapshotItems = stableItems(enrichedItems).map((item) => ({
    key: '',
    id: item.id,
    title: item.title,
    status: item.status,
    ownerRole: item.ownerRole,
    department: item.department,
    priority: item.priority,
    risk: item.risk,
    dependsOn: [...item.dependsOn].sort(compareText),
    targetFiles: [...item.targetFiles].sort(compareText),
    traceStatus: item.traceStatus,
    nextAction: item.nextAction,
    evidence: [...item.evidence].sort(compareText),
    checks: [...item.checks].sort(compareText),
    blocker: item.blocker,
    basis: item.basis,
    vector: item.vector,
    goal: item.goal,
    analysis: item.analysis ?? '',
    decision: item.decision ?? '',
    uiRefs: item.uiRefs ?? '',
    parentId: readWorkItemParentId(item),
    itemKind: readWorkItemKind(item),
    childIds: [...(item.childIds ?? [])],
    closedAt: item.closedAt ?? String(item.labels?.['work.closed_at'] ?? '').trim(),
    labels: { ...(item.labels ?? {}) },
  }));

  snapshotItems.forEach((item, index) => {
    item.key = `WG-${String(index + 1).padStart(3, '0')}`;
  });

  return {
    schema: 'workgraph.snapshot.v1',
    source: '.bvc',
    items: snapshotItems,
    edges: buildEdges(snapshotItems),
    statusCounts: buildStatusCounts(snapshotItems),
    readyQueue: snapshotItems
      .filter((item) => item.status === 'ready')
      .map((item) => item.id),
  };
}

export function buildOperatorDashboardSnapshot(workGraphSnapshot, options = {}) {
  assertWorkGraphSnapshot(workGraphSnapshot);

  const items = stableItems(workGraphSnapshot.items);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const doneIds = new Set(items.filter((item) => DONE_STATUSES.has(item.status)).map((item) => item.id));
  const readyIds = Array.isArray(workGraphSnapshot.readyQueue)
    ? workGraphSnapshot.readyQueue
    : items.filter((item) => item.status === 'ready').map((item) => item.id);

  const currentTasks = items
    .filter((item) => ['claimed', 'doing', 'in_progress', 'verify'].includes(item.status))
    .map(toDashboardTaskSummary);

  const readyQueue = readyIds
    .map((id) => itemById.get(id))
    .filter(Boolean)
    .map((item) => ({
      ...toDashboardTaskSummary(item),
      dependencies: item.dependsOn.map((dependencyId) => ({
        id: dependencyId,
        status: itemById.get(dependencyId)?.status ?? 'missing',
        satisfied: doneIds.has(dependencyId),
      })),
      claimable: item.dependsOn.every((dependencyId) => doneIds.has(dependencyId)),
    }));

  const blocked = items
    .filter((item) => item.status === 'blocked' || item.blocker)
    .map((item) => ({
      ...toDashboardTaskSummary(item),
      blocker: item.blocker,
      nextUnblockAction: item.nextAction,
    }));

  return {
    schema: 'operator-dashboard.snapshot.v1',
    sourceSchema: workGraphSnapshot.schema,
    source: workGraphSnapshot.source,
    currentTasks,
    currentTask: currentTasks[0] ?? null,
    readyQueue,
    blocked,
    statusCounts: buildDashboardStatusCounts(items),
    recentEvidence: buildRecentEvidence(items, options.evidenceLimit),
    workerRunSummaries: normalizeProjectionList(options.workerRunSummaries ?? options.workerRuns),
    memoryUpdates: normalizeProjectionList(options.memoryUpdates),
    actionFeed: normalizeProjectionList(options.actionFeed),
    viewCounts: buildViewCounts(items),
  };
}

export function parseTraceLinksV1(items) {
  assertItems(items);

  return stableItems(items).flatMap((item) =>
    TRACE_LABEL_KEYS.flatMap((labelKey) =>
      parseList(item.labels?.[labelKey]).map((rawRef) => ({
        id: `trace:${item.id}:${labelKey}:${rawRef}`,
        from: { kind: 'work', id: item.id },
        to: parseTraceEndpoint(labelKey, rawRef),
        relation: traceRelationForLabel(labelKey),
        evidence: labelKey === 'trace.evidence_refs' ? [rawRef] : [],
        status: item.traceStatus || 'pending',
        source: 'author',
        confidence: rawRef.includes('#') ? 'medium' : 'high',
        sourceWorkId: item.id,
        sourceLabel: labelKey,
        sourceRef: rawRef,
      })),
    ),
  );
}

export function scanReverseTraceMarkers(fileContentsByPath) {
  const files = normalizeFileMap(fileContentsByPath);
  const markers = [];

  for (const [path, content] of files) {
    let match;
    REVERSE_MARKER_PATTERN.lastIndex = 0;
    while ((match = REVERSE_MARKER_PATTERN.exec(content)) !== null) {
      const rawRef = match[2] ?? legacyIohascIdToRef(match[1]);
      if (rawRef === '') {
        continue;
      }

      markers.push({
        ref: rawRef,
        endpoint: parseReverseMarkerEndpoint(rawRef),
        sourcePath: path,
        line: lineNumberAt(content, match.index),
      });
    }
  }

  return markers.sort((left, right) => compareText(`${left.sourcePath}\0${left.line}\0${left.ref}`, `${right.sourcePath}\0${right.line}\0${right.ref}`));
}

export function validateTraceLinksV1(items, options = {}) {
  assertItems(items);

  const workIds = new Set(items.map((item) => item.id));
  const atomIds = new Set(items.map((item) => item.labels.guid).filter(Boolean));
  const evidenceIds = new Set([
    ...items.flatMap((item) => item.evidence.map((_, index) => `${item.id}:legacy-evidence:${index + 1}`)),
    ...normalizeStringList(options.evidenceIds),
  ]);
  const filePaths = new Set([
    ...normalizeStringList(options.filePaths).map(normalizeTracePath),
    ...normalizeFileMap(options.fileContentsByPath).map(([path]) => path),
  ]);
  const links = options.traceLinks ?? parseTraceLinksV1(items);
  const markers = options.reverseMarkers ?? scanReverseTraceMarkers(options.fileContentsByPath ?? {});
  const diagnostics = [];

  for (const link of links) {
    const diagnostic = validateTraceEndpoint(link, { workIds, atomIds, evidenceIds, filePaths });
    if (diagnostic !== null) {
      diagnostics.push(diagnostic);
    }
  }

  for (const marker of markers) {
    const diagnostic = validateReverseMarker(marker, { workIds, atomIds, evidenceIds, traceIds: new Set(links.map((link) => link.id)) });
    if (diagnostic !== null) {
      diagnostics.push(diagnostic);
    }
  }

  for (const item of stableItems(items)) {
    if (DONE_STATUSES.has(item.status) && item.targetFiles.length > 0 && !hasAuthoredTraceLinks(item)) {
      diagnostics.push(traceDiagnostic({
        severity: 'warning',
        code: 'trace.weak_target_files_only',
        message: `WorkItem ${item.id} has target_files but no Trace Links v1 labels.`,
        source: { workId: item.id, label: 'work.target_files' },
        actionable: `Add trace.code_refs or trace.artifact_refs for ${item.targetFiles[0]}.`,
      }));
    }
  }

  return diagnostics.sort((left, right) => compareText(`${left.severity}\0${left.code}\0${left.message}`, `${right.severity}\0${right.code}\0${right.message}`));
}

function isInlineSectionHeading(line) {
  return /^[A-Za-zА-Яа-яЁё0-9][^:\n]{0,80}:$/u.test(line)
    || /^[A-Za-zА-Яа-яЁё0-9][^:\n]{0,40}\s\/\s[^:\n]{0,40}:$/u.test(line);
}

function isProseLineWithTrailingColon(line) {
  if (!/:\s*$/u.test(line)) {
    return false;
  }
  const before = line.slice(0, -1).trim();
  return before.length > 42 || (/\s/u.test(before) && before.length > 24);
}

function isSectionBoundaryInSemanticBlock(line) {
  return isInlineSectionHeading(line) && !isProseLineWithTrailingColon(line);
}

function parseSections(body) {
  const result = {
    labels: {},
    basis: [],
    vector: [],
    goal: [],
    analysis: [],
    decision: [],
    uiRefs: [],
    evidence: [],
    checks: [],
  };
  let section = '';

  for (const rawLine of body.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }

    if (line === 'Базис:') {
      if (section === 'analysis' || section === 'decision') {
        result[section].push(stripListMarker(line));
      } else {
        section = 'basis';
      }
      continue;
    }

    if (line === 'Вектор:') {
      if (section === 'analysis' || section === 'decision') {
        result[section].push(stripListMarker(line));
      } else {
        section = 'vector';
      }
      continue;
    }

    if (line === 'Цель:') {
      if (section === 'analysis' || section === 'decision') {
        result[section].push(stripListMarker(line));
      } else {
        section = 'goal';
      }
      continue;
    }

    if (line === 'Анализ:') {
      section = 'analysis';
      continue;
    }

    if (line === 'Решение:') {
      section = 'decision';
      continue;
    }

    if (line === 'Референсы_UI:') {
      section = 'uiRefs';
      continue;
    }

    if (line === 'Метки:') {
      section = 'labels';
      continue;
    }

    if (line === 'Свидетельства:') {
      section = 'evidence';
      continue;
    }

    if (line === 'критерии_готовности:' || line === 'Проверки:') {
      section = 'checks';
      continue;
    }

    if (section === 'basis' || section === 'vector' || section === 'goal') {
      if (isSectionBoundaryInSemanticBlock(line)) {
        section = '';
        continue;
      }
      result[section].push(stripListMarker(line));
      continue;
    }

    if (section === 'analysis' || section === 'decision' || section === 'uiRefs') {
      result[section].push(stripListMarker(line));
      continue;
    }

    if (isInlineSectionHeading(line)) {
      section = '';
      continue;
    }

    if (section === 'labels') {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      result.labels[key] = value;
      continue;
    }

    if (section === 'evidence') {
      result.evidence.push(stripListMarker(line));
      continue;
    }

    if (section === 'checks') {
      result.checks.push(stripListMarker(line));
    }
  }

  return result;
}

function buildEdges(items) {
  return items
    .flatMap((item) =>
      item.dependsOn.map((dependencyId) => ({
        from: dependencyId,
        to: item.id,
        type: 'depends_on',
      })),
    )
    .sort((left, right) => compareText(`${left.from}\0${left.to}`, `${right.from}\0${right.to}`));
}

function buildStatusCounts(items) {
  const entries = [];
  for (const status of [...ALLOWED_STATUSES].sort(compareText)) {
    const count = items.filter((item) => item.status === status).length;
    if (count > 0) {
      entries.push([status, count]);
    }
  }

  return Object.fromEntries(entries);
}

function buildDashboardStatusCounts(items) {
  return Object.fromEntries(
    [...items.reduce((counts, item) => {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([left], [right]) => compareText(left, right)),
  );
}

function buildRecentEvidence(items, limit = 10) {
  return items
    .flatMap((item) =>
      item.evidence.map((summary, index) => ({
        id: `${item.id}:legacy-evidence:${index + 1}`,
        taskId: item.id,
        taskTitle: item.title,
        type: 'legacy-evidence',
        source: 'workgraph.snapshot.v1',
        status: item.traceStatus === 'verified' ? 'succeeded' : 'pending',
        summary,
      })),
    )
    .slice(0, Number.isInteger(limit) && limit >= 0 ? limit : 10);
}

function parseTraceEndpoint(labelKey, rawRef) {
  if (labelKey === 'trace.evidence_refs') {
    return { kind: 'evidence', id: rawRef };
  }

  if (labelKey === 'trace.links') {
    return parseReverseMarkerEndpoint(rawRef);
  }

  const rangeMatch = RANGE_LOCATOR_PATTERN.exec(rawRef);
  if (rangeMatch !== null) {
    const [, path, startLine, endLine] = rangeMatch;
    return {
      kind: 'range',
      id: rawRef,
      locator: {
        path: normalizeTracePath(path),
        startLine: Number(startLine),
        endLine: Number(endLine ?? startLine),
      },
    };
  }

  const hashIndex = rawRef.indexOf('#');
  if (hashIndex !== -1) {
    const path = normalizeTracePath(rawRef.slice(0, hashIndex));
    const symbol = rawRef.slice(hashIndex + 1).trim();
    return { kind: 'symbol', id: rawRef, locator: { path, symbol } };
  }

  return { kind: 'file', id: normalizeTracePath(rawRef), locator: { path: normalizeTracePath(rawRef) } };
}

function parseReverseMarkerEndpoint(ref) {
  const separatorIndex = ref.indexOf(':');
  if (separatorIndex === -1) {
    return { kind: 'marker', id: ref };
  }

  return {
    kind: ref.slice(0, separatorIndex).trim(),
    id: ref.slice(separatorIndex + 1).trim(),
  };
}

function traceRelationForLabel(labelKey) {
  if (labelKey === 'trace.evidence_refs') {
    return 'verifies';
  }

  if (labelKey === 'trace.links') {
    return 'references';
  }

  return 'references';
}

function validateTraceEndpoint(link, context) {
  const endpoint = link.to;

  if (endpoint.kind === 'file' && !context.filePaths.has(endpoint.id)) {
    return traceDiagnostic({
      severity: 'error',
      code: 'trace.broken_file_ref',
      message: `Trace link from ${link.sourceWorkId} references missing file ${endpoint.id}.`,
      source: { workId: link.sourceWorkId, label: link.sourceLabel, ref: link.sourceRef },
      actionable: `Update ${link.sourceLabel} or add ${endpoint.id} to the provided file list.`,
    });
  }

  if ((endpoint.kind === 'symbol' || endpoint.kind === 'range') && !context.filePaths.has(endpoint.locator.path)) {
    return traceDiagnostic({
      severity: 'error',
      code: 'trace.broken_file_ref',
      message: `Trace link from ${link.sourceWorkId} references missing file ${endpoint.locator.path}.`,
      source: { workId: link.sourceWorkId, label: link.sourceLabel, ref: link.sourceRef },
      actionable: `Update ${link.sourceLabel} or add ${endpoint.locator.path} to the provided file list.`,
    });
  }

  if (endpoint.kind === 'evidence' && context.evidenceIds.size > 0 && !context.evidenceIds.has(endpoint.id)) {
    return traceDiagnostic({
      severity: 'warning',
      code: 'trace.broken_evidence_ref',
      message: `Trace link from ${link.sourceWorkId} references unknown evidence ${endpoint.id}.`,
      source: { workId: link.sourceWorkId, label: link.sourceLabel, ref: link.sourceRef },
      actionable: `Record evidence ${endpoint.id} or update ${link.sourceLabel}.`,
    });
  }

  return null;
}

function validateReverseMarker(marker, context) {
  const { endpoint } = marker;
  const knownByKind = {
    work: context.workIds,
    atom: context.atomIds,
    evidence: context.evidenceIds,
    trace: context.traceIds,
  };
  const knownIds = knownByKind[endpoint.kind];

  if (knownIds === undefined || knownIds.has(endpoint.id)) {
    return null;
  }

  return traceDiagnostic({
    severity: 'error',
    code: 'trace.orphan_reverse_marker',
    message: `Reverse marker ${marker.ref} in ${marker.sourcePath} points to unknown ${endpoint.kind} id ${endpoint.id}.`,
    source: { path: marker.sourcePath, line: marker.line, ref: marker.ref },
    actionable: `Update or remove the marker in ${marker.sourcePath}.`,
  });
}

function traceDiagnostic({ severity, code, message, source, actionable }) {
  return { severity, code, message, source, actionable };
}

function hasAuthoredTraceLinks(item) {
  return TRACE_LABEL_KEYS.some((labelKey) => parseList(item.labels[labelKey]).length > 0);
}

function normalizeFileMap(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (value instanceof Map) {
    return [...value.entries()].map(([path, content]) => [normalizeTracePath(path), String(content ?? '')]);
  }

  if (Array.isArray(value)) {
    return value.map(([path, content]) => [normalizeTracePath(path), String(content ?? '')]);
  }

  if (typeof value === 'object') {
    return Object.entries(value).map(([path, content]) => [normalizeTracePath(path), String(content ?? '')]);
  }

  throw new TypeError('fileContentsByPath must be an object, Map, or entry array');
}

function normalizeTracePath(path) {
  return String(path ?? '').replace(/\\/gu, '/').replace(/^\.\//u, '').trim();
}

function normalizeStringList(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new TypeError('value must be an array');
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function legacyIohascIdToRef(ref) {
  const normalized = String(ref ?? '').trim();
  return normalized.startsWith('step:') ? `atom:${normalized.slice('step:'.length)}` : normalized;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/u).length;
}

function buildViewCounts(items) {
  return {
    board: items.filter((item) => item.status !== 'backlog').length,
    backlog: items.filter((item) => item.status === 'backlog').length,
    current: items.filter((item) => ['claimed', 'doing', 'in_progress', 'verify'].includes(item.status)).length,
    blocked: items.filter((item) => item.status === 'blocked' || item.blocker).length,
  };
}

function toDashboardTaskSummary(item) {
  return {
    id: item.id,
    key: item.key,
    title: item.title,
    status: item.status,
    ownerRole: item.ownerRole,
    department: item.department,
    priority: item.priority,
    risk: item.risk,
    traceStatus: item.traceStatus,
    nextAction: item.nextAction,
    targetFiles: [...item.targetFiles],
  };
}

function normalizeProjectionList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(status) {
  const normalizedStatus = String(status ?? 'backlog').trim();
  return normalizedStatus === '' ? 'backlog' : normalizedStatus;
}

function parseList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  return value
    .split(LIST_SEPARATOR_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean)
    .sort(compareText);
}

function stableItems(items) {
  return [...items].sort((left, right) => compareText(left.id, right.id));
}

function hasEvidence(item, options) {
  return item.evidence.length > 0 || normalizeOptionalText(options.evidence) !== '';
}

function hasBlockerReason(options) {
  return normalizeOptionalText(options.reason) !== '' || normalizeOptionalText(options.blocker) !== '';
}

function normalizeEvidence(evidence) {
  if (typeof evidence === 'string') {
    const trimmed = evidence.trim();
    if (trimmed === '') {
      throw new WorkGraphPolicyError('evidence must be non-empty');
    }

    return trimmed;
  }

  if (evidence && typeof evidence === 'object') {
    return JSON.stringify(sortObject(evidence));
  }

  throw new WorkGraphPolicyError('evidence must be a non-empty string or object');
}

function normalizeOptionalText(value) {
  return value === undefined ? '' : String(value).trim();
}

function stripListMarker(line) {
  return line.replace(/^-\s*/u, '').trim();
}

function normalizeSectionText(lines) {
  return lines.map((line) => line.trim()).filter(Boolean).join('\n');
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareText)
        .map((key) => [key, sortObject(value[key])]),
    );
  }

  return value;
}

function assertItems(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  items.forEach(assertItem);
}

function assertWorkGraphSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.items)) {
    throw new TypeError('snapshot must be a Work Graph snapshot');
  }
}

function assertItem(item) {
  if (!item || typeof item !== 'object' || typeof item.id !== 'string') {
    throw new TypeError('item must be a parsed WorkItem');
  }

  if (!Array.isArray(item.dependsOn) || !Array.isArray(item.evidence) || !Array.isArray(item.checks)) {
    throw new TypeError('item must be a parsed WorkItem');
  }
}

function compareText(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'variant' });
}
