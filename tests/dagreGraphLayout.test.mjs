import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { layoutGraphWithDagre } from '../src/dagreGraphLayout.mjs';

describe('dagreGraphLayout', () => {
  it('lays out a small DAG top-to-bottom', () => {
    const nodes = [
      { id: 'a', width: 100, height: 40, title: 'A' },
      { id: 'b', width: 100, height: 40, title: 'B' },
      { id: 'c', width: 100, height: 40, title: 'C' },
    ];
    const placed = layoutGraphWithDagre(nodes, [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ]);

    const byId = new Map(placed.map((node) => [node.id, node]));
    assert.ok(byId.get('b').y > byId.get('a').y);
    assert.ok(byId.get('c').y > byId.get('b').y);
  });

  it('lays out a small DAG left-to-right', () => {
    const nodes = [
      { id: 'a', width: 100, height: 40, title: 'A' },
      { id: 'b', width: 100, height: 40, title: 'B' },
      { id: 'c', width: 100, height: 40, title: 'C' },
    ];
    const placed = layoutGraphWithDagre(nodes, [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ], { rankdir: 'LR' });

    const byId = new Map(placed.map((node) => [node.id, node]));
    assert.ok(byId.get('b').x > byId.get('a').x);
    assert.ok(byId.get('c').x > byId.get('b').x);
  });
});
