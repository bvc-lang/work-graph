import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderClientUiBadge } from '../src/ui/atoms/badgeClient.mjs';
import {
  resolveWorkItemClassifierBadge,
  renderWorkItemClassifierBadge,
} from '../src/ui/workItemClassifierBadge.mjs';

globalThis.renderClientUiBadge = renderClientUiBadge;

describe('workItemClassifierBadge', () => {
  it('prefers explicit architecture.block_id label', () => {
    const badge = resolveWorkItemClassifierBadge({
      id: 'task-x',
      labels: { 'architecture.block_id': 'work-graph' },
      department: 'frontend-ui',
    });
    assert.equal(badge.label, 'WORK GRAPH');
    assert.equal(badge.source, 'architecture.block_id');
  });

  it('classifies UI tasks from department and keywords', () => {
    const badge = resolveWorkItemClassifierBadge({
      id: 'wire-sidebar-nav-icons',
      title: 'Board kanban cards',
      department: 'frontend-ui',
    });
    assert.equal(badge.label, 'UI');
    assert.equal(badge.source, 'architecture.block');
    assert.equal(badge.sourceId, 'derived-projections');
  });

  it('classifies agent-runtime tasks', () => {
    const badge = resolveWorkItemClassifierBadge({
      id: 'design-agent-worker',
      title: 'Agent worker loop',
      department: 'agent-platform',
    });
    assert.equal(badge.label, 'AGENT RT');
    assert.equal(badge.sourceId, 'agent-runtime');
  });

  it('classifies domain-onebase as DOMAINS architecture block', () => {
    const badge = resolveWorkItemClassifierBadge({
      id: 'onebase-catalog',
      department: 'domain-onebase',
    });
    assert.equal(badge.label, 'DOMAINS');
    assert.equal(badge.source, 'architecture.block');
    assert.equal(badge.sourceId, 'domains');
  });

  it('falls back to item kind for generic work-graph epics and subtasks', () => {
    assert.equal(resolveWorkItemClassifierBadge({ itemKind: 'epic', title: 'Planning' }).label, 'EPIC');
    assert.equal(resolveWorkItemClassifierBadge({ itemKind: 'subtask', title: 'Sub' }).label, 'SUBTASK');
    assert.equal(resolveWorkItemClassifierBadge({ itemKind: 'task', title: 'Plain task' }).label, 'WORK GRAPH');
  });

  it('renders Jira lozenge markup via renderClientUiBadge', () => {
    const html = renderWorkItemClassifierBadge({
      id: 'epic-work-graph-ui-classifier-badges-v1',
      department: 'frontend-ui',
      itemKind: 'epic',
    });
    assert.match(html, /wg-badge--accent/);
    assert.match(html, />UI</);
    assert.match(html, /data-testid="classifier-derived-projections"/);
    assert.match(html, /title="Architecture block: derived-projections"/);
  });
});
