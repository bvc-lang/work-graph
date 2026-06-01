import { pathToFileURL } from 'node:url';

import { formatBacklogLintReport, lintBacklogFile } from '../src/backlogSchemaLint.mjs';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const backlogFlagIndex = process.argv.indexOf('--backlog');
  const backlogPath = backlogFlagIndex === -1 ? undefined : process.argv[backlogFlagIndex + 1];
  const report = await lintBacklogFile({
    backlogPath,
    strictBvc: process.argv.includes('--strict-bvc'),
  });

  console.log(formatBacklogLintReport(report));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

export { lintBacklogFile };
