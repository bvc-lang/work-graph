/**
 * Task search (#search) applies only to board/workflow views.
 * Memory view keeps work:{id} deep-link filters.
 */
export function resolvePanelSearchQuery(activeView, rawSearchValue) {
  const raw = String(rawSearchValue ?? '').trim();
  if (!raw) {
    return '';
  }

  const normalized = raw.toLowerCase();
  if (activeView === 'memory' && normalized.startsWith('work:')) {
    return normalized;
  }

  if (activeView === 'board' || activeView === 'workflow') {
    return normalized;
  }

  return '';
}
