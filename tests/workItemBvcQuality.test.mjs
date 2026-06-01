import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  enrichWorkItemBvcDraft,
  evaluateWorkItemBvcQuality,
  meetsBvcLimits,
  WORK_ITEM_BVC_LIMITS,
} from '../src/workItemBvcQuality.mjs';

describe('workItemBvcQuality', () => {
  it('flags one-line BVC sections', () => {
    const issues = evaluateWorkItemBvcQuality({
      id: 'sample-task',
      basis: 'Короткий базис.',
      vector: 'Один шаг.',
      goal: 'Готово.',
    });

    assert.ok(issues.some((issue) => issue.code === 'short_basis_lines'));
    assert.ok(issues.some((issue) => issue.code === 'short_vector_lines'));
    assert.ok(issues.some((issue) => issue.code === 'short_goal_chars'));
  });

  it('enriches short sections using work item metadata', () => {
    const enriched = enrichWorkItemBvcDraft({
      profile: 'work_item',
      name: 'Задача_sample_task',
      basis: ['MCP tool отсутствует в Cursor.'],
      vector: ['Добавить handler в workgraph-mcp.'],
      goal: ['Tool доступен агенту.'],
      labels: {
        'atom.profile': 'work_item',
        'work.id': 'sample-task',
        'work.title': 'Sample MCP tool',
        'work.department': 'agent-platform',
        'work.next_action': 'добавить handler и тест',
        'work.target_files': 'packages/workgraph-mcp/src/handlers.mjs',
      },
    }, {
      id: 'sample-task',
      title: 'Sample MCP tool',
      department: 'agent-platform',
      nextAction: 'добавить handler и тест',
      targetFiles: ['packages/workgraph-mcp/src/handlers.mjs'],
      checks: ['Vitest покрывает handler'],
      dependsOn: ['implement-workgraph-mcp-server-mvp'],
    });

    assert.equal(meetsBvcLimits(enriched.basis, WORK_ITEM_BVC_LIMITS.basis), true);
    assert.equal(meetsBvcLimits(enriched.vector, WORK_ITEM_BVC_LIMITS.vector), true);
    assert.equal(meetsBvcLimits(enriched.goal, WORK_ITEM_BVC_LIMITS.goal), true);
  });
});
