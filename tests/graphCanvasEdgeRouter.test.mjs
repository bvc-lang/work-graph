import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildGraphCanvasEdgeGeometry,
  buildGraphCanvasEdgeRoutes,
} from '../src/graphCanvasLitFlow/graphCanvasEdgeRouter.mjs';

const node = (id, x, y, width = 220, height = 72) => ({ id, x, y, width, height });

describe('graphCanvasEdgeRouter', () => {
  it('routes horizontal LR spine from right side to left side', () => {
    const geometry = buildGraphCanvasEdgeGeometry({
      fromNode: node('a', 40, 80),
      toNode: node('b', 320, 80),
    }, 'LR');

    assert.equal(geometry.orientation, 'horizontal');
    assert.match(geometry.d, /^M 260 116 C/);
    assert.equal(geometry.startX, 260);
    assert.equal(geometry.endX, 320);
  });

  it('routes vertical parent → child with cubic bend (not horizontal-first)', () => {
    const geometry = buildGraphCanvasEdgeGeometry({
      fromNode: node('parent', 320, 40),
      toNode: node('child', 320, 180),
      label: 'подзадача',
    }, 'LR');

    assert.equal(geometry.orientation, 'vertical');
    assert.match(geometry.d, /^M \d+ \d+ C \d+ \d+, \d+ \d+, \d+ \d+$/);
    assert.equal(geometry.label, '');
    assert.ok(geometry.startY > geometry.endY === false);
    assert.ok(geometry.startY < geometry.endY);
  });

  it('buildGraphCanvasEdgeRoutes maps projection edges with node positions', () => {
    const routes = buildGraphCanvasEdgeRoutes({
      layoutDirection: 'LR',
      nodes: [
        node('q', 40, 40),
        node('d', 320, 40),
        node('w', 320, 180),
      ],
      edges: [
        { id: 'q-d', from: 'q', to: 'd', label: 'вариант' },
        { id: 'd-w', from: 'd', to: 'w', label: 'порождает' },
      ],
    });

    assert.equal(routes.length, 2);
    assert.equal(routes[0].orientation, 'horizontal');
    assert.equal(routes[1].orientation, 'vertical');
    assert.ok(routes.every((route) => route.d.startsWith('M ')));
  });

  it('marks rejected and upstream edges for stroke styling', () => {
    const rejected = buildGraphCanvasEdgeGeometry({
      fromNode: node('a', 40, 80),
      toNode: node('b', 320, 80),
      rejected: true,
    }, 'LR');
    const upstream = buildGraphCanvasEdgeGeometry({
      fromNode: node('a', 40, 80),
      toNode: node('b', 320, 80),
      upstream: true,
    }, 'LR');

    assert.equal(rejected.rejected, true);
    assert.equal(upstream.upstream, true);
  });
});
