import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lintPipelineStageIssues } from '../src/pipelineStageLint.mjs';

describe('lintPipelineStageIssues', () => {
  it('errors when explicit analyzed stage has empty analysis block', () => {
    const issues = lintPipelineStageIssues([
      {
        id: 'bad-analyzed',
        status: 'backlog',
        analysis: '',
        labels: { 'work.pipeline_stage': 'analyzed', 'migration.strategy': 'rebuild' },
      },
    ]);
    assert.ok(issues.some((issue) => issue.code === 'pipeline_analyzed_without_analysis' && issue.severity === 'error'));
  });

  it('errors when ready has open dependency', () => {
    const issues = lintPipelineStageIssues([
      { id: 'dep', status: 'backlog', dependsOn: [], labels: {} },
      {
        id: 'ready-child',
        status: 'ready',
        dependsOn: ['dep'],
        ownerRole: 'feature_engineer',
        labels: { 'work.pipeline_stage': 'ready' },
      },
    ]);
    assert.ok(issues.some((issue) => issue.code === 'pipeline_ready_open_dependency' && issue.severity === 'error'));
  });

  it('skips intake analytics warning for operational bypass', () => {
    const issues = lintPipelineStageIssues([
      {
        id: 'ops-fix',
        status: 'backlog',
        labels: {
          'work.pipeline_stage': 'intake',
          'work.intake.bypass': 'operational',
          'migration.strategy': 'rebuild',
        },
      },
    ]);
    assert.equal(issues.some((issue) => issue.code === 'pipeline_intake_without_analytics'), false);
  });

  it('errors when explicit decided stage lacks verdict', () => {
    const issues = lintPipelineStageIssues([
      {
        id: 'bad-decided',
        status: 'backlog',
        decision: 'Вердикт: полезно',
        labels: { 'work.pipeline_stage': 'decided' },
      },
    ]);
    assert.ok(issues.some((issue) => issue.code === 'pipeline_decided_without_verdict' && issue.severity === 'error'));
  });

  it('warns when closed epic has no analytics.closing_ref', () => {
    const issues = lintPipelineStageIssues([
      {
        id: 'closed-epic',
        status: 'done',
        itemKind: 'epic',
        labels: { 'work.item_kind': 'epic' },
      },
    ]);
    assert.ok(issues.some((issue) => issue.code === 'epic_closed_without_closing_analysis' && issue.severity === 'warning'));
  });
});
