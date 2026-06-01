/**
 * Dagre spacing inspired by n8n / Vue Flow layout recipes:
 * generous ranksep, nodesep >= rendered card height gap, edgesep for parallel edges.
 */

/** @type {import('../dagreGraphLayout.mjs').DagreLayoutOptions} */
export const N8N_INSPIRED_DAGRE_LR = {
  rankdir: 'LR',
  ranksep: 128,
  nodesep: 64,
  edgesep: 32,
  marginx: 36,
  marginy: 36,
  ranker: 'network-simplex',
  align: 'UL',
  resolveOverlaps: true,
  overlapGap: 32,
};

/** @type {import('../dagreGraphLayout.mjs').DagreLayoutOptions} */
export const N8N_INSPIRED_DAGRE_TB = {
  rankdir: 'TB',
  ranksep: 96,
  nodesep: 56,
  edgesep: 28,
  marginx: 32,
  marginy: 32,
  ranker: 'network-simplex',
  align: 'UL',
  resolveOverlaps: true,
  overlapGap: 28,
};
