import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  attachAnalyticsLineageToRecords,
  buildAnalyticsLineageProjection,
  buildAnalyticsLineageIndexes,
  normalizeAnalyticsLineage,
} from '../src/analyticsLineageProjection.mjs';

const PARENT = {
  id: 'analytics:verification-panel-tests-evidence-intent',
  key: 'AN-50',
  title: 'AN-50: Verification panel',
  createdAt: '2026-06-02T14:00:00.000Z',
};

const CHILD = {
  id: 'analytics:work-graph-bvc-contract-verification',
  key: 'AN-50.1',
  title: 'AN-50.1: BVC contract',
  createdAt: '2026-06-02T15:30:00.000Z',
  lineage: {
    parentKey: 'AN-50',
    parentId: 'analytics:verification-panel-tests-evidence-intent',
    relation: 'deepens',
  },
};

describe('analyticsLineageProjection', () => {
  it('normalizeAnalyticsLineage defaults relation to deepens when parent set', () => {
    const normalized = normalizeAnalyticsLineage({ parentKey: 'AN-50' });
    assert.deepEqual(normalized, { parentKey: 'AN-50', relation: 'deepens' });
  });

  it('buildAnalyticsLineageProjection resolves parent and continuations', () => {
    const records = attachAnalyticsLineageToRecords([PARENT, CHILD]);
    const child = records.find((record) => record.key === 'AN-50.1');
    const parent = records.find((record) => record.key === 'AN-50');

    assert.equal(child.analyticsLineage.parent?.key, 'AN-50');
    assert.equal(child.analyticsLineage.parent?.relation, 'deepens');
    assert.deepEqual(parent.analyticsLineage.continuations.map((entry) => entry.key), ['AN-50.1']);
  });

  it('buildAnalyticsLineageProjection exposes feedsWorkItems from relatedWorkItems', () => {
    const indexes = buildAnalyticsLineageIndexes([CHILD]);
    const projection = buildAnalyticsLineageProjection(
      CHILD,
      indexes,
      { relatedWorkItems: [{ id: 'epic-work-graph-bvc-contract-verification-v1' }] },
    );
    assert.deepEqual(projection.feedsWorkItems, ['epic-work-graph-bvc-contract-verification-v1']);
  });
});
