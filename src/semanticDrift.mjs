import { detectSemanticDrift } from './semanticPlaneMcp.mjs';

export const SEMANTIC_DRIFT_BATCH_SCHEMA = 'semantic.drift.batch.v1';

function driftTier(score) {
  if (score >= 0.65) {
    return 'high';
  }
  if (score >= 0.35) {
    return 'medium';
  }
  return 'low';
}

export function buildSemanticDriftBatch(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  let filtered = items;
  const department = String(options.department ?? '').trim();
  const parentId = String(options.parentId ?? options.epicId ?? '').trim();

  if (department) {
    filtered = filtered.filter((item) => item.department === department);
  }
  if (parentId) {
    filtered = filtered.filter((item) => (item.labels?.['work.parent_id'] ?? '') === parentId);
  }

  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : filtered.length;
  const entries = [];

  for (const item of filtered.slice(0, limit)) {
    const drift = detectSemanticDrift(items, item.id);
    entries.push({
      workId: item.id,
      alignment_score: drift.alignment_score,
      drift_score: drift.drift_score,
      driftTier: driftTier(drift.drift_score),
      reasons: drift.reasons,
    });
  }

  entries.sort((left, right) => right.drift_score - left.drift_score);

  return {
    schema: SEMANTIC_DRIFT_BATCH_SCHEMA,
    department: department || null,
    parentId: parentId || null,
    count: entries.length,
    entries,
    legend: {
      low: { max: 0.35, label: 'aligned' },
      medium: { min: 0.35, max: 0.65, label: 'review' },
      high: { min: 0.65, label: 'drift' },
    },
  };
}

export function driftScoreMapFromBatch(batch) {
  const map = new Map();
  for (const entry of batch?.entries ?? []) {
    map.set(entry.workId, entry.drift_score);
  }
  return map;
}

export function driftTierMapFromBatch(batch) {
  const map = new Map();
  for (const entry of batch?.entries ?? []) {
    map.set(entry.workId, entry.driftTier);
  }
  return map;
}
