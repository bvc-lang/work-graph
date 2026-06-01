import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const INBOX_EVENTS_SCHEMA = 'inbox.events.v1';
export const INBOX_READ_STATE_SCHEMA = 'inbox.read-state.v1';
export const DEFAULT_INBOX_READ_STATE_PATH = '.workgraph/inbox-read-state.json';

function parseTime(value) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildInboxEventsFromSources(sources = {}) {
  const events = [];

  for (const run of sources.workerRuns ?? []) {
    const at = run.recordedAt ?? run.startedAt ?? run.finishedAt ?? null;
    events.push({
      id: `agent-run:${run.runId ?? run.taskId ?? at ?? events.length}`,
      kind: 'agent-run',
      severity: run.ok === false || run.status === 'failed' ? 'error' : 'info',
      title: run.taskId ? `Agent run: ${run.taskId}` : 'Agent run',
      summary: run.failureReason ?? run.summary ?? run.transition ?? '',
      link: run.taskId ? { type: 'work', workId: run.taskId } : null,
      at,
      unread: true,
    });
  }

  for (const entry of sources.daemonAudit ?? []) {
    const at = entry.recordedAt ?? entry.at ?? null;
    events.push({
      id: `daemon:${entry.tickId ?? entry.taskId ?? at ?? events.length}`,
      kind: 'daemon',
      severity: entry.event === 'recovery' || entry.status === 'failed' ? 'warning' : 'info',
      title: entry.event ? `Daemon: ${entry.event}` : 'Daemon tick',
      summary: entry.summary ?? entry.message ?? '',
      link: entry.taskId ? { type: 'work', workId: entry.taskId } : null,
      at,
      unread: true,
    });
  }

  for (const record of sources.analyticsRecords ?? []) {
    const key = record.key ?? record.id ?? '';
    events.push({
      id: `analytics:${key || events.length}`,
      kind: 'analytics',
      severity: 'info',
      title: record.title ?? key ?? 'Analytics',
      summary: record.topic ?? record.query ?? '',
      link: record.bodyPath ? { type: 'analytics', path: record.bodyPath, key } : null,
      at: record.updatedAt ?? record.createdAt ?? record.appendedAt ?? null,
      unread: true,
    });
  }

  for (const item of sources.verifyItems ?? []) {
    if (item.status !== 'verify') {
      continue;
    }
    events.push({
      id: `verify:${item.id}`,
      kind: 'work-verify',
      severity: 'info',
      title: `Verify: ${item.title ?? item.id}`,
      summary: item.nextAction ?? '',
      link: { type: 'work', workId: item.id },
      at: item.labels?.['work.decision.at'] ?? null,
      unread: true,
    });
  }

  return events.sort((left, right) => parseTime(right.at) - parseTime(left.at));
}

export function applyInboxReadState(events, readState = {}) {
  const readIds = new Set(Array.isArray(readState.readIds) ? readState.readIds : []);
  return events.map((event) => ({
    ...event,
    unread: !readIds.has(event.id),
  }));
}

export function countUnreadInboxEvents(events) {
  return events.filter((event) => event.unread !== false).length;
}

export async function readInboxReadState(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const statePath = join(cwd, options.statePath ?? DEFAULT_INBOX_READ_STATE_PATH);

  try {
    const text = await readFile(statePath, 'utf8');
    const parsed = JSON.parse(text);
    return {
      schema: INBOX_READ_STATE_SCHEMA,
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return { schema: INBOX_READ_STATE_SCHEMA, readIds: [], updatedAt: null };
  }
}

export async function markInboxEventsRead(eventIds, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const statePath = join(cwd, options.statePath ?? DEFAULT_INBOX_READ_STATE_PATH);
  const current = await readInboxReadState({ cwd, statePath });
  const merged = new Set([...current.readIds, ...eventIds.filter(Boolean)]);

  const next = {
    schema: INBOX_READ_STATE_SCHEMA,
    readIds: [...merged],
    updatedAt: new Date().toISOString(),
  };

  await mkdir(join(cwd, '.workgraph'), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function readInboxEventsResponse(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 50;
  const sources = options.sources ?? {};
  const events = buildInboxEventsFromSources(sources);
  const readState = await readInboxReadState({ cwd, statePath: options.statePath });
  const withRead = applyInboxReadState(events, readState);

  return {
    schema: INBOX_EVENTS_SCHEMA,
    generatedAt: new Date().toISOString(),
    unreadCount: countUnreadInboxEvents(withRead),
    items: withRead.slice(0, limit),
  };
}
