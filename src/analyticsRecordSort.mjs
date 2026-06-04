const analyticsSortCompareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const ANALYTICS_RECORD_SORT_CREATED_DESC = 'created-desc';
export const ANALYTICS_RECORD_SORT_KEY_DESC = 'key-desc';

/**
 * @param {string} key
 * @returns {{ sortKey: number, suffix: string, label: string }}
 */
export function parseAnalyticsRecordKeySortParts(key) {
  const text = String(key ?? '').trim();
  const mp = text.match(/^AN-MP-(\d+)$/iu);
  if (mp) {
    return {
      sortKey: -10000 + Number(mp[1]),
      suffix: 'MP',
      label: text,
    };
  }

  const std = text.match(/^AN-(\d+(?:\.\d+)?)(?:-(.+))?$/iu);
  if (std) {
    const [major, minor = '0'] = std[1].split('.');
    return {
      sortKey: Number(major) + Number(minor || 0) / 1000,
      suffix: std[2] ?? '',
      label: text,
    };
  }

  return {
    sortKey: Number.NEGATIVE_INFINITY,
    suffix: '',
    label: text,
  };
}

/**
 * @param {{ key?: string, id?: string }} left
 * @param {{ key?: string, id?: string }} right
 */
export function compareAnalyticsRecordKeysDesc(left, right) {
  const a = parseAnalyticsRecordKeySortParts(left.key ?? left.id);
  const b = parseAnalyticsRecordKeySortParts(right.key ?? right.id);
  if (a.sortKey !== b.sortKey) {
    return b.sortKey - a.sortKey;
  }
  const suffixCmp = analyticsSortCompareText(b.suffix, a.suffix);
  if (suffixCmp !== 0) {
    return suffixCmp;
  }
  return analyticsSortCompareText(b.label, a.label);
}

export function sortAnalyticsRecordsByRecencyDesc(records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  return [...records].sort((left, right) => {
    const createdCmp = analyticsSortCompareText(right.createdAt ?? '', left.createdAt ?? '');
    if (createdCmp !== 0) {
      return createdCmp;
    }
    return analyticsSortCompareText(right.id ?? '', left.id ?? '');
  });
}

export function sortAnalyticsRecordsByKeyDesc(records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  return [...records].sort((left, right) => {
    const keyCmp = compareAnalyticsRecordKeysDesc(left, right);
    if (keyCmp !== 0) {
      return keyCmp;
    }
    return analyticsSortCompareText(right.createdAt ?? '', left.createdAt ?? '');
  });
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} [sortMode]
 */
export function sortAnalyticsRecords(records, sortMode = ANALYTICS_RECORD_SORT_CREATED_DESC) {
  if (sortMode === ANALYTICS_RECORD_SORT_KEY_DESC) {
    return sortAnalyticsRecordsByKeyDesc(records);
  }
  return sortAnalyticsRecordsByRecencyDesc(records);
}

export function normalizeAnalyticsRecordSortMode(value) {
  return value === ANALYTICS_RECORD_SORT_KEY_DESC
    ? ANALYTICS_RECORD_SORT_KEY_DESC
    : ANALYTICS_RECORD_SORT_CREATED_DESC;
}
