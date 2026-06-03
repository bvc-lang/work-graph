import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatWorkItemIssueKey,
  renderWorkItemIssueKeyChip,
  resolveWorkItemIssueType,
} from '../src/ui/workItemIssueType.mjs';

describe('workItemIssueType', () => {
  it('maps work item kinds to Jira-like issue types', () => {
    assert.equal(resolveWorkItemIssueType({ itemKind: 'epic' }), 'epic');
    assert.equal(resolveWorkItemIssueType({ itemKind: 'subtask' }), 'subtask');
    assert.equal(resolveWorkItemIssueType({ itemKind: 'task' }), 'task');
    assert.equal(resolveWorkItemIssueType({ itemKind: 'task', risk: 'critical' }), 'bug');
  });

  it('formats issue keys from work ids', () => {
    assert.equal(formatWorkItemIssueKey({ id: 'wire-sidebar-nav-icons' }), 'WIRE-SIDEBAR-NAV-ICONS');
    assert.equal(formatWorkItemIssueKey({ key: 'AN-60' }), 'AN-60');
  });

  it('renders colored issue type plate with key text', () => {
    const html = renderWorkItemIssueKeyChip({ id: 'epic-work-graph-ui-avatars-v1', itemKind: 'epic' });
    assert.match(html, /class="issue-key-chip"/);
    assert.match(html, /class="issue-type-icon is-epic"/);
    assert.match(html, /class="issue-key-text">EPIC-WORK-GRAPH-UI-AVATARS-V1</);
    assert.match(html, /<svg/);
  });
});
