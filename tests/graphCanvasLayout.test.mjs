import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getArchitectureL1Blocks, getArchitectureL1Edges } from '../src/architectureSnapshot.mjs';
import { buildArchitectureLayout } from '../src/architectureLayout.mjs';
import {
  ARCHITECTURE_LAYOUT_PROFILE,
  ARCHITECTURE_PIPELINE_LAYOUT_PROFILE,
  GRAPH_CANVAS_VIEW_FULL,
  GRAPH_CANVAS_VIEW_PIPELINE,
  SCHEMATIC_LAYOUT_PROFILE,
  computeNodeSlots,
  normalizeLayoutProfile,
  placeGraphCanvasNodes,
} from '../src/graphCanvasLayout.mjs';
import {
  SCHEMATIC_EDGE_DEFS,
  SCHEMATIC_NODE_DEFS,
  buildSchematicViewModel,
} from '../src/schematicView.mjs';

describe('graphCanvasLayout', () => {
  it('normalizes layered-dag profile with ranks and overrides', () => {
    const profile = normalizeLayoutProfile(ARCHITECTURE_LAYOUT_PROFILE);
    assert.equal(profile.profile, 'layered-dag-v1');
    assert.ok(profile.manualOverrides?.['work-graph']);
    assert.equal(profile.ranks?.domains, 1);
  });

  it('computes pipeline slots as a single row', () => {
    const slots = computeNodeSlots({
      nodeIds: ARCHITECTURE_PIPELINE_LAYOUT_PROFILE.pipelineNodeIds,
      edges: getArchitectureL1Edges(),
      layoutProfile: ARCHITECTURE_PIPELINE_LAYOUT_PROFILE,
    });

    assert.equal(slots.get('step-canon')?.col, 0);
    assert.equal(slots.get('project-memory')?.col, 4);
    assert.equal(slots.get('step-canon')?.row, 0);
    assert.equal(slots.get('project-memory')?.row, 0);
  });

  it('preserves architecture manual overrides for full graph', () => {
    const slots = computeNodeSlots({
      nodeIds: getArchitectureL1Blocks().map((block) => block.id),
      edges: getArchitectureL1Edges().map((edge) => ({ ...edge, upstream: edge.type === 'maps_to' })),
      layoutProfile: ARCHITECTURE_LAYOUT_PROFILE,
    });

    assert.deepEqual(slots.get('derived-projections'), { col: 3, row: 1, colSpan: 1 });
    assert.deepEqual(slots.get('domains'), { col: 1, row: 1, colSpan: 2 });
  });

  it('builds schematic pipeline with fewer nodes than full graph', () => {
    const full = buildSchematicViewModel({ viewMode: GRAPH_CANVAS_VIEW_FULL });
    const pipeline = buildSchematicViewModel({ viewMode: GRAPH_CANVAS_VIEW_PIPELINE });

    assert.ok(full.nodes.length > pipeline.nodes.length);
    assert.equal(pipeline.viewMode, GRAPH_CANVAS_VIEW_PIPELINE);
    assert.equal(pipeline.layoutProfile.profile, 'pipeline-v1');
    assert.ok(pipeline.nodes.every((node) => node.row === 0));
    assert.ok(!pipeline.edges.some((edge) => edge.upstream));
  });

  it('places nodes with colSpan width for storage block', () => {
    const placed = placeGraphCanvasNodes({
      items: SCHEMATIC_NODE_DEFS,
      edges: SCHEMATIC_EDGE_DEFS,
      layoutProfile: SCHEMATIC_LAYOUT_PROFILE,
      estimateSize: (_node, slot) => ({
        width: 232 * (slot.colSpan ?? 1),
        height: 112,
      }),
      config: { nodeWidth: 232, colGap: 72, offsetX: 40, offsetY: 40, rowGap: 96, nodeMinHeight: 112 },
    });

    const storage = placed.find((node) => node.id === 'storage');
    assert.ok(storage);
    assert.equal(storage.colSpan, 2);
    assert.ok(storage.width > 232);
  });
});

describe('buildArchitectureLayout with layout profile', () => {
  it('includes layoutProfile metadata in layout result', () => {
    const layout = buildArchitectureLayout({
      blocks: getArchitectureL1Blocks(),
      edges: getArchitectureL1Edges(),
    }, null, { viewMode: GRAPH_CANVAS_VIEW_FULL });

    assert.equal(layout.viewMode, GRAPH_CANVAS_VIEW_FULL);
    assert.equal(layout.layoutProfile.profile, 'layered-dag-v1');
    assert.ok(layout.nodes.length >= 7);
  });

  it('filters to pipeline main path nodes', () => {
    const layout = buildArchitectureLayout({
      blocks: getArchitectureL1Blocks(),
      edges: getArchitectureL1Edges(),
    }, null, { viewMode: GRAPH_CANVAS_VIEW_PIPELINE });

    assert.equal(layout.nodes.length, 5);
    assert.ok(!layout.nodes.some((node) => node.block.id === 'domains'));
  });
});
