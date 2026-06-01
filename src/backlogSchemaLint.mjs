import { resolve } from 'node:path';

import { lintWorkItemHierarchyIssues } from './workItemHierarchy.mjs';
import { lintPipelineStageIssues } from './pipelineStageLint.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import { parseWorkItems } from './workGraphRuntime.mjs';
import { evaluateWorkItemBvcQuality } from './workItemBvcQuality.mjs';
import { evaluateWorkItemProseLint } from './workItemProseLint.mjs';

export const ALLOWED_MIGRATION_STRATEGIES = new Set(['port', 'rebuild', 'replace', 'defer']);

const ALLOWED_STATUSES = new Set(['backlog', 'ready', 'claimed', 'doing', 'in_progress', 'verify', 'done', 'verified', 'blocked']);
const DONE_STATUSES = new Set(['done', 'verified']);
const ACTIVE_STATUSES = new Set(['backlog', 'ready', 'claimed', 'doing', 'in_progress', 'verify']);

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/**
 * @param {Array<{ id: string, status: string, dependsOn?: string[], evidence?: string[], nextAction?: string, basis?: string, vector?: string, goal?: string }>} items
 * @param {{ strictBvc?: boolean }} [options]
 */
export function lintBacklogItems(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const issues = [];
  const seenIds = new Map();
  const itemById = new Map(items.map((item) => [item.id, item]));

  for (const item of items) {
    if (typeof item.id !== 'string' || item.id.trim() === '') {
      issues.push({
        severity: 'error',
        code: 'missing_work_id',
        message: 'WorkItem missing work.id',
        workId: item.id ?? '',
      });
      continue;
    }

    const count = (seenIds.get(item.id) ?? 0) + 1;
    seenIds.set(item.id, count);
    if (count > 1) {
      issues.push({
        severity: 'error',
        code: 'duplicate_work_id',
        message: `Duplicate work.id: ${item.id}`,
        workId: item.id,
      });
    }

    if (!ALLOWED_STATUSES.has(item.status)) {
      issues.push({
        severity: 'error',
        code: 'invalid_status',
        message: `Invalid work.status "${item.status}" for ${item.id}`,
        workId: item.id,
        status: item.status,
      });
    }

    for (const dependencyId of item.dependsOn ?? []) {
      if (dependencyId === item.id) {
        issues.push({
          severity: 'error',
          code: 'self_dependency',
          message: `WorkItem depends on itself: ${item.id}`,
          workId: item.id,
          dependencyId,
        });
      } else if (!itemById.has(dependencyId)) {
        issues.push({
          severity: 'error',
          code: 'missing_dependency',
          message: `Missing dependency "${dependencyId}" for ${item.id}`,
          workId: item.id,
          dependencyId,
        });
      }
    }

    if (ACTIVE_STATUSES.has(item.status) && String(item.nextAction ?? '').trim() === '') {
      issues.push({
        severity: 'warning',
        code: 'missing_next_action',
        message: `Active WorkItem ${item.id} has empty work.next_action`,
        workId: item.id,
        status: item.status,
      });
    }

    if (DONE_STATUSES.has(item.status) && !(item.evidence?.length > 0)) {
      issues.push({
        severity: 'warning',
        code: 'done_without_evidence',
        message: `Done WorkItem ${item.id} has no Свидетельства section lines`,
        workId: item.id,
        status: item.status,
      });
    }

    const migrationStrategy = String(item.labels?.['migration.strategy'] ?? '').trim();
    if (migrationStrategy === '') {
      issues.push({
        severity: 'error',
        code: 'missing_migration_strategy',
        message: `WorkItem ${item.id} missing migration.strategy (allowed: port, rebuild, replace, defer)`,
        workId: item.id,
      });
    } else if (!ALLOWED_MIGRATION_STRATEGIES.has(migrationStrategy)) {
      issues.push({
        severity: 'error',
        code: 'invalid_migration_strategy',
        message: `WorkItem ${item.id} has invalid migration.strategy "${migrationStrategy}"`,
        workId: item.id,
        migrationStrategy,
      });
    }

    for (const bvcIssue of evaluateWorkItemBvcQuality(item)) {
      issues.push({
        ...bvcIssue,
        severity: options.strictBvc ? 'error' : bvcIssue.severity,
      });
    }

    for (const proseIssue of evaluateWorkItemProseLint(item)) {
      issues.push(proseIssue);
    }
  }

  for (const hierarchyIssue of lintWorkItemHierarchyIssues(items)) {
    issues.push(hierarchyIssue);
  }

  for (const pipelineIssue of lintPipelineStageIssues(items)) {
    issues.push(pipelineIssue);
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return {
    schema: 'workgraph.backlog.lint.v1',
    ok: errors.length === 0,
    itemCount: items.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    issues: [...errors, ...warnings].sort((left, right) => compareText(left.workId, right.workId) || compareText(left.code, right.code)),
  };
}

export function formatBacklogLintReport(report) {
  const lines = [
    `backlog lint: ${report.ok ? 'ok' : 'failed'} (${report.errorCount} errors, ${report.warningCount} warnings, ${report.itemCount} items)`,
  ];

  for (const issue of report.issues) {
    lines.push(`${issue.severity}: [${issue.code}] ${issue.message}`);
  }

  return lines.join('\n');
}

export async function lintBacklogFile(options = {}) {
  const items = await readWorkItemsFromRepo({
    cwd: resolve(options.cwd ?? process.cwd()),
    backlogPath: options.backlogPath,
    backlogText: options.backlogText,
    intentIndexPath: options.intentIndexPath,
  });
  return lintBacklogItems(items, {
    strictBvc: options.strictBvc === true,
  });
}
