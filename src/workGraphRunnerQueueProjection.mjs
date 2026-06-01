import { createHash } from 'node:crypto';
import { readWorkerRunJournal } from './agentWorkerLiveLoop.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const RUNNER_QUEUE_PROJECTION_SCHEMA = 'workgraph.runner.queue.projection.v1';
export const RUNNER_QUEUE_SQLITE_DDL = `
CREATE TABLE IF NOT EXISTS workgraph_runner_queue_v1 (
  task_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT,
  last_run_id TEXT,
  last_run_status TEXT,
  provider_id TEXT,
  policy_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`.trim();

export function computeRunnerQueuePolicyHash(item) {
  const payload = JSON.stringify({
    id: item.id,
    status: item.status,
    dependsOn: [...(item.dependsOn ?? [])].sort(compareText),
    priority: item.priority ?? 'medium',
  });

  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function indexWorkerRunsByTaskId(entries) {
  const byTask = new Map();

  for (const entry of entries ?? []) {
    if (!entry || typeof entry.taskId !== 'string' || entry.taskId.trim() === '') {
      continue;
    }

    const existing = byTask.get(entry.taskId);
    if (!existing || String(entry.recordedAt ?? '') > String(existing.recordedAt ?? '')) {
      byTask.set(entry.taskId, entry);
    }
  }

  return byTask;
}

export function buildRunnerQueueProjectionFromItems(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const journalByTask = indexWorkerRunsByTaskId(options.workerRuns ?? []);
  const runnableStatuses = new Set(options.runnableStatuses ?? ['ready', 'claimed', 'verify', 'in_progress']);
  const recordedAt = options.recordedAt ?? new Date(0).toISOString();

  const rows = items
    .filter((item) => runnableStatuses.has(item.status))
    .map((item) => {
      const lastRun = journalByTask.get(item.id);
      return {
        taskId: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority ?? 'medium',
        retryCount: Number(lastRun?.retryCount ?? 0),
        nextRunAt: item.status === 'ready' ? recordedAt : null,
        lastRunId: lastRun?.runId ?? null,
        lastRunStatus: lastRun?.status ?? null,
        providerId: lastRun?.provider ?? null,
        policyHash: computeRunnerQueuePolicyHash(item),
        ownerRole: item.ownerRole ?? '',
        dependsOn: [...(item.dependsOn ?? [])].sort(compareText),
      };
    })
    .sort((left, right) => compareText(left.taskId, right.taskId));

  return {
    schema: RUNNER_QUEUE_PROJECTION_SCHEMA,
    recordedAt,
    source: options.source ?? 'workgraph.snapshot.v1',
    rows,
    summary: {
      total: rows.length,
      ready: rows.filter((row) => row.status === 'ready').length,
      claimed: rows.filter((row) => row.status === 'claimed').length,
      withLastRun: rows.filter((row) => row.lastRunId).length,
    },
    sqlite: {
      ddl: RUNNER_QUEUE_SQLITE_DDL,
      optional: true,
      rebuildPolicy: 'delete-db-and-rebuild-from-step-canonical',
    },
  };
}

export async function syncRunnerQueueProjectionToSqlite(projection, options = {}) {
  if (!projection || projection.schema !== RUNNER_QUEUE_PROJECTION_SCHEMA) {
    throw new TypeError('projection must be workgraph.runner.queue.projection.v1');
  }

  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch {
    return {
      ok: false,
      skipped: true,
      reason: 'node:sqlite is not available in this runtime',
      rowCount: 0,
    };
  }

  const dbPath = options.dbPath;
  if (!dbPath) {
    return {
      ok: false,
      skipped: true,
      reason: 'dbPath is required for sqlite sync',
      rowCount: 0,
    };
  }

  const db = new DatabaseSync(dbPath);
  try {
    db.exec(RUNNER_QUEUE_SQLITE_DDL);
    const upsert = db.prepare(`
      INSERT INTO workgraph_runner_queue_v1 (
        task_id, status, priority, retry_count, next_run_at,
        last_run_id, last_run_status, provider_id, policy_hash, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id) DO UPDATE SET
        status=excluded.status,
        priority=excluded.priority,
        retry_count=excluded.retry_count,
        next_run_at=excluded.next_run_at,
        last_run_id=excluded.last_run_id,
        last_run_status=excluded.last_run_status,
        provider_id=excluded.provider_id,
        policy_hash=excluded.policy_hash,
        updated_at=excluded.updated_at
    `);

    for (const row of projection.rows) {
      upsert.run(
        row.taskId,
        row.status,
        row.priority,
        row.retryCount,
        row.nextRunAt,
        row.lastRunId,
        row.lastRunStatus,
        row.providerId,
        row.policyHash,
        projection.recordedAt,
      );
    }

    return {
      ok: true,
      skipped: false,
      reason: '',
      rowCount: projection.rows.length,
      dbPath,
    };
  } finally {
    db.close();
  }
}

export async function readRunnerQueueProjectionFromRepo(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const items = await readWorkItemsFromRepo({ ...options, cwd });
  const workerRuns = await readWorkerRunJournal({
    cwd,
    journalPath: options.journalPath ?? 'work/worker-runs.jsonl',
  });

  return buildRunnerQueueProjectionFromItems(items, {
    workerRuns,
    recordedAt: options.recordedAt,
    source: options.source ?? (options.backlogPath ?? 'intent/index.bvc'),
  });
}
