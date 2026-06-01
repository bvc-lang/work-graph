import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SCHEMATIC_EDGE_DEFS,
  SCHEMATIC_NODE_DEFS,
  buildSchematicViewModel,
  schematicEdgeGeometry,
} from '../src/schematicView.mjs';

describe('buildSchematicViewModel', () => {
  it('builds deterministic schematic.view.v1 with Work Graph OS nodes', () => {
    const model = buildSchematicViewModel();

    assert.equal(model.schema, 'schematic.view.v1');
    assert.equal(model.nodes.length, SCHEMATIC_NODE_DEFS.length);
    assert.equal(model.edges.length, SCHEMATIC_EDGE_DEFS.length);
    assert.ok(model.nodes.some((node) => node.id === 'intent-tree'));
    assert.ok(model.nodes.some((node) => node.id === 'work-graph'));
    assert.ok(model.nodes.some((node) => node.id === 'runner'));
    assert.ok(model.nodes.some((node) => node.id === 'evidence'));
    assert.ok(model.nodes.some((node) => node.id === 'memory'));
    assert.ok(model.nodes.some((node) => node.id === 'graph-rag'));
    assert.ok(model.nodes.some((node) => node.id === 'ui'));
    assert.ok(model.nodes.some((node) => node.id === 'domains'));
    assert.ok(model.nodes.some((node) => node.id === 'storage'));
    assert.ok(model.nodes.some((node) => node.title === 'Дерево intent'));
    assert.ok(model.nodes.some((node) => node.title === 'Runner задач'));
    assert.ok(model.nodes.some((node) => node.title === 'Доказательства'));
    assert.ok(model.nodes.some((node) => node.title === 'Память проекта'));
    assert.ok(model.nodes.some((node) => node.title === 'UI оператора'));
    assert.ok(model.nodes.some((node) => node.layer === 'проекция'));
    assert.ok(model.width > 600);
    assert.ok(model.height > 300);
  });

  it('includes main OS loop edges without depends_on', () => {
    const model = buildSchematicViewModel();
    const types = new Set(model.edges.map((edge) => edge.type));

    assert.ok(types.has('feeds'));
    assert.ok(types.has('uses'));
    assert.ok(types.has('validates'));
    assert.ok(types.has('maps_to'));
    assert.ok(model.edges.every((edge) => edge.type !== 'depends_on'));
    assert.ok(model.edges.some((edge) => edge.label === 'питает'));
    assert.ok(model.edges.some((edge) => edge.label === 'проверяет'));
    assert.ok(model.edges.some((edge) => edge.label === 'пересобирает'));
  });

  it('computes edge geometry for same-row and cross-row links', () => {
    const model = buildSchematicViewModel();
    const sameRow = model.edges.find((edge) => edge.from === 'intent-tree' && edge.to === 'work-graph');
    const crossRow = model.edges.find((edge) => edge.from === 'evidence' && edge.to === 'memory');

    assert.ok(sameRow);
    assert.ok(crossRow);
    assert.match(schematicEdgeGeometry(sameRow).d, /^M /);
    assert.match(schematicEdgeGeometry(crossRow).d, /^M /);
  });

  it('anchors vertical links bottom-to-top when target is below', () => {
    const model = buildSchematicViewModel();
    const edge = model.edges.find((candidate) => candidate.from === 'evidence' && candidate.to === 'memory');
    const geometry = schematicEdgeGeometry(edge);
    const from = edge.fromNode;
    const to = edge.toNode;

    assert.equal(geometry.startY, from.y + from.height);
    assert.equal(geometry.endY, to.y);
  });

  it('anchors vertical links top-to-bottom when target is above', () => {
    const model = buildSchematicViewModel();
    const edge = model.edges.find((candidate) => candidate.from === 'storage' && candidate.to === 'graph-rag');
    const geometry = schematicEdgeGeometry(edge);
    const from = edge.fromNode;
    const to = edge.toNode;

    assert.equal(geometry.startY, from.y);
    assert.equal(geometry.endY, to.y + to.height);
  });

  it('embeds precomputed geometry on edges', () => {
    const model = buildSchematicViewModel();

    assert.ok(model.edges.every((edge) => edge.geometry?.d));
    assert.ok(model.edges.every((edge) => typeof edge.geometry?.orientation === 'string'));
  });

  it('keeps row spacing below tallest card in each row', () => {
    const model = buildSchematicViewModel();
    const byRow = new Map();
    for (const node of model.nodes) {
      const row = byRow.get(node.row) ?? [];
      row.push(node);
      byRow.set(node.row, row);
    }

    const row0Bottom = Math.max(...byRow.get(0).map((node) => node.y + node.height));
    const row1Top = Math.min(...byRow.get(1).map((node) => node.y));
    const row1Bottom = Math.max(...byRow.get(1).map((node) => node.y + node.height));
    const row2Top = Math.min(...byRow.get(2).map((node) => node.y));

    assert.ok(row1Top >= row0Bottom + 80, 'row 1 should sit below row 0');
    assert.ok(row2Top >= row1Bottom + 80, 'row 2 should sit below row 1');
    assert.ok(model.nodes.every((node) => node.height >= 112));
  });
});
