export function formatHomeKpiValue(value, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
}

export function renderHomeMissionControl(root, homeSnapshot) {
  if (!root || !homeSnapshot) {
    return;
  }

  const kpi = homeSnapshot.kpi ?? {};
  const verifyRate = kpi.verifyPassRate?.rate;
  const throughput = kpi.throughput?.perDay;
  const runsToday = kpi.agentRunsToday?.count;

  root.innerHTML = `
    <div class="home-kpi-grid" data-testid="home-kpi-grid">
      <article class="home-kpi-tile"><div class="label">Цикл</div><div class="value">${formatHomeKpiValue(kpi.cycleProgress?.percent, '0')}%</div></article>
      <article class="home-kpi-tile"><div class="label">Готовы</div><div class="value">${formatHomeKpiValue(kpi.ready)}</div></article>
      <article class="home-kpi-tile"><div class="label">Заблок.</div><div class="value">${formatHomeKpiValue(kpi.blocked)}</div></article>
      <article class="home-kpi-tile"><div class="label">Доля verify</div><div class="value">${verifyRate === null ? '—' : Math.round(verifyRate * 100) + '%'}</div></article>
      <article class="home-kpi-tile"><div class="label">Пропуск/д</div><div class="value">${throughput === null ? '—' : throughput.toFixed(1)}</div></article>
      <article class="home-kpi-tile"><div class="label">Запуски сегодня</div><div class="value">${formatHomeKpiValue(runsToday)}</div></article>
    </div>
    <div class="home-section"><h3>Входящие</h3><ul class="home-list" data-testid="home-inbox-list">${renderHomeList(homeSnapshot.inboxPreview?.items, 'inbox')}</ul></div>
    <div class="home-section"><h3>Моя очередь</h3><ul class="home-list" data-testid="home-queue-list">${renderHomeList(homeSnapshot.myQueue?.items, 'queue')}</ul></div>
    <div class="home-section"><h3>Активные запуски</h3><ul class="home-list" data-testid="home-runs-list">${renderHomeList(homeSnapshot.activeRuns, 'run')}</ul></div>
  `;
}

export function renderHomeList(items, kind) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<li class="empty">Нет записей</li>';
  }

  return items.map((item) => {
    const title = item.title ?? item.workId ?? item.id ?? '';
    const meta = item.status ?? item.kind ?? '';
    const routing = resolveHomeListRouting(item, kind);
    const eventId = item.id ?? '';
    const attrs = [
      `data-home-kind="${kind}"`,
      `data-event-id="${escapeHtmlAttr(eventId)}"`,
    ];
    if (routing.workId) {
      attrs.push(`data-work-id="${escapeHtmlAttr(routing.workId)}"`);
    }
    if (routing.analyticsKey) {
      attrs.push(`data-analytics-key="${escapeHtmlAttr(routing.analyticsKey)}"`);
    }
    if (!routing.workId && !routing.analyticsKey) {
      attrs.push('aria-disabled="true"');
    }
    return `<li ${attrs.join(' ')}><strong>${escapeHtml(title)}</strong><div class="muted">${escapeHtml(meta)}</div></li>`;
  }).join('');
}

function resolveHomeListRouting(item, kind) {
  if (kind === 'inbox') {
    const link = item?.link;
    if (link && typeof link === 'object') {
      if (link.type === 'work' && link.workId) {
        return { workId: String(link.workId), analyticsKey: null };
      }
      if (link.type === 'analytics' && (link.key || link.recordKey)) {
        return { workId: null, analyticsKey: String(link.key ?? link.recordKey) };
      }
    }
    return { workId: null, analyticsKey: null };
  }
  const workId = item?.workId ?? item?.id ?? null;
  return {
    workId: workId ? String(workId) : null,
    analyticsKey: null,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

export function buildCommandPaletteIndex(snapshot, analyticsProjection) {
  const rows = [];
  for (const item of snapshot?.items ?? []) {
    rows.push({
      id: `task:${item.id}`,
      scope: 'task',
      label: item.title ?? item.id,
      workId: item.id,
      keywords: `${item.id} ${item.title ?? ''} ${item.status ?? ''}`,
    });
  }
  for (const record of analyticsProjection?.records ?? []) {
    rows.push({
      id: `an:${record.key ?? record.id}`,
      scope: 'an',
      label: record.title ?? record.key,
      analyticsKey: record.key,
      keywords: `${record.key ?? ''} ${record.title ?? ''}`,
    });
  }
  rows.push({ id: 'cmd:home', scope: 'cmd', label: 'Открыть «Главная»', view: 'home', keywords: 'home mission control главная центр управления' });
  rows.push({ id: 'cmd:board', scope: 'cmd', label: 'Открыть «Доска»', view: 'board', keywords: 'board kanban доска' });
  rows.push({ id: 'cmd:run-ready', scope: 'run', label: 'Запустить первую ready-задачу', keywords: 'run agent worker запуск агент' });
  return rows;
}

export function filterCommandPaletteRows(rows, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) {
    return rows.slice(0, 12);
  }
  return rows
    .filter((row) => row.keywords.toLowerCase().includes(needle) || row.label.toLowerCase().includes(needle))
    .slice(0, 12);
}

const DONE_SCOPE_STATUSES = new Set(['done', 'verified']);
const ACTIVE_SCOPE_STATUSES = new Set(['claimed', 'doing', 'in_progress', 'verify']);

export function scopePanelCheckMark(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (DONE_SCOPE_STATUSES.has(normalized)) {
    return 'x';
  }
  if (ACTIVE_SCOPE_STATUSES.has(normalized)) {
    return '~';
  }
  return ' ';
}

function readItemKind(item) {
  return String(item?.itemKind ?? item?.labels?.['work.item_kind'] ?? '').trim().toLowerCase();
}

function readItemParentId(item) {
  return String(item?.parentId ?? item?.labels?.['work.parent_id'] ?? '').trim();
}

/**
 * Walk parent chain from a work item to its containing epic id.
 * @param {Array<object>} items
 * @param {string} workId
 * @returns {string | null}
 */
export function resolveEpicIdForWorkItem(items, workId) {
  const normalizedWorkId = String(workId ?? '').trim();
  if (normalizedWorkId === '' || !Array.isArray(items)) {
    return null;
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  let current = byId.get(normalizedWorkId);
  while (current) {
    if (readItemKind(current) === 'epic') {
      return current.id;
    }
    const parentId = readItemParentId(current);
    current = parentId ? byId.get(parentId) : null;
  }
  return null;
}

/**
 * Pick epic id for agent scope panel: focus task, else first active run, else in-progress epic.
 * @param {Array<object>} items
 * @param {{ focusTaskId?: string | null, activeRunIds?: string[] }} [options]
 */
export function resolveSessionEpicId(items, options = {}) {
  const focusTaskId = String(options.focusTaskId ?? '').trim();
  if (focusTaskId) {
    const fromFocus = resolveEpicIdForWorkItem(items, focusTaskId);
    if (fromFocus) {
      return fromFocus;
    }
  }

  for (const runId of options.activeRunIds ?? []) {
    const fromRun = resolveEpicIdForWorkItem(items, runId);
    if (fromRun) {
      return fromRun;
    }
  }

  const inProgressEpic = items.find((item) => {
    if (readItemKind(item) !== 'epic') {
      return false;
    }
    const status = String(item.status ?? '').trim().toLowerCase();
    return status === 'in_progress' || status === 'doing' || status === 'claimed';
  });
  return inProgressEpic?.id ?? null;
}

export function renderAgentScopePanelHtml(scopeSlice) {
  if (!scopeSlice || typeof scopeSlice !== 'object') {
    return {
      summaryHtml: '<div class="agent-scope-empty">Нет данных scope</div>',
      listHtml: '',
    };
  }

  const rollup = scopeSlice.rollup ?? {};
  const closed = rollup.closed ?? scopeSlice.doneChildCount ?? 0;
  const total = rollup.total ?? scopeSlice.childCount ?? 0;
  const title = scopeSlice.title ?? scopeSlice.epicId ?? 'Эпик';
  const epicStatus = scopeSlice.status ?? '';

  const summaryHtml =
    '<div class="agent-scope-summary">' +
    '<strong>' + escapeHtml(title) + '</strong>' +
    '<div class="muted">' + escapeHtml(scopeSlice.epicId ?? '') + ' · ' + escapeHtml(epicStatus) +
    ' · ' + closed + '/' + total + '</div>' +
    '</div>';

  const children = Array.isArray(scopeSlice.children) ? scopeSlice.children : [];
  if (children.length === 0) {
    return {
      summaryHtml,
      listHtml: '<li class="empty">Нет subtasks</li>',
    };
  }

  const listHtml = children.map((child) => {
    const mark = scopePanelCheckMark(child.status);
    const label = child.title ? escapeHtml(child.title) : escapeHtml(child.id);
    return (
      '<li data-work-id="' + escapeHtmlAttr(child.id) + '" data-scope-status="' + escapeHtmlAttr(child.status ?? '') + '">' +
      '<span class="agent-scope-mark" aria-hidden="true">[' + mark + ']</span> ' +
      '<span class="agent-scope-label">' + label + '</span>' +
      '<span class="agent-scope-status muted">' + escapeHtml(child.status ?? '') + '</span>' +
      '</li>'
    );
  }).join('');

  return { summaryHtml, listHtml };
}

export function renderAgentScopePanel(panelEl, scopeSlice) {
  if (!panelEl) {
    return;
  }
  const summaryEl = panelEl.querySelector('[data-testid="agent-scope-summary"]');
  const listEl = panelEl.querySelector('[data-testid="agent-scope-list"]');
  const { summaryHtml, listHtml } = renderAgentScopePanelHtml(scopeSlice);
  if (summaryEl) {
    summaryEl.innerHTML = summaryHtml;
  }
  if (listEl) {
    listEl.innerHTML = listHtml;
  }
}

export function renderAgentRunDockLog(bodyEl, journal) {
  if (!bodyEl) {
    return;
  }
  const entries = Array.isArray(journal?.entries) ? journal.entries : [];
  if (entries.length === 0) {
    bodyEl.textContent = 'Нет записей в журнале agent run.';
    return;
  }
  bodyEl.textContent = entries.slice(0, 8).map((entry) => {
    const at = entry.recordedAt ?? '';
    const taskId = entry.taskId ?? entry.runId ?? '?';
    const status = entry.ok === false ? 'FAIL' : 'OK';
    return `[${at}] ${taskId} ${status} ${entry.summary ?? entry.failureReason ?? ''}`;
  }).join('\n');
}
