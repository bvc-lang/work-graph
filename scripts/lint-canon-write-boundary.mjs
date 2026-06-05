import { pathToFileURL } from 'node:url';

import {
  formatCanonWriteBoundaryReport,
  lintCanonWriteBoundary,
} from '../src/canonWriteBoundaryLint.mjs';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const includeUntracked = process.argv.includes('--include-untracked');
  const report = await lintCanonWriteBoundary({ includeUntracked });
  console.log(formatCanonWriteBoundaryReport(report));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

export { lintCanonWriteBoundary, formatCanonWriteBoundaryReport };
