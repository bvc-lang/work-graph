import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';

const PLAN_GLOB_PREFIX = 'plan-';
const WORK_ID_IN_LINE = /`([a-z][a-z0-9-]*)`/i;
const UNCHECKED_TODO = /^-\s+\[\s\]\s+/;

const PIPELINE_ORDER = ['intake', 'analyzed', 'decided', 'ready', 'executing', 'closed'];

export function lintPlanTodoLines(planText, filePath) {
  const issues = [];
  const lines = planText.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!UNCHECKED_TODO.test(line)) {
      continue;
    }

    if (WORK_ID_IN_LINE.test(line)) {
      continue;
    }

    issues.push({
      code: 'plan_todo_missing_work_id',
      severity: 'warning',
      filePath,
      line: index + 1,
      message: `unchecked todo без work.id в backticks: ${line.trim()}`,
    });
  }

  return issues;
}

export function lintWorkItemDoingBeforeReady(workItems) {
  const issues = [];

  for (const item of workItems) {
    const status = item.status ?? item.labels?.['work.status'];
    const stage = item.labels?.['work.pipeline_stage'] ?? inferStageFromItem(item);

    if (status !== 'doing') {
      continue;
    }

    if (!stage || stage === 'executing' || stage === 'closed') {
      continue;
    }

    const stageIndex = PIPELINE_ORDER.indexOf(stage);
    const readyIndex = PIPELINE_ORDER.indexOf('ready');

    if (stageIndex !== -1 && stageIndex < readyIndex) {
      issues.push({
        code: 'work_doing_before_ready',
        severity: 'warning',
        workId: item.id,
        message: `work.status=doing при work.pipeline_stage=${stage} (< ready)`,
      });
    }
  }

  return issues;
}

function inferStageFromItem(item) {
  if (item.labels?.['work.pipeline_stage']) {
    return item.labels['work.pipeline_stage'];
  }

  if (item.decisionVerdict) {
    return 'decided';
  }

  if (item.analysis) {
    return 'analyzed';
  }

  return 'intake';
}

export async function lintPlanWorkAlignment(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const docsDir = join(cwd, 'docs');
  const issues = [];

  let planFiles = [];

  try {
    const entries = await readdir(docsDir);
    planFiles = entries
      .filter((name) => name.startsWith(PLAN_GLOB_PREFIX) && name.endsWith('.md'))
      .map((name) => join('docs', name));
  } catch {
    planFiles = [];
  }

  for (const filePath of planFiles) {
    const text = await readFile(join(cwd, filePath), 'utf8');
    issues.push(...lintPlanTodoLines(text, filePath));
  }

  const workItems = options.workItems ?? await readWorkItemsFromRepo({ cwd });
  issues.push(...lintWorkItemDoingBeforeReady(workItems));

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return {
    schema: 'workgraph.lint-plan-work-alignment.v1',
    ok: errors.length === 0,
    issueCount: issues.length,
    errors,
    warnings,
    issues,
  };
}

export function formatPlanWorkAlignmentReport(report) {
  const lines = [
    `plan-work alignment: ${report.ok ? 'ok' : 'fail'} (${report.errors.length} errors, ${report.warnings.length} warnings)`,
  ];

  for (const issue of report.issues) {
    const location = issue.filePath
      ? `${issue.filePath}:${issue.line ?? '?'}`
      : issue.workId ?? '?';
    lines.push(`  [${issue.severity}] ${issue.code} @ ${location} — ${issue.message}`);
  }

  return lines.join('\n');
}
