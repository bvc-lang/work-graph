import dagre from '@dagrejs/dagre';
import { resolveGraphCanvasOverlaps } from './graphCanvasLitFlow/resolveGraphCanvasOverlaps.mjs';

/**
 * @typedef {{
 *   nodesep?: number,
 *   ranksep?: number,
 *   edgesep?: number,
 *   marginx?: number,
 *   marginy?: number,
 *   rankdir?: 'TB' | 'BT' | 'LR' | 'RL',
 *   ranker?: 'network-simplex' | 'tight-tree' | 'longest-path',
 *   align?: 'UL' | 'UR' | 'DL' | 'DR',
 *   resolveOverlaps?: boolean,
 *   overlapGap?: number,
 * }} DagreLayoutOptions
 */

/**
 * @param {Array<{ id: string, width: number, height: number, [key: string]: unknown }>} nodes
 * @param {Array<{ from: string, to: string }>} edges
 * @param {DagreLayoutOptions} [options]
 */
export function layoutGraphWithDagre(nodes, edges, options = {}) {
  const rankdir = options.rankdir ?? 'TB';
  const graph = new dagre.graphlib.Graph({ compound: false, directed: true });
  graph.setGraph({
    rankdir,
    nodesep: options.nodesep ?? 56,
    ranksep: options.ranksep ?? 112,
    edgesep: options.edgesep ?? 24,
    marginx: options.marginx ?? 32,
    marginy: options.marginy ?? 32,
    ranker: options.ranker ?? 'network-simplex',
    align: options.align ?? 'UL',
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, { width: node.width, height: node.height });
  }

  for (const edge of edges) {
    if (graph.hasNode(edge.from) && graph.hasNode(edge.to)) {
      graph.setEdge(edge.from, edge.to);
    }
  }

  dagre.layout(graph);

  const isHorizontal = rankdir === 'LR' || rankdir === 'RL';
  const rankByCoord = new Map();
  const sortedRanks = [...new Set(nodes.map((node) => graph.node(node.id)[isHorizontal ? 'x' : 'y']))]
    .sort((left, right) => left - right);
  sortedRanks.forEach((value, index) => rankByCoord.set(value, index));

  let placed = nodes.map((node) => {
    const positioned = graph.node(node.id);
    const rankCoord = isHorizontal ? positioned.x : positioned.y;
    const crossCoord = isHorizontal ? positioned.y : positioned.x;
    return {
      ...node,
      x: positioned.x - node.width / 2,
      y: positioned.y - node.height / 2,
      row: isHorizontal ? crossCoord : (rankByCoord.get(rankCoord) ?? 0),
      col: isHorizontal ? (rankByCoord.get(rankCoord) ?? 0) : crossCoord,
    };
  });

  if (options.resolveOverlaps !== false) {
    placed = resolveGraphCanvasOverlaps(placed, {
      gap: options.overlapGap ?? 28,
      layoutDirection: rankdir,
    });
  }

  return placed;
}
