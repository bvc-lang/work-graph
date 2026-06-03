/** @typedef {'default' | 'accent' | 'warning' | 'muted' | 'danger' | 'ok'} BadgeTone */

const STATUS_LABELS = {
  backlog: 'Бэклог',
  ready: 'Доступно агенту',
  claimed: 'Взято',
  doing: 'В работе',
  in_progress: 'В работе',
  verify: 'Проверка',
  blocked: 'Блокер',
  done: 'Завершено',
  verified: 'Проверено',
};

/**
 * @param {string | null | undefined} status
 */
export function statusLabel(status) {
  const key = String(status ?? '').toLowerCase();
  if (typeof t === 'function') {
    const localized = t('status.' + key);
    if (localized !== 'status.' + key) {
      return localized;
    }
  }
  return STATUS_LABELS[key] ?? String(status ?? '');
}

/**
 * @param {string | null | undefined} status
 * @param {string | null | undefined} [queueKind]
 * @returns {BadgeTone}
 */
export function statusToBadgeTone(status, queueKind = null) {
  if (queueKind === 'planned') return 'accent';
  const key = String(status ?? '').toLowerCase();
  if (key === 'ready') return 'accent';
  if (key === 'claimed' || key === 'doing' || key === 'in_progress') return 'warning';
  if (key === 'done' || key === 'verified') return 'ok';
  if (key === 'blocked') return 'danger';
  if (key === 'verify') return 'muted';
  return 'default';
}
