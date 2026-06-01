import {
  CYCLE_SLICE_SCHEMA,
  DEFAULT_DONE_ARCHIVE_CAP,
  DONE_STATUSES,
  OPERATIONAL_STATUSES,
  deriveWorkCycle,
} from './workGraphCycleSlice.mjs';

export const HOME_SNAPSHOT_SCHEMA = 'home.snapshot.v1';

export const HOME_REFRESH_BUDGETS = Object.freeze({
  kpiMs: 30000,
  activeRunsMs: 5000,
  myQueueMs: 30000,
  inboxPreviewMs: 30000,
});

const ACTIVE_RUN_STATUSES = new Set(['claimed', 'doing', 'in_progress', 'verify']);
const READY_STATUS = 'ready';
const BLOCKED_STATUS = 'blocked';
const DEFAULT_QUEUE_LIMIT = 5;
const DEFAULT_INBOX_PREVIEW_LIMIT = 5;
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const RISK_RANK = { high: 0, medium: 1, low: 2 };

const compareText = (left, right) =>
  String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function rankOf(map, value, fallback = 1) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const key = String(value).trim().toLowerCase();
  return Object.hasOwn(map, key) ? map[key] : fallback;
}

function compareReadyItems(left, right) {
  const priorityDelta = rankOf(PRIORITY_RANK, left.priority) - rankOf(PRIORITY_RANK, right.priority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  const riskDelta = rankOf(RISK_RANK, left.risk) - rankOf(RISK_RANK, right.risk);
  if (riskDelta !== 0) {
    return riskDelta;
  }
  return compareText(left.id, right.id);
}

function compareActiveRuns(left, right) {
  const order = ['verify', 'doing', 'in_progress', 'claimed'];
  const leftIndex = order.indexOf(left.status);
  const rightIndex = order.indexOf(right.status);
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  return compareText(left.id, right.id);
}

function summarizeQueueItem(item) {
  return {
    workId: item.id,
    title: item.title ?? '',
    status: item.status,
    department: item.department ?? '',
    ownerRole: item.ownerRole ?? '',
    priority: item.priority ?? '',
    risk: item.risk ?? '',
    nextAction: item.nextAction ?? '',
    parentId: item.labels?.['work.parent_id'] ?? item.parentId ?? null,
  };
}

function summarizeActiveRun(item) {
  return {
    workId: item.id,
    title: item.title ?? '',
    status: item.status,
    ownerRole: item.ownerRole ?? '',
    department: item.department ?? '',
    blockerReason: item.blocker?.reason ?? null,
  };
}

function buildStatusBuckets(items) {
  const counts = { ready: 0, blocked: 0, doing: 0, verify: 0, done: 0, backlog: 0, other: 0 };
  for (const item of items) {
    if (item.status === READY_STATUS) {
      counts.ready += 1;
    } else if (item.status === BLOCKED_STATUS) {
      counts.blocked += 1;
    } else if (item.status === 'verify') {
      counts.verify += 1;
    } else if (item.status === 'doing' || item.status === 'in_progress' || item.status === 'claimed') {
      counts.doing += 1;
    } else if (DONE_STATUSES.has(item.status)) {
      counts.done += 1;
    } else if (item.status === 'backlog') {
      counts.backlog += 1;
    } else {
      counts.other += 1;
    }
  }
  return counts;
}

function buildCycleProgress(items, options) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const currentCycle = options.currentCycle
    ?? (typeof options.resolveCurrentCycle === 'function' ? options.resolveCurrentCycle(items) : null);

  if (!currentCycle || currentCycle === 'all') {
    const total = items.length;
    const done = items.filter((item) => DONE_STATUSES.has(item.status)).length;
    return {
      cycleId: currentCycle ?? null,
      total,
      done,
      operational: items.filter((item) => OPERATIONAL_STATUSES.has(item.status)).length,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  }

  const inCycle = items.filter((item) => deriveWorkCycle(item, itemById) === currentCycle);
  const total = inCycle.length;
  const done = inCycle.filter((item) => DONE_STATUSES.has(item.status)).length;
  return {
    cycleId: currentCycle,
    total,
    done,
    operational: inCycle.filter((item) => OPERATIONAL_STATUSES.has(item.status)).length,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

function pickMyQueue(items, options) {
  const ownerRole = options.ownerRole ? String(options.ownerRole).trim().toLowerCase() : null;
  const limit = Number.isInteger(options.queueLimit) && options.queueLimit > 0
    ? options.queueLimit
    : DEFAULT_QUEUE_LIMIT;

  const readyItems = items.filter((item) => item.status === READY_STATUS);
  const filtered = ownerRole
    ? readyItems.filter((item) => String(item.ownerRole ?? '').trim().toLowerCase() === ownerRole)
    : readyItems;

  const sorted = [...filtered].sort(compareReadyItems);
  return sorted.slice(0, limit).map(summarizeQueueItem);
}

function pickActiveRuns(items) {
  return items
    .filter((item) => ACTIVE_RUN_STATUSES.has(item.status))
    .sort(compareActiveRuns)
    .map(summarizeActiveRun);
}

function buildInboxPreview(events, limit = DEFAULT_INBOX_PREVIEW_LIMIT) {
  if (!Array.isArray(events)) {
    return [];
  }
  return events
    .slice(0, Math.max(0, limit))
    .map((event) => ({
      id: event.id ?? '',
      kind: event.kind ?? 'event',
      severity: event.severity ?? 'info',
      title: event.title ?? '',
      summary: event.summary ?? '',
      link: event.link ?? null,
      at: event.at ?? null,
      unread: event.unread !== false,
    }));
}

function buildVerifyPassRate(options) {
  if (typeof options.verifyPassRate === 'number' && Number.isFinite(options.verifyPassRate)) {
    return {
      rate: Math.max(0, Math.min(1, options.verifyPassRate)),
      windowRuns: Number.isInteger(options.verifyWindowRuns) ? options.verifyWindowRuns : null,
      source: options.verifyPassRateSource ?? 'caller',
    };
  }
  return { rate: null, windowRuns: null, source: 'unavailable' };
}

function buildThroughput(options) {
  if (typeof options.throughputPerDay === 'number' && Number.isFinite(options.throughputPerDay)) {
    return {
      perDay: options.throughputPerDay,
      windowDays: Number.isInteger(options.throughputWindowDays) ? options.throughputWindowDays : 7,
      source: options.throughputSource ?? 'caller',
    };
  }
  return { perDay: null, windowDays: null, source: 'unavailable' };
}

function buildDaemonUptime(options) {
  if (options.daemonStartedAt && Number.isFinite(Date.parse(options.daemonStartedAt))) {
    return {
      startedAt: options.daemonStartedAt,
      uptimeMs: Math.max(0, Date.now() - Date.parse(options.daemonStartedAt)),
      source: options.daemonSource ?? 'caller',
    };
  }
  return { startedAt: null, uptimeMs: null, source: 'unavailable' };
}

function buildAgentRunsToday(options) {
  if (Number.isInteger(options.agentRunsToday) && options.agentRunsToday >= 0) {
    return { count: options.agentRunsToday, source: options.agentRunsSource ?? 'caller' };
  }
  return { count: null, source: 'unavailable' };
}

/**
 * Build a Home (mission control) snapshot from a workgraph.snapshot.v1.
 *
 * @param {object} workGraphSnapshot — must contain {items: WorkItem[]}.
 * @param {object} [options]
 * @param {string} [options.ownerRole] — filter My queue by owner role.
 * @param {number} [options.queueLimit=5] — My queue size cap.
 * @param {number} [options.inboxPreviewLimit=5] — inbox preview cap.
 * @param {string} [options.currentCycle] — explicit cycle id; otherwise resolveCurrentCycle().
 * @param {(items: WorkItem[]) => string} [options.resolveCurrentCycle]
 * @param {Array<object>} [options.inboxPreview] — pre-built inbox events (newest first).
 * @param {number} [options.verifyPassRate]
 * @param {number} [options.throughputPerDay]
 * @param {string} [options.daemonStartedAt]
 * @param {number} [options.agentRunsToday]
 * @param {number} [options.doneArchiveCap=DEFAULT_DONE_ARCHIVE_CAP]
 * @returns {object} schema home.snapshot.v1
 */
export function buildHomeSnapshot(workGraphSnapshot, options = {}) {
  if (!workGraphSnapshot || typeof workGraphSnapshot !== 'object') {
    throw new TypeError('workGraphSnapshot must be an object');
  }
  const items = Array.isArray(workGraphSnapshot.items) ? workGraphSnapshot.items : [];

  const statusBuckets = buildStatusBuckets(items);
  const cycleProgress = buildCycleProgress(items, options);

  return {
    schema: HOME_SNAPSHOT_SCHEMA,
    sourceSchema: workGraphSnapshot.schema ?? null,
    cycleSliceSchema: CYCLE_SLICE_SCHEMA,
    generatedAt: options.now ?? new Date().toISOString(),
    refreshBudgets: HOME_REFRESH_BUDGETS,
    kpi: {
      cycleProgress,
      ready: statusBuckets.ready,
      blocked: statusBuckets.blocked,
      verify: statusBuckets.verify,
      doing: statusBuckets.doing,
      done: statusBuckets.done,
      backlog: statusBuckets.backlog,
      verifyPassRate: buildVerifyPassRate(options),
      throughput: buildThroughput(options),
      daemonUptime: buildDaemonUptime(options),
      agentRunsToday: buildAgentRunsToday(options),
    },
    myQueue: {
      ownerRole: options.ownerRole ?? null,
      items: pickMyQueue(items, options),
      doneArchiveCap: options.doneArchiveCap ?? DEFAULT_DONE_ARCHIVE_CAP,
    },
    activeRuns: pickActiveRuns(items),
    inboxPreview: {
      limit: Number.isInteger(options.inboxPreviewLimit) && options.inboxPreviewLimit > 0
        ? options.inboxPreviewLimit
        : DEFAULT_INBOX_PREVIEW_LIMIT,
      items: buildInboxPreview(options.inboxPreview, options.inboxPreviewLimit),
    },
    sessionEpicId: options.sessionEpicId ?? null,
  };
}
