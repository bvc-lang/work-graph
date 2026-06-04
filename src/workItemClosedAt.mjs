const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const CLOSED_WORK_ITEM_STATUSES = new Set(['done', 'verified']);

export function readWorkItemClosedAtMs(item) {
  const raw = item?.labels?.['work.closed_at'] ?? item?.closedAt ?? '';
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareWorkItemsByClosedAtDesc(left, right) {
  const delta = readWorkItemClosedAtMs(right) - readWorkItemClosedAtMs(left);
  if (delta !== 0) {
    return delta;
  }
  return compareText(right.id, left.id);
}

export function stampWorkItemClosedAt(item, targetStatus, recordedAt = new Date().toISOString()) {
  if (!CLOSED_WORK_ITEM_STATUSES.has(targetStatus)) {
    return item;
  }

  const closedAt = String(recordedAt ?? '').trim() || new Date().toISOString();
  return {
    ...item,
    closedAt,
    labels: {
      ...item.labels,
      'work.closed_at': closedAt,
    },
  };
}
