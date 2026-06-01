import { pathToFileURL } from 'node:url';

import {
  formatPlanWorkAlignmentReport,
  lintPlanWorkAlignment,
} from '../src/lintPlanWorkAlignment.mjs';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await lintPlanWorkAlignment();
  console.log(formatPlanWorkAlignmentReport(report));

  if (!report.ok || (process.argv.includes('--strict') && report.warnings.length > 0)) {
    process.exitCode = 1;
  }
}

export { lintPlanWorkAlignment };
