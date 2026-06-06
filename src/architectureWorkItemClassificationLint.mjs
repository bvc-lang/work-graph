import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { loadArchitectureL1Canon } from './architectureL1Canon.mjs';
import {
  UNCLASSIFIED_BLOCK_ID,
  buildCanonBlockPathIndex,
  classifyWorkItemForCanon,
} from './workItemBlockClassifier.mjs';

const ACTIVE_STATUSES = new Set(['backlog', 'ready', 'claimed', 'doing', 'in_progress', 'verify', 'blocked']);

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/**
 * @param {{ id?: string, status?: string, labels?: Record<string, string>, targetFiles?: string[], sourcePath?: string }} item
 * @param {ReturnType<typeof loadArchitectureL1Canon>} canon
 * @param {ReturnType<typeof buildCanonBlockPathIndex>} pathIndex
 */
function lintSingleWorkItemArchitectureClassification(item, canon, pathIndex) {
  const issues = [];
  const workId = String(item?.id ?? '').trim();
  if (!workId) {
    return issues;
  }

  const status = String(item?.status ?? '').trim();
  if (!ACTIVE_STATUSES.has(status)) {
    return issues;
  }

  const blockIds = new Set(canon.blocks.map((block) => block.id));
  const explicit = String(item?.labels?.['architecture.block_id'] ?? '').trim();
  if (explicit && !blockIds.has(explicit)) {
    issues.push({
      severity: 'warning',
      code: 'architecture_invalid_block_id',
      message: `WorkItem ${workId} has architecture.block_id "${explicit}" that is not in architecture canon`,
      workId,
      blockId: explicit,
    });
    return issues;
  }

  const classification = classifyWorkItemForCanon(item, canon, { pathIndex });
  if (classification.blockId === UNCLASSIFIED_BLOCK_ID) {
    const paths = [...(item.targetFiles ?? []), item.labels?.['intent.path'], item.sourcePath]
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean);
    const pathHint = paths.length > 0 ? ` (paths: ${paths.join(', ')})` : '';
    issues.push({
      severity: 'warning',
      code: 'architecture_unclassified',
      message: `WorkItem ${workId} is not mapped to any L1 architecture block${pathHint}`,
      workId,
      status,
      classificationSource: classification.source,
    });
  }

  return issues;
}

/**
 * @param {Array<{ id?: string, status?: string, labels?: Record<string, string>, targetFiles?: string[], sourcePath?: string }>} items
 * @param {{ repoRoot?: string, canonPath?: string, canon?: ReturnType<typeof loadArchitectureL1Canon> }} [options]
 */
export function lintArchitectureWorkItemClassification(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const repoRoot = options.repoRoot;
  const canonPath = options.canonPath;
  const explicitCanonPath = canonPath ? join(repoRoot ?? '', canonPath) : join(repoRoot ?? '', 'architecture/main.bvc');

  if (!options.canon && repoRoot && !existsSync(explicitCanonPath)) {
    return {
      schema: 'workgraph.architecture.classification.lint.v1',
      ok: true,
      skipped: true,
      reason: 'no_architecture_canon',
      itemCount: items.length,
      unclassifiedCount: 0,
      invalidBlockIdCount: 0,
      warningCount: 0,
      issues: [],
    };
  }

  const canon = options.canon ?? loadArchitectureL1Canon(repoRoot, { canonPath });
  const pathIndex = buildCanonBlockPathIndex(canon);
  const issues = [];

  for (const item of items) {
    issues.push(...lintSingleWorkItemArchitectureClassification(item, canon, pathIndex));
  }

  const unclassifiedCount = issues.filter((issue) => issue.code === 'architecture_unclassified').length;
  const invalidBlockIdCount = issues.filter((issue) => issue.code === 'architecture_invalid_block_id').length;

  return {
    schema: 'workgraph.architecture.classification.lint.v1',
    ok: true,
    skipped: false,
    canonSourcePath: canon.sourcePath,
    itemCount: items.length,
    unclassifiedCount,
    invalidBlockIdCount,
    warningCount: issues.length,
    issues: issues.sort((left, right) => compareText(left.workId, right.workId) || compareText(left.code, right.code)),
  };
}

/**
 * @param {{ id?: string, title?: string, department?: string, labels?: Record<string, string>, targetFiles?: string[], sourcePath?: string }} item
 * @param {{ repoRoot?: string, canonPath?: string }} [options]
 */
export function suggestArchitectureBlockIdForWorkItem(item, options = {}) {
  const repoRoot = options.repoRoot;
  if (!repoRoot) {
    return null;
  }

  const canonPath = options.canonPath;
  const explicitCanonPath = canonPath ? join(repoRoot, canonPath) : join(repoRoot, 'architecture/main.bvc');
  if (!existsSync(explicitCanonPath)) {
    return null;
  }

  const canon = loadArchitectureL1Canon(repoRoot, { canonPath });
  const classification = classifyWorkItemForCanon(item, canon);
  const block = canon.blocks.find((candidate) => candidate.id === classification.blockId);

  if (classification.blockId === UNCLASSIFIED_BLOCK_ID) {
    return {
      status: 'unclassified',
      hint: 'Set architecture.block_id on the work item or align work.target_files with canon intent_roots/container.paths.',
      classification,
    };
  }

  return {
    status: 'suggested',
    blockId: classification.blockId,
    blockTitle: block?.title ?? classification.blockId,
    label: 'architecture.block_id',
    source: classification.source,
    confidence: classification.confidence,
    hint: `Suggested label architecture.block_id: ${classification.blockId} (${classification.source}).`,
    classification,
  };
}
