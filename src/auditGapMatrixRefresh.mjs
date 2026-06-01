import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const AUDIT_GAP_MATRIX_SYNC_SCHEMA = 'workgraph.audit-gap-matrix.sync.v1';

const REQUIRED_MATRIX_STATUSES = ['implemented', 'contract-only', 'stub', 'deferred', 'replace'];
const REQUIRED_MATRIX_SECTIONS = [
  '## Легенда статусов',
  '## Матрица: capability → strategy → fact → follow-up',
  '## Post-rollout backlog',
];

const RECONCILE_PROCEDURE_HEADING = '## Процедура сверки при изменениях ioHasC';

/**
 * @param {string} text
 * @param {string[]} needles
 */
function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{ cwd?: string, matrixPath?: string, rebuildPlanPath?: string, iohascStatusPath?: string, matrixText?: string, rebuildPlanText?: string }} [options]
 */
export async function evaluateAuditGapMatrixSync(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const matrixPath = resolve(cwd, options.matrixPath ?? 'docs/plan-iohasc-rebuild-audit-gap-matrix.md');
  const rebuildPlanPath = resolve(cwd, options.rebuildPlanPath ?? 'docs/plan-iohasc-full-rebuild-backlog.md');
  const iohascStatusPath = resolve(cwd, options.iohascStatusPath ?? '../project/docs/architecture-v2/IMPLEMENTATION_STATUS.md');

  const checks = [];
  const matrixText = options.matrixText ?? await readFile(matrixPath, 'utf8');
  const rebuildPlanText = options.rebuildPlanText ?? await readFile(rebuildPlanPath, 'utf8');

  checks.push({
    id: 'matrix-status-legend',
    label: 'Audit-gap matrix documents implemented/contract-only/stub/deferred/replace legend',
    met: includesAll(matrixText, REQUIRED_MATRIX_STATUSES),
    evidence: matrixPath,
  });

  checks.push({
    id: 'matrix-required-sections',
    label: 'Audit-gap matrix includes legend, capability table, and post-rollout backlog sections',
    met: includesAll(matrixText, REQUIRED_MATRIX_SECTIONS),
    evidence: matrixPath,
  });

  checks.push({
    id: 'rebuild-plan-matrix-link',
    label: 'Full rebuild backlog links to audit-gap matrix',
    met: rebuildPlanText.includes('plan-iohasc-rebuild-audit-gap-matrix.md'),
    evidence: rebuildPlanPath,
  });

  checks.push({
    id: 'reconcile-procedure-documented',
    label: 'Full rebuild backlog documents reconcile procedure heading',
    met: rebuildPlanText.includes(RECONCILE_PROCEDURE_HEADING),
    evidence: rebuildPlanPath,
  });

  checks.push({
    id: 'reconcile-cli-referenced',
    label: 'Full rebuild backlog references npm run check:audit-gap-matrix',
    met: rebuildPlanText.includes('npm run check:audit-gap-matrix'),
    evidence: rebuildPlanPath,
  });

  const iohascStatusExists = await pathExists(iohascStatusPath);
  checks.push({
    id: 'iohasc-status-source-present',
    label: 'Sibling ioHasC IMPLEMENTATION_STATUS source is reachable when present',
    met: !iohascStatusExists || rebuildPlanText.includes('IMPLEMENTATION_STATUS.md'),
    evidence: iohascStatusExists ? iohascStatusPath : 'optional sibling ../project not checked in',
  });

  if (iohascStatusExists) {
    const iohascStatusText = await readFile(iohascStatusPath, 'utf8');
    checks.push({
      id: 'iohasc-status-has-phase-headings',
      label: 'ioHasC IMPLEMENTATION_STATUS contains phase headings for manual reconcile',
      met: /Phase\s+\d+/u.test(iohascStatusText) || /##\s+/u.test(iohascStatusText),
      evidence: iohascStatusPath,
    });
  }

  const unmet = checks.filter((check) => !check.met);
  return {
    schema: AUDIT_GAP_MATRIX_SYNC_SCHEMA,
    ok: unmet.length === 0,
    matrixPath: join(cwd, 'docs/plan-iohasc-rebuild-audit-gap-matrix.md'),
    rebuildPlanPath: join(cwd, 'docs/plan-iohasc-full-rebuild-backlog.md'),
    iohascStatusPath: iohascStatusExists ? iohascStatusPath : null,
    checkCount: checks.length,
    unmetCount: unmet.length,
    checks,
  };
}

export function formatAuditGapMatrixSyncReport(report) {
  const lines = [
    `audit-gap matrix sync: ${report.ok ? 'ok' : 'failed'} (${report.unmetCount}/${report.checkCount} unmet)`,
  ];

  for (const check of report.checks) {
    lines.push(`${check.met ? 'ok' : 'fail'}: [${check.id}] ${check.label}`);
  }

  return lines.join('\n');
}
