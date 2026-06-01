import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildArchitectureMatrixModel,
  exportArchitectureSnapshotMermaid,
  formatArchitectureBlockDisplayTitle,
  getArchitectureBlockGroupLabel,
  summarizeArchitectureBlockForList,
} from '../src/architectureViewsProjection.mjs';

describe('architectureViewsProjection', () => {
  const fixture = {
    blocks: [
      {
        id: 'work-graph',
        title: 'Work Graph',
        layer: 'L1',
        taskIds: ['a', 'b'],
        taskCounts: { backlog: 1, done: 1 },
        summary: 'Runtime queue',
      },
    ],
    edges: [
      { from: 'step-canon', to: 'work-graph', type: 'feeds' },
    ],
  };

  it('exports mermaid flowchart from snapshot', () => {
    const output = exportArchitectureSnapshotMermaid(fixture);
    assert.match(output, /^flowchart LR/);
    assert.match(output, /work_graph\["Work Graph"\]/);
    assert.match(output, /step_canon -->|"feeds"| work_graph/);
  });

  it('builds matrix rows and status columns', () => {
    const matrix = buildArchitectureMatrixModel(fixture);
    assert.equal(matrix.schema, 'architecture.matrix.v1');
    assert.equal(matrix.rows.length, 1);
    assert.equal(matrix.rows[0].cells.find((cell) => cell.columnId === 'backlog')?.count, 1);
    assert.equal(matrix.rows[0].cells.find((cell) => cell.columnId === 'done')?.count, 1);
  });

  it('summarizes block list row metrics', () => {
    const summary = summarizeArchitectureBlockForList(fixture.blocks[0]);
    assert.equal(summary.blockId, 'work-graph');
    assert.equal(summary.taskCount, 2);
    assert.equal(summary.doneCount, 1);
  });

  it('keeps block title in list rows and exposes group label when set', () => {
    const domainBlock = { id: 'domains', title: 'Домены', taskIds: [] };
    assert.equal(formatArchitectureBlockDisplayTitle(domainBlock), 'Домены');
    assert.equal(getArchitectureBlockGroupLabel(domainBlock), '');
    const summary = summarizeArchitectureBlockForList({
      id: 'domains',
      title: 'Домены',
      taskIds: [],
    });
    assert.equal(summary.title, 'Домены');
    assert.equal(summary.listTitle, 'Домены');
  });
});
