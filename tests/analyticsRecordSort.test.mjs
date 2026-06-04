import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ANALYTICS_RECORD_SORT_KEY_DESC,
  compareAnalyticsRecordKeysDesc,
  parseAnalyticsRecordKeySortParts,
  sortAnalyticsRecords,
  sortAnalyticsRecordsByKeyDesc,
} from '../src/analyticsRecordSort.mjs';

describe('parseAnalyticsRecordKeySortParts', () => {
  it('parses standard and fractional AN keys', () => {
    assert.equal(parseAnalyticsRecordKeySortParts('AN-64').sortKey, 64);
    assert.equal(parseAnalyticsRecordKeySortParts('AN-50.1').sortKey, 50.001);
    assert.equal(parseAnalyticsRecordKeySortParts('AN-32-C').suffix, 'C');
  });
});

describe('sortAnalyticsRecordsByKeyDesc', () => {
  it('orders intake keys by AN number descending', () => {
    const ordered = sortAnalyticsRecordsByKeyDesc([
      { id: 'a', key: 'AN-54', createdAt: '2026-06-02T20:00:00.000Z' },
      { id: 'b', key: 'AN-64', createdAt: '2026-06-02T22:00:00.000Z' },
      { id: 'c', key: 'AN-59', createdAt: '2026-06-02T19:00:00.000Z' },
      { id: 'd', key: 'AN-63', createdAt: '2026-06-02T21:00:00.000Z' },
    ]);

    assert.deepEqual(
      ordered.map((record) => record.key),
      ['AN-64', 'AN-63', 'AN-59', 'AN-54'],
    );
  });

  it('keeps recency as tie-breaker for same key', () => {
    const ordered = sortAnalyticsRecordsByKeyDesc([
      { id: 'old', key: 'AN-42', createdAt: '2026-06-01T10:00:00.000Z' },
      { id: 'new', key: 'AN-42', createdAt: '2026-06-02T10:00:00.000Z' },
    ]);
    assert.deepEqual(ordered.map((record) => record.id), ['new', 'old']);
  });
});

describe('sortAnalyticsRecords', () => {
  it('switches between created and key modes', () => {
    const records = [
      { id: 'a', key: 'AN-54', createdAt: '2026-06-02T20:00:00.000Z' },
      { id: 'b', key: 'AN-64', createdAt: '2026-06-02T22:00:00.000Z' },
    ];

    assert.deepEqual(
      sortAnalyticsRecords(records, ANALYTICS_RECORD_SORT_KEY_DESC).map((record) => record.key),
      ['AN-64', 'AN-54'],
    );
    assert.deepEqual(
      sortAnalyticsRecords(records).map((record) => record.key),
      ['AN-64', 'AN-54'],
    );
  });
});

describe('compareAnalyticsRecordKeysDesc', () => {
  it('ranks AN-50.1 above AN-50', () => {
    assert.ok(
      compareAnalyticsRecordKeysDesc({ key: 'AN-50.1' }, { key: 'AN-50' }) < 0,
    );
  });
});
