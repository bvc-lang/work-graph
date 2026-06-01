import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildClosingAnalysisSuggestion, CLOSING_ANALYSIS_SUGGEST_SCHEMA } from '../src/closingAnalysisSuggest.mjs';

describe('buildClosingAnalysisSuggestion', () => {
  it('returns suggestion when epic transitions to done', () => {
    const suggestion = buildClosingAnalysisSuggestion(
      { id: 'epic-a', status: 'doing', itemKind: 'epic', labels: { 'work.item_kind': 'epic' } },
      { id: 'epic-a', status: 'done', title: 'Epic A', itemKind: 'epic', labels: { 'work.item_kind': 'epic' } },
    );

    assert.ok(suggestion);
    assert.equal(suggestion.schema, CLOSING_ANALYSIS_SUGGEST_SCHEMA);
    assert.equal(suggestion.epicId, 'epic-a');
    assert.match(suggestion.suggestedBodyPath, /^work\/analytics\/closing-epic-a\.md$/);
    assert.deepEqual(suggestion.suggestedJournalFields.feeds_epics, ['epic-a']);
  });

  it('returns null when epic was already done', () => {
    const suggestion = buildClosingAnalysisSuggestion(
      { id: 'epic-a', status: 'done', itemKind: 'epic' },
      { id: 'epic-a', status: 'done', itemKind: 'epic' },
    );
    assert.equal(suggestion, null);
  });

  it('returns null for non-epic work item', () => {
    const suggestion = buildClosingAnalysisSuggestion(
      { id: 'task-a', status: 'verify', itemKind: 'subtask' },
      { id: 'task-a', status: 'done', itemKind: 'subtask' },
    );
    assert.equal(suggestion, null);
  });
});
