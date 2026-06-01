import { pathToFileURL } from 'node:url';

import {
  evaluateAuditGapMatrixSync,
  formatAuditGapMatrixSyncReport,
} from '../src/auditGapMatrixRefresh.mjs';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await evaluateAuditGapMatrixSync();
  console.log(formatAuditGapMatrixSyncReport(report));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

export { evaluateAuditGapMatrixSync };
