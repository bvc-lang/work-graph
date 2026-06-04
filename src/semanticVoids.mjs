import { readAnalyticsRecordJournal } from './analyticsRecordStore.mjs';
import { attachRelatedWorkItemsToAnalyticsRecords } from './analyticsRecordWorkItems.mjs';
import { buildUnifiedLinkageProjectionV1 } from './unifiedLinkageProjection.mjs';
import { detectSemanticDrift } from './semanticPlaneMcp.mjs';

export const SEMANTIC_VOIDS_RESULT_SCHEMA = 'semantic.voids.result.v1';

function collectTargetFiles(items) {
  const files = new Set();
  for (const item of items) {
    for (const path of item.targetFiles ?? []) {
      if (path) {
        files.add(String(path).replace(/\\/g, '/'));
      }
    }
  }
  return files;
}

export function findSemanticVoids(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const department = String(options.domain ?? options.department ?? '').trim();
  let scoped = items;
  if (department) {
    scoped = scoped.filter((item) => item.department === department);
  }

  const workWithoutEvidence = scoped
    .filter((item) => {
      const hasEvidence = (item.evidence?.length ?? 0) > 0 || item.traceStatus === 'verified';
      return !hasEvidence && !['done', 'verified'].includes(item.status);
    })
    .map((item) => ({
      workId: item.id,
      title: item.title ?? item.id,
      status: item.status,
      reasons: detectSemanticDrift(items, item.id).reasons,
    }));

  const targetFiles = collectTargetFiles(scoped);
  const linkage = options.linkage ?? buildUnifiedLinkageProjectionV1(items, options);
  const linkedFiles = new Set();

  for (const link of linkage.links ?? []) {
    if (link.to?.kind === 'file') {
      linkedFiles.add(String(link.to.id).replace(/\\/g, '/'));
    }
    if (link.from?.kind === 'file') {
      linkedFiles.add(String(link.from.id).replace(/\\/g, '/'));
    }
  }

  const filesWithoutWork = [...linkedFiles]
    .filter((path) => !targetFiles.has(path))
    .slice(0, options.maxFiles ?? 64)
    .map((path) => ({ path, reason: 'linked_but_not_target_file' }));

  let orphanAnalytics = [];
  if (options.analyticsRecords) {
    orphanAnalytics = options.analyticsRecords
      .filter((record) => (record.relatedWorkItems?.length ?? 0) === 0)
      .map((record) => ({
        key: record.key ?? record.id,
        title: record.title ?? record.key,
        bodyPath: record.bodyPath ?? '',
      }));
  }

  return {
    schema: SEMANTIC_VOIDS_RESULT_SCHEMA,
    domain: department || null,
    work_without_evidence: workWithoutEvidence,
    files_without_work: filesWithoutWork,
    orphan_analytics: orphanAnalytics,
    summary: {
      workWithoutEvidence: workWithoutEvidence.length,
      filesWithoutWork: filesWithoutWork.length,
      orphanAnalytics: orphanAnalytics.length,
    },
  };
}

export async function findSemanticVoidsFromRepo(options = {}) {
  const { readWorkItemsFromRepo } = await import('./intentTreeWorkItems.mjs');
  const items = options.items ?? await readWorkItemsFromRepo(options);

  let analyticsRecords = options.analyticsRecords;
  if (analyticsRecords === undefined) {
    const journal = await readAnalyticsRecordJournal(options);
    analyticsRecords = attachRelatedWorkItemsToAnalyticsRecords(journal.records ?? [], items);
  }

  return findSemanticVoids(items, { ...options, analyticsRecords });
}
