import { inferPipelineStage, PIPELINE_VERDICTS } from './workItemDecisionPipeline.mjs';

const DONE_STATUSES = new Set(['done', 'verified']);

function isOperationalBypass(item) {
  return String(item?.labels?.['work.intake.bypass'] ?? '').trim() === 'operational';
}

function hasAnalyticsIntake(item) {
  const key = String(item?.labels?.['intake.analytics_key'] ?? '').trim();
  const keys = String(item?.labels?.['intake.analytics_keys'] ?? '').trim();
  return key !== '' || keys !== '';
}

function nonEmptySection(value) {
  return String(value ?? '').trim().length > 0;
}

/**
 * DoR/DoD checks for decision pipeline stages (AN-22 T3).
 * Errors apply to explicit pipeline_stage mismatches; warnings tolerate legacy items.
 *
 * @param {Array<{ id: string, status: string, ownerRole?: string, analysis?: string, decision?: string, dependsOn?: string[], itemKind?: string, labels?: Record<string, string> }>} items
 */
export function lintPipelineStageIssues(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const issues = [];
  const doneIds = new Set(items.filter((item) => DONE_STATUSES.has(item.status)).map((item) => item.id));

  for (const item of items) {
    const bypass = isOperationalBypass(item);
    const explicitStage = String(item.labels?.['work.pipeline_stage'] ?? '').trim();
    const inferredStage = inferPipelineStage(item);
    const stage = explicitStage !== '' ? explicitStage : inferredStage;

    if (explicitStage === 'analyzed' && !nonEmptySection(item.analysis) && !bypass) {
      issues.push({
        severity: 'error',
        code: 'pipeline_analyzed_without_analysis',
        message: `WorkItem ${item.id} has work.pipeline_stage=analyzed but empty Анализ block`,
        workId: item.id,
        pipelineStage: explicitStage,
      });
    } else if (inferredStage === 'analyzed' && !nonEmptySection(item.analysis) && !bypass) {
      issues.push({
        severity: 'warning',
        code: 'pipeline_inferred_analyzed_without_analysis',
        message: `WorkItem ${item.id} infers analyzed stage but Анализ block is empty`,
        workId: item.id,
        pipelineStage: inferredStage,
      });
    }

    if (explicitStage === 'decided' || (inferredStage === 'decided' && nonEmptySection(item.decision))) {
      const verdict = String(item.labels?.['work.decision.verdict'] ?? '').trim();
      if (!PIPELINE_VERDICTS.includes(verdict)) {
        issues.push({
          severity: explicitStage === 'decided' ? 'error' : 'warning',
          code: 'pipeline_decided_without_verdict',
          message: `WorkItem ${item.id} at decided stage missing valid work.decision.verdict`,
          workId: item.id,
          pipelineStage: stage,
        });
      }
    }

    if (item.status === 'ready' || stage === 'ready') {
      if (!nonEmptySection(item.ownerRole) && !bypass) {
        issues.push({
          severity: 'warning',
          code: 'pipeline_ready_without_owner',
          message: `WorkItem ${item.id} is ready but work.owner_role is empty`,
          workId: item.id,
          status: item.status,
        });
      }

      for (const dependencyId of item.dependsOn ?? []) {
        if (!doneIds.has(dependencyId)) {
          issues.push({
            severity: 'error',
            code: 'pipeline_ready_open_dependency',
            message: `WorkItem ${item.id} is ready but dependency "${dependencyId}" is not done/verified`,
            workId: item.id,
            dependencyId,
          });
        }
      }
    }

    if (!bypass && !hasAnalyticsIntake(item) && stage === 'intake' && item.status === 'backlog') {
      issues.push({
        severity: 'warning',
        code: 'pipeline_intake_without_analytics',
        message: `WorkItem ${item.id} at intake without intake.analytics_key and without work.intake.bypass=operational`,
        workId: item.id,
      });
    }

    if (String(item.itemKind ?? '') === 'epic' && DONE_STATUSES.has(item.status)) {
      const closingRef = String(item.labels?.['analytics.closing_ref'] ?? '').trim();
      if (closingRef === '') {
        issues.push({
          severity: 'warning',
          code: 'epic_closed_without_closing_analysis',
          message: `Epic ${item.id} is closed but analytics.closing_ref is not set (closing-AN pending)`,
          workId: item.id,
          status: item.status,
        });
      }
    }
  }

  return issues;
}
