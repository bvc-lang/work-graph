import { createHash } from 'node:crypto';

export const BACKLOG_REVISION_SCHEMA = 'workgraph.backlog-revision.v1';

function compareWorkIds(left, right) {
  return String(left.id).localeCompare(String(right.id), 'en', { sensitivity: 'variant' });
}

/**
 * Deterministic revision from parsed work items (not file mtimes).
 * @param {Array<{ id: string, status?: string, labels?: Record<string, string> }>} items
 */
export function computeBacklogRevision(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const sorted = [...items].sort(compareWorkIds);
  const fingerprint = sorted.map((item) => ({
    id: item.id,
    status: item.status ?? '',
    decisionAt: item.labels?.['work.decision.at'] ?? '',
    analysisAt: item.labels?.['work.analysis.at'] ?? '',
  }));

  const digest = createHash('sha256')
    .update(JSON.stringify(fingerprint))
    .digest('hex')
    .slice(0, 16);

  return {
    schema: BACKLOG_REVISION_SCHEMA,
    revision: `sha256:${digest}`,
    itemCount: sorted.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {object | null | undefined} previous
 * @param {object | null | undefined} next
 */
export function backlogRevisionChanged(previous, next) {
  if (!previous?.revision || !next?.revision) return true;
  return previous.revision !== next.revision;
}
