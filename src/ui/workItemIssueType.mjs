const ISSUE_TYPE_SVG = {
  task: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="#FFFFFF" d="M6.6 11.1 3.8 8.3l.9-.9 1.9 1.9 4.5-4.5.9.9z"/></svg>',
  story: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="#FFFFFF" d="M5 3.5h6v9l-3-1.8L5 12.5V3.5z"/></svg>',
  epic: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="#FFFFFF" d="M8 2.5 10.8 7H13l-4.2 7.2V9.2H5L8 2.5z"/></svg>',
  subtask: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="#FFFFFF" d="M3.5 3.5h7v7h-7v-7zm1.5 1.5v4h4v-4h-4zm5.5-.5h2.5v2.5H10.5V4.5z"/></svg>',
  bug: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><circle cx="8" cy="8" r="2.6" fill="#172B4D"/></svg>',
};

/**
 * @param {string | null | undefined} value
 */
function escapeIssueAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * @param {{ itemKind?: string, labels?: Record<string, string>, risk?: string, status?: string, parentId?: string } | null | undefined} item
 */
export function resolveWorkItemIssueType(item) {
  const kind = String(item?.itemKind ?? item?.labels?.['work.item_kind'] ?? 'task').trim().toLowerCase();
  if (kind === 'epic') {
    return 'epic';
  }
  if (kind === 'subtask') {
    return 'subtask';
  }
  const risk = String(item?.risk ?? '').trim().toLowerCase();
  if (risk === 'critical') {
    return 'bug';
  }
  const parentId = String(item?.parentId ?? item?.labels?.['work.parent_id'] ?? '').trim();
  if (parentId) {
    return 'subtask';
  }
  return 'task';
}

/**
 * @param {{ id?: string, key?: string } | null | undefined} item
 */
export function formatWorkItemIssueKey(item) {
  const raw = String(item?.key ?? item?.id ?? '').trim();
  if (!raw) {
    return 'WG';
  }
  return raw.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase() || 'WG';
}

/**
 * @param {{ id?: string, key?: string, itemKind?: string, labels?: Record<string, string>, risk?: string, status?: string, parentId?: string } | null | undefined} item
 * @param {{ key?: string, title?: string }} [options]
 */
export function renderWorkItemIssueKeyChip(item, options = {}) {
  const type = resolveWorkItemIssueType(item);
  const key = options.key ?? formatWorkItemIssueKey(item);
  const title = options.title ?? String(item?.id ?? key);
  const icon = ISSUE_TYPE_SVG[type] ?? ISSUE_TYPE_SVG.task;
  return '<span class="issue-key-chip" title="' + escapeIssueAttr(title) + '">' +
    '<span class="issue-type-icon is-' + type + '" aria-hidden="true">' + icon + '</span>' +
    '<span class="issue-key-text">' + escapeIssueAttr(key) + '</span>' +
  '</span>';
}
