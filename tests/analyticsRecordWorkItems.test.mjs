import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  findWorkItemsForAnalyticsRecord,
  workItemMatchesAnalyticsRecord,
} from '../src/analyticsRecordWorkItems.mjs';

describe('workItemMatchesAnalyticsRecord', () => {
  const record = {
    id: 'analytics:graph-canvas-layout-mess',
    key: 'AN-1',
    bodyPath: 'work/analytics/graph-canvas-layout-mess.md',
  };

  it('matches intake labels', () => {
    assert.equal(workItemMatchesAnalyticsRecord(record, {
      id: 'task-a',
      labels: {
        'intake.source_ref': 'analytics:graph-canvas-layout-mess',
        'intake.analytics_key': 'AN-1',
      },
    }), true);
  });

  it('matches basis text with analytics id and key', () => {
    assert.equal(workItemMatchesAnalyticsRecord(record, {
      id: 'design-graph-canvas-layout-profile-v1',
      basis: ['Источник: analytics:graph-canvas-layout-mess (AN-1), блок C п.8'],
    }), true);
  });

  it('does not match unrelated tasks', () => {
    assert.equal(workItemMatchesAnalyticsRecord(record, {
      id: 'other-task',
      basis: ['Обычная задача без intake'],
    }), false);
  });
});

describe('findWorkItemsForAnalyticsRecord', () => {
  it('returns sorted summaries', () => {
    const related = findWorkItemsForAnalyticsRecord(
      { id: 'analytics:demo', key: 'AN-9' },
      [
        { id: 'z-task', basis: ['analytics:demo (AN-9)'], title: 'Z', status: 'backlog' },
        { id: 'a-task', basis: ['analytics:demo (AN-9)'], title: 'A', status: 'ready' },
      ],
    );

    assert.deepEqual(related.map((entry) => entry.id), ['a-task', 'z-task']);
  });
});
