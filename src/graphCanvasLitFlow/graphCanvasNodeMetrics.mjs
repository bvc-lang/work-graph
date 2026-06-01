/** Card width aligned with n8n-style node proportions (~240px). */
export const GRAPH_CARD_WIDTH = 240;

/** Minimum card height including layer pill + one title line. */
export const GRAPH_CARD_MIN_HEIGHT = 96;

/**
 * Estimate rendered graph card height (must stay in sync with graphCardNode.ts).
 *
 * @param {{ title?: string, summary?: string, status?: string, layer?: boolean }} input
 */
export function estimateGraphCardHeight(input = {}) {
  const title = String(input.title ?? '');
  const summary = String(input.summary ?? '');
  const hasStatus = String(input.status ?? '').trim() !== '';
  const hasLayer = input.layer !== false;

  const titleLines = Math.max(1, Math.ceil(title.length / 30));
  const summaryLines = summary.trim() ? Math.max(1, Math.ceil(summary.length / 36)) : 0;

  let height = 21;
  if (hasLayer) {
    height += 30;
  }
  height += titleLines * 18;
  if (summaryLines) {
    height += 6 + summaryLines * 16;
  }
  if (hasStatus) {
    height += 31;
  }
  height += 12;

  return Math.max(GRAPH_CARD_MIN_HEIGHT, height);
}

/**
 * @param {{ title?: string, summary?: string, status?: string, layer?: boolean, width?: number }} input
 */
export function measureGraphCardNode(input = {}) {
  return {
    width: input.width ?? GRAPH_CARD_WIDTH,
    height: estimateGraphCardHeight(input),
  };
}
