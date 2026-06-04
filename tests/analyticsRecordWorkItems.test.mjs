import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  findWorkItemsForAnalyticsRecord,
  formatAnalyticsRelatedTasksCardNote,
  formatAnalyticsRelatedTasksCountLabel,
  resolveAnalyticsRelatedTasksBadgeTone,
  summarizeAnalyticsRelatedWorkItems,
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

  it('matches basis text with AN-XX: colon pattern', () => {
    assert.equal(workItemMatchesAnalyticsRecord(
      { id: 'analytics:public-site', key: 'AN-44' },
      { id: 'epic-public-site', basis: ['AN-44: WG должен позиционироваться как слой обязательств'] },
    ), true);
  });

  it('matches feeds_epics on closing records', () => {
    assert.equal(workItemMatchesAnalyticsRecord(
      {
        id: 'analytics:closing-epic-demo',
        key: 'AN-23',
        feeds_epics: ['epic-decision-pipeline-canonization'],
      },
      { id: 'epic-decision-pipeline-canonization', basis: ['Pipeline canon epic'] },
    ), true);
  });

  it('matches subtasks of feeds_epics epic', () => {
    assert.equal(workItemMatchesAnalyticsRecord(
      {
        id: 'analytics:closing-epic-demo',
        key: 'AN-23',
        feeds_epics: ['epic-decision-pipeline-canonization'],
      },
      {
        id: 'document-decision-pipeline-canon',
        labels: { 'work.parent_id': 'epic-decision-pipeline-canonization' },
        basis: ['Subtask'],
      },
    ), true);
  });

  it('matches intake.source_ref against bodyPath', () => {
    assert.equal(workItemMatchesAnalyticsRecord(
      {
        id: 'analytics:app-update',
        key: 'AN-66',
        bodyPath: 'docs/analysis/2026-06-app-update-mechanism.md',
      },
      {
        id: 'epic-app-update-mechanism-v1',
        labels: {
          'intake.source_ref': 'docs/analysis/2026-06-app-update-mechanism.md',
          'intake.analytics_key': 'AN-66',
        },
      },
    ), true);
  });
});

describe('formatAnalyticsRelatedTasksCardNote', () => {
  it('returns empty string when no related tasks', () => {
    assert.equal(formatAnalyticsRelatedTasksCardNote([]), '');
    assert.equal(formatAnalyticsRelatedTasksCardNote(null), '');
  });

  it('formats done/total label for card badge', () => {
    const related = [
      { id: 'a', status: 'done' },
      { id: 'b', status: 'ready' },
      { id: 'c', status: 'verified' },
      { id: 'd', status: 'backlog' },
    ];

    assert.deepEqual(summarizeAnalyticsRelatedWorkItems(related), { total: 4, done: 2 });
    assert.equal(formatAnalyticsRelatedTasksCountLabel(related), '2/4 ЗАДАЧ');
    assert.equal(resolveAnalyticsRelatedTasksBadgeTone(related), 'accent');
    assert.equal(formatAnalyticsRelatedTasksCardNote(related), ' · 2/4 ЗАДАЧ');
  });

  it('uses ok tone when all related tasks are done', () => {
    const related = [
      { id: 'a', status: 'done' },
      { id: 'b', status: 'verified' },
    ];
    assert.equal(resolveAnalyticsRelatedTasksBadgeTone(related), 'ok');
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
