import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildCodeGapBacklogFeed } from './codeGapBacklogFeeder.mjs';
import { buildCodeGapBacklogCandidateList } from './codeGapDraftIntakeApi.mjs';

export { analyzeCodeGaps, CODE_GAP_REPORT_SCHEMA } from './codeGapAnalyzer.mjs';

export const CODE_GAP_PROJECTION_SCHEMA = 'workgraph.code-gap-projection.v1';
export const DEFAULT_CODE_GAP_REPORT_PATH = 'tests/fixtures/code-gap-report.v1.json';

export async function readCodeGapReport(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const reportPath = resolve(cwd, options.reportPath ?? DEFAULT_CODE_GAP_REPORT_PATH);

  if (options.report !== undefined) {
    return options.report;
  }

  try {
    const text = await readFile(reportPath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {
        schema: 'code-gap.report.v1',
        summary: { total: 0 },
        entries: [],
      };
    }

    throw error;
  }
}

export async function buildCodeGapOperatorProjection(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const reportPath = options.reportPath ?? DEFAULT_CODE_GAP_REPORT_PATH;
  const report = await readCodeGapReport({ cwd, reportPath, report: options.report });
  const feed = buildCodeGapBacklogFeed(report, options);
  const promotionCandidates = buildCodeGapBacklogCandidateList(
    {
      suggestions: feed.suggestions,
      sourceReportPath: reportPath,
    },
    options,
  );

  return {
    schema: CODE_GAP_PROJECTION_SCHEMA,
    reportSchema: report.schema ?? 'code-gap.report.v1',
    sourceReportPath: reportPath,
    reportSummary: feed.sourceReport ?? {},
    suggestionCount: feed.suggestionCount,
    reviewRequired: feed.reviewRequired,
    promotionProtocol: feed.promotionProtocol,
    suggestions: feed.suggestions,
    promotionCandidates,
  };
}
