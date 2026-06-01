import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  lintPlanTodoLines,
  lintWorkItemDoingBeforeReady,
} from '../src/lintPlanWorkAlignment.mjs';

describe('lintPlanWorkAlignment', () => {
  it('warns on unchecked plan todo without work.id', () => {
    const text = [
      '## Todo',
      '- [ ] `add-cursor-rule-single-backlog` — ok',
      '- [ ] T1: abstract todo without id',
    ].join('\n');

    const issues = lintPlanTodoLines(text, 'docs/plan-test.md');
    assert.equal(issues.length, 1);
    assert.equal(issues[0].code, 'plan_todo_missing_work_id');
  });

  it('warns when doing status precedes ready pipeline stage', () => {
    const issues = lintWorkItemDoingBeforeReady([
      {
        id: 'bad-doing',
        status: 'doing',
        labels: { 'work.pipeline_stage': 'decided' },
      },
      {
        id: 'ok-doing',
        status: 'doing',
        labels: { 'work.pipeline_stage': 'executing' },
      },
    ]);

    assert.equal(issues.length, 1);
    assert.equal(issues[0].workId, 'bad-doing');
    assert.equal(issues[0].code, 'work_doing_before_ready');
  });
});
