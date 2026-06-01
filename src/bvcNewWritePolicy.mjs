export const BVC_WORK_ITEM_CANON_SUFFIX = '.work.bvc';
export const BVC_WORK_ITEM_LEGACY_SUFFIX = '.work.bvc';

/** @param {string} relativePath */
export function isWorkItemArtifactPath(relativePath) {
  const normalized = String(relativePath ?? '').replace(/\\/g, '/');
  return normalized.endsWith(BVC_WORK_ITEM_CANON_SUFFIX)
    || normalized.endsWith(BVC_WORK_ITEM_LEGACY_SUFFIX);
}

/**
 * @param {string} workId
 * @param {{ preferCanon?: boolean }} [options]
 */
export function workItemFileName(workId, options = {}) {
  const preferCanon = options.preferCanon !== false;
  const suffix = preferCanon ? BVC_WORK_ITEM_CANON_SUFFIX : BVC_WORK_ITEM_LEGACY_SUFFIX;
  return `${String(workId).trim()}${suffix}`;
}

/**
 * @param {string} folder e.g. intent/system/runtime/work
 * @param {string} workId
 * @param {{ preferCanon?: boolean }} [options]
 */
export function workItemPathInFolder(folder, workId, options = {}) {
  const base = String(folder ?? '').replace(/\\/g, '/').replace(/\/+$/u, '');
  return `${base}/${workItemFileName(workId, options)}`;
}

/**
 * @param {{ id: string, department?: string }} item
 */
export function intentWorkFolderForItem(item) {
  const department = String(item.department ?? '').trim();
  if (department === 'ui-dashboard' || department === 'frontend-ui') {
    return 'intent/ui/dashboard/work';
  }
  if (department === 'memory') {
    return 'intent/memory/work';
  }
  if (department === 'domain-onebase') {
    return 'intent/domains/onebase/work';
  }
  if (department === 'domain-marketplace') {
    return 'intent/domains/marketplace/work';
  }
  if (String(item.id).includes('pvrg')) {
    return 'intent/research/pvrg/work';
  }
  return 'intent/system/runtime/work';
}

/**
 * New WorkItems use `.work.bvc`; legacy `.work.bvc` remains readable.
 * @param {{ id: string, department?: string }} item
 */
export function intentPathForNewWorkItem(item) {
  return workItemPathInFolder(intentWorkFolderForItem(item), item.id, { preferCanon: true });
}

/**
 * @param {string} workId
 * @param {string} relativePath
 */
export function workItemPathMatchesId(workId, relativePath) {
  const normalized = String(relativePath ?? '').replace(/\\/g, '/');
  return normalized.endsWith(workItemFileName(workId, { preferCanon: true }))
    || normalized.endsWith(workItemFileName(workId, { preferCanon: false }));
}
