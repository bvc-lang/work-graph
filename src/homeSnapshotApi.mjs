import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readWorkerRunJournal } from './agentWorkerLiveLoop.mjs';
import { buildHomeSnapshot } from './homeSnapshotProjection.mjs';
import {
  applyInboxReadState,
  buildInboxEventsFromSources,
  readInboxReadState,
} from './inboxEventStream.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import { buildSnapshot } from './workGraphRuntime.mjs';
import { readDaemonAuditJournal } from './workGraphDaemonTick.mjs';
import { DONE_STATUSES } from './workGraphCycleSlice.mjs';
import { resolveSessionEpicId } from './missionControlUiClient.mjs';

const ANALYTICS_JOURNAL = 'work/analytics-records.jsonl';

function startOfUtcDay(isoDate = new Date()) {
  const date = new Date(isoDate);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function countAgentRunsToday(workerRuns, now = new Date()) {
  const dayStart = startOfUtcDay(now).getTime();
  return workerRuns.filter((run) => {
    const at = Date.parse(run.recordedAt ?? run.startedAt ?? '');
    return Number.isFinite(at) && at >= dayStart;
  }).length;
}

function computeVerifyPassRate(workerRuns, window = 20) {
  const recent = workerRuns.slice(-window);
  if (recent.length === 0) {
    return { rate: null, windowRuns: 0 };
  }
  const passed = recent.filter((run) => run.ok !== false && run.status !== 'failed').length;
  return { rate: passed / recent.length, windowRuns: recent.length };
}

function computeThroughputPerDay(items, windowDays = 7, now = new Date()) {
  const windowStart = now.getTime() - windowDays * 86_400_000;
  const doneInWindow = items.filter((item) => {
    if (!DONE_STATUSES.has(item.status)) {
      return false;
    }
    const closedAt = item.labels?.['work.decision.at'] ?? item.labels?.['work.analysis.at'];
    const parsed = Date.parse(closedAt ?? '');
    return Number.isFinite(parsed) && parsed >= windowStart;
  }).length;
  return doneInWindow / windowDays;
}

function findDaemonStartedAt(daemonAudit) {
  for (let index = daemonAudit.length - 1; index >= 0; index -= 1) {
    const entry = daemonAudit[index];
    if (entry.event === 'started' || entry.event === 'start' || entry.summary?.includes('started')) {
      return entry.recordedAt ?? null;
    }
  }
  const last = daemonAudit[daemonAudit.length - 1];
  return last?.recordedAt ?? null;
}

async function readAnalyticsRecordsTail(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const limit = options.limit ?? 20;

  try {
    const text = await readFile(join(cwd, ANALYTICS_JOURNAL), 'utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    const records = [];

    for (const line of lines.slice(-limit)) {
      try {
        const envelope = JSON.parse(line);
        records.push(envelope.record ?? envelope);
      } catch {
        // skip malformed
      }
    }

    return records.reverse();
  } catch {
    return [];
  }
}

export async function readHomeSnapshot(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const items = await readWorkItemsFromRepo({ ...options, cwd });
  const workGraphSnapshot = buildSnapshot(items);
  const workerRuns = await readWorkerRunJournal({ cwd, journalPath: options.journalPath });
  const daemonAudit = await readDaemonAuditJournal({ cwd, auditPath: options.auditPath });
  const analyticsRecords = await readAnalyticsRecordsTail({ cwd, limit: 15 });
  const verifyItems = items.filter((item) => item.status === 'verify');

  const inboxEvents = buildInboxEventsFromSources({
    workerRuns: workerRuns.slice(-30).reverse(),
    daemonAudit: daemonAudit.slice(-20).reverse(),
    analyticsRecords,
    verifyItems: verifyItems.slice(0, 10),
  });
  const readState = await readInboxReadState({ cwd, statePath: options.inboxStatePath });
  const inboxWithRead = applyInboxReadState(inboxEvents, readState);
  const verifyStats = computeVerifyPassRate(workerRuns);
  const latestRun = workerRuns[workerRuns.length - 1];
  const activeRunIds = items
    .filter((item) => ['claimed', 'doing', 'in_progress', 'verify'].includes(item.status))
    .map((item) => item.id);
  const sessionEpicId = resolveSessionEpicId(items, {
    focusTaskId: latestRun?.taskId ?? null,
    activeRunIds,
  });

  return buildHomeSnapshot(workGraphSnapshot, {
    ownerRole: options.ownerRole,
    currentCycle: options.cycleId,
    now: options.now,
    inboxPreview: inboxWithRead,
    inboxPreviewLimit: options.inboxPreviewLimit ?? 5,
    verifyPassRate: verifyStats.rate,
    verifyWindowRuns: verifyStats.windowRuns,
    throughputPerDay: computeThroughputPerDay(items),
    throughputWindowDays: 7,
    daemonStartedAt: findDaemonStartedAt(daemonAudit),
    agentRunsToday: countAgentRunsToday(workerRuns, options.now ? new Date(options.now) : new Date()),
    sessionEpicId,
  });
}
