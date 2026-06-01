import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { join } from 'node:path';

import { EPIC_WORK_SCOPE_SCHEMA, buildEpicWorkScopeSlice, formatEpicScopeMarkdown, scopeChecklistMark } from '../src/epicWorkScope.mjs';
import { getEpicWorkScope, readWorkGraphResource } from '../packages/workgraph-mcp/src/handlers.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const FIXTURE_EPIC = {
  id: 'epic-chat-work-scope-readonly',
  title: 'Chat work scope epic',
  status: 'backlog',
  labels: { 'work.item_kind': 'epic' },
};

const FIXTURE_CHILDREN = [
  {
    id: 'mcp-epic-rollup-scope-resource',
    title: 'MCP rollup',
    status: 'backlog',
    labels: {
      'work.item_kind': 'subtask',
      'work.parent_id': 'epic-chat-work-scope-readonly',
    },
  },
  {
    id: 'agent-behavior-chat-scope-block',
    title: 'Agent behavior scope block',
    status: 'backlog',
    labels: {
      'work.item_kind': 'subtask',
      'work.parent_id': 'epic-chat-work-scope-readonly',
    },
  },
];

describe('epicWorkScope', () => {
  it('builds compact read-only scope for epic direct children', () => {
    const slice = buildEpicWorkScopeSlice([FIXTURE_EPIC, ...FIXTURE_CHILDREN], 'epic-chat-work-scope-readonly');
    assert.equal(slice.schema, EPIC_WORK_SCOPE_SCHEMA);
    assert.equal(slice.readOnly, true);
    assert.equal(slice.epicId, 'epic-chat-work-scope-readonly');
    assert.equal(slice.rollup.total, 2);
    assert.equal(slice.rollup.closed, 0);
    assert.equal(slice.children.length, 2);
    assert.deepEqual(slice.children.map((child) => child.id), [
      'agent-behavior-chat-scope-block',
      'mcp-epic-rollup-scope-resource',
    ]);
  });

  it('rejects non-epic work ids', () => {
    assert.throws(
      () => buildEpicWorkScopeSlice(FIXTURE_CHILDREN, 'mcp-epic-rollup-scope-resource'),
      /work item is not an epic/u,
    );
  });

  it('MCP handler and resource expose live epic-chat-work-scope-readonly', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const slice = await getEpicWorkScope({ epicId: 'epic-chat-work-scope-readonly' }, { root: repoRoot });
    assert.equal(slice.schema, EPIC_WORK_SCOPE_SCHEMA);
    assert.ok(slice.children.length >= 4);

    const resource = await readWorkGraphResource(
      'workgraph://epic/epic-chat-work-scope-readonly/scope',
      { root: repoRoot },
    );
    assert.equal(resource.epicId, 'epic-chat-work-scope-readonly');
    assert.equal(resource.children.length, slice.children.length);
  });

  it('formats read-only scope markdown checklist marks', () => {
    assert.equal(scopeChecklistMark('done'), 'x');
    assert.equal(scopeChecklistMark('doing'), '~');
    assert.equal(scopeChecklistMark('backlog'), ' ');

    const markdown = formatEpicScopeMarkdown({
      children: [
        { id: 'a', title: 'Done task', status: 'done' },
        { id: 'b', title: 'Active task', status: 'doing' },
        { id: 'c', title: 'Queued task', status: 'ready' },
      ],
    });
    assert.match(markdown, /## Scope \(read-only, Work Graph\)/);
    assert.match(markdown, /- \[x\] `a` — done/u);
    assert.match(markdown, /- \[~\] `b` — doing/u);
    assert.match(markdown, /- \[ \] `c` — ready/u);
  });

  it('live repo epic has expected subtasks from AN-28 seed', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const items = await readWorkItemsFromRepo({ cwd: repoRoot });
    const slice = buildEpicWorkScopeSlice(items, 'epic-chat-work-scope-readonly');
    const childIds = slice.children.map((child) => child.id);
    assert.ok(childIds.includes('mcp-epic-rollup-scope-resource'));
    assert.ok(childIds.includes('agent-behavior-chat-scope-block'));
    assert.ok(childIds.includes('document-chat-scope-readonly-canon'));
    assert.ok(childIds.includes('ui-agent-scope-panel-poll'));
  });
});
