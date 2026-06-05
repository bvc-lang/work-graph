/**
 * @param {{ status?: string, reviewRequired?: boolean } | null | undefined} record
 */
export function formatMemoryRecordStatusBadgeLabel(record) {
  const status = String(record?.status ?? '').trim().toLowerCase();
  if (status === 'needs-review') {
    return 'NEEDS REVIEW';
  }
  if (status === 'active') {
    return 'ACTIVE';
  }
  if (status === 'draft') {
    return 'DRAFT';
  }
  if (record?.reviewRequired) {
    return 'NEEDS REVIEW';
  }

  return status.toUpperCase() || 'UNKNOWN';
}

/**
 * @param {{ status?: string, reviewRequired?: boolean } | null | undefined} record
 */
export function resolveMemoryRecordStatusBadgeTone(record) {
  const status = String(record?.status ?? '').trim().toLowerCase();
  if (status === 'needs-review') {
    return 'warning';
  }
  if (status === 'active') {
    return 'ok';
  }
  if (status === 'draft') {
    return 'muted';
  }
  if (record?.reviewRequired) {
    return 'warning';
  }

  return 'default';
}

/**
 * Browser-inline helper: expects global renderWorkItemIssueKeyChip.
 * @param {{ id?: string, key?: string, summary?: string } | null | undefined} record
 */
export function renderMemoryRecordKeyChip(record) {
  const key = String(record?.key ?? '').trim();
  if (!key) {
    return '';
  }

  return renderWorkItemIssueKeyChip(
    { key, itemKind: 'story', id: record?.id },
    { key, title: String(record?.summary ?? record?.id ?? key), type: 'story' },
  );
}
