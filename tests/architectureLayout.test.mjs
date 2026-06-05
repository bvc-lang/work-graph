import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getArchitectureL1Blocks, getArchitectureL1Edges } from '../src/architectureSnapshot.mjs';
import {
  buildArchitectureLayout,
  architectureEdgeGeometry,
} from '../src/architectureLayout.mjs';

describe('buildArchitectureLayout', () => {
  it('embeds geometry on edges and sizes nodes from summary text', () => {
    const layout = buildArchitectureLayout({
      blocks: getArchitectureL1Blocks(),
      edges: getArchitectureL1Edges(),
    });

    assert.ok(layout.nodes.length >= 7);
    assert.ok(layout.edges.every((edge) => edge.geometry?.d));
    assert.ok(layout.nodes.every((node) => node.height >= 88));
  });

  it('anchors downward links from bottom to top', () => {
    const layout = buildArchitectureLayout({
      blocks: getArchitectureL1Blocks(),
      edges: getArchitectureL1Edges(),
    });
    const edge = layout.edges.find((candidate) => candidate.from === 'trace-evidence' && candidate.to === 'derived-projections');
    const geometry = edge.geometry;

    assert.equal(geometry.startY, edge.fromNode.y + edge.fromNode.height);
    assert.equal(geometry.endY, edge.toNode.y);
  });

  it('anchors upward links from top to bottom', () => {
    const layout = buildArchitectureLayout({
      blocks: getArchitectureL1Blocks(),
      edges: getArchitectureL1Edges(),
    });
    const edge = layout.edges.find((candidate) => candidate.from === 'domains' && candidate.to === 'work-graph');
    const geometry = edge.geometry;

    assert.equal(geometry.startY, edge.fromNode.y);
    assert.equal(geometry.endY, edge.toNode.y + edge.toNode.height);
  });

  it('keeps row spacing below tallest card in each row', () => {
    const layout = buildArchitectureLayout({
      blocks: getArchitectureL1Blocks(),
      edges: getArchitectureL1Edges(),
    });
    const byRow = new Map();
    for (const node of layout.nodes) {
      const row = byRow.get(node.row) ?? [];
      row.push(node);
      byRow.set(node.row, row);
    }

    const row0Bottom = Math.max(...byRow.get(0).map((node) => node.y + node.height));
    const row1Top = Math.min(...byRow.get(1).map((node) => node.y));

    assert.ok(row1Top >= row0Bottom + 64);
  });
});

describe('architectureEdgeGeometry', () => {
  it('computes bezier path for horizontal links', () => {
    const layout = buildArchitectureLayout({
      blocks: getArchitectureL1Blocks(),
      edges: getArchitectureL1Edges(),
    });
    const edge = layout.edges.find((candidate) => candidate.from === 'step-canon' && candidate.to === 'work-graph');
    assert.match(architectureEdgeGeometry(edge).d, /^M /);
  });
});
