import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePanelSearchQuery } from '../src/ui/panelSearchQuery.mjs';

describe('resolvePanelSearchQuery', () => {
  it('returns task search on board and workflow views', () => {
    assert.equal(resolvePanelSearchQuery('board', '  Epic  '), 'epic');
    assert.equal(resolvePanelSearchQuery('workflow', 'bug'), 'bug');
  });

  it('ignores task search on prompts, memory, analytics, and settings', () => {
    for (const view of ['prompts', 'memory', 'analytics', 'settings', 'verification']) {
      assert.equal(resolvePanelSearchQuery(view, 'epic'), '');
    }
  });

  it('keeps memory work-id deep-link filters', () => {
    assert.equal(resolvePanelSearchQuery('memory', 'work:WG-42'), 'work:wg-42');
    assert.equal(resolvePanelSearchQuery('memory', '  work:WG-42  '), 'work:wg-42');
  });

  it('treats empty search as no filter', () => {
    assert.equal(resolvePanelSearchQuery('prompts', ''), '');
    assert.equal(resolvePanelSearchQuery('prompts', '   '), '');
  });
});
