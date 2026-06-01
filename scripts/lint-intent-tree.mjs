import { pathToFileURL } from 'node:url';

import { lintIntentTreeOrphans } from '../src/intentTreeLint.mjs';

export function formatIntentTreeLintReport(report) {
  const lines = [
    `intent tree lint: ${report.ok ? 'ok' : 'failed'}`,
    `index: ${report.indexPath} (${report.indexedCount} entries, ${report.diskFileCount} .work.bvc files)`,
  ];

  if (report.orphanFiles.length > 0) {
    lines.push('orphan files:');
    for (const row of report.orphanFiles) {
      lines.push(`  - ${row.path}`);
    }
  }

  if (report.missingFiles.length > 0) {
    lines.push('missing files:');
    for (const row of report.missingFiles) {
      lines.push(`  - ${row.workId} -> ${row.path}`);
    }
  }

  if (report.errors.length > 0) {
    lines.push('errors:');
    for (const error of report.errors) {
      lines.push(`  - ${error}`);
    }
  }

  return lines.join('\n');
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const intentRootFlagIndex = process.argv.indexOf('--intent-root');
  const indexFlagIndex = process.argv.indexOf('--index');
  const report = await lintIntentTreeOrphans({
    intentRoot: intentRootFlagIndex === -1 ? undefined : process.argv[intentRootFlagIndex + 1],
    indexPath: indexFlagIndex === -1 ? undefined : process.argv[indexFlagIndex + 1],
  });

  console.log(formatIntentTreeLintReport(report));
  if (!report.ok) {
    process.exitCode = 1;
  }
}
