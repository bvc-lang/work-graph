import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import { readWorkerRunJournal } from './agentWorkerLiveLoop.mjs';
import { readDaemonAuditJournal } from './workGraphDaemonTick.mjs';
import { readHomeSnapshot } from './homeSnapshotApi.mjs';
import {
  markInboxEventsRead,
  readInboxEventsResponse,
} from './inboxEventStream.mjs';

async function loadInboxSources(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const [workerRuns, daemonAudit, items] = await Promise.all([
    readWorkerRunJournal({ cwd, journalPath: options.journalPath }),
    readDaemonAuditJournal({ cwd, auditPath: options.auditPath }),
    readWorkItemsFromRepo({ ...options, cwd }),
  ]);

  return {
    workerRuns,
    daemonAudit,
    verifyItems: items.filter((item) => item.status === 'verify'),
  };
}

export async function handleHomeSnapshotRequest(options = {}) {
  return readHomeSnapshot(options);
}

export async function handleInboxEventsRequest(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const sources = await loadInboxSources(options);
  const analyticsRecords = [];

  try {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const text = await readFile(join(cwd, 'work/analytics-records.jsonl'), 'utf8');
    for (const line of text.split(/\r?\n/).filter(Boolean).slice(-20)) {
      try {
        const envelope = JSON.parse(line);
        analyticsRecords.unshift(envelope.record ?? envelope);
      } catch {
        // skip
      }
    }
  } catch {
    // optional
  }

  return readInboxEventsResponse({
    cwd,
    limit: Number(options.limit) || 50,
    sources: {
      workerRuns: sources.workerRuns.slice(-30).reverse(),
      daemonAudit: sources.daemonAudit.slice(-20).reverse(),
      analyticsRecords,
      verifyItems: sources.verifyItems.slice(0, 10),
    },
    statePath: options.inboxStatePath,
  });
}

export async function handleInboxEventsReadRequest(body, options = {}) {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  const eventIds = Array.isArray(parsed?.eventIds) ? parsed.eventIds : [];
  const state = await markInboxEventsRead(eventIds, options);
  const inbox = await handleInboxEventsRequest(options);
  return { ok: true, readState: state, unreadCount: inbox.unreadCount };
}

export const MISSION_CONTROL_CSS = `
    .layout-root.has-agent-dock .content { margin-right: var(--agent-dock-width, 360px); }
    #home-view { display: grid; gap: 16px; color: var(--text); }
    .home-mission-control { display: grid; gap: 16px; }
    .home-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .home-kpi-tile {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      box-shadow: var(--shadow-card);
      color: var(--text);
    }
    .home-kpi-tile .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    .home-kpi-tile .value { font-size: 20px; font-weight: 600; margin-top: 4px; color: var(--text); }
    .home-section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      box-shadow: var(--shadow-card);
      color: var(--text);
    }
    .home-section h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--text); }
    .home-list { list-style: none; margin: 0; padding: 0; }
    .home-list li { padding: 8px 0; border-bottom: 1px solid var(--border); cursor: pointer; color: var(--text); }
    .home-list li:last-child { border-bottom: none; }
    .home-list li .muted { color: var(--muted); font-size: var(--font-size-sm, 14px); margin-top: 2px; }
    .home-list li.empty {
      cursor: default;
      color: var(--muted);
      border: 1px dashed var(--border);
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      background: var(--panel-2);
    }
    #agent-run-dock {
      position: fixed; top: 0; right: 0;
      width: var(--agent-dock-width, 360px); height: 100vh;
      background: var(--panel);
      border-left: 1px solid var(--border);
      display: flex; flex-direction: column; z-index: 20;
      transform: translateX(100%); transition: transform .2s ease;
      color: var(--text);
    }
    #agent-run-dock.is-open { transform: translateX(0); }
    .agent-dock-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border); }
    .agent-dock-close { background: transparent; border: 0; color: var(--muted); cursor: pointer; font: inherit; font-size: 18px; line-height: 1; padding: 4px 8px; }
    .agent-dock-close:hover { color: var(--text); }
    .agent-scope-panel {
      border-bottom: 1px solid var(--border);
      max-height: 42vh;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: var(--panel-2);
    }
    .agent-scope-panel-header {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }
    .agent-scope-summary { padding: 8px 12px 4px; font-size: 13px; }
    .agent-scope-summary .muted { font-size: 11px; margin-top: 2px; color: var(--muted); }
    .agent-scope-list {
      list-style: none;
      margin: 0;
      padding: 0 0 8px;
      overflow: auto;
      flex: 1;
      min-height: 0;
    }
    .agent-scope-list li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 6px;
      align-items: baseline;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }
    .agent-scope-list li:last-child { border-bottom: none; }
    .agent-scope-list li:hover { background: var(--accent-soft); }
    body[data-theme="dark"] .agent-scope-list li:hover { background: rgba(0, 102, 255, 0.12); }
    .agent-scope-list li.empty { cursor: default; color: var(--muted); justify-content: center; display: block; text-align: center; }
    .agent-scope-mark { font-family: ui-monospace, monospace; color: var(--muted); }
    .agent-scope-status { font-size: 11px; }
    .agent-scope-empty { padding: 12px; color: var(--muted); font-size: 12px; }
    .agent-dock-log-label {
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }
    .agent-dock-body { flex: 1; overflow: auto; padding: 10px 12px; font-family: ui-monospace, monospace; font-size: 12px; white-space: pre-wrap; color: var(--text); min-height: 0; }
    .agent-dock-footer { padding: 10px 12px; border-top: 1px solid var(--border); display: flex; gap: 8px; flex-shrink: 0; }
    #cmd-k-overlay { position: fixed; inset: 0; background: rgba(9, 30, 66, 0.45); z-index: 50; display: none; align-items: flex-start; justify-content: center; padding-top: 12vh; }
    body[data-theme="dark"] #cmd-k-overlay { background: rgba(0, 0, 0, 0.55); }
    #cmd-k-overlay.is-open { display: flex; }
    #cmd-k-panel {
      width: min(560px, 92vw);
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: var(--shadow-card);
      color: var(--text);
    }
    #cmd-k-results { max-height: 320px; overflow: auto; border-top: 1px solid var(--border); }
    .cmd-k-row { padding: 10px 16px; cursor: pointer; color: var(--text); }
    .cmd-k-row.is-active, .cmd-k-row:hover { background: var(--accent-soft); }
    body[data-theme="dark"] .cmd-k-row.is-active,
    body[data-theme="dark"] .cmd-k-row:hover { background: rgba(0, 102, 255, 0.16); }
`;
