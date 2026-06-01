import { pathToFileURL } from 'node:url';

import {
  evaluateOnebaseVectorDslCodegenReadiness,
  formatOnebaseVectorDslCodegenReadinessReport,
} from '../src/onebaseVectorDslCodegenReadiness.mjs';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await evaluateOnebaseVectorDslCodegenReadiness();
  console.log(formatOnebaseVectorDslCodegenReadinessReport(report));
  if (process.argv.includes('--require-reopen') && !report.readyToReopenCodegen) {
    process.exitCode = 1;
  }
}

export { evaluateOnebaseVectorDslCodegenReadiness };
