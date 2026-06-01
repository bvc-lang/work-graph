import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCommandPaletteIndex,
  filterCommandPaletteRows,
  renderAgentScopePanelHtml,
  renderHomeList,
  resolveEpicIdForWorkItem,
  resolveSessionEpicId,
  scopePanelCheckMark,
} from '../src/missionControlUiClient.mjs';

describe('missionControlUiClient', () => {
  it('builds palette rows from snapshot items', () => {
    const rows = buildCommandPaletteIndex({
      items: [{ id: 'ready-task', title: 'Ready Task', status: 'ready' }],
    }, null);
    assert.ok(rows.some((row) => row.workId === 'ready-task'));
    assert.ok(rows.some((row) => row.id === 'cmd:home'));
  });

  it('filters palette rows by query', () => {
    const rows = buildCommandPaletteIndex({
      items: [{ id: 'a', title: 'Alpha', status: 'ready' }],
    }, null);
    const filtered = filterCommandPaletteRows(rows, 'alpha');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].workId, 'a');
  });
});

describe('renderHomeList — routing attributes', () => {
  it('uses data-analytics-key for inbox events linked to analytics records', () => {
    const html = renderHomeList(
      [
        {
          id: 'analytics:AN-27',
          kind: 'analytics',
          title: 'AN-27: Closing — pivot-to-1c-onebase-vertical',
          link: { type: 'analytics', key: 'AN-27', path: 'work/analytics/an-27.md' },
        },
      ],
      'inbox',
    );
    assert.match(html, /data-analytics-key="AN-27"/);
    assert.doesNotMatch(html, /data-work-id="analytics:AN-27"/);
    assert.match(html, /data-event-id="analytics:AN-27"/);
  });

  it('uses data-work-id for inbox events linked to work items', () => {
    const html = renderHomeList(
      [
        {
          id: 'agent-run:foo',
          kind: 'agent-run',
          title: 'Agent run: foo',
          link: { type: 'work', workId: 'foo' },
        },
      ],
      'inbox',
    );
    assert.match(html, /data-work-id="foo"/);
    assert.doesNotMatch(html, /data-analytics-key=/);
  });

  it('marks inbox rows without link as non-clickable', () => {
    const html = renderHomeList(
      [
        {
          id: 'daemon:tick-1',
          kind: 'daemon',
          title: 'Daemon: tick',
          link: null,
        },
      ],
      'inbox',
    );
    assert.doesNotMatch(html, /data-work-id=/);
    assert.doesNotMatch(html, /data-analytics-key=/);
    assert.match(html, /aria-disabled="true"/);
  });

  it('keeps data-work-id for queue and run rows from workId', () => {
    const queueHtml = renderHomeList(
      [{ workId: 'task-1', title: 'Task 1', status: 'ready' }],
      'queue',
    );
    assert.match(queueHtml, /data-work-id="task-1"/);

    const runsHtml = renderHomeList(
      [{ workId: 'task-2', title: 'Task 2', status: 'doing' }],
      'run',
    );
    assert.match(runsHtml, /data-work-id="task-2"/);
  });

  it('renders empty state when there are no items', () => {
    const html = renderHomeList([], 'inbox');
    assert.match(html, /class="empty"/);
  });
});

describe('agent scope panel', () => {
  const items = [
    {
      id: 'epic-a',
      title: 'Epic A',
      status: 'in_progress',
      labels: { 'work.item_kind': 'epic' },
    },
    {
      id: 'sub-1',
      title: 'Subtask 1',
      status: 'doing',
      labels: { 'work.item_kind': 'subtask', 'work.parent_id': 'epic-a' },
    },
  ];

  it('resolves epic id from subtask parent chain', () => {
    assert.equal(resolveEpicIdForWorkItem(items, 'sub-1'), 'epic-a');
    assert.equal(resolveEpicIdForWorkItem(items, 'epic-a'), 'epic-a');
    assert.equal(resolveEpicIdForWorkItem(items, 'missing'), null);
  });

  it('resolves session epic from focus task or active runs', () => {
    assert.equal(resolveSessionEpicId(items, { focusTaskId: 'sub-1' }), 'epic-a');
    assert.equal(resolveSessionEpicId(items, { activeRunIds: ['sub-1'] }), 'epic-a');
    assert.equal(resolveSessionEpicId(items), 'epic-a');
  });

  it('renders scope list with checklist marks and work ids', () => {
    assert.equal(scopePanelCheckMark('done'), 'x');
    assert.equal(scopePanelCheckMark('doing'), '~');
    assert.equal(scopePanelCheckMark('ready'), ' ');

    const { listHtml, summaryHtml } = renderAgentScopePanelHtml({
      epicId: 'epic-a',
      title: 'Epic A',
      status: 'in_progress',
      rollup: { closed: 1, total: 2 },
      children: [
        { id: 'sub-1', title: 'Subtask 1', status: 'doing' },
        { id: 'sub-2', title: 'Subtask 2', status: 'done' },
      ],
    });
    assert.match(summaryHtml, /Epic A/);
    assert.match(listHtml, /data-work-id="sub-1"/);
    assert.match(listHtml, /\[~\]/);
    assert.match(listHtml, /data-work-id="sub-2"/);
    assert.match(listHtml, /\[x\]/);
  });
});
